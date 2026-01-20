export type Marketplace = "poshmark" | "mercari" | "ebay";

export type ListingStatus = "draft" | "processing" | "published" | "failed";

// Database condition types (matches DB enum)
export type ListingCondition = "new" | "like_new" | "good" | "fair" | "poor";

// Full database listing interface
export interface DatabaseListing {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  condition: ListingCondition | null;
  brand: string | null;
  size: string | null;
  color: string | null;
  tags: string[] | null;
  images: string[];
  ai_generated: boolean;
  status: "draft" | "published" | "sold" | "archived";
  created_at: string;
  updated_at: string;
}

// Client-side listing interface (with marketplace data)
export interface Listing {
  id: string;
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
  marketplaces: Marketplace[];
  status: ListingStatus;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

// Marketplace listing from database
export interface MarketplaceListing {
  id: string;
  listing_id: string;
  marketplace: Marketplace;
  marketplace_listing_id: string | null;
  marketplace_url: string | null;
  posted_at: string | null;
  views: number;
  likes: number;
  status: "active" | "sold" | "removed" | "expired";
  created_at: string;
  updated_at: string;
}

// User profile from database
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan_type: "starter" | "professional" | "enterprise";
  trial_ends_at: string | null;
  subscription_status: "trial" | "active" | "cancelled" | "expired";
  created_at: string;
  updated_at: string;
}

// Analytics record
export interface AnalyticsRecord {
  id: string;
  user_id: string;
  listing_id: string;
  marketplace: Marketplace | null;
  metric_type: "view" | "like" | "share" | "sale";
  metric_value: number;
  recorded_at: string;
}

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  compressed?: boolean;
}

export interface DashboardStats {
  totalListings: number;
  activeListings: number;
  draftListings: number;
  totalRevenue: number;
  marketplaceBreakdown: {
    [key in Marketplace]: number;
  };
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
