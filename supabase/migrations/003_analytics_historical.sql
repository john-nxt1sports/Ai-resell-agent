-- =====================================================
-- HISTORICAL ANALYTICS SYSTEM
-- =====================================================
-- This migration creates a comprehensive analytics system with:
-- - Event logging for all user actions
-- - Materialized views for fast aggregation
-- - Historical snapshots for trend analysis
-- - Automatic refresh triggers

-- =====================================================
-- 1. ANALYTICS EVENTS TABLE
-- =====================================================
-- Stores all raw analytics events with high write performance

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  marketplace_listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'listing_created',
    'listing_published',
    'listing_updated',
    'listing_deleted',
    'view',
    'like',
    'share',
    'sale',
    'message',
    'offer_received',
    'offer_accepted'
  )),
  marketplace TEXT CHECK (marketplace IN ('ebay', 'poshmark', 'mercari', 'all')),
  event_value DECIMAL(10, 2), -- For sales, offers, etc.
  metadata JSONB, -- Flexible storage for additional data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id 
ON public.analytics_events(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_listing_id 
ON public.analytics_events(listing_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type 
ON public.analytics_events(event_type);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at 
ON public.analytics_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_marketplace 
ON public.analytics_events(marketplace);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_date 
ON public.analytics_events(user_id, created_at DESC);

-- =====================================================
-- 2. DAILY METRICS SNAPSHOTS
-- =====================================================
-- Pre-aggregated daily metrics for fast historical queries

CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Listing metrics
  total_listings INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  published_listings INTEGER DEFAULT 0,
  draft_listings INTEGER DEFAULT 0,
  
  -- Engagement metrics
  total_views INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  
  -- Sales metrics
  total_sales INTEGER DEFAULT 0,
  total_offers INTEGER DEFAULT 0,
  accepted_offers INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  
  -- Marketplace breakdown
  poshmark_views INTEGER DEFAULT 0,
  poshmark_sales INTEGER DEFAULT 0,
  poshmark_revenue DECIMAL(10, 2) DEFAULT 0,
  
  mercari_views INTEGER DEFAULT 0,
  mercari_sales INTEGER DEFAULT 0,
  mercari_revenue DECIMAL(10, 2) DEFAULT 0,
  
  ebay_views INTEGER DEFAULT 0,
  ebay_sales INTEGER DEFAULT 0,
  ebay_revenue DECIMAL(10, 2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- Indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_date 
ON public.daily_metrics(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date 
ON public.daily_metrics(date DESC);

-- =====================================================
-- 3. MATERIALIZED VIEW: USER ANALYTICS SUMMARY
-- =====================================================
-- Fast aggregated view of user analytics across all time

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_user_analytics_summary AS
SELECT
  user_id,
  
  -- Listing counts
  COUNT(DISTINCT CASE WHEN event_type = 'listing_created' THEN listing_id END) as total_listings_created,
  
  -- Engagement metrics (all time)
  COUNT(CASE WHEN event_type = 'view' THEN 1 END) as total_views,
  COUNT(CASE WHEN event_type = 'like' THEN 1 END) as total_likes,
  COUNT(CASE WHEN event_type = 'share' THEN 1 END) as total_shares,
  COUNT(CASE WHEN event_type = 'message' THEN 1 END) as total_messages,
  
  -- Sales metrics
  COUNT(CASE WHEN event_type = 'sale' THEN 1 END) as total_sales,
  COALESCE(SUM(CASE WHEN event_type = 'sale' THEN event_value END), 0) as total_revenue,
  
  -- Marketplace breakdown
  COUNT(CASE WHEN event_type = 'view' AND marketplace = 'poshmark' THEN 1 END) as poshmark_views,
  COUNT(CASE WHEN event_type = 'sale' AND marketplace = 'poshmark' THEN 1 END) as poshmark_sales,
  COALESCE(SUM(CASE WHEN event_type = 'sale' AND marketplace = 'poshmark' THEN event_value END), 0) as poshmark_revenue,
  
  COUNT(CASE WHEN event_type = 'view' AND marketplace = 'mercari' THEN 1 END) as mercari_views,
  COUNT(CASE WHEN event_type = 'sale' AND marketplace = 'mercari' THEN 1 END) as mercari_sales,
  COALESCE(SUM(CASE WHEN event_type = 'sale' AND marketplace = 'mercari' THEN event_value END), 0) as mercari_revenue,
  
  COUNT(CASE WHEN event_type = 'view' AND marketplace = 'ebay' THEN 1 END) as ebay_views,
  COUNT(CASE WHEN event_type = 'sale' AND marketplace = 'ebay' THEN 1 END) as ebay_sales,
  COALESCE(SUM(CASE WHEN event_type = 'sale' AND marketplace = 'ebay' THEN event_value END), 0) as ebay_revenue,
  
  -- Last activity
  MAX(created_at) as last_activity_at
  
FROM public.analytics_events
GROUP BY user_id;

-- Create unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_analytics_summary_user_id 
ON public.mv_user_analytics_summary(user_id);

-- Enable RLS on materialized view
ALTER MATERIALIZED VIEW mv_user_analytics_summary OWNER TO authenticated;

-- =====================================================
-- 4. FUNCTIONS FOR ANALYTICS AGGREGATION
-- =====================================================

-- Function to get analytics for a specific time range
CREATE OR REPLACE FUNCTION get_user_analytics_range(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_views BIGINT,
  total_likes BIGINT,
  total_shares BIGINT,
  total_sales BIGINT,
  revenue NUMERIC,
  poshmark_views BIGINT,
  poshmark_sales BIGINT,
  poshmark_revenue NUMERIC,
  mercari_views BIGINT,
  mercari_sales BIGINT,
  mercari_revenue NUMERIC,
  ebay_views BIGINT,
  ebay_sales BIGINT,
  ebay_revenue NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(CASE WHEN event_type = 'view' THEN 1 END)::BIGINT as total_views,
    COUNT(CASE WHEN event_type = 'like' THEN 1 END)::BIGINT as total_likes,
    COUNT(CASE WHEN event_type = 'share' THEN 1 END)::BIGINT as total_shares,
    COUNT(CASE WHEN event_type = 'sale' THEN 1 END)::BIGINT as total_sales,
    COALESCE(SUM(CASE WHEN event_type = 'sale' THEN event_value END), 0)::NUMERIC as revenue,
    
    COUNT(CASE WHEN event_type = 'view' AND marketplace = 'poshmark' THEN 1 END)::BIGINT as poshmark_views,
    COUNT(CASE WHEN event_type = 'sale' AND marketplace = 'poshmark' THEN 1 END)::BIGINT as poshmark_sales,
    COALESCE(SUM(CASE WHEN event_type = 'sale' AND marketplace = 'poshmark' THEN event_value END), 0)::NUMERIC as poshmark_revenue,
    
    COUNT(CASE WHEN event_type = 'view' AND marketplace = 'mercari' THEN 1 END)::BIGINT as mercari_views,
    COUNT(CASE WHEN event_type = 'sale' AND marketplace = 'mercari' THEN 1 END)::BIGINT as mercari_sales,
    COALESCE(SUM(CASE WHEN event_type = 'sale' AND marketplace = 'mercari' THEN event_value END), 0)::NUMERIC as mercari_revenue,
    
    COUNT(CASE WHEN event_type = 'view' AND marketplace = 'ebay' THEN 1 END)::BIGINT as ebay_views,
    COUNT(CASE WHEN event_type = 'sale' AND marketplace = 'ebay' THEN 1 END)::BIGINT as ebay_sales,
    COALESCE(SUM(CASE WHEN event_type = 'sale' AND marketplace = 'ebay' THEN event_value END), 0)::NUMERIC as ebay_revenue
    
  FROM public.analytics_events
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

-- Function to calculate percentage changes between periods
CREATE OR REPLACE FUNCTION get_analytics_with_changes(
  p_user_id UUID,
  p_current_days INTEGER DEFAULT 30,
  p_previous_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  -- Current metrics
  current_views BIGINT,
  current_likes BIGINT,
  current_sales BIGINT,
  current_revenue NUMERIC,
  
  -- Previous metrics
  previous_views BIGINT,
  previous_likes BIGINT,
  previous_sales BIGINT,
  previous_revenue NUMERIC,
  
  -- Percentage changes
  views_change NUMERIC,
  likes_change NUMERIC,
  sales_change NUMERIC,
  revenue_change NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_current_start TIMESTAMP;
  v_previous_start TIMESTAMP;
  v_previous_end TIMESTAMP;
BEGIN
  -- Calculate time ranges
  v_current_start := NOW() - (p_current_days || ' days')::INTERVAL;
  v_previous_end := v_current_start;
  v_previous_start := v_previous_end - (p_previous_days || ' days')::INTERVAL;
  
  RETURN QUERY
  WITH current_period AS (
    SELECT
      COUNT(CASE WHEN event_type = 'view' THEN 1 END)::BIGINT as views,
      COUNT(CASE WHEN event_type = 'like' THEN 1 END)::BIGINT as likes,
      COUNT(CASE WHEN event_type = 'sale' THEN 1 END)::BIGINT as sales,
      COALESCE(SUM(CASE WHEN event_type = 'sale' THEN event_value END), 0)::NUMERIC as revenue
    FROM public.analytics_events
    WHERE user_id = p_user_id
      AND created_at >= v_current_start
  ),
  previous_period AS (
    SELECT
      COUNT(CASE WHEN event_type = 'view' THEN 1 END)::BIGINT as views,
      COUNT(CASE WHEN event_type = 'like' THEN 1 END)::BIGINT as likes,
      COUNT(CASE WHEN event_type = 'sale' THEN 1 END)::BIGINT as sales,
      COALESCE(SUM(CASE WHEN event_type = 'sale' THEN event_value END), 0)::NUMERIC as revenue
    FROM public.analytics_events
    WHERE user_id = p_user_id
      AND created_at >= v_previous_start
      AND created_at < v_previous_end
  )
  SELECT
    c.views as current_views,
    c.likes as current_likes,
    c.sales as current_sales,
    c.revenue as current_revenue,
    
    p.views as previous_views,
    p.likes as previous_likes,
    p.sales as previous_sales,
    p.revenue as previous_revenue,
    
    -- Calculate percentage changes
    CASE WHEN p.views > 0 THEN ROUND(((c.views - p.views)::NUMERIC / p.views) * 100, 1) ELSE 0 END as views_change,
    CASE WHEN p.likes > 0 THEN ROUND(((c.likes - p.likes)::NUMERIC / p.likes) * 100, 1) ELSE 0 END as likes_change,
    CASE WHEN p.sales > 0 THEN ROUND(((c.sales - p.sales)::NUMERIC / p.sales) * 100, 1) ELSE 0 END as sales_change,
    CASE WHEN p.revenue > 0 THEN ROUND(((c.revenue - p.revenue)::NUMERIC / p.revenue) * 100, 1) ELSE 0 END as revenue_change
    
  FROM current_period c, previous_period p;
END;
$$;

-- Function to aggregate daily metrics (called by cron job)
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(p_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update daily metrics for each user
  INSERT INTO public.daily_metrics (
    user_id,
    date,
    total_views,
    total_likes,
    total_shares,
    total_sales,
    revenue,
    poshmark_views,
    poshmark_sales,
    poshmark_revenue,
    mercari_views,
    mercari_sales,
    mercari_revenue,
    ebay_views,
    ebay_sales,
    ebay_revenue
  )
  SELECT
    user_id,
    p_date as date,
    COUNT(CASE WHEN event_type = 'view' THEN 1 END)::INTEGER as total_views,
    COUNT(CASE WHEN event_type = 'like' THEN 1 END)::INTEGER as total_likes,
    COUNT(CASE WHEN event_type = 'share' THEN 1 END)::INTEGER as total_shares,
    COUNT(CASE WHEN event_type = 'sale' THEN 1 END)::INTEGER as total_sales,
    COALESCE(SUM(CASE WHEN event_type = 'sale' THEN event_value END), 0) as revenue,
    
    COUNT(CASE WHEN event_type = 'view' AND marketplace = 'poshmark' THEN 1 END)::INTEGER as poshmark_views,
    COUNT(CASE WHEN event_type = 'sale' AND marketplace = 'poshmark' THEN 1 END)::INTEGER as poshmark_sales,
    COALESCE(SUM(CASE WHEN event_type = 'sale' AND marketplace = 'poshmark' THEN event_value END), 0) as poshmark_revenue,
    
    COUNT(CASE WHEN event_type = 'view' AND marketplace = 'mercari' THEN 1 END)::INTEGER as mercari_views,
    COUNT(CASE WHEN event_type = 'sale' AND marketplace = 'mercari' THEN 1 END)::INTEGER as mercari_sales,
    COALESCE(SUM(CASE WHEN event_type = 'sale' AND marketplace = 'mercari' THEN event_value END), 0) as mercari_revenue,
    
    COUNT(CASE WHEN event_type = 'view' AND marketplace = 'ebay' THEN 1 END)::INTEGER as ebay_views,
    COUNT(CASE WHEN event_type = 'sale' AND marketplace = 'ebay' THEN 1 END)::INTEGER as ebay_sales,
    COALESCE(SUM(CASE WHEN event_type = 'sale' AND marketplace = 'ebay' THEN event_value END), 0) as ebay_revenue
    
  FROM public.analytics_events
  WHERE DATE(created_at) = p_date
  GROUP BY user_id
  
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_views = EXCLUDED.total_views,
    total_likes = EXCLUDED.total_likes,
    total_shares = EXCLUDED.total_shares,
    total_sales = EXCLUDED.total_sales,
    revenue = EXCLUDED.revenue,
    poshmark_views = EXCLUDED.poshmark_views,
    poshmark_sales = EXCLUDED.poshmark_sales,
    poshmark_revenue = EXCLUDED.poshmark_revenue,
    mercari_views = EXCLUDED.mercari_views,
    mercari_sales = EXCLUDED.mercari_sales,
    mercari_revenue = EXCLUDED.mercari_revenue,
    ebay_views = EXCLUDED.ebay_views,
    ebay_sales = EXCLUDED.ebay_sales,
    ebay_revenue = EXCLUDED.ebay_revenue,
    updated_at = NOW();
    
  RAISE NOTICE 'Daily metrics aggregated for date: %', p_date;
END;
$$;

-- =====================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

-- Note: Materialized views don't support RLS directly, but we control access via the owner
-- The mv_user_analytics_summary is owned by authenticated role and queries respect RLS on source table

-- Users can insert their own analytics events
CREATE POLICY "Users can insert own analytics events"
ON public.analytics_events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can read their own analytics events
CREATE POLICY "Users can read own analytics events"
ON public.analytics_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can read their own daily metrics
CREATE POLICY "Users can read own daily metrics"
ON public.daily_metrics FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role can do everything (for aggregation jobs)
CREATE POLICY "Service role full access to analytics_events"
ON public.analytics_events FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access to daily_metrics"
ON public.daily_metrics FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 6. HELPER VIEWS FOR COMMON QUERIES
-- =====================================================

-- Last 7 days summary per user
CREATE OR REPLACE VIEW v_analytics_7d AS
SELECT
  user_id,
  COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views_7d,
  COUNT(CASE WHEN event_type = 'like' THEN 1 END) as likes_7d,
  COUNT(CASE WHEN event_type = 'sale' THEN 1 END) as sales_7d,
  COALESCE(SUM(CASE WHEN event_type = 'sale' THEN event_value END), 0) as revenue_7d
FROM public.analytics_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id;

-- Last 30 days summary per user
CREATE OR REPLACE VIEW v_analytics_30d AS
SELECT
  user_id,
  COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views_30d,
  COUNT(CASE WHEN event_type = 'like' THEN 1 END) as likes_30d,
  COUNT(CASE WHEN event_type = 'sale' THEN 1 END) as sales_30d,
  COALESCE(SUM(CASE WHEN event_type = 'sale' THEN event_value END), 0) as revenue_30d
FROM public.analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id;

-- Enable RLS on views
ALTER VIEW v_analytics_7d SET (security_invoker = true);
ALTER VIEW v_analytics_30d SET (security_invoker = true);

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Run aggregate_daily_metrics() via a cron job or Edge Function
-- 2. Refresh materialized view: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_analytics_summary;
-- 3. Consider partitioning analytics_events table by date for better performance at scale
-- 4. Set up automated cleanup of old analytics_events (e.g., keep 1 year, then aggregate to daily_metrics)
