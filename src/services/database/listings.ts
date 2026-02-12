/**
 * Database Service: Listings
 * Handles all database operations for listings
 */

import { createClient } from "@/services/supabase/client";
import type {
  DatabaseListing,
  Listing,
  MarketplaceListing,
  Marketplace,
  ListingCondition,
} from "@/types";

/**
 * Create a new listing in the database
 */
export async function createListing(data: {
  userId: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  condition?: ListingCondition;
  brand?: string;
  size?: string;
  color?: string;
  tags?: string[];
  images: string[];
  aiGenerated?: boolean;
  status?: "draft" | "published";
  platformContent?: Record<string, unknown>;
  marketResearch?: Record<string, unknown>;
}): Promise<{ data: DatabaseListing | null; error: Error | null }> {
  try {
    const supabase = createClient();

    const { data: listing, error } = await supabase
      .from("listings")
      .insert({
        user_id: data.userId,
        title: data.title,
        description: data.description || null,
        price: data.price,
        category: data.category || null,
        condition: data.condition || null,
        brand: data.brand || null,
        size: data.size || null,
        color: data.color || null,
        tags: data.tags || null,
        images: data.images,
        ai_generated: data.aiGenerated || false,
        status: data.status || "draft",
        ...(data.platformContent
          ? { platform_content: data.platformContent }
          : {}),
        ...(data.marketResearch
          ? { market_research: data.marketResearch }
          : {}),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating listing:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: listing, error: null };
  } catch (error: unknown) {
    console.error("Error in createListing:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Create marketplace listing entries
 */
export async function createMarketplaceListings(
  listingId: string,
  marketplaces: Marketplace[],
): Promise<{ data: MarketplaceListing[] | null; error: Error | null }> {
  try {
    const supabase = createClient();

    const entries = marketplaces.map((marketplace) => ({
      listing_id: listingId,
      marketplace,
      status: "active" as const,
    }));

    const { data, error } = await supabase
      .from("marketplace_listings")
      .insert(entries)
      .select();

    if (error) {
      console.error("Error creating marketplace listings:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error: unknown) {
    console.error("Error in createMarketplaceListings:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Get all listings for a user with marketplace data
 */
export async function getUserListings(
  userId: string,
): Promise<{ data: Listing[] | null; error: Error | null }> {
  try {
    const supabase = createClient();

    const { data: dbListings, error } = await supabase
      .from("listings")
      .select(
        `
        *,
        marketplace_listings (
          marketplace,
          status,
          views,
          likes,
          marketplace_url
        )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching listings:", error);
      return { data: null, error: new Error(error.message) };
    }

    // Transform database format to client format
    const listings: Listing[] = dbListings.map((dbListing) => ({
      id: dbListing.id,
      title: dbListing.title,
      description: dbListing.description,
      price: dbListing.price,
      category: dbListing.category,
      condition: dbListing.condition,
      brand: dbListing.brand,
      size: dbListing.size,
      color: dbListing.color,
      tags: dbListing.tags || [],
      images: dbListing.images,
      marketplaces:
        dbListing.marketplace_listings?.map(
          (ml: { marketplace: string }) => ml.marketplace,
        ) || [],
      status: dbListing.status as Listing["status"],
      aiGenerated: dbListing.ai_generated,
      createdAt: dbListing.created_at,
      updatedAt: dbListing.updated_at,
    }));

    return { data: listings, error: null };
  } catch (error: unknown) {
    console.error("Error in getUserListings:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Get a single listing by ID
 */
export async function getListingById(
  listingId: string,
): Promise<{ data: Listing | null; error: Error | null }> {
  try {
    const supabase = createClient();

    const { data: dbListing, error } = await supabase
      .from("listings")
      .select(
        `
        *,
        marketplace_listings (
          marketplace,
          status,
          views,
          likes,
          marketplace_url
        )
      `,
      )
      .eq("id", listingId)
      .single();

    if (error) {
      console.error("Error fetching listing:", error);
      return { data: null, error: new Error(error.message) };
    }

    const listing: Listing = {
      id: dbListing.id,
      title: dbListing.title,
      description: dbListing.description,
      price: dbListing.price,
      category: dbListing.category,
      condition: dbListing.condition,
      brand: dbListing.brand,
      size: dbListing.size,
      color: dbListing.color,
      tags: dbListing.tags || [],
      images: dbListing.images,
      marketplaces:
        dbListing.marketplace_listings?.map(
          (ml: { marketplace: string }) => ml.marketplace,
        ) || [],
      status: dbListing.status as Listing["status"],
      aiGenerated: dbListing.ai_generated,
      createdAt: dbListing.created_at,
      updatedAt: dbListing.updated_at,
    };

    return { data: listing, error: null };
  } catch (error: unknown) {
    console.error("Error in getListingById:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Update a listing
 */
export async function updateListing(
  listingId: string,
  updates: Partial<{
    title: string;
    description: string;
    price: number;
    category: string;
    condition: ListingCondition;
    brand: string;
    size: string;
    color: string;
    tags: string[];
    images: string[];
    status: "draft" | "published" | "sold" | "archived";
  }>,
): Promise<{ data: DatabaseListing | null; error: Error | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("listings")
      .update(updates)
      .eq("id", listingId)
      .select()
      .single();

    if (error) {
      console.error("Error updating listing:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error: unknown) {
    console.error("Error in updateListing:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Delete a listing
 */
export async function deleteListing(
  listingId: string,
): Promise<{ error: Error | null }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (error) {
      console.error("Error deleting listing:", error);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error: unknown) {
    console.error("Error in deleteListing:", error);
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Get listings by status
 */
export async function getListingsByStatus(
  userId: string,
  status: "draft" | "published" | "sold" | "archived",
): Promise<{ data: Listing[] | null; error: Error | null }> {
  try {
    const supabase = createClient();

    const { data: dbListings, error } = await supabase
      .from("listings")
      .select(
        `
        *,
        marketplace_listings (
          marketplace,
          status,
          views,
          likes
        )
      `,
      )
      .eq("user_id", userId)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching listings by status:", error);
      return { data: null, error: new Error(error.message) };
    }

    const listings: Listing[] = dbListings.map((dbListing) => ({
      id: dbListing.id,
      title: dbListing.title,
      description: dbListing.description,
      price: dbListing.price,
      category: dbListing.category,
      condition: dbListing.condition,
      brand: dbListing.brand,
      size: dbListing.size,
      color: dbListing.color,
      tags: dbListing.tags || [],
      images: dbListing.images,
      marketplaces:
        dbListing.marketplace_listings?.map(
          (ml: { marketplace: string }) => ml.marketplace,
        ) || [],
      status: dbListing.status as Listing["status"],
      aiGenerated: dbListing.ai_generated,
      createdAt: dbListing.created_at,
      updatedAt: dbListing.updated_at,
    }));

    return { data: listings, error: null };
  } catch (error: unknown) {
    console.error("Error in getListingsByStatus:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Get listing statistics for dashboard
 */
export async function getListingStats(userId: string): Promise<{
  data: {
    total: number;
    published: number;
    draft: number;
    sold: number;
    totalRevenue: number;
  } | null;
  error: Error | null;
}> {
  try {
    const supabase = createClient();

    // Get all listings
    const { data: listings, error } = await supabase
      .from("listings")
      .select("status, price")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching listing stats:", error);
      return { data: null, error: new Error(error.message) };
    }

    const stats = {
      total: listings.length,
      published: listings.filter((l) => l.status === "published").length,
      draft: listings.filter((l) => l.status === "draft").length,
      sold: listings.filter((l) => l.status === "sold").length,
      totalRevenue: listings
        .filter((l) => l.status === "sold")
        .reduce((sum, l) => sum + (l.price || 0), 0),
    };

    return { data: stats, error: null };
  } catch (error: unknown) {
    console.error("Error in getListingStats:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
