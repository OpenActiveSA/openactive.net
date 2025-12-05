# Setup Club Images Storage Bucket

This guide explains how to set up the Supabase Storage bucket for club background images.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `club-images`
   - **Public bucket**: ✅ **Enable** (so images can be accessed via public URLs)
   - **File size limit**: 5MB (or your preferred limit)
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`
5. Click **Create bucket**

## Option 2: Using SQL (Alternative)

Run this SQL in the Supabase SQL Editor:

```sql
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-images',
  'club-images',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

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
```

## Verify Setup

After creating the bucket, you can verify it's working by:

1. Going to **Storage** > **club-images** in the Supabase dashboard
2. Try uploading a test image manually
3. Check that the image has a public URL

## Notes

- The bucket must be **public** for the images to be accessible in the clubs list
- File uploads are limited to 5MB by default (configurable)
- Images are stored in the path: `clubs/{club-id}/{filename}`
- Only authenticated users (SUPER_ADMIN) can upload images through the admin interface

