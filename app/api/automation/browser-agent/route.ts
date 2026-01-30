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
- selector: CSS selector to find element (required for type/select, optional for click if using value)
- value: For "type": text to input. For "click": text to match in dropdown options
- description: Human-readable description
- waitMs: Milliseconds to wait after action (use 500-800 for dropdowns)

## POSHMARK SPECIFIC INSTRUCTIONS (CRITICAL - FOLLOW EXACTLY)

### Field Selectors
- Title: input[data-vv-name="title"] or input[placeholder*="selling"]
- Description: textarea[data-vv-name="description"]
- Brand: input[data-vv-name="brand"] or input[placeholder="Brand"]
- Price: input[data-vv-name="price"]
  NOTE: Price field triggers a modal - it's auto-dismissed, continue normally
- Original Price: input[data-vv-name="original_price"]

### DROPDOWN HANDLING (THIS IS WHERE MOST FAILURES OCCUR)
Poshmark uses CUSTOM dropdowns, not native <select> elements.

**Pattern for ALL dropdowns:**
1. CLICK the dropdown trigger to OPEN it (waitMs: 600)
2. CLICK the option by TEXT MATCHING using "value" field (waitMs: 400)

**Category Selection (multi-level):**
\`\`\`json
[
  {"action":"click","selector":".listing-editor__section--category .dropdown__selector","description":"Open category dropdown","waitMs":600},
  {"action":"click","value":"Men","description":"Select Men department","waitMs":500},
  {"action":"click","value":"Shoes","description":"Select Shoes category","waitMs":500},
  {"action":"click","value":"Sandals","description":"Select subcategory","waitMs":400}
]
\`\`\`

**Size Selection:**
\`\`\`json
[
  {"action":"click","selector":".listing-editor__section--size .dropdown__selector","description":"Open size dropdown","waitMs":600},
  {"action":"click","value":"7","description":"Select size 7","waitMs":400}
]
\`\`\`

**Color Selection:**
\`\`\`json
[
  {"action":"click","selector":".listing-editor__section--color .dropdown__selector","description":"Open color dropdown","waitMs":600},
  {"action":"click","value":"Black","description":"Select black color","waitMs":400}
]
\`\`\`

### IMPORTANT: When clicking dropdown OPTIONS:
- Use "value" field with the EXACT text you want to match
- Do NOT use selector for options - the executor will find by text
- Wait 600ms after opening dropdown before selecting

## EBAY SPECIFIC
- Title: input[name="title"]
- Description: textarea[name="description"]
- Price: input[name="price"]
- Category: Multi-step process, follow prompts

## MERCARI SPECIFIC
- Title: input[name="name"]
- Description: textarea[name="description"]
- Brand: input[name="brand"]
- Price: input[name="price"]

## MODAL HANDLING (CRITICAL - READ CAREFULLY)
Modals are now reported with full details including:
- buttons: Available buttons in the modal
- dropdowns: Dropdowns inside the modal with their selectors, labels, and current values
- inputs: Input fields inside the modal
- hasRequiredFields: Whether the modal needs interaction before dismissing
- canAutoDismiss: Whether modal can be safely dismissed with primary button

**MODAL WITH MULTIPLE DROPDOWNS (COMMON ON POSHMARK):**
When you see a modal with dropdowns array, you MUST fill them IN ORDER:

1. First, check if a dropdown inside the modal is already expanded (isExpanded: true)
2. If expanded, select the option using: {"action":"click","value":"Option Text","description":"Select option","waitMs":500}
3. If not expanded, open the dropdown first using its selector from the modal.dropdowns array
4. After selecting, the next dropdown may auto-expand - check for isExpanded in next context
5. Only click the primary/submit button AFTER all dropdowns have values (hasRequiredFields: false)

**Example - Modal with 3 dropdowns (Category → Department → Subcategory):**
\`\`\`json
[{"action":"click","selector":"[modal-dropdown selector from context]","description":"Open first dropdown in modal","waitMs":600}]
\`\`\`
Then in next iteration when expanded:
\`\`\`json
[{"action":"click","value":"Men","description":"Select category option","waitMs":500}]
\`\`\`

**IMPORTANT:** Do NOT try to dismiss modals with hasRequiredFields: true - fill the fields first!
Simple modals (canAutoDismiss: true) ARE auto-dismissed. Complex modals require your interaction.

## ERROR RECOVERY
When you see ERRORS in the page context:
1. Address the error IMMEDIATELY
2. Size required → open size dropdown, select a size
3. Category required → open category dropdown, make selection
4. Price required → type in price field

## WHEN TO RETURN ACTIONS
- If fields need filling → return type actions
- If dropdowns need selection → return click sequence (open then select)
- If errors shown → address the error
- If all fields filled → click "Next" button
- If on final page → click "List" or "Publish"

## WHEN TO RETURN EMPTY OR SCROLL
If you're stuck and don't know what to do:
\`\`\`json
[{"action":"scroll","description":"Scroll to reveal more content","waitMs":500}]
\`\`\`

Or try clicking Next:
\`\`\`json
[{"action":"click","selector":"button[data-et-name=\\"next\\"]","description":"Click Next to proceed","waitMs":800}]
\`\`\`

## SUCCESS DETECTION
Return done when:
- URL contains "/listing/" without "create"
- Page shows "Congratulations" or "successfully listed"
\`\`\`json
[{"action":"done","description":"Listing created successfully"}]
\`\`\`

## CRITICAL RULES
1. Return ONLY valid JSON array - no markdown, no text outside JSON
2. Max 5 actions per response
3. Use appropriate waitMs (500-800ms for dropdown interactions)
4. For dropdown options, use VALUE field with text, not selector
5. Address errors before proceeding to Next

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
          .map((m) => {
            const lines = [
              `Modal Type: ${(m as any).type || "unknown"}`,
              `  Text: ${m.text?.substring(0, 100) || "N/A"}`,
              `  Buttons: ${m.buttons?.map((b) => `${b.text}${(b as any).isPrimary ? " (PRIMARY)" : ""}`).join(", ") || "None"}`,
              `  hasRequiredFields: ${(m as any).hasRequiredFields ?? "unknown"}`,
              `  canAutoDismiss: ${(m as any).canAutoDismiss ?? "unknown"}`,
            ];

            // Include dropdown details if present
            const dropdowns = (m as any).dropdowns;
            if (dropdowns && dropdowns.length > 0) {
              lines.push(`  Dropdowns (${dropdowns.length}):`);
              dropdowns.forEach((dd: any, idx: number) => {
                lines.push(
                  `    [${idx + 1}] Label: "${dd.label || "N/A"}" | Selector: "${dd.selector}"`,
                );
                lines.push(
                  `        isExpanded: ${dd.isExpanded} | currentValue: "${dd.currentValue || "empty"}"`,
                );
                if (dd.isExpanded && dd.options?.length > 0) {
                  lines.push(
                    `        OPTIONS: [${dd.options.slice(0, 10).join(", ")}]`,
                  );
                }
              });
            }

            // Include input details if present
            const inputs = (m as any).inputs;
            if (inputs && inputs.length > 0) {
              lines.push(`  Inputs (${inputs.length}):`);
              inputs.forEach((inp: any, idx: number) => {
                lines.push(
                  `    [${idx + 1}] ${inp.type} | Label: "${inp.label || inp.placeholder || "N/A"}" | Value: "${inp.value || "empty"}" | Selector: "${inp.selector}"`,
                );
              });
            }

            return lines.join("\n");
          })
          .join("\n\n")
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
    correlationId =
      (body as any).correlationId ||
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Validate required fields
    if (!pageContext || !listingData || !marketplace) {
      console.error(
        `[Browser Agent] ${correlationId} - Missing required fields`,
      );
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

    console.log(
      `[Browser Agent] ${correlationId} - Processing request for ${marketplace}`,
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
      console.error(
        `[Browser Agent] ${correlationId} - Failed to parse AI response:`,
        content,
      );
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

    console.log(
      `[Browser Agent] ${correlationId} - Success (${processingTimeMs}ms, ${actions.length} actions)`,
    );

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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
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
