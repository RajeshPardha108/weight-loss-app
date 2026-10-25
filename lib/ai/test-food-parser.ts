import { FoodParser } from './foodParser';
import { FoodParseResult } from './types';

interface TestCase {
  id: number;
  category: string;
  input: string;
  expectedRules?: (res: FoodParseResult) => { pass: boolean; reason: string };
}

const testCases: TestCase[] = [
  // CATEGORY 1 — RAW HOME-COOKING INGREDIENTS
  {
    id: 1,
    category: "RAW HOME-COOKING INGREDIENTS",
    input: "quinoa 20g, onion 50g, groundnut oil 1 tbsp",
    expectedRules: (res) => {
      const q = res.items.find(i => i.food.toLowerCase().includes('quinoa'));
      if (q && q.unit !== 'g') return { pass: false, reason: "Quinoa unit converted from g" };
      const oil = res.items.find(i => i.food.toLowerCase().includes('oil'));
      if (oil && oil.unit === 'g') return { pass: false, reason: "Oil tbsp converted into grams" };
      return { pass: true, reason: "Preserved g and tbsp correctly" };
    }
  },
  {
    id: 2,
    category: "RAW HOME-COOKING INGREDIENTS",
    input: "100g paneer, 50g onion, 10g groundnut oil"
  },
  {
    id: 3,
    category: "RAW HOME-COOKING INGREDIENTS",
    input: "200g raw chicken + 150g raw white rice",
    expectedRules: (res) => {
      const rawCount = res.items.filter(i => i.state === 'raw').length;
      if (rawCount < 2) return { pass: false, reason: "Failed to mark both items as raw" };
      return { pass: true, reason: "Preserved explicitly stated raw state" };
    }
  },
  {
    id: 4,
    category: "RAW HOME-COOKING INGREDIENTS",
    input: "50g raw oats + 200ml milk",
    expectedRules: (res) => {
      const milk = res.items.find(i => i.food.toLowerCase().includes('milk'));
      if (milk && milk.unit !== 'ml') return { pass: false, reason: "Converted ml to another unit" };
      return { pass: true, reason: "Preserved ml unit correctly" };
    }
  },
  {
    id: 5,
    category: "RAW HOME-COOKING INGREDIENTS",
    input: "30g quinoa + 100g tomato + 5g oil"
  },

  // CATEGORY 2 — SOUTH INDIAN FOODS
  {
    id: 6,
    category: "SOUTH INDIAN FOODS",
    input: "2 idlis and 1 bowl sambar"
  },
  {
    id: 7,
    category: "SOUTH INDIAN FOODS",
    input: "4 Mysore bonda"
  },
  {
    id: 8,
    category: "SOUTH INDIAN FOODS",
    input: "3 pooris"
  },
  {
    id: 9,
    category: "SOUTH INDIAN FOODS",
    input: "2 dosa + 1 vada"
  },
  {
    id: 10,
    category: "SOUTH INDIAN FOODS",
    input: "1 masala dosa and 2 idli"
  },
  {
    id: 11,
    category: "SOUTH INDIAN FOODS",
    input: "3 idly + 1 cup sambar + 2 boiled eggs"
  },
  {
    id: 12,
    category: "SOUTH INDIAN FOODS",
    input: "I had 2 medu vada and one bowl rasam"
  },

  // CATEGORY 3 — AMBIGUOUS COOKING STATE
  {
    id: 13,
    category: "AMBIGUOUS COOKING STATE",
    input: "I ate 200g chicken",
    expectedRules: (res) => {
      const chicken = res.items.find(i => i.food.toLowerCase().includes('chicken'));
      if (chicken && (chicken.state === 'raw' || chicken.state === 'cooked') && !chicken.ambiguous) {
        return { pass: false, reason: `Assumed state '${chicken.state}' without explicit input or ambiguity flag` };
      }
      return { pass: true, reason: "State correctly left unspecified or marked ambiguous" };
    }
  },
  {
    id: 14,
    category: "AMBIGUOUS COOKING STATE",
    input: "I had 150g rice",
    expectedRules: (res) => {
      const rice = res.items.find(i => i.food.toLowerCase().includes('rice'));
      if (rice && (rice.state === 'raw' || rice.state === 'cooked') && !rice.ambiguous) {
        return { pass: false, reason: `Assumed state '${rice.state}' without explicit input or ambiguity flag` };
      }
      return { pass: true, reason: "State correctly left unspecified or marked ambiguous" };
    }
  },
  {
    id: 15,
    category: "AMBIGUOUS COOKING STATE",
    input: "100g paneer",
    expectedRules: (res) => {
      const paneer = res.items.find(i => i.food.toLowerCase().includes('paneer'));
      if (paneer && (paneer.state === 'raw' || paneer.state === 'cooked') && !paneer.ambiguous) {
        return { pass: false, reason: `Assumed state '${paneer.state}' without explicit input or ambiguity flag` };
      }
      return { pass: true, reason: "State correctly left unspecified or marked ambiguous" };
    }
  },

  // CATEGORY 4 — MISSING QUANTITY
  {
    id: 16,
    category: "MISSING QUANTITY",
    input: "I ate some dosa",
    expectedRules: (res) => {
      const dosa = res.items.find(i => i.food.toLowerCase().includes('dosa'));
      if (dosa && dosa.quantity !== null && dosa.quantity > 0 && !dosa.ambiguous && !res.needsClarification) {
        return { pass: false, reason: `Invented quantity ${dosa.quantity} without clarification request` };
      }
      return { pass: true, reason: "Handled missing quantity via clarification/ambiguity flag" };
    }
  },
  {
    id: 17,
    category: "MISSING QUANTITY",
    input: "I had chicken curry",
    expectedRules: (res) => {
      const curry = res.items.find(i => i.food.toLowerCase().includes('chicken'));
      if (curry && curry.quantity !== null && curry.quantity > 0 && !curry.ambiguous && !res.needsClarification) {
        return { pass: false, reason: `Invented quantity ${curry.quantity} without clarification request` };
      }
      return { pass: true, reason: "Handled missing quantity via clarification/ambiguity flag" };
    }
  },
  {
    id: 18,
    category: "MISSING QUANTITY",
    input: "ate rice and dal",
    expectedRules: (res) => {
      const hasInventedQty = res.items.some(i => i.quantity !== null && i.quantity > 0 && !i.ambiguous);
      if (hasInventedQty && !res.needsClarification) {
        return { pass: false, reason: "Invented quantity for rice or dal without clarification request" };
      }
      return { pass: true, reason: "Handled missing quantity via clarification/ambiguity flag" };
    }
  },

  // CATEGORY 5 — FRACTIONS AND NATURAL LANGUAGE QUANTITIES
  {
    id: 19,
    category: "FRACTIONS AND NATURAL LANGUAGE QUANTITIES",
    input: "half a bowl of rice",
    expectedRules: (res) => {
      const rice = res.items.find(i => i.food.toLowerCase().includes('rice'));
      if (rice && rice.quantity !== 0.5) return { pass: false, reason: `Quantity parsed as ${rice.quantity} instead of 0.5` };
      return { pass: true, reason: "Parsed fractional quantity 'half' as 0.5" };
    }
  },
  {
    id: 20,
    category: "FRACTIONS AND NATURAL LANGUAGE QUANTITIES",
    input: "one and a half dosa",
    expectedRules: (res) => {
      const dosa = res.items.find(i => i.food.toLowerCase().includes('dosa'));
      if (dosa && dosa.quantity !== 1.5) return { pass: false, reason: `Quantity parsed as ${dosa.quantity} instead of 1.5` };
      return { pass: true, reason: "Parsed fractional quantity 'one and a half' as 1.5" };
    }
  },
  {
    id: 21,
    category: "FRACTIONS AND NATURAL LANGUAGE QUANTITIES",
    input: "2 and a half idlis",
    expectedRules: (res) => {
      const idli = res.items.find(i => i.food.toLowerCase().includes('idli'));
      if (idli && idli.quantity !== 2.5) return { pass: false, reason: `Quantity parsed as ${idli.quantity} instead of 2.5` };
      return { pass: true, reason: "Parsed fractional quantity '2 and a half' as 2.5" };
    }
  },
  {
    id: 22,
    category: "FRACTIONS AND NATURAL LANGUAGE QUANTITIES",
    input: "a tablespoon of groundnut oil"
  },
  {
    id: 23,
    category: "FRACTIONS AND NATURAL LANGUAGE QUANTITIES",
    input: "half tablespoon olive oil",
    expectedRules: (res) => {
      const oil = res.items.find(i => i.food.toLowerCase().includes('oil'));
      if (oil && oil.quantity !== 0.5) return { pass: false, reason: `Quantity parsed as ${oil.quantity} instead of 0.5` };
      return { pass: true, reason: "Parsed fractional quantity 'half' as 0.5" };
    }
  },

  // CATEGORY 6 — PACKAGED FOOD
  {
    id: 24,
    category: "PACKAGED FOOD",
    input: "I had 1 protein bar"
  },
  {
    id: 25,
    category: "PACKAGED FOOD",
    input: "I ate one packet of instant noodles"
  },
  {
    id: 26,
    category: "PACKAGED FOOD",
    input: "2 slices of whole wheat bread"
  },
  {
    id: 27,
    category: "PACKAGED FOOD",
    input: "I had one serving of packaged yogurt"
  },
  {
    id: 28,
    category: "PACKAGED FOOD",
    input: "one packet of potato chips"
  },

  // CATEGORY 7 — RESTAURANT / OUTSIDE FOOD
  {
    id: 29,
    category: "RESTAURANT / OUTSIDE FOOD",
    input: "I had 1 serving chicken biryani outside"
  },
  {
    id: 30,
    category: "RESTAURANT / OUTSIDE FOOD",
    input: "ate restaurant fried rice"
  },
  {
    id: 31,
    category: "RESTAURANT / OUTSIDE FOOD",
    input: "I had butter chicken at a restaurant"
  },

  // CATEGORY 8 — MESSY REAL-WORLD INPUT
  {
    id: 32,
    category: "MESSY REAL-WORLD INPUT",
    input: "today morning 3 idly + 1 cup sambar + 2 boiled eggs"
  },
  {
    id: 33,
    category: "MESSY REAL-WORLD INPUT",
    input: "lunch 200g chicken 150g rice 50g onion little oil"
  },
  {
    id: 34,
    category: "MESSY REAL-WORLD INPUT",
    input: "quinoa 20 grams onion 50 g groundnut oil 1 table spoon"
  },
  {
    id: 35,
    category: "MESSY REAL-WORLD INPUT",
    input: "2 dosa, 4 bonda, one bowl sambar and some chutney"
  },
  {
    id: 36,
    category: "MESSY REAL-WORLD INPUT",
    input: "had 3 pooris for breakfast"
  },
  {
    id: 37,
    category: "MESSY REAL-WORLD INPUT",
    input: "200 gm raw chicken breast + 100 ml curd"
  },

  // CATEGORY 9 — SPELLING / LANGUAGE VARIATIONS
  {
    id: 38,
    category: "SPELLING / LANGUAGE VARIATIONS",
    input: "2 idly"
  },
  {
    id: 39,
    category: "SPELLING / LANGUAGE VARIATIONS",
    input: "3 puri"
  },
  {
    id: 40,
    category: "SPELLING / LANGUAGE VARIATIONS",
    input: "4 bonda"
  },
  {
    id: 41,
    category: "SPELLING / LANGUAGE VARIATIONS",
    input: "2 chapathi"
  },
  {
    id: 42,
    category: "SPELLING / LANGUAGE VARIATIONS",
    input: "1 roti"
  },
  {
    id: 43,
    category: "SPELLING / LANGUAGE VARIATIONS",
    input: "100g ground nut oil"
  },

  // CATEGORY 10 — MULTI-ITEM CONVERSATIONAL INPUT
  {
    id: 44,
    category: "MULTI-ITEM CONVERSATIONAL INPUT",
    input: "For breakfast I had 2 idlis with one bowl sambar. Then I ate a banana."
  },
  {
    id: 45,
    category: "MULTI-ITEM CONVERSATIONAL INPUT",
    input: "Lunch was 200g raw chicken, 100g raw quinoa, 50g onion and 1 tablespoon groundnut oil."
  },
  {
    id: 46,
    category: "MULTI-ITEM CONVERSATIONAL INPUT",
    input: "Dinner: 2 rotis, 100g paneer and half bowl dal."
  },
  {
    id: 47,
    category: "MULTI-ITEM CONVERSATIONAL INPUT",
    input: "I ate 3 pooris, 2 eggs and drank 200ml milk."
  },

  // CATEGORY 11 — SAFETY / HALLUCINATION TESTS
  {
    id: 48,
    category: "SAFETY / HALLUCINATION TESTS",
    input: "I ate chicken"
  },
  {
    id: 49,
    category: "SAFETY / HALLUCINATION TESTS",
    input: "I had a plate of biryani"
  },
  {
    id: 50,
    category: "SAFETY / HALLUCINATION TESTS",
    input: "I ate some rice"
  },
  {
    id: 51,
    category: "SAFETY / HALLUCINATION TESTS",
    input: "2 eggs, tell me how many calories"
  },
  {
    id: 52,
    category: "SAFETY / HALLUCINATION TESTS",
    input: "200g chicken, calculate my protein"
  },
  {
    id: 53,
    category: "SAFETY / HALLUCINATION TESTS",
    input: "one dosa, approximately 150 calories"
  }
];

async function runStressTest() {
  const parser = new FoodParser();

  const totalTests = testCases.length;
  let passedCount = 0;
  let failedCount = 0;

  const failureCategories: Record<string, Array<{ id: number; input: string; reason: string }>> = {
    "Parsing failures": [],
    "Quantity failures": [],
    "Unit failures": [],
    "State failures": [],
    "Ambiguity failures": [],
    "Hallucination/safety failures": [],
    "Schema/validation failures": []
  };

  for (const tc of testCases) {
    console.log(`==================================================`);
    console.log(`TEST ${tc.id} [${tc.category}]`);
    console.log(`INPUT: "${tc.input}"`);
    console.log(`--------------------------------------------------`);

    let result: FoodParseResult | null = null;
    let errorMsg: string | null = null;

    if (tc.id > 1) {
      // Sleep 12.5 seconds to respect 5 requests per minute free tier rate limit
      await new Promise(resolve => setTimeout(resolve, 12500));
    }

    try {
      result = await parser.parseFoodInput(tc.input);
    } catch (err: any) {
      errorMsg = err.message;
    }

    if (errorMsg || !result) {
      console.log(`OUTPUT: Error - ${errorMsg}`);
      console.log(`PASS/FAIL: FAIL`);
      console.log(`REASON: Parser threw execution/validation error: ${errorMsg}\n`);
      failedCount++;
      failureCategories["Schema/validation failures"].push({ id: tc.id, input: tc.input, reason: errorMsg || "Null result" });
      continue;
    }

    console.log(`OUTPUT:`);
    console.log(JSON.stringify(result, null, 2));

    // Global Safety Asserts
    let isPass = true;
    let reason = "Parsed successfully and passed all safety/validation assertions";
    let failureCat = "Parsing failures";

    // 1. Check for hallucinated nutrition
    const rawJson = JSON.stringify(result);
    if (/calories|protein|carbs|carbohydrates|fat|sodium|potassium|vitamin|iron|zinc/i.test(rawJson)) {
      isPass = false;
      reason = "Hallucination failure: Nutrition fields present in output JSON!";
      failureCat = "Hallucination/safety failures";
    }

    // 2. Check negative quantities
    if (isPass) {
      for (const item of result.items) {
        if (item.quantity !== null && item.quantity < 0) {
          isPass = false;
          reason = `Quantity failure: Negative quantity ${item.quantity} found for ${item.food}`;
          failureCat = "Quantity failures";
          break;
        }
      }
    }

    // 3. Custom rule check if specified
    if (isPass && tc.expectedRules) {
      const ruleResult = tc.expectedRules(result);
      if (!ruleResult.pass) {
        isPass = false;
        reason = ruleResult.reason;
        if (reason.includes("Assumed state")) failureCat = "State failures";
        else if (reason.includes("quantity") || reason.includes("Invented quantity")) failureCat = "Quantity failures";
        else if (reason.includes("unit") || reason.includes("Converted")) failureCat = "Unit failures";
        else failureCat = "Parsing failures";
      }
    }

    console.log(`PASS/FAIL: ${isPass ? "PASS" : "FAIL"}`);
    console.log(`REASON: ${reason}\n`);

    if (isPass) {
      passedCount++;
    } else {
      failedCount++;
      failureCategories[failureCat].push({ id: tc.id, input: tc.input, reason });
    }
  }

  console.log(`==================================================`);
  console.log(`STRESS TEST SUMMARY`);
  console.log(`==================================================`);
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`--------------------------------------------------`);
  console.log(`FAILURE CATEGORY BREAKDOWN:`);
  for (const [cat, fails] of Object.entries(failureCategories)) {
    console.log(`- ${cat}: ${fails.length}`);
    for (const f of fails) {
      console.log(`   * Test ${f.id} ("${f.input}"): ${f.reason}`);
    }
  }
}

runStressTest();
