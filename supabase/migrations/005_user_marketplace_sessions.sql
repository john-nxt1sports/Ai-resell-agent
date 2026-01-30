-- User Marketplace Sessions Table (2026 Best Practices)
-- Stores encrypted session data for marketplace authentication
-- Enables Vendoo-style hybrid architecture with cloud browsers

CREATE TABLE IF NOT EXISTS user_marketplace_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL CHECK (marketplace IN ('poshmark', 'mercari', 'ebay', 'depop', 'facebook', 'grailed')),
  
  -- Encrypted session data (AES-256-GCM)
  encrypted_cookies TEXT NOT NULL,
  encrypted_storage TEXT, -- localStorage + sessionStorage
  
  -- Cloud browser profile integration
  browser_profile_id TEXT NOT NULL, -- ID for browser-use cloud profile
  
  -- Session metadata
  last_validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Sessions expire after 7 days by default
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One session per user per marketplace
  UNIQUE(user_id, marketplace)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_marketplace_sessions_user 
  ON user_marketplace_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_marketplace_sessions_marketplace 
  ON user_marketplace_sessions(user_id, marketplace);

CREATE INDEX IF NOT EXISTS idx_user_marketplace_sessions_expires 
  ON user_marketplace_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_marketplace_sessions_profile 
  ON user_marketplace_sessions(browser_profile_id);

-- RLS Policies
ALTER TABLE user_marketplace_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON user_marketplace_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON user_marketplace_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON user_marketplace_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON user_marketplace_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_marketplace_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_user_marketplace_sessions_timestamp
  BEFORE UPDATE ON user_marketplace_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_marketplace_sessions_updated_at();

-- Function to clean up expired sessions (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_marketplace_sessions
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON user_marketplace_sessions TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE user_marketplace_sessions IS 
  'Stores encrypted marketplace session data (cookies, localStorage, sessionStorage) for autonomous cloud browser workers. Sessions are encrypted with AES-256-GCM and synced to cloud browser profiles.';

COMMENT ON COLUMN user_marketplace_sessions.encrypted_cookies IS 
  'AES-256-GCM encrypted marketplace cookies';

COMMENT ON COLUMN user_marketplace_sessions.encrypted_storage IS 
  'AES-256-GCM encrypted localStorage and sessionStorage data';

COMMENT ON COLUMN user_marketplace_sessions.browser_profile_id IS 
  'Unique identifier for browser-use cloud browser profile';
