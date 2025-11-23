-- Add fields to track listing deletion workflow
ALTER TABLE listings
ADD COLUMN deletion_warning_sent_at timestamp with time zone,
ADD COLUMN republish_requested_at timestamp with time zone,
ADD COLUMN pending_deletion boolean DEFAULT false;

-- Create index for efficient querying of old listings
CREATE INDEX idx_listings_created_at ON listings(created_at);
CREATE INDEX idx_listings_pending_deletion ON listings(pending_deletion) WHERE pending_deletion = true;