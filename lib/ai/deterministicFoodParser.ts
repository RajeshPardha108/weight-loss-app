import { ParsedFoodItem, FoodQuantityUnit, FoodInputState } from './types';

export interface DeterministicParseResult {
  items: ParsedFoodItem[];
  needsAI: boolean;
  reason?: string;
}

export class DeterministicFoodParser {
  // Conversational keyword patterns (checked with word boundaries \b to avoid substring false positives e.g. "my" in "mysore")
  private conversationalPatterns = [
    /\bi had\b/i, /\bi ate\b/i, /\bate\b/i, /\bhad\b/i, /\bsome\b/i, /\ba little\b/i,
    /\ba bit\b/i, /\bwhatever\b/i, /\busual\b/i, /\byesterday\b/i, /\bleftover\b/i,
    /\bleftovers\b/i, /\bmy\b/i, /\bthey served\b/i, /\boutside\b/i
  ];

  // Unit aliases mapping to standard FoodQuantityUnit
  private unitMap: Record<string, FoodQuantityUnit> = {
    'g': 'g', 'gm': 'g', 'gms': 'g', 'gram': 'g', 'grams': 'g',
    'kg': 'kg', 'kgs': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
    'ml': 'ml', 'mls': 'ml', 'milliliter': 'ml', 'milliliters': 'ml', 'millilitre': 'ml', 'millilitres': 'ml',
    'l': 'l', 'liter': 'l', 'liters': 'l', 'litre': 'l', 'litres': 'l',
    'piece': 'piece', 'pieces': 'piece', 'pc': 'piece', 'pcs': 'piece',
    'serving': 'serving', 'servings': 'serving',
    'tablespoon': 'tablespoon', 'tablespoons': 'tablespoon', 'tbsp': 'tablespoon', 'tbsps': 'tablespoon',
    'teaspoon': 'teaspoon', 'teaspoons': 'teaspoon', 'tsp': 'teaspoon', 'tsps': 'teaspoon',
    'cup': 'cup', 'cups': 'cup',
    'bowl': 'bowl', 'bowls': 'bowl'
  };

  // Safe food name plural normalizations
  private foodNormalizations: Record<string, string> = {
    'idlis': 'idli',
    'pooris': 'poori',
    'puris': 'poori',
    'bondas': 'bonda',
    'eggs': 'egg'
  };

  public parse(input: string): DeterministicParseResult {
    if (!input || typeof input !== 'string' || !input.trim()) {
      return { items: [], needsAI: false };
    }

    const text = input.trim();

    // 1. Check for conversational triggers with word boundaries -> needsAI = true
    for (const pattern of this.conversationalPatterns) {
      if (pattern.test(text)) {
        return { items: [], needsAI: true, reason: `Conversational pattern detected: ${pattern}` };
      }
    }

    // 2. Split input by newlines, commas, '+', or 'and'
    const lines = text.split(/[\n\r,+]|\band\b/i).map(s => s.trim()).filter(Boolean);

    const items: ParsedFoodItem[] = [];

    for (const line of lines) {
      const subItems = this.parseLine(line);

      if (subItems.length === 0) {
        return { items: [], needsAI: true, reason: `Unrecognized input or quantity range in line: "${line}"` };
      }

      for (const item of subItems) {
        if (item.ambiguous || item.quantity === null) {
          return { items: [], needsAI: true, reason: `Ambiguous quantity for: "${item.food}"` };
        }
        items.push(item);
      }
    }

    if (items.length === 0) {
      return { items: [], needsAI: true, reason: "No structured items extracted" };
    }

    return { items, needsAI: false };
  }

  private parseLine(line: string): ParsedFoodItem[] {
    // Regex matches quantity (e.g. "100", "4.5", "4-5"), optional unit, and food description
    const pattern = /\b(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*([a-zA-Z.]+)?\s+([^0-9]+?)(?=\b\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*([a-zA-Z.]+)?\s+|$)/gi;

    const matches: ParsedFoodItem[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      const rawQty = match[1].trim();
      const rawUnitToken = (match[2] || '').trim();
      let rawFoodPart = (match[3] || '').trim();

      if (!rawFoodPart && !rawUnitToken) continue;

      // Range rejection safety check:
      // If a quantity is specified as a range (e.g. "4-5g", "4 - 5 g"), the single-number type contract cannot safely represent it.
      // Do NOT silently select lower bound (4), upper bound (5), or midpoint (4.5). Require AI parsing / clarification.
      if (rawQty.includes('-')) {
        return [];
      }

      let unit: FoodQuantityUnit | null = null;
      let foodNamePart = rawFoodPart;

      const unitKey = rawUnitToken.toLowerCase();
      if (unitKey in this.unitMap) {
        unit = this.unitMap[unitKey];
      } else {
        // Not a unit token; re-attach to food description preserving original case
        if (rawUnitToken) {
          foodNamePart = `${rawUnitToken} ${rawFoodPart}`.trim();
        }
        unit = 'piece'; // Default count unit
      }

      if (!foodNamePart) continue;

      const num = parseFloat(rawQty);
      if (isNaN(num) || num <= 0) return [];
      const quantity = num;

      // Extract state if explicitly present
      let state: FoodInputState = 'unspecified';
      const foodLower = foodNamePart.toLowerCase();

      if (/\b(raw|uncooked|dry)\b/i.test(foodLower)) {
        state = 'raw';
        foodNamePart = foodNamePart.replace(/\b(raw|uncooked|dry)\b/gi, '').trim();
      } else if (/\b(cooked|boiled|steamed|fried|grilled|roasted|baked)\b/i.test(foodLower)) {
        state = 'cooked';
        foodNamePart = foodNamePart.replace(/\b(cooked|boiled|steamed|fried|grilled|roasted|baked)\b/gi, '').trim();
      } else if (/\b(prepared)\b/i.test(foodLower)) {
        state = 'prepared';
        foodNamePart = foodNamePart.replace(/\b(prepared)\b/gi, '').trim();
      } else if (/\b(packaged|branded)\b/i.test(foodLower)) {
        state = 'packaged';
        foodNamePart = foodNamePart.replace(/\b(packaged|branded)\b/gi, '').trim();
      }

      // Clean food name and normalize plurals
      let foodName = foodNamePart.replace(/\s+/g, ' ').trim();
      if (!foodName) continue;

      const foodNameLower = foodName.toLowerCase();
      if (this.foodNormalizations[foodNameLower]) {
        foodName = this.foodNormalizations[foodNameLower];
      } else if (foodNameLower.endsWith('s') && !foodNameLower.endsWith('ss') && !foodNameLower.endsWith('us')) {
        const singular = foodNameLower.slice(0, -1);
        if (['idli', 'poori', 'bonda', 'egg', 'banana', 'apple'].includes(singular)) {
          foodName = singular;
        }
      }

      matches.push({
        food: foodName,
        quantity,
        unit,
        state,
        ambiguous: false
      });
    }

    return matches;
  }
}
