import { GoogleGenAI } from "@google/genai";

export function getGenAI() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
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

export const ai = getGenAI();

