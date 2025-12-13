-- Add ban columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES public.profiles(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ban_reason text DEFAULT NULL;

-- Create index for efficient banned user queries
CREATE INDEX IF NOT EXISTS idx_profiles_banned_at ON public.profiles(banned_at) WHERE banned_at IS NOT NULL;