/**
 * Database Service: Analytics
 * Handles all database operations for analytics and metrics
 * Updated to use historical analytics system with percentage changes
 */

import { createClient } from "@/lib/supabase/client";
import type { AnalyticsRecord, Marketplace } from "@/types";

/**
 * Record an analytics event
 */
export async function recordAnalyticsEvent(data: {
  userId: string;
  listingId: string;
  marketplace?: Marketplace;
  metricType: "view" | "like" | "share" | "sale";
  metricValue?: number;
}): Promise<{ error: Error | null }> {
  try {
    const supabase = createClient();

    const { error } = await supabase.from("analytics").insert({
      user_id: data.userId,
      listing_id: data.listingId,
      marketplace: data.marketplace || null,
      metric_type: data.metricType,
      metric_value: data.metricValue || 1,
    });

    if (error) {
      console.error("Error recording analytics:", error);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error: any) {
    console.error("Error in recordAnalyticsEvent:", error);
    return { error };
  }
}

/**
 * Get analytics for a user within a date range
 */
export async function getUserAnalytics(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ data: AnalyticsRecord[] | null; error: Error | null }> {
  try {
    const supabase = createClient();

    let query = supabase
      .from("analytics")
      .select("*")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: false });

    if (startDate) {
      query = query.gte("recorded_at", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("recorded_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching analytics:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error("Error in getUserAnalytics:", error);
    return { data: null, error };
  }
}

/**
 * Get analytics summary for dashboard
 */
export async function getAnalyticsSummary(
  userId: string,
  days: number = 30
): Promise<{
  data: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalSales: number;
    revenueGenerated: number;
    viewsByMarketplace: Record<string, number>;
    salesByMarketplace: Record<string, number>;
    dailyStats: Array<{
      date: string;
      views: number;
      likes: number;
      sales: number;
    }>;
  } | null;
  error: Error | null;
}> {
  try {
    const supabase = createClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: analytics, error } = await supabase
      .from("analytics")
      .select("*")
      .eq("user_id", userId)
      .gte("recorded_at", startDate.toISOString());

    if (error) {
      console.error("Error fetching analytics summary:", error);
      return { data: null, error: new Error(error.message) };
    }

    // Calculate totals
    const totalViews = analytics
      .filter((a) => a.metric_type === "view")
      .reduce((sum, a) => sum + a.metric_value, 0);

    const totalLikes = analytics
      .filter((a) => a.metric_type === "like")
      .reduce((sum, a) => sum + a.metric_value, 0);

    const totalShares = analytics
      .filter((a) => a.metric_type === "share")
      .reduce((sum, a) => sum + a.metric_value, 0);

    const totalSales = analytics.filter((a) => a.metric_type === "sale").length;

    const revenueGenerated = analytics
      .filter((a) => a.metric_type === "sale")
      .reduce((sum, a) => sum + a.metric_value, 0);

    // Views by marketplace
    const viewsByMarketplace: Record<string, number> = {
      poshmark: 0,
      mercari: 0,
      ebay: 0,
    };
    analytics
      .filter((a) => a.metric_type === "view" && a.marketplace)
      .forEach((a) => {
        if (a.marketplace) {
          viewsByMarketplace[a.marketplace] =
            (viewsByMarketplace[a.marketplace] || 0) + a.metric_value;
        }
      });

    // Sales by marketplace
    const salesByMarketplace: Record<string, number> = {
      poshmark: 0,
      mercari: 0,
      ebay: 0,
    };
    analytics
      .filter((a) => a.metric_type === "sale" && a.marketplace)
      .forEach((a) => {
        if (a.marketplace) {
          salesByMarketplace[a.marketplace] =
            (salesByMarketplace[a.marketplace] || 0) + 1;
        }
      });

    // Daily stats
    const dailyStatsMap: Record<
      string,
      { views: number; likes: number; sales: number }
    > = {};

    analytics.forEach((record) => {
      const date = new Date(record.recorded_at).toISOString().split("T")[0];

      if (!dailyStatsMap[date]) {
        dailyStatsMap[date] = { views: 0, likes: 0, sales: 0 };
      }

      if (record.metric_type === "view") {
        dailyStatsMap[date].views += record.metric_value;
      } else if (record.metric_type === "like") {
        dailyStatsMap[date].likes += record.metric_value;
      } else if (record.metric_type === "sale") {
        dailyStatsMap[date].sales += 1;
      }
    });

    const dailyStats = Object.entries(dailyStatsMap)
      .map(([date, stats]) => ({
        date,
        ...stats,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const summary = {
      totalViews,
      totalLikes,
      totalShares,
      totalSales,
      revenueGenerated,
      viewsByMarketplace,
      salesByMarketplace,
      dailyStats,
    };

    return { data: summary, error: null };
  } catch (error: any) {
    console.error("Error in getAnalyticsSummary:", error);
    return { data: null, error };
  }
}

/**
 * Get analytics for a specific listing
 */
export async function getListingAnalytics(listingId: string): Promise<{
  data: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    sold: boolean;
    salePrice?: number;
  } | null;
  error: Error | null;
}> {
  try {
    const supabase = createClient();

    const { data: analytics, error } = await supabase
      .from("analytics")
      .select("*")
      .eq("listing_id", listingId);

    if (error) {
      console.error("Error fetching listing analytics:", error);
      return { data: null, error: new Error(error.message) };
    }

    const totalViews = analytics
      .filter((a) => a.metric_type === "view")
      .reduce((sum, a) => sum + a.metric_value, 0);

    const totalLikes = analytics
      .filter((a) => a.metric_type === "like")
      .reduce((sum, a) => sum + a.metric_value, 0);

    const totalShares = analytics
      .filter((a) => a.metric_type === "share")
      .reduce((sum, a) => sum + a.metric_value, 0);

    const saleRecord = analytics.find((a) => a.metric_type === "sale");

    const stats = {
      totalViews,
      totalLikes,
      totalShares,
      sold: !!saleRecord,
      salePrice: saleRecord?.metric_value,
    };

    return { data: stats, error: null };
  } catch (error: any) {
    console.error("Error in getListingAnalytics:", error);
    return { data: null, error };
  }
}

/**
 * Update marketplace listing stats (views, likes)
 */
export async function updateMarketplaceStats(
  listingId: string,
  marketplace: Marketplace,
  updates: {
    views?: number;
    likes?: number;
  }
): Promise<{ error: Error | null }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from("marketplace_listings")
      .update(updates)
      .eq("listing_id", listingId)
      .eq("marketplace", marketplace);

    if (error) {
      console.error("Error updating marketplace stats:", error);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error: any) {
    console.error("Error in updateMarketplaceStats:", error);
    return { error };
  }
}
