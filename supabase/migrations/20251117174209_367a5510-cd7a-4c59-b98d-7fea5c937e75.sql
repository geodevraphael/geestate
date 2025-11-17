-- Add branding and landing page fields to institutional_sellers
ALTER TABLE public.institutional_sellers
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS about_company text,
ADD COLUMN IF NOT EXISTS mission_statement text,
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS year_established integer,
ADD COLUMN IF NOT EXISTS total_employees integer,
ADD COLUMN IF NOT EXISTS service_areas text[],
ADD COLUMN IF NOT EXISTS certifications text[],
ADD COLUMN IF NOT EXISTS social_media jsonb;

-- Create function to generate slug from institution name
CREATE OR REPLACE FUNCTION generate_institution_slug(institution_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(institution_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  final_slug := base_slug;
  
  -- Check for uniqueness and append number if needed
  WHILE EXISTS (SELECT 1 FROM public.institutional_sellers WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Trigger to auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION set_institution_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_institution_slug(NEW.institution_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_institution_slug ON public.institutional_sellers;
CREATE TRIGGER trigger_set_institution_slug
  BEFORE INSERT OR UPDATE OF institution_name
  ON public.institutional_sellers
  FOR EACH ROW
  EXECUTE FUNCTION set_institution_slug();

-- Generate slugs for existing records
UPDATE public.institutional_sellers
SET slug = generate_institution_slug(institution_name)
WHERE slug IS NULL;