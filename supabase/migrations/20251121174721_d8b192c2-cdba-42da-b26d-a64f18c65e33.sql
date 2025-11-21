-- Add unique constraint to proximity_analysis table for upsert operations
ALTER TABLE proximity_analysis ADD CONSTRAINT proximity_analysis_listing_id_key UNIQUE (listing_id);