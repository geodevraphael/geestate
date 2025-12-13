-- Create geoinsight-proofs storage bucket for payment proof uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('geoinsight-proofs', 'geoinsight-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'geoinsight-proofs' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own proofs
CREATE POLICY "Users can view their own proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'geoinsight-proofs' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all proofs
CREATE POLICY "Admins can view all proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'geoinsight-proofs' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'compliance_officer')
  )
);

-- Public read access for proof files (needed for displaying in admin panel)
CREATE POLICY "Public can view geoinsight proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'geoinsight-proofs');