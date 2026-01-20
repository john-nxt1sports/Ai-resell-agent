-- =====================================================
-- SUPABASE STORAGE SETUP FOR LISTING IMAGES
-- =====================================================
-- Run this in your Supabase SQL Editor after creating the storage bucket
-- This sets up policies and configurations for image uploads

-- =====================================================
-- 1. CREATE STORAGE BUCKET (if not exists)
-- =====================================================
-- Note: You need to create the bucket in Supabase Dashboard first:
-- 1. Go to Storage section
-- 2. Create new bucket named "listing-images"
-- 3. Set it to PUBLIC
-- 4. Then run this SQL

-- =====================================================
-- 2. STORAGE POLICIES
-- =====================================================

-- Allow authenticated users to upload images to their own folder
CREATE POLICY "Users can upload images to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own images
CREATE POLICY "Users can read their own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'listing-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public to read all images (for marketplace display)
CREATE POLICY "Public can read all images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listing-images');

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'listing-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- 3. ADD IMAGE_PATHS COLUMN TO LISTINGS TABLE
-- =====================================================
-- Store both URLs and paths for easier deletion

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS image_paths TEXT[];

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_listings_user_id 
ON public.listings(user_id);

CREATE INDEX IF NOT EXISTS idx_listings_created_at 
ON public.listings(created_at DESC);

-- =====================================================
-- 4. CREATE FUNCTION TO CLEAN UP ORPHANED IMAGES
-- =====================================================
-- This function will delete images that are no longer associated with any listing

CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  orphaned_paths TEXT[];
BEGIN
  -- Find all storage paths from listings
  -- Compare with actual storage objects
  -- Delete orphaned ones
  -- This is a placeholder for future implementation
  RAISE NOTICE 'Orphaned image cleanup would run here';
END;
$$;

-- =====================================================
-- 5. CREATE TRIGGER TO DELETE IMAGES WHEN LISTING IS DELETED
-- =====================================================

CREATE OR REPLACE FUNCTION delete_listing_images()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete associated images from storage
  IF OLD.image_paths IS NOT NULL AND array_length(OLD.image_paths, 1) > 0 THEN
    -- Note: This requires a separate Cloud Function or Edge Function
    -- to actually delete from storage, as SQL can't directly call storage API
    RAISE NOTICE 'Would delete images: %', OLD.image_paths;
  END IF;
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_listing_delete
BEFORE DELETE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION delete_listing_images();

-- =====================================================
-- 6. ADD STORAGE USAGE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.storage_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_size_bytes BIGINT DEFAULT 0,
  image_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create function to update storage usage
CREATE OR REPLACE FUNCTION update_storage_usage(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This would calculate actual storage usage
  -- For now, it's a placeholder
  INSERT INTO public.storage_usage (user_id, last_calculated_at)
  VALUES (p_user_id, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET last_calculated_at = NOW();
END;
$$;

-- =====================================================
-- NOTES FOR PRODUCTION
-- =====================================================
-- 1. Set file size limits in Supabase Dashboard (recommended: 5MB per file)
-- 2. Set allowed MIME types: image/jpeg, image/png, image/webp, image/gif
-- 3. Enable automatic image optimization in Supabase (if available in your plan)
-- 4. Set up backup/retention policies
-- 5. Monitor storage usage and costs
-- 6. Consider implementing CDN caching for frequently accessed images
