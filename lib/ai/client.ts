/**
 * OpenRouter AI Client
 * Professional API client for OpenRouter with error handling and streaming support
 */

import { AICompletionRequest, AICompletionResponse, AIModel } from "./types";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

class OpenRouterClient {
  private apiKey: string;
  private appName: string;
  private siteUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || "";
    this.appName = process.env.NEXT_PUBLIC_APP_NAME || "ListingsAI";
    this.siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  }

  private ensureApiKey() {
    if (!this.apiKey) {
      throw new Error(
        "OpenRouter API key is required. Please set OPENROUTER_API_KEY in your .env.local file"
      );
    }
  }

  /**
   * Create a chat completion
   */
  async createCompletion(
    request: AICompletionRequest
  ): Promise<AICompletionResponse> {
    this.ensureApiKey();

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": this.siteUrl,
          "X-Title": this.appName,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.max_tokens ?? 2000,
          top_p: request.top_p ?? 1,
          frequency_penalty: request.frequency_penalty ?? 0,
          presence_penalty: request.presence_penalty ?? 0,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          `OpenRouter API error: ${error.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      return data as AICompletionResponse;
    } catch (error) {
      console.error("OpenRouter API error:", error);
      throw error;
    }
  }

  /**
   * Create a streaming completion
   */
  async createStreamingCompletion(
    request: AICompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    this.ensureApiKey();

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": this.siteUrl,
          "X-Title": this.appName,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.max_tokens ?? 2000,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          `OpenRouter API error: ${error.error?.message || response.statusText}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("OpenRouter streaming error:", error);
      throw error;
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<any[]> {
    this.ensureApiKey();

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch models");
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error("Error fetching models:", error);
      throw error;
    }
  }
}

// Export singleton instance for server-side use
export const openRouterClient = new OpenRouterClient();

// Export class for custom instances
export default OpenRouterClient;
