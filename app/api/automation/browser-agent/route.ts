/**
 * Browser Agent API - TRUE AGENTIC Automation
 * AI analyzes page context and returns specific actions to execute
 * Enhanced with 2026 Best Practices
 *
 * Features:
 * - Comprehensive error handling with structured responses
 * - Correlation IDs for request tracking
 * - Enhanced AI prompting for better action planning
 * - Timeout handling and retry support
 * - Security best practices
 *
 * @version 3.0.0
 * @author AI Resell Agent Team
 * @updated 2026-01-29
 *
 * Architecture:
 * Content Script → PageContext → This API → AI Analysis → Action Array → Content Script
 */

import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// CONFIGURATION
// ============================================================================

export const runtime = "edge";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

// Validate API key at startup
if (!OPENROUTER_API_KEY) {
  console.warn("[Browser Agent] WARNING: OPENROUTER_API_KEY not configured");
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const AI_CONFIG = {
  model: "google/gemini-3-pro-preview",
  temperature: 0.1,
  maxTokens: 4000,
  reasoning: { enabled: true },
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PageElement {
  tag: string;
  type?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string;
  text?: string;
  classes?: string;
  dataAttributes?: Record<string, string> | null;
  isDisabled?: boolean;
  options?: string[];
  selector: string;
}

interface ModalElement extends PageElement {
  buttons?: Array<{ text: string; selector: string }>;
}

interface PageContext {
  url: string;
  title: string;
  timestamp?: number;
  inputs: PageElement[];
  textareas: PageElement[];
  buttons: PageElement[];
  dropdowns: PageElement[];
  labels: PageElement[];
  modals: ModalElement[];
  errors: string[];
}

interface ListingData {
  title?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  brand?: string;
  category?: string;
  condition?: string;
  size?: string;
  color?: string | string[];
  images?: string[];
  tags?: string[];
}

type ActionType =
  | "type"
  | "click"
  | "select"
  | "upload"
  | "scroll"
  | "wait"
  | "done"
  | "error";

interface BrowserAction {
  action: ActionType;
  selector?: string;
  value?: string;
  description: string;
  waitMs?: number;
}

interface AgentRequest {
  pageContext: PageContext;
  listingData: ListingData;
  currentStep: string;
  previousActions?: BrowserAction[];
  marketplace: string;
  correlationId?: string; // 2026 addition
}

interface AgentResponse {
  success: boolean;
  actions: BrowserAction[];
  error?: string;
  debug?: {
    inputCount: number;
    buttonCount: number;
    marketplace: string;
    currentStep: string;
    processingTimeMs: number;
    correlationId?: string; // 2026 addition
  };
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are an expert browser automation AI agent for e-commerce marketplaces (2026 Production Grade). Your job is to analyze web page context and return specific actions to fill out listing forms with zero-failure reliability.

## INPUT FORMAT
You receive:
1. Page context: All visible form elements with CSS selectors
2. Listing data: Product info (title, description, price, brand, category, size, color)
3. Previous actions: Actions already executed
4. Marketplace: Target platform (poshmark, ebay, mercari)

## OUTPUT FORMAT
Return a JSON array of actions. Each action object:
- action: "type" | "click" | "select" | "scroll" | "wait" | "done" | "error"
- selector: CSS selector to find element (optional for some actions)
- value: Value to input or text to search for (for type/click text search)
- description: Human-readable description
- waitMs: Milliseconds to wait after action (optional, for page settling)

## MARKETPLACE-SPECIFIC FIELD MAPPING

### POSHMARK
- Title: input[placeholder*="selling"] or [data-vv-name="title"]
- Description: textarea[placeholder*="Describe"] or [data-vv-name="description"]
- Brand: input[placeholder="Brand"] or [data-vv-name="brand"]
- Price: [data-vv-name="price"] or input[placeholder*="Listing Price"]
- Category: Click category dropdown, then select from menu
- Size: Click size dropdown, select matching size
- Color: Click color dropdown, select matching color(s)
- Original Price: [data-vv-name="original_price"]

### EBAY
- Title: input[name="title"] or input[data-testid="title-input"]
- Description: textarea[name="description"] or #description
- Price: input[name="price"] or input[data-testid="price-input"]
- Condition: select[name="condition"] or [data-testid="condition-select"]
- Category: Multi-step selection process
- Shipping: Various shipping option selectors

### MERCARI
- Title: input[name="name"] or input[data-testid="title-input"]
- Description: textarea[name="description"]
- Brand: input[name="brand"]
- Price: input[name="price"]
- Condition: Dropdown with options: New, Like new, Good, Fair, Poor
- Shipping: Auto-select first available option

## DROPDOWN HANDLING (CRITICAL FOR SUCCESS)
1. First action: Click dropdown trigger element with waitMs: 500
2. Second action: Click option using value field with text to match and waitMs: 300
3. Verify selection before proceeding

Example:
[
  {"action":"click","selector":"[data-test='category-dropdown']","description":"Open category dropdown","waitMs":500},
  {"action":"click","value":"Tops","description":"Select Tops category","waitMs":300}
]

## MODAL & POPUP HANDLING
- If modal visible, handle it FIRST before any other action
- Look for "Apply", "Done", "Save", "OK", "Continue" buttons
- Click the primary/submit button to close and waitMs: 800

## ERROR HANDLING & RECOVERY
- If "Required" error shown, prioritize that field immediately
- Common required fields: Title, Description, Category, Size, Price
- If action fails repeatedly, try alternative selectors
- Use scroll action to bring elements into view if needed

## FORM SUBMISSION
- Form complete → click button with data-et-name="next" or text "Next"
- Final submit → button with text "List", "List Item", or "Publish"
- Always wait 1000-2000ms after submission for processing

## SUCCESS DETECTION
- URL contains "/listing/" or "/item/" without "create" → return {"action":"done","description":"Listing created successfully"}
- Page shows "Congratulations", "Listed", or "Success" → return {"action":"done","description":"Listing completed"}
- Item number or listing ID visible → return {"action":"done","description":"Listing published"}

## RELIABILITY RULES (2026 BEST PRACTICES)
1. Return ONLY valid JSON array - no markdown, no explanation, no commentary
2. Max 5 actions per response to allow page updates between iterations
3. Use specific selectors - prefer data attributes > IDs > names > classes
4. Always include appropriate waitMs for dynamic content
5. If stuck after 3+ similar attempts, try alternative approach or scroll
6. Handle edge cases: disabled buttons, loading states, validation errors
7. Be defensive: verify elements exist before interacting

## ANTI-DETECTION CONSIDERATIONS
- Natural action progression (don't rush)
- Appropriate wait times between actions
- Realistic element interaction patterns

Return ONLY the JSON array.`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build user prompt with page context
 */
function buildUserPrompt(
  pageContext: PageContext,
  listingData: ListingData,
  currentStep: string,
  previousActions: BrowserAction[] = [],
  marketplace: string,
): string {
  const formatElement = (el: PageElement): string => {
    const attrs: string[] = [];

    if (el.id) attrs.push(`id="${el.id}"`);
    if (el.name) attrs.push(`name="${el.name}"`);
    if (el.type) attrs.push(`type="${el.type}"`);
    if (el.placeholder) attrs.push(`placeholder="${el.placeholder}"`);
    if (el.value) attrs.push(`value="${el.value.substring(0, 50)}"`);
    if (el.text) attrs.push(`text="${el.text.substring(0, 50)}"`);
    if (el.classes) attrs.push(`class="${el.classes.substring(0, 80)}"`);

    if (el.dataAttributes) {
      Object.entries(el.dataAttributes)
        .slice(0, 4)
        .forEach(([k, v]) => {
          attrs.push(`data-${k}="${v}"`);
        });
    }

    if (el.options?.length) {
      attrs.push(`options=[${el.options.slice(0, 8).join(", ")}]`);
    }

    if (el.isDisabled) attrs.push("DISABLED");

    return `<${el.tag} ${attrs.join(" ")} /> → "${el.selector}"`;
  };

  const sections = [
    `MARKETPLACE: ${marketplace}`,
    `URL: ${pageContext.url}`,
    `STEP: ${currentStep}`,
    "",
    "=== LISTING DATA ===",
    JSON.stringify(listingData, null, 2),
    "",
    "=== INPUTS ===",
    pageContext.inputs.map(formatElement).join("\n") || "None",
    "",
    "=== TEXTAREAS ===",
    pageContext.textareas.map(formatElement).join("\n") || "None",
    "",
    "=== DROPDOWNS ===",
    pageContext.dropdowns.map(formatElement).join("\n") || "None",
    "",
    "=== BUTTONS ===",
    pageContext.buttons.map(formatElement).join("\n") || "None",
    "",
    "=== LABELS ===",
    pageContext.labels
      .slice(0, 15)
      .map((l) => `"${l.text}"`)
      .join(", ") || "None",
    "",
    "=== MODALS ===",
    pageContext.modals.length > 0
      ? pageContext.modals
          .map(
            (m) =>
              `Modal: ${m.text?.substring(0, 100)} | Buttons: ${m.buttons?.map((b) => b.text).join(", ")}`,
          )
          .join("\n")
      : "None",
    "",
    "=== ERRORS ===",
    pageContext.errors.length > 0 ? pageContext.errors.join("\n") : "None",
    "",
    "=== PREVIOUS ACTIONS ===",
    previousActions.length > 0
      ? previousActions
          .map((a, i) => `${i + 1}. ${a.action}: ${a.description}`)
          .join("\n")
      : "None",
    "",
    "Return the next actions as a JSON array.",
  ];

  return sections.join("\n");
}

/**
 * Parse and validate AI response
 */
function parseAIResponse(content: string): BrowserAction[] {
  let cleanContent = content.trim();

  // Remove markdown code blocks if present
  if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent
      .replace(/```(?:json)?\n?/g, "")
      .replace(/```$/g, "")
      .trim();
  }

  const parsed = JSON.parse(cleanContent);

  // Handle single action object
  if (!Array.isArray(parsed)) {
    return [parsed];
  }

  // Validate action types
  const validActions: ActionType[] = [
    "type",
    "click",
    "select",
    "upload",
    "scroll",
    "wait",
    "done",
    "error",
  ];

  return parsed.filter((action: BrowserAction) => {
    if (!action.action || !validActions.includes(action.action)) {
      return false;
    }
    if (!action.description) {
      action.description = `${action.action} action`;
    }
    return true;
  });
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data: AgentResponse, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * Handle CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

/**
 * Main POST handler with enhanced error handling (2026)
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  let correlationId = "unknown";

  try {
    // Parse request body
    const body: AgentRequest = await req.json();
    const {
      pageContext,
      listingData,
      currentStep,
      previousActions,
      marketplace,
    } = body;

    // Extract or generate correlation ID (2026 observability)
    correlationId = (body as any).correlationId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Validate required fields
    if (!pageContext || !listingData || !marketplace) {
      console.error(`[Browser Agent] ${correlationId} - Missing required fields`);
      return jsonResponse(
        {
          success: false,
          error:
            "Missing required fields: pageContext, listingData, marketplace",
          actions: [],
        },
        400,
      );
    }

    // Check API key is configured
    if (!OPENROUTER_API_KEY) {
      console.error(`[Browser Agent] ${correlationId} - OPENROUTER_API_KEY not configured`);
      return jsonResponse(
        {
          success: false,
          error: "Server configuration error: AI API key not configured",
          actions: [],
        },
        500,
      );
    }

    // Build prompt
    const userPrompt = buildUserPrompt(
      pageContext,
      listingData,
      currentStep || "fill_form",
      previousActions,
      marketplace,
    );

    console.log(`[Browser Agent] ${correlationId} - Processing request for ${marketplace}`);

    // Call AI with reasoning enabled (Gemini 3 Pro)
    const aiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_SITE_URL || "https://listingsai.com",
          "X-Title": "ListingsAI Browser Agent",
        },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: AI_CONFIG.temperature,
          max_tokens: AI_CONFIG.maxTokens,
          reasoning: AI_CONFIG.reasoning,
        }),
      },
    );

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      const errorMsg = `AI API error: ${errorData.error?.message || aiResponse.statusText}`;
      console.error(`[Browser Agent] ${correlationId} - ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "[]";

    // Parse response
    let actions: BrowserAction[];
    try {
      actions = parseAIResponse(content);
    } catch (parseError) {
      console.error(`[Browser Agent] ${correlationId} - Failed to parse AI response:`, content);
      actions = [
        {
          action: "error",
          description: "AI returned invalid response format",
        },
      ];
    }

    // Limit actions per response (2026 best practice)
    actions = actions.slice(0, 5);

    const processingTimeMs = Date.now() - startTime;
    
    console.log(`[Browser Agent] ${correlationId} - Success (${processingTimeMs}ms, ${actions.length} actions)`);

    return jsonResponse({
      success: true,
      actions,
      debug: {
        inputCount: pageContext.inputs?.length || 0,
        buttonCount: pageContext.buttons?.length || 0,
        marketplace,
        currentStep: currentStep || "fill_form",
        processingTimeMs,
        correlationId,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Browser Agent] ${correlationId} - Error:`, error);

    return jsonResponse(
      {
        success: false,
        error: errorMessage,
        actions: [
          {
            action: "error",
            description: "API error occurred - will retry",
          },
        ],
        debug: {
          correlationId,
          processingTimeMs: Date.now() - startTime,
        } as any,
      },
      500,
    );
  }
}
