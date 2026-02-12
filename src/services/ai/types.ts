/**
 * AI Service Type Definitions
 * Provides type safety for AI operations throughout the application
 */

export type AIModel =
  | "google/gemini-3-pro-preview"
  | "google/gemini-3-pro-image-preview"
  | "google/gemini-2.0-flash-001"
  | "google/gemini-2.5-flash"
  | "google/gemini-2.5-flash:online"
  | "anthropic/claude-3.5-sonnet"
  | "openai/gpt-4-turbo"
  | "openai/gpt-4o"
  | "openai/gpt-3.5-turbo"
  | "meta-llama/llama-3.1-70b-instruct"
  | "google/gemini-pro";

// Multimodal content types for vision models
export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageUrlContent {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export type MessageContent = string | (TextContent | ImageUrlContent)[];

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: MessageContent;
}

export interface AICompletionRequest {
  model: AIModel;
  messages: AIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface AICompletionResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: "assistant";
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ListingGenerationInput {
  title?: string;
  description?: string;
  category: string;
  condition: string;
  price?: number;
  brand?: string;
  images?: string[];
  additionalDetails?: string;
}

export interface GeneratedListing {
  title: string;
  description: string;
  tags: string[];
  suggestedPrice?: number;
  marketplaceOptimizations: {
    ebay?: string;
    poshmark?: string;
    mercari?: string;
  };
}

export interface ImageAnalysisResult {
  description: string;
  detectedItems: string[];
  suggestedCategory: string;
  suggestedCondition: string;
  suggestedBrand?: string;
  colors: string[];
  keywords: string[];
  size?: string;
  measurements?: string;
}

export interface AIUsageLog {
  user_id: string;
  model: string;
  operation_type:
    | "listing_generation"
    | "image_analysis"
    | "optimization"
    | "bulk_generation"
    | "smart_analysis";
  tokens_used: number;
  cost?: number;
  success: boolean;
  error_message?: string;
}

// ---------------------------------------------------------------------------
// Smart Analysis Pipeline (Unified Agentic Flow)
// ---------------------------------------------------------------------------

/** Market comparable found by the research agent */
export interface MarketComp {
  title: string;
  price: number;
  sold: boolean;
  platform: string;
  url?: string;
}

/** Live market research results */
export interface MarketResearch {
  avgSoldPrice: number;
  lowestActivePrice: number;
  highestSoldPrice: number;
  recommendedPrice: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  numCompsFound: number;
  demandLevel: "low" | "medium" | "high";
  trendingKeywords: string[];
  topSellingTitles: string[];
  comps: MarketComp[];
  marketSummary: string;
}

/** Recommended order for uploaded images */
export interface ImageOrderRecommendation {
  /** Original 0-based index of the image */
  originalIndex: number;
  /** New recommended position (0 = main/hero image) */
  newPosition: number;
  /** Why this image should be in this position */
  role: string;
}

/** Platform-specific optimized content */
export interface PlatformContent {
  title: string;
  description: string;
  hashtags: string[];
}

/** Complete result from the unified smart analysis pipeline */
export interface SmartAnalysisResult {
  /** Step 1: Image analysis */
  imageAnalysis: ImageAnalysisResult;
  /** Step 2: Recommended image ordering */
  imageOrder: ImageOrderRecommendation[];
  /** Step 3: Live market research */
  marketResearch: MarketResearch | null;
  /** Step 4: Generated listing content */
  generatedListing: GeneratedListing;
  /** Step 5: Platform-specific optimized content */
  platformContent: {
    ebay: PlatformContent;
    poshmark: PlatformContent;
    mercari: PlatformContent;
    flyp: PlatformContent;
  };
  /** Pipeline metadata */
  pipeline: {
    steps: string[];
    totalDuration: number;
    model: string;
  };
}
