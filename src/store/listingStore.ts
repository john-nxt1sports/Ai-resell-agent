"use client";

import { create } from "zustand";
import { Listing, ListingStatus } from "@/types";
import {
  getUserListings,
  createListing as createListingDB,
  createMarketplaceListings,
  updateListing as updateListingDB,
  deleteListing as deleteListingDB,
} from "@/services/database";

interface ListingState {
  listings: Listing[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchListings: (userId: string) => Promise<void>;
  addListing: (
    userId: string,
    listing: Omit<Listing, "id" | "createdAt" | "updatedAt" | "aiGenerated">,
  ) => Promise<{ success: boolean; listingId?: string; error?: string }>;
  updateListing: (id: string, updates: Partial<Listing>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  getListingsByStatus: (status: ListingStatus) => Listing[];
  clearListings: () => void;
}

export const useListingStore = create<ListingState>((set, get) => ({
  listings: [],
  isLoading: false,
  error: null,

  // Fetch listings from database
  fetchListings: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await getUserListings(userId);

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      set({ listings: data || [], isLoading: false });
    } catch (error: unknown) {
      set({
        error: error instanceof Error ? error.message : String(error),
        isLoading: false,
      });
    }
  },

  // Add new listing to database
  addListing: async (userId: string, listing) => {
    set({ isLoading: true, error: null });

    try {
      // Create the main listing
      const { data: newListing, error: listingError } = await createListingDB({
        userId,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        condition: listing.condition,
        brand: listing.brand,
        size: listing.size,
        color: listing.color,
        tags: listing.tags,
        images: listing.images,
        aiGenerated: true, // Since this app uses AI
        status: listing.status === "draft" ? "draft" : "published",
        platformContent: listing.platformContent,
        marketResearch: listing.marketResearch,
      });

      if (listingError || !newListing) {
        set({
          error: listingError?.message || "Failed to create listing",
          isLoading: false,
        });
        return {
          success: false,
          error: listingError?.message || "Failed to create listing",
        };
      }

      // Create marketplace listings
      if (listing.marketplaces.length > 0) {
        const { error: marketplaceError } = await createMarketplaceListings(
          newListing.id,
          listing.marketplaces,
        );

        if (marketplaceError) {
          console.error(
            "Error creating marketplace listings:",
            marketplaceError,
          );
        }
      }

      // Refresh listings
      await get().fetchListings(userId);

      set({ isLoading: false });
      return { success: true, listingId: newListing.id };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Update listing in database
  updateListing: async (id: string, updates: Partial<Listing>) => {
    set({ isLoading: true, error: null });

    try {
      // Map client fields to database fields
      const dbUpdates: Record<string, unknown> = {};

      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined)
        dbUpdates.description = updates.description;
      if (updates.price !== undefined) dbUpdates.price = updates.price;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.condition !== undefined)
        dbUpdates.condition = updates.condition;
      if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
      if (updates.size !== undefined) dbUpdates.size = updates.size;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.images !== undefined) dbUpdates.images = updates.images;
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      const { error } = await updateListingDB(id, dbUpdates);

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      // Update local state optimistically
      set((state) => ({
        listings: state.listings.map((listing) =>
          listing.id === id ? { ...listing, ...updates } : listing,
        ),
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({
        error: error instanceof Error ? error.message : String(error),
        isLoading: false,
      });
    }
  },

  // Delete listing from database
  deleteListing: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await deleteListingDB(id);

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      // Remove from local state
      set((state) => ({
        listings: state.listings.filter((listing) => listing.id !== id),
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({
        error: error instanceof Error ? error.message : String(error),
        isLoading: false,
      });
    }
  },

  // Get listings by status (local filter)
  getListingsByStatus: (status: ListingStatus) => {
    return get().listings.filter((listing) => listing.status === status);
  },

  // Clear listings (for logout)
  clearListings: () => {
    set({ listings: [], error: null, isLoading: false });
  },
}));
