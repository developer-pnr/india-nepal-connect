
-- Add commission_npr to transactions
ALTER TABLE public.transactions ADD COLUMN commission_npr numeric NOT NULL DEFAULT 0;

-- Add commission rate config to daily_rates
ALTER TABLE public.daily_rates ADD COLUMN commission_rate_npr_per_1000 numeric NOT NULL DEFAULT 30;
