DROP VIEW IF EXISTS public.v_monthly_analytics;

CREATE VIEW public.v_monthly_analytics
WITH (security_invoker = true) AS
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