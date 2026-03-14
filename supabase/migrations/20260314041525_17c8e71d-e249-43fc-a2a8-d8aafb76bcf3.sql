
-- ============================================
-- Project Setu: Full Database Schema
-- ============================================

-- 1. Enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'paid', 'cancelled');
CREATE TYPE public.payment_method AS ENUM ('cash', 'bank_transfer', 'esewa', 'khalti', 'ime', 'other');
CREATE TYPE public.ledger_account AS ENUM ('indian_bank', 'cash_npr', 'bank_npr', 'esewa_pool', 'khalti_pool', 'ime_pool', 'commission');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table (separate per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if user has any role (is authenticated team member)
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

-- 5. Senders table
CREATE TABLE public.senders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  worker_id TEXT,
  bank_account TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.senders ENABLE ROW LEVEL SECURITY;

-- 6. Receivers table
CREATE TABLE public.receivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.senders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  district TEXT,
  address TEXT,
  payment_mode payment_method NOT NULL DEFAULT 'cash',
  bank_details TEXT,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receivers ENABLE ROW LEVEL SECURITY;

-- 7. Daily rates table
CREATE TABLE public.daily_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_date DATE NOT NULL UNIQUE,
  inr_to_npr NUMERIC(10,4) NOT NULL,
  set_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_rates ENABLE ROW LEVEL SECURITY;

-- 8. Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sender_id UUID NOT NULL REFERENCES public.senders(id),
  receiver_id UUID NOT NULL REFERENCES public.receivers(id),
  amount_inr NUMERIC(12,2) NOT NULL,
  exchange_rate NUMERIC(10,4) NOT NULL,
  amount_npr NUMERIC(12,2) NOT NULL,
  commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  status transaction_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 9. Ledger entries table (double-entry)
CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  account ledger_account NOT NULL,
  debit NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- 10. Audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Profiles: users can read all, update own
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- User roles: admins can manage, users can read own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Senders: all authenticated with any role can read; admin/operator can write
CREATE POLICY "Team can view senders" ON public.senders FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Operators can insert senders" ON public.senders FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
CREATE POLICY "Operators can update senders" ON public.senders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
CREATE POLICY "Admins can delete senders" ON public.senders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Receivers: same pattern
CREATE POLICY "Team can view receivers" ON public.receivers FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Operators can insert receivers" ON public.receivers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
CREATE POLICY "Operators can update receivers" ON public.receivers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
CREATE POLICY "Admins can delete receivers" ON public.receivers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Daily rates: all team can read, admin can write
CREATE POLICY "Team can view rates" ON public.daily_rates FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Admins can insert rates" ON public.daily_rates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update rates" ON public.daily_rates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Transactions: all team can read; admin/operator can write
CREATE POLICY "Team can view transactions" ON public.transactions FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Operators can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
CREATE POLICY "Operators can update transactions" ON public.transactions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

-- Ledger entries: all team can read; system-generated via triggers
CREATE POLICY "Team can view ledger" ON public.ledger_entries FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Operators can insert ledger" ON public.ledger_entries FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

-- Audit logs: admins can read all, others can read own
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- Triggers
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_senders_updated_at BEFORE UPDATE ON public.senders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_receivers_updated_at BEFORE UPDATE ON public.receivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and assign default operator role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operator');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Audit log trigger for transactions
CREATE OR REPLACE FUNCTION public.log_transaction_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, payload)
  VALUES (
    auth.uid(),
    TG_OP,
    'transaction',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_transaction_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_transaction_change();
