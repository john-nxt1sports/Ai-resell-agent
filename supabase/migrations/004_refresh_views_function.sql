-- Helper function to refresh materialized views
-- This is called by the Edge Function

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh the user analytics summary view
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_analytics_summary;
  
  RAISE NOTICE 'Materialized views refreshed successfully';
END;
$$;
