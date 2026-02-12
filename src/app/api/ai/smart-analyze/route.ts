/**
 * Smart Analysis API Route — Unified Agentic Pipeline
 * POST /api/ai/smart-analyze
 *
 * Single endpoint that runs the full pipeline:
 *   1. Image Analysis  →  2. Image Ordering  →  3. Market Research  →
 *   4. Listing Generation  →  5. Platform Content
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/services/supabase/server";
import {
  runSmartAnalysis,
  SmartAnalyzeInput,
} from "@/services/ai/smart-analyze";
import { estimateCost } from "@/services/ai/service";

export const maxDuration = 120; // Allow up to 2 min for full pipeline

export async function POST(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Validate input ──────────────────────────────────────────────
    const body = await request.json();
    const {
      imageUrls,
      title,
      price,
      writingStyle,
      brand,
      category,
      condition,
    } = body as SmartAnalyzeInput & { imageUrls: string[] };

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image URL is required" },
        { status: 400 },
      );
    }

    if (imageUrls.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 images per request" },
        { status: 400 },
      );
    }

    // ── Run pipeline ────────────────────────────────────────────────
    const startTime = Date.now();

    const result = await runSmartAnalysis({
      imageUrls,
      title,
      price,
      writingStyle,
      brand,
      category,
      condition,
    });

    const duration = Date.now() - startTime;

    // ── Estimate cost ───────────────────────────────────────────────
    // Rough token estimate: images + 3 API calls
    const tokensUsed =
      imageUrls.length * 500 + // image tokens
      2000 + // analysis + ordering
      3000 + // market research
      4000; // content generation
    const cost = estimateCost(tokensUsed, "google/gemini-2.5-flash");

    // ── Log usage ───────────────────────────────────────────────────
    await supabase
      .from("ai_generations")
      .insert({
        user_id: user.id,
        model: "google/gemini-2.5-flash",
        operation_type: "smart_analysis",
        input_data: {
          imageCount: imageUrls.length,
          hasUserTitle: !!title,
          hasUserPrice: !!price,
          writingStyle: writingStyle || null,
        },
        output_data: {
          stepsCompleted: result.pipeline.steps,
          hasMarketResearch: !!result.marketResearch,
          imagesReordered: result.imageOrder.some(
            (o) => o.originalIndex !== o.newPosition,
          ),
          estimatedCost: cost,
        },
        tokens_used: tokensUsed,
        duration_ms: duration,
        success: true,
      })
      .then(({ error }) => {
        if (error) console.error("[SmartAnalyze] Usage log failed:", error);
      });

    // ── Response ────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        imagesAnalyzed: imageUrls.length,
        stepsCompleted: result.pipeline.steps.length,
        totalDuration: duration,
        tokensUsed,
        cost,
      },
    });
  } catch (error: unknown) {
    console.error("[SmartAnalyze API] Error:", error);

    const message =
      (error instanceof Error ? error.message : String(error)) ||
      "Smart analysis pipeline failed";

    // Surface credit issues clearly
    if (message.includes("credits") || message.includes("afford")) {
      return NextResponse.json(
        {
          error:
            "Insufficient OpenRouter credits. Add credits at https://openrouter.ai/settings/credits",
        },
        { status: 402 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
