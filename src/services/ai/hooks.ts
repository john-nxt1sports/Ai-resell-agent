/**
 * AI Hooks
 * React hooks for AI operations with loading states and error handling
 */

import { useState } from "react";
import {
  ListingGenerationInput,
  GeneratedListing,
  ImageAnalysisResult,
  AIModel,
  SmartAnalysisResult,
} from "./types";

interface UseAIResult<T, Args extends unknown[] = never[]> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for generating a single listing
 */
export function useGenerateListing(): UseAIResult<
  GeneratedListing,
  [ListingGenerationInput, AIModel?]
> {
  const [data, setData] = useState<GeneratedListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (input: ListingGenerationInput, model?: AIModel) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/generate-listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input, model }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate listing");
      }

      const result = await response.json();
      setData(result.data);
      return result.data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return { data, loading, error, execute, reset };
}

/**
 * Hook for generating bulk listings
 */
export function useGenerateBulk(): UseAIResult<
  GeneratedListing[],
  [ListingGenerationInput[], AIModel?]
> {
  const [data, setData] = useState<GeneratedListing[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (inputs: ListingGenerationInput[], model?: AIModel) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/generate-bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs, model }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate bulk listings");
      }

      const result = await response.json();
      setData(result.data);
      return result.data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return { data, loading, error, execute, reset };
}

/**
 * Hook for analyzing images
 */
export function useAnalyzeImages(): UseAIResult<
  ImageAnalysisResult,
  [string[], AIModel?]
> {
  const [data, setData] = useState<ImageAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (imageUrls: string[], model?: AIModel) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/analyze-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrls, model }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze images");
      }

      const result = await response.json();
      setData(result.data);
      return result.data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return { data, loading, error, execute, reset };
}

/**
 * Hook for optimizing listings
 */
export function useOptimizeListing(): UseAIResult<
  {
    title: string;
    description: string;
    improvements: string[];
  },
  [string, string, "ebay" | "poshmark" | "mercari", AIModel?]
> {
  const [data, setData] = useState<{
    title: string;
    description: string;
    improvements: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (
    title: string,
    description: string,
    marketplace: "ebay" | "poshmark" | "mercari",
    model?: AIModel,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/optimize-listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description, marketplace, model }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to optimize listing");
      }

      const result = await response.json();
      setData(result.data);
      return result.data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return { data, loading, error, execute, reset };
}

/**
 * Hook for AI chat assistant
 */
export function useAIChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    context?: unknown,
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages, context }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const result = await response.json();
      return result.message;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, sendMessage };
}

// ---------------------------------------------------------------------------
// Smart Analysis Hook — Unified Agentic Pipeline
// ---------------------------------------------------------------------------

export interface SmartAnalysisInput {
  imageUrls: string[];
  title?: string;
  price?: number;
  writingStyle?: string;
  brand?: string;
  category?: string;
  condition?: string;
}

/**
 * Hook for the unified smart analysis pipeline.
 *
 * Runs: Image Analysis → Image Ordering → Market Research →
 *       Listing Generation → Platform Content
 *
 * Returns the full SmartAnalysisResult plus step-level progress.
 */
export function useSmartAnalysis(): UseAIResult<
  SmartAnalysisResult,
  [SmartAnalysisInput]
> & {
  /** Current pipeline step label for UI progress display */
  currentStep: string | null;
} {
  const [data, setData] = useState<SmartAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const execute = async (input: SmartAnalysisInput) => {
    setLoading(true);
    setError(null);
    setCurrentStep("Analyzing images...");

    try {
      const response = await fetch("/api/ai/smart-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Smart analysis failed (${response.status})`,
        );
      }

      setCurrentStep("Finalizing results...");
      const result = await response.json();
      setData(result.data);
      setCurrentStep(null);
      return result.data as SmartAnalysisResult;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setCurrentStep(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
    setCurrentStep(null);
  };

  return { data, loading, error, execute, reset, currentStep };
}
