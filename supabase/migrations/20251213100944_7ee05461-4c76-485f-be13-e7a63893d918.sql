-- Fix the incorrectly assigned listing: transfer from Raphael Mussa to Thabiti mbiaji
-- Listing created from request ace56ddb-3437-443b-aa92-de3438069dd0

-- 1. Update the listing owner to the original requester
UPDATE listings 
SET owner_id = 'dff85c07-8868-441b-8c37-478598e39a9e' -- Thabiti mbiaji
WHERE id = '0ccd38d2-b938-4574-b215-85482b73055f' -- Property in Dodoma
AND owner_id = '559186ba-4af2-4307-88d9-22143f3de39c'; -- Currently Raphael Mussa

-- 2. Update any income records if they exist
UPDATE geoinsight_income_records 
SET user_id = 'dff85c07-8868-441b-8c37-478598e39a9e'
WHERE related_listing_id = '0ccd38d2-b938-4574-b215-85482b73055f'
AND user_id = '559186ba-4af2-4307-88d9-22143f3de39c';