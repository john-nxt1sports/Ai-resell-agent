/**
 * Smart Analysis Pipeline — Unified Agentic Flow (2026 Best Practices)
 *
 * Consolidates image analysis, market research, image ordering, and
 * listing generation into a single pipeline triggered on image upload.
 *
 * Pipeline Steps:
 *   1. Analyze Images     → brand, category, condition, colors, keywords
 *   2. Order Images       → recommend optimal photo order for marketplaces
 *   3. Market Research    → live pricing, sold comps, trending keywords (Gemini :online)
 *   4. Generate Listing   → title, description, tags, suggested price
 *   5. Platform Content   → marketplace-specific titles/descriptions/hashtags
 *
 * Uses Gemini 2.5 Flash (:online variant for research, standard for content).
 */

import { openRouterClient } from "./client";
import {
  AIMessage,
  AIModel,
  ImageAnalysisResult,
  GeneratedListing,
  SmartAnalysisResult,
  ImageOrderRecommendation,
  MarketResearch,
  PlatformContent,
} from "./types";

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

/** Vision + analysis model (fast, multimodal) */
const VISION_MODEL: AIModel = "google/gemini-2.5-flash";

/** Model with live web search for market research */
const RESEARCH_MODEL = "google/gemini-2.5-flash:online" as AIModel;

/** Fast model for content generation */
const CONTENT_MODEL: AIModel = "google/gemini-2.5-flash";

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export interface SmartAnalyzeInput {
  imageUrls: string[];
  /** User-provided title (optional, AI will generate if empty) */
  title?: string;
  /** User-provided price (optional, AI will suggest) */
  price?: number;
  /** User's chosen writing style */
  writingStyle?: string;
  /** User-provided brand override */
  brand?: string;
  /** User-provided category override */
  category?: string;
  /** User-provided condition override */
  condition?: string;
}

/**
 * Run the full smart analysis pipeline.
 *
 * Steps execute in sequence because each feeds into the next:
 *   images → analysis → research → ordering → content generation
 */
export async function runSmartAnalysis(
  input: SmartAnalyzeInput,
): Promise<SmartAnalysisResult> {
  const startTime = Date.now();
  const steps: string[] = [];

  // ── Step 1: Analyze Images ───────────────────────────────────────
  steps.push("image_analysis");
  const imageAnalysis = await analyzeImagesStep(input.imageUrls);

  // Merge user overrides with AI analysis
  const brand = input.brand || imageAnalysis.suggestedBrand || "";
  const category = input.category || imageAnalysis.suggestedCategory || "";
  const condition =
    input.condition || imageAnalysis.suggestedCondition || "good";

  // ── Step 2: Order Images ─────────────────────────────────────────
  steps.push("image_ordering");
  const imageOrder = await orderImagesStep(input.imageUrls, imageAnalysis);

  // ── Step 3: Market Research (live web) ───────────────────────────
  steps.push("market_research");
  let marketResearch: MarketResearch | null = null;
  try {
    marketResearch = await marketResearchStep({
      title: input.title || imageAnalysis.description,
      brand,
      category,
      condition,
      price: input.price,
      firstImageUrl: input.imageUrls[0],
    });
  } catch (err) {
    console.error("[SmartAnalysis] Market research failed (non-fatal):", err);
    // Non-fatal — we continue without market data
  }

  // ── Step 4 + 5: Generate listing + platform content ──────────────
  steps.push("content_generation");
  steps.push("platform_optimization");
  const { generatedListing, platformContent } = await generateContentStep({
    imageAnalysis,
    marketResearch,
    brand,
    category,
    condition,
    userTitle: input.title,
    userPrice: input.price,
    writingStyle: input.writingStyle,
  });

  const totalDuration = Date.now() - startTime;

  return {
    imageAnalysis,
    imageOrder,
    marketResearch,
    generatedListing,
    platformContent,
    pipeline: {
      steps,
      totalDuration,
      model: VISION_MODEL,
    },
  };
}

// ---------------------------------------------------------------------------
// Step 1: Image Analysis
// ---------------------------------------------------------------------------

async function analyzeImagesStep(
  imageUrls: string[],
): Promise<ImageAnalysisResult> {
  const imageContent = imageUrls.map((url) => ({
    type: "image_url" as const,
    image_url: { url },
  }));

  const messages: AIMessage[] = [
    {
      role: "system",
      content:
        "You are an expert product authenticator and e-commerce image analyst. " +
        "Identify items, brands, models, conditions, colors, sizes, and suggest " +
        "optimal categories. Always respond with valid JSON only, no markdown.",
    },
    {
      role: "user",
      content: [
        ...imageContent,
        {
          type: "text" as const,
          text: `Analyze these product images thoroughly.

Return a JSON object with:
{
  "description": "detailed 2-3 sentence description of the product, mention brand/model if visible",
  "detectedItems": ["item1", "item2"],
  "suggestedCategory": "most specific category (e.g. 'Shoes > Athletic > Running')",
  "suggestedCondition": "new|like_new|good|fair|poor",
  "suggestedBrand": "brand name if identifiable, null otherwise",
  "size": "size if visible (e.g. '10', 'Small', '10W'), null if not visible",
  "measurements": "measurements if visible (e.g. '7\" H x 8\" W'), null if not visible",
  "colors": ["primary color", "secondary color"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Be precise about the brand — look at logos, tags, labels, stitching patterns.
Use lowercase snake_case for suggestedCondition.
RESPOND WITH ONLY THE JSON.`,
        },
      ],
    },
  ];

  const response = await openRouterClient.createCompletion({
    model: VISION_MODEL,
    messages,
    temperature: 0.2,
    max_tokens: 800,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from image analysis");

  return parseJSON<ImageAnalysisResult>(content, {
    description: "Unable to analyze image",
    detectedItems: [],
    suggestedCategory: "Other",
    suggestedCondition: "good",
    suggestedBrand: undefined,
    size: undefined,
    measurements: undefined,
    colors: [],
    keywords: [],
  });
}

// ---------------------------------------------------------------------------
// Step 2: Image Ordering
// ---------------------------------------------------------------------------

async function orderImagesStep(
  imageUrls: string[],
  analysis: ImageAnalysisResult,
): Promise<ImageOrderRecommendation[]> {
  // If only 1 image, no reordering needed
  if (imageUrls.length <= 1) {
    return [{ originalIndex: 0, newPosition: 0, role: "Main photo" }];
  }

  const imageContent = imageUrls.map((url) => ({
    type: "image_url" as const,
    image_url: { url },
  }));

  const messages: AIMessage[] = [
    {
      role: "system",
      content:
        "You are an e-commerce photography expert specializing in marketplace listing optimization. " +
        "You know that the first image is the thumbnail/hero image and must be the most visually appealing, " +
        "well-lit, front-facing product shot. Subsequent images should show details, tags, flaws, and angles.",
    },
    {
      role: "user",
      content: [
        ...imageContent,
        {
          type: "text" as const,
          text: `I have ${imageUrls.length} product images (numbered 0 to ${imageUrls.length - 1} in the order shown above).

Product: ${analysis.description}
Category: ${analysis.suggestedCategory}

Recommend the optimal display order for marketplace listings (eBay, Poshmark, Mercari, Flyp).

Rules:
- Position 0 = hero/thumbnail image (best overall shot, clean, well-lit, front-facing)
- Position 1 = secondary angle or brand/label close-up
- Higher positions = detail shots, tags, flaws, lifestyle angles

Return a JSON array with one entry per image:
[
  { "originalIndex": 0, "newPosition": 2, "role": "Detail shot showing texture" },
  { "originalIndex": 1, "newPosition": 0, "role": "Best hero image - clean front view" },
  ...
]

RESPOND WITH ONLY THE JSON ARRAY.`,
        },
      ],
    },
  ];

  const response = await openRouterClient.createCompletion({
    model: VISION_MODEL,
    messages,
    temperature: 0.2,
    max_tokens: 600,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    // Fallback: keep original order
    return imageUrls.map((_, i) => ({
      originalIndex: i,
      newPosition: i,
      role: i === 0 ? "Main photo" : `Photo ${i + 1}`,
    }));
  }

  try {
    const parsed = parseJSON<ImageOrderRecommendation[]>(content, null);
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Invalid ordering response");
    }
    // Validate & deduplicate positions
    return normalizeImageOrder(parsed, imageUrls.length);
  } catch {
    return imageUrls.map((_, i) => ({
      originalIndex: i,
      newPosition: i,
      role: i === 0 ? "Main photo" : `Photo ${i + 1}`,
    }));
  }
}

/** Ensures every position is unique and all images are accounted for */
function normalizeImageOrder(
  order: ImageOrderRecommendation[],
  totalImages: number,
): ImageOrderRecommendation[] {
  const usedPositions = new Set<number>();
  const usedIndices = new Set<number>();
  const result: ImageOrderRecommendation[] = [];

  // First pass — validate AI's recommendations
  for (const item of order) {
    const idx = item.originalIndex;
    const pos = item.newPosition;
    if (
      idx >= 0 &&
      idx < totalImages &&
      pos >= 0 &&
      pos < totalImages &&
      !usedPositions.has(pos) &&
      !usedIndices.has(idx)
    ) {
      usedPositions.add(pos);
      usedIndices.add(idx);
      result.push(item);
    }
  }

  // Second pass — fill any gaps (images the AI missed)
  for (let i = 0; i < totalImages; i++) {
    if (!usedIndices.has(i)) {
      let nextPos = 0;
      while (usedPositions.has(nextPos)) nextPos++;
      usedPositions.add(nextPos);
      usedIndices.add(i);
      result.push({
        originalIndex: i,
        newPosition: nextPos,
        role: `Photo ${nextPos + 1}`,
      });
    }
  }

  return result.sort((a, b) => a.newPosition - b.newPosition);
}

// ---------------------------------------------------------------------------
// Step 3: Market Research (Live Web Search)
// ---------------------------------------------------------------------------

interface ResearchInput {
  title: string;
  brand: string;
  category: string;
  condition: string;
  price?: number;
  firstImageUrl?: string;
}

async function marketResearchStep(
  input: ResearchInput,
): Promise<MarketResearch> {
  const product = [input.brand, input.title].filter(Boolean).join(" ");

  const imageContent = input.firstImageUrl
    ? [
        {
          type: "image_url" as const,
          image_url: { url: input.firstImageUrl },
        },
      ]
    : [];

  const messages: AIMessage[] = [
    {
      role: "system",
      content:
        "You are a professional reseller market research analyst. " +
        "Search the web RIGHT NOW for real-time pricing data, sold comparables, " +
        "and trending keywords. Always respond with valid JSON only.",
    },
    {
      role: "user",
      content: [
        ...imageContent,
        {
          type: "text" as const,
          text: `Research this product on the live internet:

PRODUCT: ${product}
CATEGORY: ${input.category}
CONDITION: ${input.condition}
${input.price ? `SELLER'S ASKING PRICE: $${input.price}` : ""}

SEARCH FOR:
1. eBay sold comps (last 5-10 comparable sales)
2. eBay active listings (current lowest price)
3. Poshmark comps (active & sold pricing)
4. Mercari comps (active & sold pricing)
5. Trending keywords from top-performing listings

Return JSON ONLY:
{
  "avgSoldPrice": 0.00,
  "lowestActivePrice": 0.00,
  "highestSoldPrice": 0.00,
  "recommendedPrice": 0.00,
  "priceRangeLow": 0.00,
  "priceRangeHigh": 0.00,
  "numCompsFound": 0,
  "demandLevel": "low|medium|high",
  "trendingKeywords": ["keyword1", "keyword2"],
  "topSellingTitles": ["title1", "title2"],
  "comps": [
    {"title": "...", "price": 0.00, "sold": true, "platform": "ebay", "url": "..."}
  ],
  "marketSummary": "2-3 sentence market analysis with pricing recommendation"
}

IMPORTANT: recommendedPrice should be competitive yet profitable.
RESPOND WITH ONLY THE JSON.`,
        },
      ],
    },
  ];

  const response = await openRouterClient.createCompletion({
    model: RESEARCH_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from market research");

  return parseJSON<MarketResearch>(content, {
    avgSoldPrice: 0,
    lowestActivePrice: 0,
    highestSoldPrice: 0,
    recommendedPrice: 0,
    priceRangeLow: 0,
    priceRangeHigh: 0,
    numCompsFound: 0,
    demandLevel: "medium",
    trendingKeywords: [],
    topSellingTitles: [],
    comps: [],
    marketSummary: "",
  });
}

// ---------------------------------------------------------------------------
// Step 4 + 5: Content Generation + Platform Optimization
// ---------------------------------------------------------------------------

interface ContentInput {
  imageAnalysis: ImageAnalysisResult;
  marketResearch: MarketResearch | null;
  brand: string;
  category: string;
  condition: string;
  userTitle?: string;
  userPrice?: number;
  writingStyle?: string;
}

async function generateContentStep(input: ContentInput): Promise<{
  generatedListing: GeneratedListing;
  platformContent: SmartAnalysisResult["platformContent"];
}> {
  const {
    imageAnalysis,
    marketResearch,
    brand,
    category,
    condition,
    userTitle,
    userPrice,
    writingStyle,
  } = input;

  // Build research context for the prompt
  let researchContext = "";
  if (marketResearch && marketResearch.numCompsFound > 0) {
    researchContext = `
LIVE MARKET DATA (from real-time research):
- Average Sold Price: $${marketResearch.avgSoldPrice.toFixed(2)}
- Recommended Price: $${marketResearch.recommendedPrice.toFixed(2)}
- Price Range: $${marketResearch.priceRangeLow.toFixed(2)} - $${marketResearch.priceRangeHigh.toFixed(2)}
- Demand Level: ${marketResearch.demandLevel}
- Comps Found: ${marketResearch.numCompsFound}
- Trending Keywords: ${marketResearch.trendingKeywords.slice(0, 10).join(", ")}
- Top Selling Titles: ${marketResearch.topSellingTitles.slice(0, 3).join(" | ")}
- Market Summary: ${marketResearch.marketSummary}`;
  }

  // Writing style instructions
  const styleMap: Record<string, string> = {
    professional:
      "Use formal, detailed language with technical specifications. Professional tone for serious buyers.",
    casual:
      "Use conversational, friendly language. Write like talking to a friend. Enthusiastic and approachable.",
    luxury:
      "Use sophisticated, elegant language. Emphasize exclusivity, craftsmanship, and premium quality.",
    minimal:
      "Use concise, direct language. Short sentences. Key details only. No filler.",
  };
  const styleInstructions = writingStyle
    ? `\n\nWRITING STYLE: ${styleMap[writingStyle] || "Professional tone."}`
    : "";

  // Platform limits
  const LIMITS = {
    poshmark: { title: 80, description: 1500 },
    ebay: { title: 80, description: 4000 },
    mercari: { title: 80, description: 1000 },
    flyp: { title: 255, description: 1000 },
  };

  const messages: AIMessage[] = [
    {
      role: "system",
      content:
        "You are an expert e-commerce listing optimizer for eBay, Poshmark, Mercari, and Flyp. " +
        "You create compelling, SEO-optimized listings that maximize sales. " +
        "IMPORTANT FORMATTING: Do NOT use markdown (**bold**, *italics*, # headers). " +
        "Use plain text only with dashes (-) for bullet points. " +
        "Marketplaces do not render markdown. " +
        "Follow the exact title and description format provided in the user instructions." +
        styleInstructions,
    },
    {
      role: "user",
      content: `Create an optimized listing with platform-specific versions.

PRODUCT ANALYSIS (from AI image analysis):
- Description: ${imageAnalysis.description}
- Detected Items: ${imageAnalysis.detectedItems.join(", ")}
- Category: ${category}
- Condition: ${condition}
- Brand: ${brand || "Unknown"}
- Colors: ${imageAnalysis.colors.join(", ")}
- Keywords: ${imageAnalysis.keywords.join(", ")}
- Size (from images): ${imageAnalysis.size || "Not visible"}
- Measurements (from images): ${imageAnalysis.measurements || "Not visible"}
${userTitle ? `- User Title: ${userTitle}` : ""}
${userPrice ? `- User Price: $${userPrice}` : ""}
${researchContext}

TITLE FORMAT (exactly one line):
Brand Model Key Descriptor Material Color Detail Gender
Example:
Clarks Zylah May Snake Print Loafers Black Chain Link Detail Womens

DESCRIPTION FORMAT (exact layout, blank lines between sections):
Paragraph 1: 2-3 sentences, strong opening, highlight item and material/print.
Paragraph 2: 2-3 sentences, highlight detail, comfort, use-cases.

Brand: ...
Model: ...
Material: ...
Print: ...
Style: ...
Details: ...
Fit: ...
Look: ...
Occasion: ...
Measurements: ... (only if measurements are visible)

Size: ... (always include a size line; use "Not listed" if not visible)

FAST SHIPPING

Thanks for shopping 😊

IMPORTANT:
- Do NOT output "Not applicable", "Not visible", or "Unknown" in the attribute lines.
- If an attribute is unknown, omit that line entirely (except Size, which must always appear).
- Only include Measurements when measurements are clearly visible.

Return a single JSON object with:
{
  "title": "compelling SEO title (max 80 chars)",
  "description": "description formatted EXACTLY as specified above",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggestedPrice": ${marketResearch?.recommendedPrice || userPrice || "null"},
  "marketplaceOptimizations": {
    "ebay": "eBay-specific tips",
    "poshmark": "Poshmark-specific tips",
    "mercari": "Mercari-specific tips"
  },
  "platformContent": {
    "ebay": {
      "title": "eBay-optimized title (max ${LIMITS.ebay.title} chars, use keywords from trending data)",
      "description": "eBay-specific description (max ${LIMITS.ebay.description} chars, HTML-friendly, item specifics format)",
      "hashtags": []
    },
    "poshmark": {
      "title": "Poshmark-optimized title (max ${LIMITS.poshmark.title} chars)",
      "description": "Poshmark-specific description (max ${LIMITS.poshmark.description} chars, include size/brand/condition, engaging tone)",
      "hashtags": ["#brand", "#category", "#style", "#trending"]
    },
    "mercari": {
      "title": "Mercari-optimized title (max ${LIMITS.mercari.title} chars)",
      "description": "Mercari-specific description (max ${LIMITS.mercari.description} chars, concise, condition details)",
      "hashtags": []
    },
    "flyp": {
      "title": "Flyp-optimized title (max ${LIMITS.flyp.title} chars, descriptive)",
      "description": "Flyp-specific description (max ${LIMITS.flyp.description} chars)",
      "hashtags": []
    }
  }
}

${marketResearch ? "USE the trending keywords and top selling title patterns from the market research to optimize titles and descriptions for maximum visibility." : ""}

RESPOND WITH ONLY THE JSON.`,
    },
  ];

  const response = await openRouterClient.createCompletion({
    model: CONTENT_MODEL,
    messages,
    temperature: 0.6,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from content generation");

  const defaultPlatform: PlatformContent = {
    title: "",
    description: "",
    hashtags: [],
  };

  const parsed = parseJSON<Record<string, unknown>>(content, {
    title: "Generated Listing",
    description: imageAnalysis.description,
    tags: imageAnalysis.keywords,
    suggestedPrice: marketResearch?.recommendedPrice || userPrice,
    marketplaceOptimizations: {},
    platformContent: {
      ebay: defaultPlatform,
      poshmark: defaultPlatform,
      mercari: defaultPlatform,
      flyp: defaultPlatform,
    },
  });

  const generatedListing: GeneratedListing = {
    title: (parsed.title as string) || "Untitled",
    description: (parsed.description as string) || "",
    tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]) : [],
    suggestedPrice: parsed.suggestedPrice as number,
    marketplaceOptimizations:
      (parsed.marketplaceOptimizations as Record<string, unknown>) || {},
  };

  const pc = (parsed.platformContent as Record<string, unknown>) || {};
  const platformContent: SmartAnalysisResult["platformContent"] = {
    ebay: normalizePlatformContent(pc.ebay, generatedListing),
    poshmark: normalizePlatformContent(pc.poshmark, generatedListing),
    mercari: normalizePlatformContent(pc.mercari, generatedListing),
    flyp: normalizePlatformContent(pc.flyp, generatedListing),
  };

  return { generatedListing, platformContent };
}

function normalizePlatformContent(
  raw: unknown,
  fallback: GeneratedListing,
): PlatformContent {
  if (!raw || typeof raw !== "object") {
    return {
      title: fallback.title,
      description: fallback.description,
      hashtags: [],
    };
  }
  const r = raw as Record<string, unknown>;
  return {
    title: (r.title as string) || fallback.title,
    description: (r.description as string) || fallback.description,
    hashtags: Array.isArray(r.hashtags) ? (r.hashtags as string[]) : [],
  };
}

// ---------------------------------------------------------------------------
// JSON Parser Utility
// ---------------------------------------------------------------------------

function parseJSON<T>(content: string, fallback: T): T;
function parseJSON<T>(content: string, fallback: null): T | null;
function parseJSON<T>(content: string, fallback: T | null): T | null {
  try {
    const cleaned = extractJSON(content);
    if (!cleaned || cleaned.trim() === "") {
      console.error("[SmartAnalysis] Empty JSON from content:", content);
      return fallback;
    }
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("[SmartAnalysis] JSON parse error:", err);
    console.error("[SmartAnalysis] Raw content:", content);
    return fallback;
  }
}

function extractJSON(content: string): string {
  content = content.trim();

  // Try markdown code block
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    const extracted = jsonMatch[1].trim();
    if (extracted.startsWith("{") || extracted.startsWith("[")) {
      return repairTruncatedJSON(extracted);
    }
  }

  // Try raw JSON — find first { or [ and last } or ]
  const firstOpen = Math.min(
    content.indexOf("{") === -1 ? Infinity : content.indexOf("{"),
    content.indexOf("[") === -1 ? Infinity : content.indexOf("["),
  );
  const isArray = content[firstOpen] === "[";
  const closer = isArray ? "]" : "}";
  const lastClose = content.lastIndexOf(closer);

  if (firstOpen !== Infinity && lastClose > firstOpen) {
    return content.slice(firstOpen, lastClose + 1);
  }

  if (firstOpen !== Infinity) {
    return repairTruncatedJSON(content.slice(firstOpen));
  }

  return content;
}

function repairTruncatedJSON(json: string): string {
  if (json.trim().endsWith("}") || json.trim().endsWith("]")) {
    return json;
  }

  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    const prev = i > 0 ? json[i - 1] : "";
    if (ch === '"' && prev !== "\\") inString = !inString;
    if (!inString) {
      if (ch === "{") openBraces++;
      else if (ch === "}") openBraces--;
      else if (ch === "[") openBrackets++;
      else if (ch === "]") openBrackets--;
    }
  }

  let repair = "";
  if (inString) repair += '"';
  for (let i = 0; i < openBrackets; i++) repair += "]";
  for (let i = 0; i < openBraces; i++) repair += "}";

  return json + repair;
}
