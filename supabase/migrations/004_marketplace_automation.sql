-- Marketplace Credentials Table
-- Stores encrypted user credentials for various marketplaces

CREATE TABLE IF NOT EXISTS marketplace_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL CHECK (marketplace IN ('poshmark', 'mercari', 'ebay', 'depop', 'facebook', 'grailed')),
  email TEXT,
  username TEXT,
  password TEXT, -- Optional: Only if user provides manual credentials
  cookies TEXT NOT NULL, -- Serialized session cookies (captured from logged-in browser)
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One credential per user per marketplace
  UNIQUE(user_id, marketplace)
);

-- Index for fast lookups
CREATE INDEX idx_marketplace_credentials_user ON marketplace_credentials(user_id);
CREATE INDEX idx_marketplace_credentials_active ON marketplace_credentials(user_id, is_active);

-- RLS Policies
ALTER TABLE marketplace_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credentials"
  ON marketplace_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials"
  ON marketplace_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
  ON marketplace_credentials
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials"
  ON marketplace_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- Listing Job Results Table
-- Tracks automation results for each marketplace

CREATE TABLE IF NOT EXISTS listing_automation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  job_id TEXT NOT NULL, -- Bull job ID
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  external_listing_id TEXT, -- Marketplace-specific listing ID
  external_url TEXT, -- Public URL on marketplace
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_listing_automation_results_listing ON listing_automation_results(listing_id);
CREATE INDEX idx_listing_automation_results_user ON listing_automation_results(user_id);
CREATE INDEX idx_listing_automation_results_job ON listing_automation_results(job_id);
CREATE INDEX idx_listing_automation_results_status ON listing_automation_results(status);

-- RLS Policies
ALTER TABLE listing_automation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own automation results"
  ON listing_automation_results
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own automation results"
  ON listing_automation_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own automation results"
  ON listing_automation_results
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add marketplace-specific columns to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS poshmark_listing_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS poshmark_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS poshmark_posted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS mercari_listing_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS mercari_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS mercari_posted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_listing_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_posted_at TIMESTAMP WITH TIME ZONE;

-- Add size and color columns to listings (marketplace requirements)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS color TEXT;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_marketplace_credentials_updated_at
  BEFORE UPDATE ON marketplace_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listing_automation_results_updated_at
  BEFORE UPDATE ON listing_automation_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (if needed)
GRANT ALL ON marketplace_credentials TO authenticated;
GRANT ALL ON listing_automation_results TO authenticated;
