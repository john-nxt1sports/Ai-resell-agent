-- =====================================================
-- ADD MARKETPLACE CREDENTIALS TABLE
-- Migration: 001
-- =====================================================
-- This table stores encrypted marketplace credentials for browser automation

CREATE TABLE IF NOT EXISTS public.marketplace_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  marketplace TEXT NOT NULL CHECK (marketplace IN ('ebay', 'poshmark', 'mercari', 'depop')),
  username TEXT,
  password_encrypted TEXT,
  cookies JSONB,
  session_data JSONB,
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, marketplace)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_marketplace_credentials_user_id ON public.marketplace_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_credentials_marketplace ON public.marketplace_credentials(marketplace);

-- Enable Row Level Security
ALTER TABLE public.marketplace_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_credentials
CREATE POLICY "Users can view own marketplace credentials" 
  ON public.marketplace_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own marketplace credentials"
  ON public.marketplace_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own marketplace credentials"
  ON public.marketplace_credentials
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own marketplace credentials"
  ON public.marketplace_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketplace_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketplace_credentials_updated_at
  BEFORE UPDATE ON public.marketplace_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_credentials_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_credentials TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
