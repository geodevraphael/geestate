-- Make payment-proofs bucket public so stored public URLs work
UPDATE storage.buckets
SET public = true
WHERE id = 'payment-proofs';