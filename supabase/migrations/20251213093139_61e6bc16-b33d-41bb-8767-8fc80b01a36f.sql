-- Update LISTING_FEE to be percentage-based (0.1% of selling price)
UPDATE geoinsight_fee_definitions 
SET fee_type = 'percentage', 
    percentage_rate = 0.001, 
    fixed_amount = NULL,
    description = 'Fee charged at 0.1% of the property selling price when published',
    updated_at = now()
WHERE code = 'LISTING_FEE';