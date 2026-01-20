/**
 * Analytics React Hooks
 *
 * Provides React hooks for fetching and managing analytics data
 * with automatic caching and refresh capabilities
 */

import { useState, useEffect, useCallback } from "react";
import {
  getAnalyticsWithChanges,
  getTimeSeriesData,
  getListingAnalytics,
  getTopPerformingListings,
  type AnalyticsWithChanges,
  type TimeSeriesData,
} from "@/lib/database/historical";

export interface UseAnalyticsOptions {
  userId: string;
  currentDays?: number;
  previousDays?: number;
  enabled?: boolean;
  refreshInterval?: number; // ms
}

export interface UseAnalyticsResult {
  data: AnalyticsWithChanges | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch analytics with percentage changes
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useAnalytics({
 *   userId: user.id,
 *   currentDays: 30,
 *   previousDays: 30
 * });
 * ```
 */
export function useAnalytics({
  userId,
  currentDays = 30,
  previousDays = 30,
  enabled = true,
  refreshInterval,
}: UseAnalyticsOptions): UseAnalyticsResult {
  const [data, setData] = useState<AnalyticsWithChanges | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!enabled || !userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await getAnalyticsWithChanges(
        userId,
        currentDays,
        previousDays
      );

      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
      }
    } catch (err: any) {
      setError(err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentDays, previousDays, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh if interval is set
  useEffect(() => {
    if (!refreshInterval || !enabled) return;

    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, enabled, fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}

/**
 * Hook to fetch time series data for charts
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useTimeSeriesData({
 *   userId: user.id,
 *   days: 30
 * });
 * ```
 */
export function useTimeSeriesData({
  userId,
  days = 30,
  enabled = true,
}: {
  userId: string;
  days?: number;
  enabled?: boolean;
}): {
  data: TimeSeriesData[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<TimeSeriesData[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await getTimeSeriesData(userId, days);

      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
      }
    } catch (err: any) {
      setError(err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, days, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook to fetch analytics for a specific listing
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useListingAnalytics({
 *   listingId: listing.id,
 *   days: 30
 * });
 * ```
 */
export function useListingAnalytics({
  listingId,
  days,
  enabled = true,
}: {
  listingId: string;
  days?: number;
  enabled?: boolean;
}): {
  data: {
    views: number;
    likes: number;
    shares: number;
    sales: number;
    revenue: number;
    viewsByMarketplace: Record<string, number>;
  } | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !listingId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await getListingAnalytics(listingId, days);

      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
      }
    } catch (err: any) {
      setError(err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [listingId, days, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook to fetch top performing listings
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useTopPerformingListings({
 *   userId: user.id,
 *   limit: 10,
 *   metric: 'views',
 *   days: 30
 * });
 * ```
 */
export function useTopPerformingListings({
  userId,
  limit = 10,
  metric = "views" as "views" | "likes" | "sales",
  days,
  enabled = true,
}: {
  userId: string;
  limit?: number;
  metric?: "views" | "likes" | "sales";
  days?: number;
  enabled?: boolean;
}): {
  data: Array<{
    listingId: string;
    views: number;
    likes: number;
    sales: number;
    revenue: number;
  }> | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await getTopPerformingListings(
        userId,
        limit,
        metric,
        days
      );

      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
      }
    } catch (err: any) {
      setError(err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit, metric, days, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook to aggregate multiple analytics hooks into one
 * Useful for dashboard pages that need all analytics at once
 *
 * @example
 * ```tsx
 * const analytics = useAnalyticsDashboard({
 *   userId: user.id,
 *   currentDays: 30,
 *   previousDays: 30
 * });
 * ```
 */
export function useAnalyticsDashboard({
  userId,
  currentDays = 30,
  previousDays = 30,
  enabled = true,
}: {
  userId: string;
  currentDays?: number;
  previousDays?: number;
  enabled?: boolean;
}) {
  const mainAnalytics = useAnalytics({
    userId,
    currentDays,
    previousDays,
    enabled,
  });

  const timeSeriesData = useTimeSeriesData({
    userId,
    days: currentDays,
    enabled,
  });

  const topListings = useTopPerformingListings({
    userId,
    limit: 5,
    metric: "views",
    days: currentDays,
    enabled,
  });

  const isLoading =
    mainAnalytics.isLoading ||
    timeSeriesData.isLoading ||
    topListings.isLoading;

  const hasError =
    mainAnalytics.error || timeSeriesData.error || topListings.error;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      mainAnalytics.refetch(),
      timeSeriesData.refetch(),
      topListings.refetch(),
    ]);
  }, [mainAnalytics, timeSeriesData, topListings]);

  return {
    analytics: mainAnalytics.data,
    timeSeries: timeSeriesData.data,
    topListings: topListings.data,
    isLoading,
    error: hasError,
    refetch: refetchAll,
  };
}
