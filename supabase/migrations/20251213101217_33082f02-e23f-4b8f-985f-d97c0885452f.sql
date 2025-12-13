-- Create listing fee for Thabiti's Property in Dodoma
INSERT INTO geoinsight_income_records (
  user_id,
  fee_definition_id,
  related_listing_id,
  description,
  amount_due,
  currency,
  status,
  due_date
) VALUES (
  'dff85c07-8868-441b-8c37-478598e39a9e', -- Thabiti
  '868a066b-b24e-4e11-acd1-8421b119a728', -- LISTING_FEE definition
  '0ccd38d2-b938-4574-b215-85482b73055f', -- Property in Dodoma
  'Listing fee (0.1%) for: Property in Dodoma',
  5000.00, -- 0.1% of 5,000,000 TZS
  'TZS',
  'pending',
  NOW() + INTERVAL '30 days'
);