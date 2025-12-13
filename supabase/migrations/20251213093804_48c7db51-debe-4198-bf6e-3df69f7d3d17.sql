-- Delete old pending listing fee records with outdated descriptions
DELETE FROM geoinsight_income_records gir
WHERE fee_definition_id = (SELECT id FROM geoinsight_fee_definitions WHERE code = 'LISTING_FEE')
  AND status IN ('pending', 'awaiting_review')
  AND NOT EXISTS (
    SELECT 1 FROM geoinsight_payment_proofs gpp 
    WHERE gpp.income_record_id = gir.id
  );

-- Recreate listing fees with correct percentage-based calculations
INSERT INTO geoinsight_income_records (
  user_id,
  related_listing_id,
  fee_definition_id,
  description,
  amount_due,
  currency,
  status,
  due_date
)
SELECT 
  l.owner_id,
  l.id,
  gfd.id,
  'Listing fee (0.1% of ' || l.price || ' ' || COALESCE(l.currency, 'TZS') || ') for: ' || l.title,
  l.price * gfd.percentage_rate,
  COALESCE(l.currency, gfd.currency, 'TZS'),
  'pending',
  NOW() + INTERVAL '14 days'
FROM listings l
CROSS JOIN geoinsight_fee_definitions gfd
WHERE l.status = 'published'
  AND l.price IS NOT NULL
  AND l.price > 0
  AND gfd.code = 'LISTING_FEE'
  AND gfd.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM geoinsight_income_records gir
    WHERE gir.related_listing_id = l.id
      AND gir.fee_definition_id = gfd.id
  );