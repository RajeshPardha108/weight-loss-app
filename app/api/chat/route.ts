import { NextRequest, NextResponse } from "next/server";
import { ThinkingLevel } from "@google/genai";
import { getGenAI } from "@/lib/gemini";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "model" | "assistant";
  content: string;
}

const ROLE_SYSTEM_INSTRUCTIONS: Record<string, string> = {
  coach: `You are an expert Health & Weight Loss Coach.
Your mission is to guide, motivate, and empower the user toward sustainable fat loss, healthy muscle retention, and daily consistency.
Be empathetic, encouraging, concise, and scientifically sound.
Avoid extreme crash diets. Emphasize sustainable lifestyle habits, daily hydration, steps, and balanced nutrition.
When relevant, reference the user's logged metrics to give personalized encouragement.`,

  nutritionist: `You are an elite Clinical Nutritionist & Macro Specialist.
Provide precise, evidence-based nutrition advice, meal planning strategies, high-protein recipes, and sensible macro breakdowns.
Explain nutritional facts clearly, offer healthy whole-food swaps, and debunk diet myths.
Always consider practical cooking habits, satiety, micronutrient balance, and dietary flexibility.`,

  fitness: `You are a certified Strength & Conditioning Trainer.
Provide progressive, safe workout recommendations, NEAT / daily step guidance, resistance training principles, and recovery advice.
Help users prevent injury, understand caloric expenditure vs intake, and maintain muscle while shedding body fat.`,

  strategist: `You are a Deep Metabolic & Weight Plateau Strategist.
Use advanced exercise physiology, metabolic adaptation insights, and progressive data review to diagnose why a weight loss plateau has occurred and devise precise adjustments (e.g., diet breaks, refeeds, NEAT changes, macro rebalancing).
Explain the underlying physiological reasons with clinical clarity.`,
};

function buildSanitizedContents(messages: ChatMessage[]) {
  const normalized = messages
    .filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === "assistant" || m.role === "model" ? ("model" as const) : ("user" as const),
      text: m.content.trim(),
    }));

  // Drop leading model messages (e.g., initial welcome banner) so the first turn is always "user"
  while (normalized.length > 0 && normalized[0].role !== "user") {
    normalized.shift();
  }

  // Merge consecutive turns of the same role so user and model strictly alternate
  const merged: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const item of normalized) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === item.role) {
      prev.parts[0].text += `\n\n${item.text}`;
    } else {
      merged.push({
        role: item.role,
        parts: [{ text: item.text }],
      });
    }
  }

  return merged;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      persona = "coach",
      useGoogleSearch = false,
      userMetrics = null,
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "A non-empty messages array is required." },
        { status: 400 }
      );
    }

    const contents = buildSanitizedContents(messages);
    if (contents.length === 0) {
      return NextResponse.json(
        { error: "No valid user message found in conversation." },
        { status: 400 }
      );
    }

    const targetModel = "gemini-3.8-flash";

    // Compose system instruction with user metrics if available
    let baseInstruction =
      ROLE_SYSTEM_INSTRUCTIONS[persona] || ROLE_SYSTEM_INSTRUCTIONS.coach;
    if (userMetrics) {
      baseInstruction += `\n\n[USER CURRENT PROFILE & LOGGED DATA]:
- Current Recorded Weight: ${userMetrics.currentWeight ? `${userMetrics.currentWeight} kg` : "Not recorded"}
- Active Goal: ${userMetrics.activeGoal ? `${userMetrics.activeGoal} kg` : "95 kg"}
- Final Target Weight: ${userMetrics.finalGoal ? `${userMetrics.finalGoal} kg` : "70 kg"}
- Today's Steps: ${userMetrics.todaySteps ? userMetrics.todaySteps.toLocaleString() : "Not logged yet"}
- Today's Water: ${userMetrics.todayWater ? `${userMetrics.todayWater} L` : "Not logged yet"}
- Today's Meal Status: ${userMetrics.todayMealStatus || "Not logged yet"}
- Recent 7-Day Weight Average: ${userMetrics.avg7Day ? `${userMetrics.avg7Day} kg` : "N/A"}
Use this factual context naturally to provide tailored feedback and celebrate their milestones!`;
    }

    const ai = getGenAI();

    const baseConfig: Record<string, any> = {
      systemInstruction: baseInstruction,
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
    };

    let response;
    if (useGoogleSearch) {
      try {
        response = await ai.models.generateContent({
          model: targetModel,
          contents,
          config: {
            ...baseConfig,
            tools: [{ googleSearch: {} }],
          },
        });
      } catch (searchErr) {
        console.warn("[API /api/chat] Search grounding failed, retrying without search:", searchErr);
        response = await ai.models.generateContent({
          model: targetModel,
          contents,
          config: baseConfig,
        });
      }
    } else {
      response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config: baseConfig,
      });
    }

    const reply =
      response.text ||
      response.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || "")
        .join("")
        .trim() ||
      "I was unable to generate a response. Please try again.";

    // Extract Google Search Grounding sources if available
    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources: Array<{ title: string; url: string }> = [];

    if (groundingChunks && Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri,
          });
        }
      }
    }

    const searchQueries: string[] =
      response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    return NextResponse.json({
      reply,
      sources,
      searchQueries,
      modelUsed: targetModel,
      grounded: sources.length > 0,
    });
  } catch (error: any) {
    console.error("[API /api/chat error]:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to process chat message with Gemini.",
        reply: `I encountered an issue generating a response: ${error.message || "Unknown error"}. Please try again.`,
        sources: [],
        searchQueries: [],
        modelUsed: "fallback",
      },
      { status: 500 }
    );
  }
}

