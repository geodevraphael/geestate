-- Fix search path for update_proximity_analysis_updated_at function
CREATE OR REPLACE FUNCTION public.update_proximity_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;