"use client";

import { useState, useMemo, useEffect } from "react";
import { useListingStore } from "@/store/listingStore";
import { createClient } from "@/services/supabase/client";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getMarketplaceColor,
} from "@/lib/utils";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Listing, ListingStatus, Marketplace } from "@/types";
import { MarketplaceIcon } from "@/components/ui/MarketplaceIcon";
import Image from "next/image";

const ITEMS_PER_PAGE = 9;

type FilterStatus = "all" | ListingStatus;

export function AllListings() {
  const { listings, deleteListing, fetchListings } = useListingStore();

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Fetch listings on mount
  useEffect(() => {
    const loadListings = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await fetchListings(user.id);
      }
      setHasLoadedOnce(true);
    };

    loadListings();
  }, [fetchListings]);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  // Filter and search listings
  const filteredListings = useMemo(() => {
    let filtered = [...listings];

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((listing) => listing.status === filterStatus);
    }

    // Search by title
    if (searchQuery) {
      filtered = filtered.filter((listing) =>
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Sort by date (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return filtered;
  }, [listings, filterStatus, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentListings = filteredListings.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (status: FilterStatus) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this listing?")) {
      deleteListing(id);
    }
  };

  const statusCounts: Record<FilterStatus, number> = {
    all: listings.length,
    draft: listings.filter((l) => l.status === "draft").length,
    processing: listings.filter((l) => l.status === "processing").length,
    published: listings.filter((l) => l.status === "published").length,
    failed: listings.filter((l) => l.status === "failed").length,
  };

  // Show loading state only on initial load (before first fetch completes)
  if (!hasLoadedOnce) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-500" />
          <p className="text-dark-600 dark:text-dark-400">
            Loading listings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-dark-900 dark:text-dark-50">
          All Listings
        </h1>
        <p className="text-dark-600 dark:text-dark-400">
          Manage and track all your marketplace listings from the database
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
              <input
                type="text"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-5 w-5 text-dark-400 hidden sm:block" />
            {(
              [
                "all",
                "draft",
                "published",
                "processing",
                "failed",
              ] as FilterStatus[]
            ).map((status) => (
              <button
                key={status}
                onClick={() => handleFilterChange(status)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                  filterStatus === status
                    ? "bg-primary-500 text-white"
                    : "bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-400 hover:bg-dark-200 dark:hover:bg-dark-700"
                }`}
              >
                {status} ({statusCounts[status]})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-dark-600 dark:text-dark-400">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredListings.length)}{" "}
          of {filteredListings.length} listings
        </p>
      </div>

      {/* Listings Grid */}
      {currentListings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onDelete={() => handleDelete(listing.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-12">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center">
                <Search className="h-8 w-8 text-dark-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
              No listings found
            </h3>
            <p className="text-dark-600 dark:text-dark-400">
              Try adjusting your search or filters
            </p>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-dark-300 dark:border-dark-700 text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first, last, current, and pages around current
              const showPage =
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1);

              if (!showPage) {
                // Show ellipsis
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="px-2 text-dark-400">
                      ...
                    </span>
                  );
                }
                return null;
              }

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-[40px] h-10 rounded-lg font-medium transition-colors ${
                    currentPage === page
                      ? "bg-primary-500 text-white"
                      : "text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-dark-300 dark:border-dark-700 text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function ListingCard({
  listing,
  onDelete,
}: {
  listing: Listing;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative aspect-square bg-dark-100 dark:bg-dark-800">
        {listing.images[0] ? (
          <Image
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
            width={400}
            height={400}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-dark-400">
            No Image
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`${getStatusColor(
              listing.status,
            )} text-white text-xs px-2 py-1 rounded-full capitalize font-medium`}
          >
            {listing.status}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title and Price */}
        <div>
          <h3 className="font-semibold text-dark-900 dark:text-dark-50 line-clamp-2 mb-1">
            {listing.title}
          </h3>
          <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {formatCurrency(listing.price)}
          </p>
        </div>

        {/* Marketplaces */}
        <div className="flex flex-wrap gap-1">
          {listing.marketplaces.map((marketplace) => (
            <span
              key={marketplace}
              className={`${getMarketplaceColor(
                marketplace,
              )} text-white text-xs px-2 py-1 rounded capitalize`}
            >
              {marketplace}
            </span>
          ))}
        </div>

        {/* Date */}
        <p className="text-xs text-dark-600 dark:text-dark-400">
          Created {formatDate(listing.createdAt)}
        </p>

        {/* Actions */}
        <div className="space-y-2 pt-2 border-t border-dark-200 dark:border-dark-800">
          {/* Edit and Delete Row */}
          <div className="flex items-center gap-2">
            <button
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              aria-label="Edit listing"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              aria-label="Delete listing"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Marketplace Links */}
          <div className="flex items-center gap-2">
            {["poshmark", "mercari", "ebay", "flyp"].map((marketplace) => {
              const isActive = listing.marketplaces.includes(
                marketplace as Marketplace,
              );
              return (
                <button
                  key={marketplace}
                  disabled={!isActive}
                  className={`group relative flex-1 h-10 rounded-lg transition-all overflow-hidden ${
                    isActive
                      ? `${getMarketplaceColor(
                          marketplace as Marketplace,
                        )} hover:opacity-90`
                      : "bg-dark-100 dark:bg-dark-800 opacity-40 cursor-not-allowed"
                  }`}
                  aria-label={`View on ${marketplace}`}
                  title={
                    isActive
                      ? `View on ${marketplace}`
                      : `Not listed on ${marketplace}`
                  }
                >
                  <span className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                    <MarketplaceIcon
                      marketplace={marketplace as Marketplace}
                      size={20}
                      className="object-contain"
                    />
                  </span>
                  {isActive && (
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-4 w-4 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
