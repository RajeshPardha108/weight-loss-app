import { DeterministicFoodParser } from './deterministicFoodParser';
import { FoodParser } from './foodParser';
import { FoodParseResult } from './types';

export interface SmartFoodInputResult {
  parsed: FoodParseResult;
  source: 'deterministic' | 'ai';
  aiUnavailable?: boolean;
  error?: string;
}

export class SmartFoodInputService {
  private deterministicParser: DeterministicFoodParser;

  constructor() {
    this.deterministicParser = new DeterministicFoodParser();
  }

  public async parseFoodInput(text: string): Promise<SmartFoodInputResult> {
    if (!text || !text.trim()) {
      return {
        parsed: { items: [], needsClarification: false, clarificationQuestions: [] },
        source: 'deterministic'
      };
    }

    // 1. Try deterministic parsing first
    const detResult = this.deterministicParser.parse(text);

    if (!detResult.needsAI && detResult.items.length > 0) {
      return {
        parsed: {
          items: detResult.items,
          needsClarification: false,
          clarificationQuestions: []
        },
        source: 'deterministic'
      };
    }

    // 2. If deterministic parsing cannot safely parse, fall back to Gemini FoodParser
    try {
      const foodParser = new FoodParser();
      const aiParsedResult = await foodParser.parseFoodInput(text);

      return {
        parsed: aiParsedResult,
        source: 'ai'
      };
    } catch (error: any) {
      console.warn("[SmartFoodInputService] Gemini AI parsing unavailable:", error.message);
      
      // 3. Graceful degradation when Gemini is unavailable, rate-limited, or unconfigured
      return {
        parsed: {
          items: [],
          needsClarification: true,
          clarificationQuestions: [
            "AI parsing is temporarily unavailable. You can enter food in a simple format such as 100g rice, 2 idlis, or 200ml milk."
          ]
        },
        source: 'ai',
        aiUnavailable: true,
        error: error.message || "AI parsing service temporarily unavailable."
      };
    }
  }
}
