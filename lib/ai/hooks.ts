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
} from "./types";

interface UseAIResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for generating a single listing
 */
export function useGenerateListing(): UseAIResult<GeneratedListing> {
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
    } catch (err: any) {
      setError(err.message);
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
export function useGenerateBulk(): UseAIResult<GeneratedListing[]> {
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
    } catch (err: any) {
      setError(err.message);
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
export function useAnalyzeImages(): UseAIResult<ImageAnalysisResult> {
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
    } catch (err: any) {
      setError(err.message);
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
export function useOptimizeListing(): UseAIResult<{
  title: string;
  description: string;
  improvements: string[];
}> {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (
    title: string,
    description: string,
    marketplace: "ebay" | "poshmark" | "mercari",
    model?: AIModel
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
    } catch (err: any) {
      setError(err.message);
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
    context?: any
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
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, sendMessage };
}
