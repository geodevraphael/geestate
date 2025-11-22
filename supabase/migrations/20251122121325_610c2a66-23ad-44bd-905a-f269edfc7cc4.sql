-- Add Tanzania land parcel specific fields to listings table
ALTER TABLE public.listings
ADD COLUMN block_number text,
ADD COLUMN plot_number text,
ADD COLUMN street_name text,
ADD COLUMN planned_use text,
ADD COLUMN has_title boolean DEFAULT false;

-- Add index for searching by plot number
CREATE INDEX idx_listings_plot_number ON public.listings(plot_number);

-- Add index for searching by block number
CREATE INDEX idx_listings_block_number ON public.listings(block_number);

COMMENT ON COLUMN public.listings.block_number IS 'Block number for Tanzania land parcels';
COMMENT ON COLUMN public.listings.plot_number IS 'Plot number for Tanzania land parcels';
COMMENT ON COLUMN public.listings.street_name IS 'Street name or locality';
COMMENT ON COLUMN public.listings.planned_use IS 'Planned use of the land parcel';
COMMENT ON COLUMN public.listings.has_title IS 'Indicates if plot has legal title (true) or not (false)';