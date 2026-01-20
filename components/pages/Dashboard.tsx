"use client";

import { useEffect, useState } from "react";
import { useListingStore } from "@/store/listingStore";
import { getListingStats } from "@/lib/database";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency,
  getStatusColor,
  getMarketplaceColor,
} from "@/lib/utils";
import {
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";

export function Dashboard() {
  const { listings, fetchListings, isLoading } = useListingStore();
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    sold: 0,
    totalRevenue: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch user and listings on mount
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

        // Fetch stats
        const { data: statsData } = await getListingStats(user.id);
        if (statsData) {
          setStats(statsData);
        }
      }

      setLoadingStats(false);
    };

    loadData();
  }, [fetchListings]);

  if (loadingStats || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-500" />
          <p className="text-dark-600 dark:text-dark-400">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-dark-900 dark:text-dark-50">
          Dashboard
        </h1>
        <p className="text-dark-600 dark:text-dark-400">
          Welcome back! Here's an overview of your listings.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Listings"
          value={stats.total}
          icon={Package}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Listings"
          value={stats.published}
          icon={TrendingUp}
          color="bg-orange-500"
        />
        <StatCard
          title="Sold Listings"
          value={stats.sold}
          icon={CheckCircle}
          color="bg-emerald-500"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          color="bg-purple-500"
        />
      </div>

      {/* Recently Sold Items */}
      {listings.filter((l) => (l.status as string) === "sold").length > 0 && (
        <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 shadow-sm">
          <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
                Recently Sold Items
              </h2>
              <span className="text-sm text-dark-600 dark:text-dark-400">
                {listings.filter((l) => (l.status as string) === "sold").length}{" "}
                items
              </span>
            </div>
          </div>
          <div className="p-6">
            {listings.filter((l) => (l.status as string) === "sold").length >
            0 ? (
              <div className="space-y-4">
                {listings
                  .filter((l) => (l.status as string) === "sold")
                  .slice(0, 5)
                  .map((listing) => (
                    <div
                      key={listing.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-dark-200 dark:border-dark-800 hover:border-green-300 dark:hover:border-green-700 transition-colors bg-green-50/30 dark:bg-green-900/10"
                    >
                      <div className="h-16 w-16 rounded-lg overflow-hidden bg-dark-100 dark:bg-dark-800 flex-shrink-0">
                        {listing.images[0] && (
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-dark-900 dark:text-dark-50 truncate">
                          {listing.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                            Sold for {formatCurrency(listing.price)}
                          </p>
                          <span className="text-dark-400">•</span>
                          <p className="text-sm font-bold text-dark-900 dark:text-dark-50">
                            Profit: {formatCurrency(listing.price * 0.85)}
                          </p>
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-2 flex-wrap">
                        {listing.marketplaces.map((marketplace) => (
                          <span
                            key={marketplace}
                            className={`${getMarketplaceColor(
                              marketplace
                            )} text-white text-xs px-2 py-1 rounded capitalize`}
                          >
                            {marketplace}
                          </span>
                        ))}
                      </div>

                      <div className="flex-shrink-0">
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded capitalize font-medium">
                          ✓ Sold
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-dark-100 dark:bg-dark-800 mb-3">
                  <DollarSign className="h-6 w-6 text-dark-400" />
                </div>
                <p className="text-sm text-dark-600 dark:text-dark-400">
                  No sold items yet
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Listings */}
      {listings.filter((l) => (l.status as string) !== "sold").length > 0 && (
        <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 shadow-sm">
          <div className="px-6 py-4 border-b border-dark-200 dark:border-dark-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
                Recent Listings
              </h2>
              <span className="text-sm text-dark-600 dark:text-dark-400">
                {listings.filter((l) => (l.status as string) !== "sold").length}{" "}
                items
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {listings
                .filter((l) => (l.status as string) !== "sold")
                .slice(0, 5)
                .map((listing) => (
                  <div
                    key={listing.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-dark-200 dark:border-dark-800 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                  >
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-dark-100 dark:bg-dark-800 flex-shrink-0">
                      {listing.images[0] && (
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-dark-900 dark:text-dark-50 truncate">
                        {listing.title}
                      </h3>
                      <p className="text-sm text-dark-600 dark:text-dark-400">
                        {formatCurrency(listing.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {listing.marketplaces.map((marketplace) => (
                        <span
                          key={marketplace}
                          className={`${getMarketplaceColor(
                            marketplace
                          )} text-white text-xs px-2 py-1 rounded capitalize`}
                        >
                          {marketplace}
                        </span>
                      ))}
                    </div>

                    <div className="flex-shrink-0">
                      <span
                        className={`${getStatusColor(
                          listing.status
                        )} text-white text-xs px-2 py-1 rounded capitalize`}
                      >
                        {listing.status}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-dark-600 dark:text-dark-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-dark-900 dark:text-dark-50">
            {value}
          </p>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
