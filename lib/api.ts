import { Listing, DashboardStats } from "@/types";

const API_BASE_URL =
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

    getById: async (id: string): Promise<Listing> => {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/listings/${id}`)
      // return response.json()
      throw new Error("Not implemented");
    },

    create: async (listing: Partial<Listing>): Promise<Listing> => {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/listings`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(listing),
      // })
      // return response.json()
      throw new Error("Not implemented");
    },

    update: async (id: string, updates: Partial<Listing>): Promise<Listing> => {
      // TODO: Replace with actual API call
      throw new Error("Not implemented");
    },

    delete: async (id: string): Promise<void> => {
      // TODO: Replace with actual API call
      throw new Error("Not implemented");
    },

    publish: async (id: string, marketplaces: string[]): Promise<void> => {
      // TODO: Replace with actual API call
      // This will trigger the AI agent to post to selected marketplaces
      throw new Error("Not implemented");
    },
  },

  // AI Assistant
  ai: {
    generateTitle: async (images: File[]): Promise<string> => {
      // TODO: Replace with actual AI API call
      throw new Error("Not implemented");
    },

    generateDescription: async (
      title: string,
      images: File[]
    ): Promise<string> => {
      // TODO: Replace with actual AI API call
      throw new Error("Not implemented");
    },

    chat: async (message: string, context?: any): Promise<string> => {
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
    upload: async (file: File): Promise<{ url: string }> => {
      // TODO: Replace with actual upload service
      throw new Error("Not implemented");
    },
  },
};
