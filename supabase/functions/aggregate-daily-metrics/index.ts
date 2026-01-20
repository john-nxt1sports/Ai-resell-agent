/**
 * Supabase Edge Function: Aggregate Daily Metrics
 *
 * This function runs daily (via cron) to:
 * 1. Aggregate yesterday's analytics events into daily_metrics table
 * 2. Refresh the materialized view mv_user_analytics_summary
 * 3. Clean up old analytics events (optional)
 *
 * Schedule: Run daily at 1:00 AM UTC
 * Cron: 0 1 * * *
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AggregationResult {
  success: boolean;
  date: string;
  usersProcessed: number;
  eventsProcessed: number;
  duration: number;
  errors: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const result: AggregationResult = {
    success: false,
    date: "",
    usersProcessed: 0,
    eventsProcessed: 0,
    duration: 0,
    errors: [],
  };

  try {
    // Get Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse date from request (default to yesterday)
    const { date } = await req.json().catch(() => ({}));
    const targetDate = date || getYesterday();
    result.date = targetDate;

    console.log(`Starting daily metrics aggregation for date: ${targetDate}`);

    // Step 1: Aggregate daily metrics
    console.log("Step 1: Aggregating daily metrics...");
    const { error: aggregateError } = await supabase.rpc(
      "aggregate_daily_metrics",
      {
        p_date: targetDate,
      }
    );

    if (aggregateError) {
      result.errors.push(`Aggregation error: ${aggregateError.message}`);
      throw aggregateError;
    }

    // Step 2: Get count of events processed
    const { count: eventCount, error: countError } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${targetDate}T00:00:00Z`)
      .lt("created_at", `${getNextDay(targetDate)}T00:00:00Z`);

    if (countError) {
      result.errors.push(`Count error: ${countError.message}`);
    } else {
      result.eventsProcessed = eventCount || 0;
    }

    // Step 3: Get count of users processed
    const { data: metricsData, error: metricsError } = await supabase
      .from("daily_metrics")
      .select("user_id")
      .eq("date", targetDate);

    if (metricsError) {
      result.errors.push(`Metrics query error: ${metricsError.message}`);
    } else {
      result.usersProcessed = metricsData?.length || 0;
    }

    // Step 4: Refresh materialized view
    console.log("Step 2: Refreshing materialized view...");
    const { error: refreshError } = await supabase.rpc(
      "refresh_materialized_views"
    );

    if (refreshError) {
      // This might fail if function doesn't exist, which is okay
      console.log(
        "Materialized view refresh skipped or failed:",
        refreshError.message
      );
    }

    // Step 5: Optional cleanup of old events (keep last 365 days)
    const cleanupEnabled = Deno.env.get("CLEANUP_OLD_EVENTS") === "true";
    if (cleanupEnabled) {
      console.log("Step 3: Cleaning up old events...");
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 365);

      const { error: cleanupError } = await supabase
        .from("analytics_events")
        .delete()
        .lt("created_at", cutoffDate.toISOString());

      if (cleanupError) {
        result.errors.push(`Cleanup error: ${cleanupError.message}`);
      }
    }

    result.success = result.errors.length === 0;
    result.duration = Date.now() - startTime;

    console.log("Aggregation complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.success ? 200 : 207, // 207 = Multi-Status (partial success)
    });
  } catch (error) {
    console.error("Fatal error during aggregation:", error);

    result.success = false;
    result.duration = Date.now() - startTime;
    result.errors.push(error.message);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

/**
 * Get next day's date in YYYY-MM-DD format
 */
function getNextDay(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}
