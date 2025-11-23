-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT CHECK (project_type IN ('residential', 'commercial', 'mixed', 'industrial', 'agricultural')),
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'archived')),
  total_area_m2 NUMERIC,
  total_plots INTEGER DEFAULT 0,
  start_date DATE,
  completion_date DATE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Add project_id to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS project_id UUID,
ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_listings_project_id ON public.listings(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);

-- Enable RLS on projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects"
  ON public.projects
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects
  FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can view all projects"
  ON public.projects
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view projects with published listings"
  ON public.projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.project_id = projects.id
      AND listings.status = 'published'
    )
  );

-- Create trigger to update project stats
CREATE OR REPLACE FUNCTION update_project_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.projects
    SET 
      total_plots = (
        SELECT COUNT(*) 
        FROM public.listings 
        WHERE project_id = NEW.project_id
      ),
      total_area_m2 = (
        SELECT COALESCE(SUM(lp.area_m2), 0)
        FROM public.listings l
        LEFT JOIN public.listing_polygons lp ON l.id = lp.listing_id
        WHERE l.project_id = NEW.project_id
      ),
      updated_at = NOW()
    WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects
    SET 
      total_plots = (
        SELECT COUNT(*) 
        FROM public.listings 
        WHERE project_id = OLD.project_id
      ),
      total_area_m2 = (
        SELECT COALESCE(SUM(lp.area_m2), 0)
        FROM public.listings l
        LEFT JOIN public.listing_polygons lp ON l.id = lp.listing_id
        WHERE l.project_id = OLD.project_id
      ),
      updated_at = NOW()
    WHERE id = OLD.project_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_project_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION update_project_stats();

-- Trigger for updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();