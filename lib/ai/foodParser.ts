import { GeminiProvider } from './providers/gemini';
import { FoodParseResult, ParsedFoodItem, FoodInputState, FoodQuantityUnit } from './types';

export class FoodParser {
  private provider: GeminiProvider;

  constructor() {
    this.provider = new GeminiProvider();
  }

  public async parseFoodInput(text: string): Promise<FoodParseResult> {
    const systemPrompt = `You are a strict Food Entity Parser. Your ONLY job is to extract structured food items from natural language.

CRITICAL RULES:
1. Return JSON only.
2. NEVER provide or calculate nutrition values (calories, macros, vitamins, etc).
3. NEVER invent quantities if they are missing. If quantity is missing, return null for quantity and unit, and set ambiguous to true.
4. NEVER invent cooking state.
5. Preserve the exact quantity and unit supplied by the user. Do NOT convert measurements (e.g. do not convert 1 tablespoon to grams).
6. Split multiple foods into separate items.
7. Recognize common Indian and global foods (rice, roti, dosa, idli, paneer, chicken, eggs, quinoa, etc).
8. Recognize raw/cooked/prepared/packaged state when explicitly stated.
9. If state materially affects database matching and the user did NOT specify it (e.g. "150g rice"), use state = "unspecified".
10. IMPORTANT: Our users commonly measure ingredients BEFORE cooking. If they say "20g quinoa" or "50g onion", use state = "raw" because it implies a raw ingredient measurement. Use "as-added" or "raw" for oils/spices. But for things like "1 bowl chicken biryani", state should be "prepared".
11. If the food itself is highly ambiguous, set ambiguous = true.
12. Negative quantities are invalid.

Return a JSON object with this exact structure:
{
  "items": [
    {
      "food": "string (name of food)",
      "quantity": number or null,
      "unit": "g" | "kg" | "ml" | "l" | "piece" | "serving" | "tablespoon" | "teaspoon" | "cup" | "bowl" | "other" | null,
      "state": "raw" | "cooked" | "prepared" | "packaged" | "unspecified",
      "ambiguous": boolean
    }
  ],
  "needsClarification": boolean,
  "clarificationQuestions": ["string array of questions if needsClarification is true"]
}

Set needsClarification to true ONLY if there are missing quantities or ambiguous items that require the user's input before they can be matched to a database.`;

    const requestSchema = {
      type: "OBJECT",
      properties: {
        items: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              food: { type: "STRING" },
              quantity: { type: "NUMBER", nullable: true },
              unit: { type: "STRING", nullable: true },
              state: { type: "STRING" },
              ambiguous: { type: "BOOLEAN" }
            },
            required: ["food", "state", "ambiguous"]
          }
        },
        needsClarification: { type: "BOOLEAN" },
        clarificationQuestions: {
          type: "ARRAY",
          items: { type: "STRING" }
        }
      },
      required: ["items", "needsClarification"]
    };

    try {
      const response = await this.provider.generate({
        systemPrompt,
        userPrompt: text,
        responseFormat: 'json',
        responseSchema: requestSchema
      });

      const parsedJson = JSON.parse(response.content);
      return this.validate(parsedJson);
    } catch (error: any) {
      console.error("[FoodParser] Error parsing food input:", error.message);
      throw error;
    }
  }

  private validate(data: any): FoodParseResult {
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid output: Root must be an object.");
    }

    if (!Array.isArray(data.items)) {
      throw new Error("Invalid output: 'items' must be an array.");
    }

    const validatedItems: ParsedFoodItem[] = [];
    let overallNeedsClarification = data.needsClarification === true;

    for (const item of data.items) {
      if (!item.food || typeof item.food !== 'string') {
        throw new Error("Invalid output: Missing or invalid 'food' name.");
      }

      // Check for illegal nutrition fields
      const illegalFields = ['calories', 'protein', 'carbs', 'carbohydrates', 'fat', 'fiber'];
      for (const field of illegalFields) {
        if (field in item) {
          throw new Error(`Invalid output: AI attempted to generate nutrition field '${field}'.`);
        }
      }

      let quantity = item.quantity;
      if (quantity !== null && quantity !== undefined) {
        if (typeof quantity !== 'number' || quantity < 0) {
          throw new Error("Invalid output: Quantity must be a non-negative number or null.");
        }
      } else {
        quantity = null;
      }

      const validUnits: FoodQuantityUnit[] = ['g', 'kg', 'ml', 'l', 'piece', 'serving', 'tablespoon', 'teaspoon', 'cup', 'bowl', 'other'];
      let unit = item.unit;
      if (unit !== null && unit !== undefined) {
        if (!validUnits.includes(unit as any)) {
          unit = 'other';
        }
      } else {
        unit = null;
      }

      const validStates: FoodInputState[] = ['raw', 'cooked', 'prepared', 'packaged', 'unspecified'];
      let state = item.state;
      if (!validStates.includes(state as any)) {
        state = 'unspecified';
      }

      const isAmbiguous = item.ambiguous === true || quantity === null;
      if (isAmbiguous) {
        overallNeedsClarification = true;
      }

      validatedItems.push({
        food: item.food,
        quantity,
        unit: unit as FoodQuantityUnit | null,
        state: state as FoodInputState,
        ambiguous: isAmbiguous
      });
    }

    return {
      items: validatedItems,
      needsClarification: overallNeedsClarification,
      clarificationQuestions: Array.isArray(data.clarificationQuestions) ? data.clarificationQuestions.filter((q: any) => typeof q === 'string') : []
    };
  }
}
