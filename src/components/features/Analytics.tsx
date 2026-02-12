"use client";

import { useListingStore } from "@/store/listingStore";
import { getAnalyticsSummary } from "@/services/database";
import { createClient } from "@/services/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  DollarSign,
  ShoppingCart,
  Eye,
  Heart,
  ArrowUp,
  ArrowDown,
  Sparkles,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { MarketplaceIcon } from "@/components/ui/MarketplaceIcon";
import type { Marketplace } from "@/types";
import { useState, useEffect, useCallback } from "react";

type TimeRange = "7d" | "30d" | "90d" | "all";

interface AIInsight {
  type: "positive" | "neutral" | "warning";
  text: string;
}

interface AnalyticsData {
  totalViews: number;
  totalLikes: number;
  totalSales: number;
  revenueGenerated: number;
  viewsByMarketplace: Record<string, number>;
  salesByMarketplace: Record<string, number>;
}

interface MarketplaceStats {
  name: string;
  listings: number;
  views: number;
  sales: number;
  revenue: number;
  color: string;
}

export function Analytics() {
  const { listings, fetchListings } = useListingStore();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [, setIsLoadingAnalytics] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Load analytics data
  const loadAnalytics = useCallback(
    async (userId: string) => {
      setIsLoadingAnalytics(true);

      const days =
        timeRange === "7d"
          ? 7
          : timeRange === "30d"
            ? 30
            : timeRange === "90d"
              ? 90
              : 365;

      const { data, error } = await getAnalyticsSummary(userId, days);

      if (!error && data) {
        setAnalyticsData(data);
      }

      setIsLoadingAnalytics(false);
    },
    [timeRange],
  );

  // Fetch user and data
  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);

        // Fetch listings
        await fetchListings(user.id);

        // Fetch analytics
        await loadAnalytics(user.id);
      }

      setIsLoadingAnalytics(false);
      setHasLoadedOnce(true);
    };

    loadData();
  }, [fetchListings, loadAnalytics]);

  // Reload analytics when time range changes
  useEffect(() => {
    if (currentUserId) {
      loadAnalytics(currentUserId);
    }
  }, [timeRange, currentUserId, loadAnalytics]);

  // Calculate metrics from real data
  const totalListings = listings.length;
  const activeListings = listings.filter(
    (l) => l.status === "published",
  ).length;
  const totalValue = listings
    .filter((l) => l.status === "published")
    .reduce((acc, l) => acc + l.price, 0);

  // Use new analytics hook with historical data
  const analyticsWithChanges = useAnalytics({
    userId: currentUserId || "",
    currentDays:
      timeRange === "7d"
        ? 7
        : timeRange === "30d"
          ? 30
          : timeRange === "90d"
            ? 90
            : 365,
    previousDays:
      timeRange === "7d"
        ? 7
        : timeRange === "30d"
          ? 30
          : timeRange === "90d"
            ? 90
            : 365,
    enabled: !!currentUserId,
  });

  // Real metrics from database with percentage changes
  const metrics = {
    views:
      analyticsWithChanges.data?.currentViews || analyticsData?.totalViews || 0,
    viewsChange: analyticsWithChanges.data?.viewsChange || 0,
    likes:
      analyticsWithChanges.data?.currentLikes || analyticsData?.totalLikes || 0,
    likesChange: analyticsWithChanges.data?.likesChange || 0,
    sales:
      analyticsWithChanges.data?.currentSales || analyticsData?.totalSales || 0,
    salesChange: analyticsWithChanges.data?.salesChange || 0,
    revenue:
      analyticsWithChanges.data?.currentRevenue ||
      analyticsData?.revenueGenerated ||
      0,
    revenueChange: analyticsWithChanges.data?.revenueChange || 0,
  };

  // Calculate marketplace stats from real data with historical analytics
  const marketplaceStats: MarketplaceStats[] = [
    {
      name: "Poshmark",
      listings: listings.filter((l) => l.marketplaces.includes("poshmark"))
        .length,
      views:
        analyticsWithChanges.data?.marketplaces.poshmark.views ||
        analyticsData?.viewsByMarketplace?.poshmark ||
        0,
      sales:
        analyticsWithChanges.data?.marketplaces.poshmark.sales ||
        analyticsData?.salesByMarketplace?.poshmark ||
        0,
      revenue: analyticsWithChanges.data?.marketplaces.poshmark.revenue || 0,
      color: "bg-red-500",
    },
    {
      name: "Mercari",
      listings: listings.filter((l) => l.marketplaces.includes("mercari"))
        .length,
      views:
        analyticsWithChanges.data?.marketplaces.mercari.views ||
        analyticsData?.viewsByMarketplace?.mercari ||
        0,
      sales:
        analyticsWithChanges.data?.marketplaces.mercari.sales ||
        analyticsData?.salesByMarketplace?.mercari ||
        0,
      revenue: analyticsWithChanges.data?.marketplaces.mercari.revenue || 0,
      color: "bg-blue-500",
    },
    {
      name: "eBay",
      listings: listings.filter((l) => l.marketplaces.includes("ebay")).length,
      views:
        analyticsWithChanges.data?.marketplaces.ebay.views ||
        analyticsData?.viewsByMarketplace?.ebay ||
        0,
      sales:
        analyticsWithChanges.data?.marketplaces.ebay.sales ||
        analyticsData?.salesByMarketplace?.ebay ||
        0,
      revenue: analyticsWithChanges.data?.marketplaces.ebay.revenue || 0,
      color: "bg-yellow-500",
    },
  ];

  // Top performers from real listings (sorted by views if available, otherwise by price)
  const topPerformers = listings
    .filter((l) => l.status === "published")
    .sort((a, b) => b.price - a.price) // Sort by price for now
    .slice(0, 3)
    .map((listing) => ({
      title: listing.title,
      price: listing.price,
      views: 0, // TODO: Get from analytics
      likes: 0, // TODO: Get from analytics
    }));

  // Generate AI insights based on real analytics data
  const generateAIInsights = async (force: boolean = false) => {
    if (!analyticsData || !currentUserId) return;

    // Check if we have cached insights for this time range
    const cacheKey = `analytics-insights-${timeRange}-${currentUserId}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData && !force) {
      // Use cached insights
      const cached = JSON.parse(cachedData);
      setAiInsights(cached);
      return;
    }

    setIsGeneratingInsights(true);

    // Generate insights based on real data
    setTimeout(() => {
      const insights: AIInsight[] = [];

      // Insight 1: Most active marketplace
      const topMarketplace = marketplaceStats.reduce(
        (max, current) => (current.views > max.views ? current : max),
        marketplaceStats[0],
      );

      if (topMarketplace.views > 0) {
        insights.push({
          type: "positive",
          text: `${
            topMarketplace.name
          } is your best performing marketplace with ${
            topMarketplace.views
          } views${
            topMarketplace.sales > 0 ? ` and ${topMarketplace.sales} sales` : ""
          }`,
        });
      }

      // Insight 2: Total sales performance
      if (metrics.sales > 0) {
        insights.push({
          type: "positive",
          text: `You've made ${metrics.sales} sale${
            metrics.sales > 1 ? "s" : ""
          } generating ${formatCurrency(metrics.revenue)} in revenue this ${
            timeRange === "7d"
              ? "week"
              : timeRange === "30d"
                ? "month"
                : "period"
          }`,
        });
      } else if (metrics.views > 0) {
        insights.push({
          type: "neutral",
          text: `Your listings received ${metrics.views} views. Consider optimizing pricing or descriptions to convert views into sales`,
        });
      }

      // Insight 3: Listing strategy
      if (activeListings < 5) {
        insights.push({
          type: "neutral",
          text: `You have ${activeListings} active listing${
            activeListings !== 1 ? "s" : ""
          }. Posting more items can increase your visibility and sales potential`,
        });
      } else if (metrics.likes > 0) {
        insights.push({
          type: "positive",
          text: `Your listings have received ${metrics.likes} like${
            metrics.likes !== 1 ? "s" : ""
          }, showing strong buyer interest`,
        });
      } else {
        insights.push({
          type: "neutral",
          text: `Consider sharing your listings during peak hours (6-9 PM) to maximize engagement`,
        });
      }

      // Fill with default insights if we don't have enough
      if (insights.length === 0) {
        insights.push(
          {
            type: "neutral",
            text: "Start creating listings to see personalized insights based on your performance",
          },
          {
            type: "neutral",
            text: "Track views, likes, and sales across multiple marketplaces in one place",
          },
          {
            type: "neutral",
            text: "AI-powered analytics will help optimize your pricing and listing strategy",
          },
        );
      }

      setAiInsights(insights);
      setIsGeneratingInsights(false);

      // Cache the insights for this time range
      sessionStorage.setItem(cacheKey, JSON.stringify(insights));
    }, 1500);
  };

  // Quick fade-in animation for insights
  useEffect(() => {
    if (aiInsights.length > 0) {
      const timer = setTimeout(() => {
        setShowInsights(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [aiInsights]);

  // Generate insights when analytics data is loaded
  useEffect(() => {
    if (analyticsData) {
      generateAIInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsData, timeRange, currentUserId]);

  // Show loading state only on initial load (before first fetch completes)
  if (!hasLoadedOnce) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-500" />
          <p className="text-dark-600 dark:text-dark-400">
            Loading analytics from database...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-dark-900 dark:text-dark-50">
            Analytics
          </h1>
          <p className="text-dark-600 dark:text-dark-400">
            Track your performance and grow your reselling business
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-lg p-1">
          {(["7d", "30d", "90d", "all"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === range
                  ? "bg-primary-500 text-white"
                  : "text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800"
              }`}
            >
              {range === "all"
                ? "All Time"
                : `Last ${range.replace("d", " days")}`}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-2">
                AI Performance Insights
                {isGeneratingInsights && (
                  <div className="h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                )}
              </h3>
              <button
                onClick={() => generateAIInsights(true)}
                disabled={isGeneratingInsights}
                className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-dark-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Regenerate insights"
              >
                <RefreshCw
                  className={`h-4 w-4 text-primary-600 dark:text-primary-400 ${
                    isGeneratingInsights ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>

            {aiInsights.length === 0 ? (
              <div className="space-y-2 text-sm text-dark-600 dark:text-dark-400">
                <div className="h-4 bg-dark-200 dark:bg-dark-700 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-dark-200 dark:bg-dark-700 rounded animate-pulse w-5/6" />
                <div className="h-4 bg-dark-200 dark:bg-dark-700 rounded animate-pulse w-2/3" />
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-dark-700 dark:text-dark-300">
                {aiInsights.map((insight, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 min-h-[24px]"
                  >
                    <span
                      className={`mt-0.5 flex-shrink-0 ${
                        insight.type === "positive"
                          ? "text-green-500"
                          : insight.type === "warning"
                            ? "text-yellow-500"
                            : "text-blue-500"
                      }`}
                    >
                      {insight.type === "positive"
                        ? "✓"
                        : insight.type === "warning"
                          ? "⚠"
                          : "→"}
                    </span>
                    <span
                      className={`transition-all duration-300 ${showInsights ? "opacity-100" : "opacity-0"}`}
                      style={{ transitionDelay: `${index * 100}ms` }}
                    >
                      {insight.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-dark-500 dark:text-dark-400 mt-3 italic">
              Generated by AI • Updates with your time range selection
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Views"
          value={metrics.views.toLocaleString()}
          change={metrics.viewsChange}
          icon={Eye}
          color="bg-blue-500"
        />
        <MetricCard
          title="Likes"
          value={metrics.likes.toLocaleString()}
          change={metrics.likesChange}
          icon={Heart}
          color="bg-pink-500"
        />
        <MetricCard
          title="Sales"
          value={metrics.sales.toLocaleString()}
          change={metrics.salesChange}
          icon={ShoppingCart}
          color="bg-green-500"
        />
        <MetricCard
          title="Revenue"
          value={formatCurrency(metrics.revenue)}
          change={metrics.revenueChange}
          icon={DollarSign}
          color="bg-purple-500"
        />
      </div>

      {/* Marketplace Performance */}
      <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 shadow-sm">
        <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-800">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
            Marketplace Performance
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {marketplaceStats.map((marketplace) => (
              <div
                key={marketplace.name}
                className="flex items-center gap-4 p-4 rounded-lg border border-dark-200 dark:border-dark-800 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
              >
                <div className="h-12 w-12 bg-white dark:bg-white rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden p-2 shadow-sm">
                  <MarketplaceIcon
                    marketplace={marketplace.name.toLowerCase() as Marketplace}
                    size={32}
                    className="object-contain"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-dark-900 dark:text-dark-50">
                    {marketplace.name}
                  </h3>
                  <p className="text-sm text-dark-600 dark:text-dark-400">
                    {marketplace.listings} active listings
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-dark-600 dark:text-dark-400">Views</p>
                    <p className="font-semibold text-dark-900 dark:text-dark-50">
                      {marketplace.views}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-dark-600 dark:text-dark-400">Sales</p>
                    <p className="font-semibold text-dark-900 dark:text-dark-50">
                      {marketplace.sales}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-dark-600 dark:text-dark-400">Revenue</p>
                    <p className="font-semibold text-dark-900 dark:text-dark-50">
                      {formatCurrency(marketplace.revenue)}
                    </p>
                  </div>
                </div>

                {/* Mobile view - stacked stats */}
                <div className="flex sm:hidden flex-col gap-1 text-right">
                  <p className="text-sm text-dark-600 dark:text-dark-400">
                    {marketplace.views} views • {marketplace.sales} sales
                  </p>
                  <p className="font-semibold text-dark-900 dark:text-dark-50">
                    {formatCurrency(marketplace.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 shadow-sm">
          <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-800">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
              Top Performers
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topPerformers.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg border border-dark-200 dark:border-dark-800"
                >
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-dark-900 dark:text-dark-50 truncate text-sm">
                      {item.title}
                    </h3>
                    <p className="text-sm text-dark-600 dark:text-dark-400">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-sm">
                    <div className="flex items-center gap-1 text-dark-600 dark:text-dark-400">
                      <Eye className="h-3 w-3" />
                      <span>{item.views}</span>
                    </div>
                    <div className="flex items-center gap-1 text-dark-600 dark:text-dark-400">
                      <Heart className="h-3 w-3" />
                      <span>{item.likes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 shadow-sm">
          <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-800">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
              Quick Stats
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <StatRow label="Total Listings" value={totalListings} />
            <StatRow label="Active Listings" value={activeListings} />
            <StatRow
              label="Draft Listings"
              value={totalListings - activeListings}
            />
            <StatRow
              label="Total Inventory Value"
              value={formatCurrency(totalValue)}
            />
            <StatRow
              label="Average Price"
              value={formatCurrency(totalValue / (activeListings || 1))}
            />
            <StatRow
              label="Conversion Rate"
              value={
                metrics.views > 0
                  ? `${((metrics.sales / metrics.views) * 100).toFixed(1)}%`
                  : "0.0%"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  color: string;
}) {
  const isPositive = change > 0;

  return (
    <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-dark-600 dark:text-dark-400">{title}</p>
        <div className={`${color} p-2 rounded-lg`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-dark-900 dark:text-dark-50 mb-2">
        {value}
      </p>
      <div className="flex items-center gap-1 text-sm">
        {isPositive ? (
          <>
            <ArrowUp className="h-4 w-4 text-green-500" />
            <span className="text-green-500 font-medium">+{change}%</span>
          </>
        ) : (
          <>
            <ArrowDown className="h-4 w-4 text-red-500" />
            <span className="text-red-500 font-medium">{change}%</span>
          </>
        )}
        <span className="text-dark-600 dark:text-dark-400">vs last period</span>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-dark-600 dark:text-dark-400">{label}</span>
      <span className="text-sm font-semibold text-dark-900 dark:text-dark-50">
        {value}
      </span>
    </div>
  );
}
