/**
 * AI Service Functions
 * High-level AI operations for listing generation, image analysis, and optimization
 */

import { openRouterClient } from "./client";
import {
  AIModel,
  ListingGenerationInput,
  GeneratedListing,
  ImageAnalysisResult,
  AIMessage,
} from "./types";

/**
 * Default model for listing generation
 */
const DEFAULT_MODEL: AIModel = "google/gemini-3-pro-preview";

/**
 * Model for image generation
 */
const IMAGE_GENERATION_MODEL: AIModel = "google/gemini-3-pro-image-preview";

/**
 * Generate optimized listing from input data
 */
export async function generateListing(
  input: ListingGenerationInput,
  model: AIModel = DEFAULT_MODEL,
): Promise<GeneratedListing> {
  const prompt = buildListingPrompt(input);

  const messages: AIMessage[] = [
    {
      role: "system",
      content: `You are an expert e-commerce listing optimizer specializing in eBay, Poshmark, and Mercari. Your goal is to create compelling, SEO-optimized listings that drive sales. 

CRITICAL: When a specific writing style is specified, you MUST strictly adhere to that style's tone, vocabulary, and sentence structure. The writing style is not a suggestion - it's a requirement that defines how the description must be written.

IMPORTANT FORMATTING RULES:
- Do NOT use markdown formatting (no **bold**, no *italics*, no # headers)
- Do NOT use asterisks (*) for bullet points - use dashes (-) instead
- Keep descriptions as plain text only - marketplaces do not render markdown
- Use line breaks and dashes for structure, not special characters

Always return valid JSON only.`,
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  try {
    const response = await openRouterClient.createCompletion({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2500,
    });

    const content = response.choices[0].message.content;
    const listing = parseListingResponse(content);
    return listing;
  } catch (error) {
    console.error("Error generating listing:", error);
    throw new Error("Failed to generate listing");
  }
}

/**
 * Generate multiple listings in bulk
 */
export async function generateBulkListings(
  inputs: ListingGenerationInput[],
  model: AIModel = DEFAULT_MODEL,
): Promise<GeneratedListing[]> {
  const promises = inputs.map((input) => generateListing(input, model));
  return Promise.all(promises);
}

/**
 * Analyze product images and extract details
 */
export async function analyzeImages(
  imageUrls: string[],
  model: AIModel = "google/gemini-2.0-flash-001",
): Promise<ImageAnalysisResult> {
  // Build multimodal content array with images
  const imageContent = imageUrls.map((url) => ({
    type: "image_url" as const,
    image_url: { url },
  }));

  const messages = [
    {
      role: "system" as const,
      content: `You are an expert at analyzing product images for e-commerce listings. Identify items, brands, conditions, colors, and suggest optimal categories. Always respond with valid JSON only, no markdown formatting.`,
    },
    {
      role: "user" as const,
      content: [
        ...imageContent,
        {
          type: "text" as const,
          text: `Analyze these product images and provide details.

Return a JSON object with:
{
  "description": "detailed description of the item",
  "detectedItems": ["item1", "item2"],
  "suggestedCategory": "category name",
  "suggestedCondition": "New/Like New/Good/Fair",
  "suggestedBrand": "brand name if visible",
  "colors": ["color1", "color2"],
  "keywords": ["keyword1", "keyword2"]
}

Respond with ONLY the JSON object, no additional text or formatting.`,
        },
      ],
    },
  ];

  try {
    const response = await openRouterClient.createCompletion({
      model,
      messages: messages as AIMessage[],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from AI");
    }
    return parseImageAnalysisResponse(content);
  } catch (error: unknown) {
    console.error("Error analyzing images:", error);
    // Provide more specific error message for credit issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("credits") || errorMessage.includes("afford")) {
      throw new Error(
        "Insufficient OpenRouter credits. Please add credits at https://openrouter.ai/settings/credits",
      );
    }
    throw new Error("Failed to analyze images");
  }
}

/**
 * Optimize existing listing for better performance
 */
export async function optimizeListing(
  currentTitle: string,
  currentDescription: string,
  targetMarketplace: "ebay" | "poshmark" | "mercari",
  model: AIModel = DEFAULT_MODEL,
): Promise<{ title: string; description: string; improvements: string[] }> {
  const messages: AIMessage[] = [
    {
      role: "system",
      content: `You are an expert at optimizing e-commerce listings for ${targetMarketplace}. Improve SEO, readability, and conversion rates. Always return valid JSON only.`,
    },
    {
      role: "user",
      content: `Optimize this listing for ${targetMarketplace}:

Current Title: ${currentTitle}
Current Description: ${currentDescription}

Return a JSON object with:
{
  "title": "optimized title",
  "description": "optimized description",
  "improvements": ["improvement1", "improvement2"]
}`,
    },
  ];

  try {
    const response = await openRouterClient.createCompletion({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 1200,
    });

    const content = response.choices[0].message.content;
    return JSON.parse(extractJSON(content));
  } catch (error) {
    console.error("Error optimizing listing:", error);
    throw new Error("Failed to optimize listing");
  }
}

/**
 * Generate marketplace-specific variations
 */
export async function generateMarketplaceVariations(
  listing: GeneratedListing,
): Promise<{
  ebay: { title: string; description: string };
  poshmark: { title: string; description: string };
  mercari: { title: string; description: string };
}> {
  const messages: AIMessage[] = [
    {
      role: "system",
      content: `You are an expert at adapting listings for different marketplaces. Each platform has unique requirements and best practices. Always return valid JSON only.`,
    },
    {
      role: "user",
      content: `Create platform-specific versions of this listing:

Title: ${listing.title}
Description: ${listing.description}
Tags: ${listing.tags.join(", ")}

Return a JSON object with optimized versions for each platform:
{
  "ebay": { "title": "...", "description": "..." },
  "poshmark": { "title": "...", "description": "..." },
  "mercari": { "title": "...", "description": "..." }
}`,
    },
  ];

  try {
    const response = await openRouterClient.createCompletion({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.6,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    return JSON.parse(extractJSON(content));
  } catch (error) {
    console.error("Error generating variations:", error);
    throw new Error("Failed to generate marketplace variations");
  }
}

/**
 * Build prompt for listing generation
 */
function buildListingPrompt(input: ListingGenerationInput): string {
  // Extract writing style from additionalDetails if present
  let writingStyleInstructions = "";
  if (input.additionalDetails?.includes("Writing style:")) {
    const styleMatch = input.additionalDetails.match(
      /Writing style:\s*(.+?)(?:\n|$)/,
    );
    if (styleMatch) {
      const styleName = styleMatch[1].trim();

      // Map style names to detailed instructions
      const styleInstructions: Record<string, string> = {
        Professional:
          'Use formal and detailed language with technical specifications. Write in a professional tone suitable for serious buyers and collectors. Include comprehensive details about features, materials, and condition. Example tone: "Premium quality item in excellent condition. Features authentic materials and expert craftsmanship."',
        "Casual & Friendly":
          "Use conversational, friendly language that's approachable and engaging. Write as if talking to a friend. Include personal touches and enthusiasm. Example tone: \"Super cute and comfy! This has been one of my favorites. Barely worn and still looks brand new. You're gonna love it!\"",
        "Luxury & Premium":
          'Use sophisticated, elegant language emphasizing exclusivity and quality. Appeal to high-end buyers with refined vocabulary. Example tone: "Exquisite piece showcasing timeless elegance. Meticulously maintained and authenticated. A distinguished addition to any curated collection."',
        "Short & Simple":
          'Use concise, direct language focusing only on key details. Keep sentences short and to the point. Avoid unnecessary words. Example tone: "Like new condition. Size M. Ships fast. No flaws."',
      };

      writingStyleInstructions = styleInstructions[styleName] || "";
    }
  }

  return `Create an optimized product listing with the following details:

${input.title ? `Title: ${input.title}` : ""}
${input.description ? `Description: ${input.description}` : ""}
Category: ${input.category}
Condition: ${input.condition}
${input.price ? `Price: $${input.price}` : ""}
${input.brand ? `Brand: ${input.brand}` : ""}
${
  writingStyleInstructions
    ? `\nWRITING STYLE REQUIREMENTS:\n${writingStyleInstructions}\n\nIMPORTANT: You MUST write the description following the style requirements above. Match the tone, vocabulary, and sentence structure exactly as described.`
    : ""
}
${
  input.additionalDetails && !input.additionalDetails.includes("Writing style:")
    ? `Additional Details: ${input.additionalDetails}`
    : ""
}

Return a JSON object with:
{
  "title": "compelling, SEO-optimized title (max 80 chars)",
  "description": "detailed, persuasive description with key features and benefits${
    writingStyleInstructions
      ? " - MUST follow the writing style requirements specified above"
      : ""
  }",
  "tags": ["relevant", "search", "keywords"],
  "suggestedPrice": estimated_fair_price_number,
  "marketplaceOptimizations": {
    "ebay": "ebay-specific tips",
    "poshmark": "poshmark-specific tips",
    "mercari": "mercari-specific tips"
  }
}`;
}

/**
 * Parse listing response and extract JSON
 */
function parseListingResponse(content: string): GeneratedListing {
  try {
    const jsonStr = extractJSON(content);
    if (!jsonStr || jsonStr.trim() === "") {
      console.error("Empty JSON string from content:", content);
      return {
        title: "Generated Listing",
        description: "Unable to generate description. Please try again.",
        tags: [],
        suggestedPrice: undefined,
        marketplaceOptimizations: {},
      };
    }
    const parsed = JSON.parse(jsonStr);

    return {
      title: parsed.title || "Untitled",
      description: parsed.description || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      suggestedPrice: parsed.suggestedPrice,
      marketplaceOptimizations: parsed.marketplaceOptimizations || {},
    };
  } catch (error) {
    console.error("Error parsing listing response:", error);
    console.error("Raw content:", content);
    // Return default values instead of throwing
    return {
      title: "Generated Listing",
      description: "Unable to parse AI response. Please try again.",
      tags: [],
      suggestedPrice: undefined,
      marketplaceOptimizations: {},
    };
  }
}

/**
 * Parse image analysis response
 */
/**
 * Normalize condition to match database constraint
 * DB expects: 'new', 'like_new', 'good', 'fair', 'poor'
 */
function normalizeCondition(condition: string | undefined): string {
  if (!condition) return "good";

  const normalized = condition.toLowerCase().trim();

  // Map variations to valid values
  const conditionMap: Record<string, string> = {
    new: "new",
    "brand new": "new",
    "like new": "like_new",
    like_new: "like_new",
    likenew: "like_new",
    excellent: "like_new",
    good: "good",
    "very good": "good",
    fair: "fair",
    poor: "poor",
    used: "good",
  };

  return conditionMap[normalized] || "good";
}

function parseImageAnalysisResponse(content: string): ImageAnalysisResult {
  try {
    const jsonStr = extractJSON(content);
    if (!jsonStr || jsonStr.trim() === "") {
      console.error("Empty JSON string from content:", content);
      // Return default values if parsing fails
      return {
        description: "Unable to analyze image",
        detectedItems: [],
        suggestedCategory: "Other",
        suggestedCondition: "good",
        suggestedBrand: undefined,
        colors: [],
        keywords: [],
      };
    }
    const parsed = JSON.parse(jsonStr);

    return {
      description: parsed.description || "",
      detectedItems: Array.isArray(parsed.detectedItems)
        ? parsed.detectedItems
        : [],
      suggestedCategory: parsed.suggestedCategory || "Other",
      suggestedCondition: normalizeCondition(parsed.suggestedCondition),
      suggestedBrand: parsed.suggestedBrand,
      colors: Array.isArray(parsed.colors) ? parsed.colors : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };
  } catch (error) {
    console.error("Error parsing image analysis response:", error);
    console.error("Raw content:", content);
    // Return default values instead of throwing
    return {
      description: "Unable to analyze image",
      detectedItems: [],
      suggestedCategory: "Other",
      suggestedCondition: "good",
      suggestedBrand: undefined,
      colors: [],
      keywords: [],
    };
  }
}

/**
 * Extract JSON from AI response (handles markdown code blocks and truncated responses)
 */
function extractJSON(content: string): string {
  // Remove any leading/trailing whitespace
  content = content.trim();

  // Try to find JSON in markdown code block (greedy match for nested objects)
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    const extracted = jsonMatch[1].trim();
    // Validate it starts with {
    if (extracted.startsWith("{")) {
      return repairTruncatedJSON(extracted);
    }
  }

  // Try to find raw JSON object - find first { and last }
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1);
  }

  // If we only found opening brace, try to repair truncated JSON
  if (firstBrace !== -1) {
    return repairTruncatedJSON(content.slice(firstBrace));
  }

  // Return as-is if no match
  return content;
}

/**
 * Attempt to repair truncated JSON by closing open brackets and quotes
 */
function repairTruncatedJSON(json: string): string {
  // If it already ends with }, try to parse as-is
  if (json.trim().endsWith("}")) {
    return json;
  }

  // Count open brackets and braces
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    const prevChar = i > 0 ? json[i - 1] : "";

    // Track string state (ignoring escaped quotes)
    if (char === '"' && prevChar !== "\\") {
      inString = !inString;
    }

    if (!inString) {
      if (char === "{") openBraces++;
      else if (char === "}") openBraces--;
      else if (char === "[") openBrackets++;
      else if (char === "]") openBrackets--;
    }
  }

  // Build repair suffix
  let repair = "";

  // Close any open string
  if (inString) {
    repair += '"';
  }

  // Close any open arrays
  for (let i = 0; i < openBrackets; i++) {
    repair += "]";
  }

  // Close any open objects
  for (let i = 0; i < openBraces; i++) {
    repair += "}";
  }

  return json + repair;
}

/**
 * Calculate estimated cost for AI operation
 */
export function estimateCost(tokens: number, model: AIModel): number {
  // Pricing per 1M tokens (approximate)
  const pricing: Record<string, number> = {
    "google/gemini-3-pro-preview": 1.25,
    "google/gemini-3-pro-image-preview": 2.0,
    "anthropic/claude-3.5-sonnet": 3.0,
    "openai/gpt-4-turbo": 10.0,
    "openai/gpt-4o": 5.0,
    "openai/gpt-3.5-turbo": 0.5,
    "meta-llama/llama-3.1-70b-instruct": 0.8,
    "google/gemini-pro": 0.5,
  };

  const pricePerMillion = pricing[model] || 1.0;
  return (tokens / 1_000_000) * pricePerMillion;
}

/**
 * Generate AI product listing images
 * Generates 3 images sequentially using Gemini 3 Pro Image model
 */
export async function generateProductImages(
  productDescription: string,
  category: string,
  style: "professional" | "lifestyle" | "minimal" = "professional",
): Promise<string[]> {
  const imagePrompts = [
    `Professional e-commerce product photo of ${productDescription}. Category: ${category}. Style: ${style}. Clean white background, studio lighting, high resolution, front view.`,
    `Professional e-commerce product photo of ${productDescription}. Category: ${category}. Style: ${style}. Clean white background, studio lighting, high resolution, angle view showing details.`,
    `Professional e-commerce product photo of ${productDescription}. Category: ${category}. Style: ${style}. Lifestyle context shot, natural lighting, high resolution, in-use or styled setting.`,
  ];

  const generatedImages: string[] = [];

  // Generate images sequentially
  for (const prompt of imagePrompts) {
    try {
      const messages: AIMessage[] = [
        {
          role: "system",
          content:
            "You are a professional product photographer AI. Generate high-quality e-commerce product images.",
        },
        {
          role: "user",
          content: prompt,
        },
      ];

      const response = await openRouterClient.createCompletion({
        model: IMAGE_GENERATION_MODEL,
        messages,
        temperature: 0.8,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      // Extract image URL from response (format depends on OpenRouter's response for image models)
      generatedImages.push(content);
    } catch (error) {
      console.error("Error generating product image:", error);
      // Continue with remaining images even if one fails
    }
  }

  if (generatedImages.length === 0) {
    throw new Error("Failed to generate any product images");
  }

  return generatedImages;
}
