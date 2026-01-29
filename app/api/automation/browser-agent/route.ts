/**
 * Browser Agent API - TRUE AGENTIC Automation
 * AI analyzes page context and returns specific actions to execute
 *
 * @version 2.0.0
 * @author AI Resell Agent Team
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

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

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
  };
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are an expert browser automation AI agent for e-commerce marketplaces. Your job is to analyze web page context and return specific actions to fill out listing forms.

## INPUT FORMAT
You receive:
1. Page context: All visible form elements with CSS selectors
2. Listing data: Product info (title, description, price, brand, category, size, color)
3. Previous actions: Actions already executed

## OUTPUT FORMAT
Return a JSON array of actions. Each action object:
- action: "type" | "click" | "select" | "scroll" | "wait" | "done" | "error"
- selector: CSS selector to find element (optional for some actions)
- value: Value to input or text to search for (for type/click text search)
- description: Human-readable description
- waitMs: Milliseconds to wait after action (optional)

## POSHMARK FIELD MAPPING
- Title: input[placeholder*="selling"] or [data-vv-name="title"]
- Description: textarea[placeholder*="Describe"] or [data-vv-name="description"]
- Brand: input[placeholder="Brand"] or [data-vv-name="brand"]
- Price: [data-vv-name="price"] or input[placeholder*="Listing Price"]
- Category: Click category dropdown, then select from menu
- Size: Click size dropdown, select matching size
- Color: Click color dropdown, select matching color(s)
- Original Price: [data-vv-name="original_price"]

## DROPDOWN HANDLING (CRITICAL)
1. First action: Click dropdown trigger element
2. Add waitMs: 500 for dropdown to open
3. Second action: Click option using value field with text to match

Example:
[
  {"action":"click","selector":"[data-test='category-dropdown']","description":"Open category","waitMs":500},
  {"action":"click","value":"Tops","description":"Select Tops","waitMs":300}
]

## MODAL HANDLING
- If modal visible, handle it FIRST
- Look for "Apply", "Done", "Save", "OK" buttons
- Click the primary/submit button to close

## REQUIRED FIELDS
- If "Required" error shown, prioritize that field
- Common required: Title, Description, Category, Size, Price

## SUBMISSION
- Form complete → click button with data-et-name="next" or text "Next"
- Final submit → button with text "List" or "List Item"

## SUCCESS DETECTION
- URL contains "/listing/" without "create" → return {"action":"done","description":"Listing created"}
- Page shows "Congratulations" or "Listed" → return {"action":"done","description":"Success"}

## RULES
1. Return ONLY valid JSON array - no markdown, no explanation
2. Max 5 actions per response to allow page updates
3. Use specific selectors - prefer data attributes over classes
4. If stuck after multiple attempts, return error action

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
 * Main POST handler
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

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

    // Validate required fields
    if (!pageContext || !listingData || !marketplace) {
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

    // Build prompt
    const userPrompt = buildUserPrompt(
      pageContext,
      listingData,
      currentStep || "fill_form",
      previousActions,
      marketplace,
    );

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
      throw new Error(
        `AI API error: ${errorData.error?.message || aiResponse.statusText}`,
      );
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "[]";

    // Parse response
    let actions: BrowserAction[];
    try {
      actions = parseAIResponse(content);
    } catch (parseError) {
      console.error("[Browser Agent] Failed to parse AI response:", content);
      actions = [
        {
          action: "error",
          description: "AI returned invalid response format",
        },
      ];
    }

    // Limit actions per response
    actions = actions.slice(0, 5);

    const processingTimeMs = Date.now() - startTime;

    return jsonResponse({
      success: true,
      actions,
      debug: {
        inputCount: pageContext.inputs?.length || 0,
        buttonCount: pageContext.buttons?.length || 0,
        marketplace,
        currentStep: currentStep || "fill_form",
        processingTimeMs,
      },
    });
  } catch (error) {
    console.error("[Browser Agent] Error:", error);

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        actions: [
          {
            action: "error",
            description: "API error occurred - will retry",
          },
        ],
      },
      500,
    );
  }
}
