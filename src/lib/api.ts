import { Listing, DashboardStats } from "@/types";

const _API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// API service layer for future backend integration
export const api = {
  // Listings
  listings: {
    getAll: async (): Promise<Listing[]> => {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/listings`)
      // return response.json()
      return [];
    },

    getById: async (_id: string): Promise<Listing> => {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/listings/${id}`)
      // return response.json()
      throw new Error("Not implemented");
    },

    create: async (_listing: Partial<Listing>): Promise<Listing> => {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/listings`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(listing),
      // })
      // return response.json()
      throw new Error("Not implemented");
    },

    update: async (
      _id: string,
      _updates: Partial<Listing>,
    ): Promise<Listing> => {
      // TODO: Replace with actual API call
      throw new Error("Not implemented");
    },

    delete: async (_id: string): Promise<void> => {
      // TODO: Replace with actual API call
      throw new Error("Not implemented");
    },

    publish: async (_id: string, _marketplaces: string[]): Promise<void> => {
      // TODO: Replace with actual API call
      // This will trigger the AI agent to post to selected marketplaces
      throw new Error("Not implemented");
    },
  },

  // AI Assistant
  ai: {
    generateTitle: async (_images: File[]): Promise<string> => {
      // TODO: Replace with actual AI API call
      throw new Error("Not implemented");
    },

    generateDescription: async (
      _title: string,
      _images: File[],
    ): Promise<string> => {
      // TODO: Replace with actual AI API call
      throw new Error("Not implemented");
    },

    chat: async (_message: string, _context?: unknown): Promise<string> => {
      // TODO: Replace with actual AI API call
      throw new Error("Not implemented");
    },
  },

  // Analytics
  analytics: {
    getDashboardStats: async (): Promise<DashboardStats> => {
      // TODO: Replace with actual API call
      throw new Error("Not implemented");
    },
  },

  // Image Upload
  images: {
    upload: async (_file: File): Promise<{ url: string }> => {
      // TODO: Replace with actual upload service
      throw new Error("Not implemented");
    },
  },
};
