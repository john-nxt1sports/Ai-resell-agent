/**
 * AI Service Type Definitions
 * Provides type safety for AI operations throughout the application
 */

export type AIModel =
  | "google/gemini-3-pro-preview"
  | "google/gemini-3-pro-image-preview"
  | "anthropic/claude-3.5-sonnet"
  | "openai/gpt-4-turbo"
  | "openai/gpt-4o"
  | "openai/gpt-3.5-turbo"
  | "meta-llama/llama-3.1-70b-instruct"
  | "google/gemini-pro";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
}

export interface AIUsageLog {
  user_id: string;
  model: string;
  operation_type:
    | "listing_generation"
    | "image_analysis"
    | "optimization"
    | "bulk_generation";
  tokens_used: number;
  cost?: number;
  success: boolean;
  error_message?: string;
}
