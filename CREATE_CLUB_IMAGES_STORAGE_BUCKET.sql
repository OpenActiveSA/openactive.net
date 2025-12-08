-- ============================================================================
-- Create Club Images Storage Bucket
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ============================================================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-images',
  'club-images',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload club images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update club images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view club images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete club images" ON storage.objects;

-- Set up storage policies for authenticated users
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload club images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'club-images');

-- Allow authenticated users to update their own club images
CREATE POLICY "Authenticated users can update club images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'club-images');

-- Allow public read access (since bucket is public)
CREATE POLICY "Public can view club images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'club-images');

-- Allow authenticated users to delete club images
CREATE POLICY "Authenticated users can delete club images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'club-images');


