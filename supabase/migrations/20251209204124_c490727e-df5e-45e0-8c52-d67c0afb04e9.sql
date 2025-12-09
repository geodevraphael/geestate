-- Add notification_preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"messages": true, "listings": true, "verification": true, "payment": true, "visits": true, "disputes": true, "system": true, "push_enabled": false}'::jsonb;