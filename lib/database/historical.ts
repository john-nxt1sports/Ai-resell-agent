/**
 * Historical Analytics Service
 *
 * Provides functions to fetch analytics with historical comparisons
 * and percentage changes. Uses the new analytics_events system.
 */

import { createClient } from "@/lib/supabase/client";

export interface AnalyticsWithChanges {
  // Current period metrics
  currentViews: number;
  currentLikes: number;
  currentSales: number;
  currentRevenue: number;

  // Previous period metrics
  previousViews: number;
  previousLikes: number;
  previousSales: number;
  previousRevenue: number;

  // Percentage changes
  viewsChange: number;
  likesChange: number;
  salesChange: number;
  revenueChange: number;

  // Marketplace breakdowns
  marketplaces: {
    poshmark: MarketplaceMetrics;
    mercari: MarketplaceMetrics;
    ebay: MarketplaceMetrics;
  };
}

export interface MarketplaceMetrics {
  views: number;
  sales: number;
  revenue: number;
}

export interface TimeSeriesData {
  date: string;
  views: number;
  likes: number;
  sales: number;
  revenue: number;
}

/**
 * Get analytics with percentage changes for a time period
 */
export async function getAnalyticsWithChanges(
  userId: string,
  currentDays: number = 30,
  previousDays: number = 30
): Promise<{ data: AnalyticsWithChanges | null; error: Error | null }> {
  try {
    const supabase = createClient();

    // Call the database function
    const { data, error } = await supabase.rpc("get_analytics_with_changes", {
      p_user_id: userId,
      p_current_days: currentDays,
      p_previous_days: previousDays,
    });

    if (error) {
      console.error("Error fetching analytics with changes:", error);
      return { data: null, error: new Error(error.message) };
    }

    if (!data || data.length === 0) {
      // Return zero values if no data
      return {
        data: {
          currentViews: 0,
          currentLikes: 0,
          currentSales: 0,
          currentRevenue: 0,
          previousViews: 0,
          previousLikes: 0,
          previousSales: 0,
          previousRevenue: 0,
          viewsChange: 0,
          likesChange: 0,
          salesChange: 0,
          revenueChange: 0,
          marketplaces: {
            poshmark: { views: 0, sales: 0, revenue: 0 },
            mercari: { views: 0, sales: 0, revenue: 0 },
            ebay: { views: 0, sales: 0, revenue: 0 },
          },
        },
        error: null,
      };
    }

    const result = data[0];

    // Get marketplace breakdown
    const { data: marketplaceData, error: marketplaceError } =
      await supabase.rpc("get_user_analytics_range", {
        p_user_id: userId,
        p_days: currentDays,
      });

    if (marketplaceError) {
      console.error("Error fetching marketplace data:", marketplaceError);
    }

    const marketplace = marketplaceData?.[0] || {};

    return {
      data: {
        currentViews: Number(result.current_views) || 0,
        currentLikes: Number(result.current_likes) || 0,
        currentSales: Number(result.current_sales) || 0,
        currentRevenue: Number(result.current_revenue) || 0,
        previousViews: Number(result.previous_views) || 0,
        previousLikes: Number(result.previous_likes) || 0,
        previousSales: Number(result.previous_sales) || 0,
        previousRevenue: Number(result.previous_revenue) || 0,
        viewsChange: Number(result.views_change) || 0,
        likesChange: Number(result.likes_change) || 0,
        salesChange: Number(result.sales_change) || 0,
        revenueChange: Number(result.revenue_change) || 0,
        marketplaces: {
          poshmark: {
            views: Number(marketplace.poshmark_views) || 0,
            sales: Number(marketplace.poshmark_sales) || 0,
            revenue: Number(marketplace.poshmark_revenue) || 0,
          },
          mercari: {
            views: Number(marketplace.mercari_views) || 0,
            sales: Number(marketplace.mercari_sales) || 0,
            revenue: Number(marketplace.mercari_revenue) || 0,
          },
          ebay: {
            views: Number(marketplace.ebay_views) || 0,
            sales: Number(marketplace.ebay_sales) || 0,
            revenue: Number(marketplace.ebay_revenue) || 0,
          },
        },
      },
      error: null,
    };
  } catch (error: any) {
    console.error("Error in getAnalyticsWithChanges:", error);
    return { data: null, error };
  }
}

/**
 * Get time series data for charts
 */
export async function getTimeSeriesData(
  userId: string,
  days: number = 30
): Promise<{ data: TimeSeriesData[] | null; error: Error | null }> {
  try {
    const supabase = createClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily aggregated data
    const { data, error } = await supabase
      .from("daily_metrics")
      .select("date, total_views, total_likes, total_sales, revenue")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (error) {
      console.error("Error fetching time series data:", error);
      return { data: null, error: new Error(error.message) };
    }

    const timeSeriesData: TimeSeriesData[] = (data || []).map((row) => ({
      date: row.date,
      views: row.total_views || 0,
      likes: row.total_likes || 0,
      sales: row.total_sales || 0,
      revenue: Number(row.revenue) || 0,
    }));

    return { data: timeSeriesData, error: null };
  } catch (error: any) {
    console.error("Error in getTimeSeriesData:", error);
    return { data: null, error };
  }
}

/**
 * Get analytics for a specific listing
 */
export async function getListingAnalytics(
  listingId: string,
  days?: number
): Promise<{
  data: {
    views: number;
    likes: number;
    shares: number;
    sales: number;
    revenue: number;
    viewsByMarketplace: Record<string, number>;
  } | null;
  error: Error | null;
}> {
  try {
    const supabase = createClient();

    let query = supabase
      .from("analytics_events")
      .select("event_type, marketplace, event_value")
      .eq("listing_id", listingId);

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      query = query.gte("created_at", startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching listing analytics:", error);
      return { data: null, error: new Error(error.message) };
    }

    // Aggregate the results
    const analytics = {
      views: 0,
      likes: 0,
      shares: 0,
      sales: 0,
      revenue: 0,
      viewsByMarketplace: {} as Record<string, number>,
    };

    for (const event of data || []) {
      switch (event.event_type) {
        case "view":
          analytics.views++;
          if (event.marketplace) {
            analytics.viewsByMarketplace[event.marketplace] =
              (analytics.viewsByMarketplace[event.marketplace] || 0) + 1;
          }
          break;
        case "like":
          analytics.likes++;
          break;
        case "share":
          analytics.shares++;
          break;
        case "sale":
          analytics.sales++;
          analytics.revenue += Number(event.event_value) || 0;
          break;
      }
    }

    return { data: analytics, error: null };
  } catch (error: any) {
    console.error("Error in getListingAnalytics:", error);
    return { data: null, error };
  }
}

/**
 * Get top performing listings
 */
export async function getTopPerformingListings(
  userId: string,
  limit: number = 10,
  metric: "views" | "likes" | "sales" = "views",
  days?: number
): Promise<{
  data: Array<{
    listingId: string;
    views: number;
    likes: number;
    sales: number;
    revenue: number;
  }> | null;
  error: Error | null;
}> {
  try {
    const supabase = createClient();

    let query = supabase
      .from("analytics_events")
      .select("listing_id, event_type, event_value")
      .eq("user_id", userId)
      .not("listing_id", "is", null);

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      query = query.gte("created_at", startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching top performing listings:", error);
      return { data: null, error: new Error(error.message) };
    }

    // Aggregate by listing
    const listingStats = new Map<
      string,
      { views: number; likes: number; sales: number; revenue: number }
    >();

    for (const event of data || []) {
      if (!event.listing_id) continue;

      const stats = listingStats.get(event.listing_id) || {
        views: 0,
        likes: 0,
        sales: 0,
        revenue: 0,
      };

      switch (event.event_type) {
        case "view":
          stats.views++;
          break;
        case "like":
          stats.likes++;
          break;
        case "sale":
          stats.sales++;
          stats.revenue += Number(event.event_value) || 0;
          break;
      }

      listingStats.set(event.listing_id, stats);
    }

    // Convert to array and sort
    const topListings = Array.from(listingStats.entries())
      .map(([listingId, stats]) => ({
        listingId,
        ...stats,
      }))
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, limit);

    return { data: topListings, error: null };
  } catch (error: any) {
    console.error("Error in getTopPerformingListings:", error);
    return { data: null, error };
  }
}

/**
 * Get daily active users count (admin function)
 */
export async function getDailyActiveUsers(
  startDate: Date,
  endDate: Date
): Promise<{
  data: Array<{ date: string; activeUsers: number }> | null;
  error: Error | null;
}> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("analytics_events")
      .select("created_at, user_id")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (error) {
      console.error("Error fetching DAU:", error);
      return { data: null, error: new Error(error.message) };
    }

    // Group by date and count unique users
    const dailyUsers = new Map<string, Set<string>>();

    for (const event of data || []) {
      const date = event.created_at.split("T")[0];
      if (!dailyUsers.has(date)) {
        dailyUsers.set(date, new Set());
      }
      dailyUsers.get(date)!.add(event.user_id);
    }

    const dau = Array.from(dailyUsers.entries())
      .map(([date, users]) => ({
        date,
        activeUsers: users.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { data: dau, error: null };
  } catch (error: any) {
    console.error("Error in getDailyActiveUsers:", error);
    return { data: null, error };
  }
}
