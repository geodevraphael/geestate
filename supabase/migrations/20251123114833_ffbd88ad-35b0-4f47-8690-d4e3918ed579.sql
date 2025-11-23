-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage on cron schema to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule the listing expiry check to run daily at 2 AM
SELECT cron.schedule(
  'check-listing-expiry-daily',
  '0 2 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://msziurxcplegxqwooawk.supabase.co/functions/v1/check-listing-expiry',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zeml1cnhjcGxlZ3hxd29vYXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMTQ3NTUsImV4cCI6MjA3ODY5MDc1NX0.B5efBnsWSm_tRq0B1qu-XvByECd4ybPDaBseyVUHrXM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);