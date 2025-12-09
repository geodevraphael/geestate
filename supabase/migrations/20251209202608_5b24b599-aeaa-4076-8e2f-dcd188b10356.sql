-- Add electricity and water availability columns to listings
ALTER TABLE public.listings 
ADD COLUMN has_electricity boolean DEFAULT NULL,
ADD COLUMN has_water boolean DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.listings.has_electricity IS 'Indicates electricity availability: true (1) = available, false (0) = not available, null = unknown';
COMMENT ON COLUMN public.listings.has_water IS 'Indicates water availability: true (1) = available, false (0) = not available, null = unknown';

-- Update existing listings with some dummy data for trials
UPDATE public.listings 
SET 
  has_electricity = CASE 
    WHEN random() > 0.4 THEN true 
    ELSE false 
  END,
  has_water = CASE 
    WHEN random() > 0.5 THEN true 
    ELSE false 
  END
WHERE status = 'published';