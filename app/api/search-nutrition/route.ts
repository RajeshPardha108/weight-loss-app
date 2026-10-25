import { NextRequest, NextResponse } from "next/server";
import { getGenAI } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "A search query string is required." },
        { status: 400 }
      );
    }

    const systemInstruction = `You are an up-to-date Nutritional Research Assistant.
Your task is to use Google Search data to find verified, real-world nutritional information, typical serving sizes, calorie estimates, and macronutrient breakdowns (protein, carbs, fats) for the user's requested food, restaurant dish, or beverage.
Cite specific facts and numbers clearly.
Provide a concise overview followed by:
1. Estimated Calories & Macronutrients (per standard serving)
2. Ingredients or preparation highlights
3. Healthier customization tips (if applicable)
Keep the response clear and easy to read.`;

    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Look up verified nutritional data and calorie facts for: "${query}".`,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      },
    });

    const reply = response.text || "No information found.";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
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

    const searchQueries: string[] = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    return NextResponse.json({
      success: true,
      query,
      content: reply,
      sources,
      searchQueries,
      modelUsed: "gemini-3.8-flash",
    });
  } catch (error: any) {
    console.error("[API /api/search-nutrition error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to search nutrition information.",
      },
      { status: 500 }
    );
  }
}
