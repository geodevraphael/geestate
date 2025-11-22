-- Allow direct messages not tied to a listing
ALTER TABLE public.messages
ALTER COLUMN listing_id DROP NOT NULL;