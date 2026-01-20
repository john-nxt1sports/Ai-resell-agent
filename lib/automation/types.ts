/**
 * Core types for marketplace automation system
 */

export type MarketplaceType = "poshmark" | "mercari" | "ebay" | "depop" | "facebook" | "grailed";

export interface MarketplaceCredentials {
  id?: string;
  userId: string;
  marketplace: MarketplaceType;
  email?: string;
  username?: string;
  password: string; // Encrypted in database
  cookies?: string; // Serialized cookies for session persistence
  isActive: boolean;
  lastUsed?: Date;
  failureCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListingJobData {
  listingId: string;
  userId: string;
  marketplace: MarketplaceType;
  listing: {
    title: string;
    description: string;
    price: number;
    category?: string;
    condition?: string;
    brand?: string;
    size?: string;
    color?: string;
    tags?: string[];
    images: string[]; // URLs to images
  };
  options?: {
    retryOnFailure?: boolean;
    maxRetries?: number;
    priority?: number;
  };
}

export interface ListingJobResult {
  success: boolean;
  marketplace: MarketplaceType;
  listingId?: string; // External marketplace listing ID
  url?: string; // Public URL of the listing
  error?: string;
  timestamp: Date;
  screenshotUrl?: string; // For debugging
}

export interface AutomationError {
  code: string;
  message: string;
  retryable: boolean;
  requiresUserAction?: boolean;
  details?: any;
}

export interface BrowserConfig {
  headless: boolean;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  locale?: string;
  timezone?: string;
}

export interface MarketplaceBot {
  marketplace: MarketplaceType;
  login(credentials: MarketplaceCredentials): Promise<void>;
  createListing(data: ListingJobData): Promise<ListingJobResult>;
  verifySession(): Promise<boolean>;
  close(): Promise<void>;
}
