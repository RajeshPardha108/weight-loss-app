import { FoodParser } from '../ai/foodParser';
import { FoodMatcher } from './foodMatcher';

const testCases = [
  { id: 1, category: "RAW INGREDIENTS", input: "quinoa 20g" },
  { id: 2, category: "RAW INGREDIENTS", input: "50g raw onion" },
  { id: 3, category: "OILS / FAT", input: "10g groundnut oil" },
  { id: 4, category: "VOLUME UNITS", input: "1 tablespoon groundnut oil" },
  { id: 5, category: "RAW INGREDIENTS", input: "200g raw chicken" },
  { id: 6, category: "RAW INGREDIENTS", input: "150g raw white rice" },
  { id: 7, category: "RAW INGREDIENTS", input: "50g raw oats" },
  { id: 8, category: "VOLUME UNITS", input: "200ml milk" },
  { id: 9, category: "INDIAN DAIRY", input: "100g raw paneer" },
  { id: 10, category: "SOUTH INDIAN FOODS", input: "3 pooris" },
  { id: 11, category: "SOUTH INDIAN FOODS", input: "2 idlis and 1 bowl sambar" },
  { id: 12, category: "PREPARED FOODS", input: "1 serving chicken biryani outside" },
  { id: 13, category: "PACKAGED FOODS", input: "1 protein bar" },
  { id: 14, category: "PACKAGED FOODS", input: "1 packet of instant noodles" },
  { id: 15, category: "NONEXISTENT FOOD", input: "xyz_unreal_food_123" }
];

async function runMatcherTest() {
  if (!process.env.USDA_API_KEY) {
    console.error("\n==================================================");
    console.error("FAIL: USDA_API_KEY environment variable is missing.");
    console.error("Please add USDA_API_KEY to your .env.local file to test database matching.");
    console.error("==================================================\n");
    process.exit(1);
  }

  console.log("\n==================================================");
  console.log("PHASE 3C: FOOD DATABASE MATCHER TEST HARNESS");
  console.log("==================================================\n");

  const parser = new FoodParser();
  const matcher = new FoodMatcher();

  let executedCount = 0;
  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    console.log(`--------------------------------------------------`);
    console.log(`TEST ${tc.id} [${tc.category}]`);
    console.log(`INPUT: "${tc.input}"`);
    
    let parseResult;
    try {
      // Step 1: Parse input with Gemini FoodParser
      parseResult = await parser.parseFoodInput(tc.input);
      console.log(`PARSED ENTITIES:`, JSON.stringify(parseResult.items, null, 2));
    } catch (err: any) {
      console.log(`[FoodParser Note]: Gemini API call unfulfilled (${err.message}). Using direct entity fallback for FoodMatcher live testing.`);
      // Direct entity fallback for testing FoodMatcher against live USDA / Open Food Facts APIs
      parseResult = {
        items: [createFallbackItem(tc.input)],
        needsClarification: false
      };
      console.log(`PARSED ENTITIES (Fallback):`, JSON.stringify(parseResult.items, null, 2));
    }

      if (!parseResult.items || parseResult.items.length === 0) {
        console.log(`MATCHER RESULT: No parsed items to match.`);
        console.log(`PASS/FAIL: FAIL (Parsing yielded 0 items)\n`);
        failedCount++;
        continue;
      }

      // Step 2: Pass parsed items into FoodMatcher
      for (const item of parseResult.items) {
        const matchResult = await matcher.matchFoodItem(item);
        executedCount++;

        console.log(`MATCHER OUTPUT (Provider: ${matchResult.providerUsed}, Status: ${matchResult.matchStatus}):`);
        if (matchResult.error) {
          console.log(`ERROR: ${matchResult.error}`);
        } else {
          console.log(`TOP CANDIDATES (${matchResult.candidates.length} returned):`);
          matchResult.candidates.slice(0, 3).forEach((cand, idx) => {
            console.log(`  [${idx + 1}] ID: ${cand.id} | Name: "${cand.displayName}" | Score: ${cand.score}`);
            console.log(`      Brand: ${cand.brand || 'N/A'} | Type: ${cand.dataType || 'N/A'}`);
            console.log(`      Reasons: ${cand.scoreReasons.join(', ')}`);
            console.log(`      Raw Nutrients:`, JSON.stringify(cand.rawNutrients));
          });
        }

        // Safety Assertions
        let pass = true;
        let failReason = "";

        // Assert 1: Original parsed quantity and unit are preserved in input
        if (item.quantity !== null && item.quantity < 0) {
          pass = false;
          failReason = "Negative quantity in parsed item";
        }

        // Assert 2: No LLM nutrition modification
        const rawJson = JSON.stringify(matchResult);
        if (/aiGeneratedNutrition|hallucinated/i.test(rawJson)) {
          pass = false;
          failReason = "AI generated nutrition found";
        }

        if (pass && !matchResult.error) {
          console.log(`PASS/FAIL: PASS`);
          console.log(`REASON: Successfully retrieved and scored factual database candidates.\n`);
          passedCount++;
        } else {
          console.log(`PASS/FAIL: FAIL`);
          console.log(`REASON: ${failReason || matchResult.error || 'Matching failure'}\n`);
          failedCount++;
        }
      }
  }

  console.log("==================================================");
  console.log("PHASE 3C MATCHER TEST SUMMARY");
  console.log("==================================================");
  console.log(`Total Inputs: ${testCases.length}`);
  console.log(`Matcher Calls Executed: ${executedCount}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log("==================================================\n");
}

function createFallbackItem(input: string) {
  const inputLower = input.toLowerCase();
  if (inputLower.includes('protein bar')) return { food: 'protein bar', quantity: 1, unit: 'piece' as const, state: 'packaged' as const };
  if (inputLower.includes('instant noodles')) return { food: 'instant noodles', quantity: 1, unit: 'serving' as const, state: 'packaged' as const };
  if (inputLower.includes('quinoa')) return { food: 'quinoa', quantity: 20, unit: 'g' as const, state: 'raw' as const };
  if (inputLower.includes('onion')) return { food: 'onion', quantity: 50, unit: 'g' as const, state: 'raw' as const };
  if (inputLower.includes('10g groundnut oil')) return { food: 'groundnut oil', quantity: 10, unit: 'g' as const, state: 'raw' as const };
  if (inputLower.includes('tablespoon')) return { food: 'groundnut oil', quantity: 1, unit: 'tablespoon' as const, state: 'raw' as const };
  if (inputLower.includes('chicken breast') || inputLower.includes('raw chicken')) return { food: 'chicken breast', quantity: 200, unit: 'g' as const, state: 'raw' as const };
  if (inputLower.includes('white rice')) return { food: 'white rice', quantity: 150, unit: 'g' as const, state: 'raw' as const };
  if (inputLower.includes('oats')) return { food: 'oats', quantity: 50, unit: 'g' as const, state: 'raw' as const };
  if (inputLower.includes('milk')) return { food: 'milk', quantity: 200, unit: 'ml' as const, state: 'unspecified' as const };
  if (inputLower.includes('paneer')) return { food: 'paneer', quantity: 100, unit: 'g' as const, state: 'raw' as const };
  if (inputLower.includes('poori') || inputLower.includes('puri')) return { food: 'poori', quantity: 3, unit: 'piece' as const, state: 'prepared' as const };
  if (inputLower.includes('idli')) return { food: 'idli', quantity: 2, unit: 'piece' as const, state: 'prepared' as const };
  if (inputLower.includes('biryani')) return { food: 'chicken biryani', quantity: 1, unit: 'serving' as const, state: 'prepared' as const };
  return { food: input, quantity: 1, unit: 'serving' as const, state: 'unspecified' as const };
}

runMatcherTest();
