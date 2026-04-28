
-- =========================================================
-- 1. ENUM EXTENSIONS
-- =========================================================
ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'partially_paid';
ALTER TYPE public.ledger_account ADD VALUE IF NOT EXISTS 'sender_advance';
ALTER TYPE public.ledger_account ADD VALUE IF NOT EXISTS 'receiver_advance';
ALTER TYPE public.ledger_account ADD VALUE IF NOT EXISTS 'payer_float';

DO $$ BEGIN
  CREATE TYPE public.party_kind AS ENUM ('sender','payer','receiver');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.settlement_kind AS ENUM ('advance_in','advance_out','adjustment','refund');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========================================================
-- 2. PAYERS (mediator / shop)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.payers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  shop_name text,
  phone text,
  address text,
  district text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view payers" ON public.payers FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Operators can insert payers" ON public.payers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Operators can update payers" ON public.payers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Admins can delete payers" ON public.payers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_payers_updated BEFORE UPDATE ON public.payers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. PAYER WALLETS (multi-channel float)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.payer_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id uuid NOT NULL REFERENCES public.payers(id) ON DELETE CASCADE,
  channel public.payment_method NOT NULL,
  balance_npr numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payer_id, channel)
);
ALTER TABLE public.payer_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view wallets" ON public.payer_wallets FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Operators can insert wallets" ON public.payer_wallets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Operators can update wallets" ON public.payer_wallets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Admins can delete wallets" ON public.payer_wallets FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 4. EXTEND TRANSACTIONS
-- =========================================================
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payer_id uuid REFERENCES public.payers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_amount_npr numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slip_number text,
  ADD COLUMN IF NOT EXISTS edit_reason text;

-- Sequence-based slip number
CREATE SEQUENCE IF NOT EXISTS public.slip_seq START 1001;

CREATE OR REPLACE FUNCTION public.assign_slip_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slip_number IS NULL THEN
    NEW.slip_number := 'SETU-' || to_char(now(),'YYYYMM') || '-' || nextval('public.slip_seq');
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_assign_slip ON public.transactions;
CREATE TRIGGER trg_assign_slip BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.assign_slip_number();

-- =========================================================
-- 5. PAYMENT INSTALLMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.payment_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  payer_id uuid REFERENCES public.payers(id) ON DELETE SET NULL,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  amount_npr numeric NOT NULL CHECK (amount_npr > 0),
  channel public.payment_method NOT NULL DEFAULT 'cash',
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view installments" ON public.payment_installments FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Operators can insert installments" ON public.payment_installments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Operators can update installments" ON public.payment_installments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Admins can delete installments" ON public.payment_installments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_installments_updated BEFORE UPDATE ON public.payment_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recalc transaction paid_amount + status whenever installments change
CREATE OR REPLACE FUNCTION public.recalc_transaction_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tx_id uuid;
  v_paid numeric;
  v_payable numeric;
  v_new_status public.transaction_status;
  v_current public.transaction_status;
BEGIN
  v_tx_id := COALESCE(NEW.transaction_id, OLD.transaction_id);
  SELECT COALESCE(SUM(amount_npr),0) INTO v_paid
    FROM public.payment_installments WHERE transaction_id = v_tx_id;
  SELECT (amount_npr - commission_npr), status INTO v_payable, v_current
    FROM public.transactions WHERE id = v_tx_id;

  IF v_current = 'cancelled' THEN
    v_new_status := 'cancelled';
  ELSIF v_paid <= 0 THEN
    v_new_status := 'pending';
  ELSIF v_paid >= v_payable THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partially_paid';
  END IF;

  UPDATE public.transactions
    SET paid_amount_npr = v_paid, status = v_new_status, updated_at = now()
    WHERE id = v_tx_id;
  RETURN COALESCE(NEW, OLD);
END;$$;

DROP TRIGGER IF EXISTS trg_installment_recalc ON public.payment_installments;
CREATE TRIGGER trg_installment_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_installments
  FOR EACH ROW EXECUTE FUNCTION public.recalc_transaction_payment();

-- Update payer wallet balance + post ledger when installment added/changed
CREATE OR REPLACE FUNCTION public.apply_installment_to_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_account public.ledger_account;
BEGIN
  -- Reverse old (UPDATE/DELETE)
  IF (TG_OP IN ('UPDATE','DELETE')) AND OLD.payer_id IS NOT NULL THEN
    INSERT INTO public.payer_wallets(payer_id, channel, balance_npr)
    VALUES (OLD.payer_id, OLD.channel, -OLD.amount_npr)
    ON CONFLICT (payer_id, channel) DO UPDATE
      SET balance_npr = public.payer_wallets.balance_npr - OLD.amount_npr,
          updated_at = now();
  END IF;

  -- Apply new (INSERT/UPDATE)
  IF (TG_OP IN ('INSERT','UPDATE')) AND NEW.payer_id IS NOT NULL THEN
    INSERT INTO public.payer_wallets(payer_id, channel, balance_npr)
    VALUES (NEW.payer_id, NEW.channel, NEW.amount_npr)
    ON CONFLICT (payer_id, channel) DO UPDATE
      SET balance_npr = public.payer_wallets.balance_npr + NEW.amount_npr,
          updated_at = now();
  END IF;

  -- Post ledger entry on insert
  IF TG_OP = 'INSERT' THEN
    v_account := CASE NEW.channel
      WHEN 'cash' THEN 'cash_npr'::public.ledger_account
      WHEN 'bank_transfer' THEN 'bank_npr'::public.ledger_account
      WHEN 'esewa' THEN 'esewa_pool'::public.ledger_account
      WHEN 'khalti' THEN 'khalti_pool'::public.ledger_account
      WHEN 'ime' THEN 'ime_pool'::public.ledger_account
      ELSE 'cash_npr'::public.ledger_account
    END;
    INSERT INTO public.ledger_entries(account, debit, credit, transaction_id, description)
    VALUES (v_account, 0, NEW.amount_npr, NEW.transaction_id,
            'Installment paid via ' || NEW.channel::text);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;$$;

DROP TRIGGER IF EXISTS trg_installment_wallet ON public.payment_installments;
CREATE TRIGGER trg_installment_wallet
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_installments
  FOR EACH ROW EXECUTE FUNCTION public.apply_installment_to_wallet();

-- =========================================================
-- 6. SETTLEMENTS (advances / adjustments per party)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_kind public.party_kind NOT NULL,
  party_id uuid NOT NULL,
  kind public.settlement_kind NOT NULL,
  amount_npr numeric NOT NULL CHECK (amount_npr <> 0),
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  channel public.payment_method,
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view settlements" ON public.settlements FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Operators can insert settlements" ON public.settlements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Operators can update settlements" ON public.settlements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Admins can delete settlements" ON public.settlements FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_settlements_updated BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.settlement_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES public.settlements(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount_npr numeric NOT NULL CHECK (amount_npr > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.settlement_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view allocations" ON public.settlement_allocations FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Operators can insert allocations" ON public.settlement_allocations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Operators can update allocations" ON public.settlement_allocations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Admins can delete allocations" ON public.settlement_allocations FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 7. TRANSACTION ACTIVITY TIMELINE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.transaction_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transaction_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view activity" ON public.transaction_activity FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Operators can insert activity" ON public.transaction_activity FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));

-- Auto-write activity from transaction changes
CREATE OR REPLACE FUNCTION public.log_transaction_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transaction_activity(transaction_id, actor_id, event_type, message)
    VALUES (NEW.id, auth.uid(), 'created',
      'Transaction created for INR ' || NEW.amount_inr || ' (NPR ' || NEW.amount_npr || ')');
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.transaction_activity(transaction_id, actor_id, event_type, message, payload)
      VALUES (NEW.id, auth.uid(), 'status_changed',
        'Status: ' || OLD.status || ' → ' || NEW.status,
        jsonb_build_object('from', OLD.status, 'to', NEW.status));
    END IF;
    IF NEW.amount_inr IS DISTINCT FROM OLD.amount_inr
       OR NEW.amount_npr IS DISTINCT FROM OLD.amount_npr
       OR NEW.exchange_rate IS DISTINCT FROM OLD.exchange_rate
       OR NEW.commission_npr IS DISTINCT FROM OLD.commission_npr THEN
      INSERT INTO public.transaction_activity(transaction_id, actor_id, event_type, message, payload)
      VALUES (NEW.id, auth.uid(), 'edited', COALESCE('Edited: ' || NEW.edit_reason,'Transaction edited'),
        jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;$$;

DROP TRIGGER IF EXISTS trg_tx_activity ON public.transactions;
CREATE TRIGGER trg_tx_activity
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_transaction_activity();

-- =========================================================
-- 8. NOTIFICATIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Operators insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Admins delete notifications" ON public.notifications FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 9. EXTEND AUDIT LOGGING TO MORE TABLES
-- =========================================================
CREATE OR REPLACE FUNCTION public.log_entity_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs(user_id, action, entity, entity_id, payload)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id),
          jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
  RETURN COALESCE(NEW, OLD);
END;$$;

DROP TRIGGER IF EXISTS trg_audit_senders ON public.senders;
CREATE TRIGGER trg_audit_senders AFTER INSERT OR UPDATE OR DELETE ON public.senders
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change();

DROP TRIGGER IF EXISTS trg_audit_receivers ON public.receivers;
CREATE TRIGGER trg_audit_receivers AFTER INSERT OR UPDATE OR DELETE ON public.receivers
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change();

DROP TRIGGER IF EXISTS trg_audit_payers ON public.payers;
CREATE TRIGGER trg_audit_payers AFTER INSERT OR UPDATE OR DELETE ON public.payers
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change();

DROP TRIGGER IF EXISTS trg_audit_installments ON public.payment_installments;
CREATE TRIGGER trg_audit_installments AFTER INSERT OR UPDATE OR DELETE ON public.payment_installments
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change();

DROP TRIGGER IF EXISTS trg_audit_settlements ON public.settlements;
CREATE TRIGGER trg_audit_settlements AFTER INSERT OR UPDATE OR DELETE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_change();

-- =========================================================
-- 10. HELPER VIEW: party balances
-- =========================================================
CREATE OR REPLACE VIEW public.party_balances AS
WITH tx AS (
  SELECT sender_id, payer_id, receiver_id,
         (amount_npr - commission_npr) AS payable,
         paid_amount_npr,
         (amount_npr - commission_npr - paid_amount_npr) AS outstanding
  FROM public.transactions WHERE status <> 'cancelled'
)
SELECT 'sender'::public.party_kind AS party_kind, sender_id AS party_id,
       SUM(payable) AS total_payable, SUM(paid_amount_npr) AS total_paid,
       SUM(outstanding) AS outstanding_npr
FROM tx WHERE sender_id IS NOT NULL GROUP BY sender_id
UNION ALL
SELECT 'payer', payer_id, SUM(payable), SUM(paid_amount_npr), SUM(outstanding)
FROM tx WHERE payer_id IS NOT NULL GROUP BY payer_id
UNION ALL
SELECT 'receiver', receiver_id, SUM(payable), SUM(paid_amount_npr), SUM(outstanding)
FROM tx WHERE receiver_id IS NOT NULL GROUP BY receiver_id;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tx_payer ON public.transactions(payer_id);
CREATE INDEX IF NOT EXISTS idx_inst_tx ON public.payment_installments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_inst_payer ON public.payment_installments(payer_id);
CREATE INDEX IF NOT EXISTS idx_settle_party ON public.settlements(party_kind, party_id);
CREATE INDEX IF NOT EXISTS idx_activity_tx ON public.transaction_activity(transaction_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id, is_read);
