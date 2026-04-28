
-- Recreate view as security_invoker so RLS of underlying tables applies to the caller
DROP VIEW IF EXISTS public.party_balances;
CREATE VIEW public.party_balances
WITH (security_invoker = true) AS
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

-- Revoke EXECUTE from public/anon/authenticated for internal trigger-only functions
REVOKE EXECUTE ON FUNCTION public.assign_slip_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_transaction_payment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_installment_to_wallet() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_transaction_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_entity_change() FROM PUBLIC, anon, authenticated;
