import { GoogleGenAI } from "@google/genai";

export function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export const GEMINI_MODELS = {
  FAST_TEXT: "gemini-3.8-flash",
  LITE_TEXT: "gemini-3.1-flash-lite",
} as const;

