-- Round 2: My Accounts, Events, Analytics

-- 1. My Accounts (personal/business accounts I control: Setu bank, personal bank, cash drawer, etc.)
CREATE TYPE public.my_account_kind AS ENUM ('bank', 'cash', 'wallet', 'other');
CREATE TYPE public.my_account_currency AS ENUM ('INR', 'NPR');

CREATE TABLE public.my_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  kind public.my_account_kind NOT NULL DEFAULT 'bank',
  currency public.my_account_currency NOT NULL DEFAULT 'INR',
  identifier text,
  opening_balance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.my_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view my_accounts" ON public.my_accounts FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Operators can insert my_accounts" ON public.my_accounts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Operators can update my_accounts" ON public.my_accounts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Admins can delete my_accounts" ON public.my_accounts FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_my_accounts_updated BEFORE UPDATE ON public.my_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Account movements (deposits, withdrawals, transfers, links to txns)
CREATE TYPE public.account_movement_kind AS ENUM ('deposit','withdrawal','transfer_in','transfer_out','txn_inflow','txn_outflow','adjustment','opening');

CREATE TABLE public.account_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.my_accounts(id) ON DELETE CASCADE,
  kind public.account_movement_kind NOT NULL,
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  counter_account_id uuid REFERENCES public.my_accounts(id),
  transaction_id uuid,
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_movements_account ON public.account_movements(account_id, occurred_on);

ALTER TABLE public.account_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view movements" ON public.account_movements FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Operators can insert movements" ON public.account_movements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Operators can update movements" ON public.account_movements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Admins can delete movements" ON public.account_movements FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 3. Events (tags for grouping transactions: family, marriage, festival, etc.)
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3B82F6',
  starts_on date,
  ends_on date,
  budget_npr numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view events" ON public.events FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Operators can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Operators can update events" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operator'));
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Add event_id to transactions for tagging
ALTER TABLE public.transactions ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;
CREATE INDEX idx_transactions_event ON public.transactions(event_id);

-- 5. Analytics view: monthly aggregates
CREATE OR REPLACE VIEW public.v_monthly_analytics AS
SELECT
  date_trunc('month', transaction_date)::date AS month,
  COUNT(*) AS tx_count,
  SUM(amount_inr) AS inr_total,
  SUM(amount_npr) AS npr_total,
  SUM(commission_npr) AS commission_total,
  SUM(paid_amount_npr) AS paid_total,
  SUM(amount_npr - commission_npr - paid_amount_npr) AS outstanding_total
FROM public.transactions
WHERE status <> 'cancelled'
GROUP BY 1
ORDER BY 1;

GRANT SELECT ON public.v_monthly_analytics TO authenticated;