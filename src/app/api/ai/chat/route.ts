import { NextRequest, NextResponse } from "next/server";
import { openRouterClient } from "@/services/ai/client";
import { AIMessage } from "@/services/ai/types";
import { createClient } from "@/services/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in to use AI chat" },
        { status: 401 },
      );
    }

    const { messages, context } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    // Build system prompt with listing context if provided
    const systemPrompt = buildSystemPrompt(context);

    const aiMessages: AIMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as AIMessage["role"],
        content: msg.content,
      })),
    ];

    const response = await openRouterClient.createCompletion({
      model: "anthropic/claude-3.5-sonnet",
      messages: aiMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantMessage = response.choices[0].message.content;

    return NextResponse.json({
      message: assistantMessage,
      usage: response.usage,
    });
  } catch (error: unknown) {
    console.error("Error in AI chat:", error);
    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : String(error)) ||
          "Failed to process chat",
      },
      { status: 500 },
    );
  }
}

interface ChatContext {
  currentListing?: {
    title?: string;
    category?: string;
    condition?: string;
    price?: number;
  };
  userStats?: {
    totalListings?: number;
    activeListings?: number;
    soldItems?: number;
  };
}

function buildSystemPrompt(context?: ChatContext): string {
  let prompt = `You are an expert AI assistant for an e-commerce listing platform. You help users with:

1. **Listing Optimization**: Improve titles, descriptions, and tags for better visibility
2. **Pricing Strategy**: Suggest competitive pricing based on market data
3. **Photography Tips**: Provide advice for better product photos
4. **SEO & Keywords**: Generate effective tags and keywords
5. **Marketplace Insights**: Platform-specific best practices for eBay, Poshmark, Mercari
6. **Performance Analysis**: Analyze listing performance and suggest improvements

Be concise, actionable, and friendly. Provide specific, practical advice that users can implement immediately.`;

  // Add context if provided
  if (context) {
    prompt += "\n\nCurrent Context:\n";

    if (context.currentListing) {
      prompt += `\nUser's current listing:
- Title: ${context.currentListing.title || "Not set"}
- Category: ${context.currentListing.category || "Not set"}
- Condition: ${context.currentListing.condition || "Not set"}
- Price: ${
        context.currentListing.price
          ? `$${context.currentListing.price}`
          : "Not set"
      }`;
    }

    if (context.userStats) {
      prompt += `\n\nUser's stats:
- Total listings: ${context.userStats.totalListings || 0}
- Active listings: ${context.userStats.activeListings || 0}
- Sold items: ${context.userStats.soldItems || 0}`;
    }
  }

  return prompt;
}
