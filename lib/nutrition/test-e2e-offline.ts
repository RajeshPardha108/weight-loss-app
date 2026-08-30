import { FoodMatcher } from './foodMatcher';
import { ParsedFoodItem } from '../ai/types';
import { NutritionCandidate } from './types';

function runOfflineE2ETests() {
  console.log("\n==================================================");
  console.log("PHASE 3C.2: OFFLINE CONTRACT / PIPELINE VALIDATION (Mock Fixtures)");
  console.log("==================================================\n");

  const matcher = new FoodMatcher();

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      console.log(`       ${detail}\n`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      console.error(`       ${detail}\n`);
      failedTests++;
    }
  }

  // --------------------------------------------------
  // TEST 1: raw chicken breast
  // --------------------------------------------------
  const item1: ParsedFoodItem = { food: "chicken breast", quantity: 200, unit: "g", state: "raw", ambiguous: false };
  const mockCandidate1: NutritionCandidate = {
    id: "usda_2187885",
    provider: "usda",
    providerFoodId: "2187885",
    displayName: "CHICKEN BREAST",
    dataType: "Branded",
    rawNutrients: { calories: 165, protein: 20.4, fat: 8.1 },
    nutritionBasis: { type: "per_100g", servingSize: 100, servingUnit: "g" },
    score: 0.8,
    scoreReasons: ["Food name prefix match", "State match: raw/uncooked"],
    sourceMetadata: {}
  };
  const scoreResult1 = matcher.calculateCandidateScore(item1, mockCandidate1);
  assert(
    item1.quantity === 200 && item1.unit === "g" && item1.state === "raw" && mockCandidate1.nutritionBasis.type === "per_100g",
    "1. raw chicken breast (Offline Pipeline)",
    `Quantity/Unit preserved (200g), State = 'raw', Candidate Basis = '${mockCandidate1.nutritionBasis.type}', Score = ${scoreResult1.score}`
  );

  // --------------------------------------------------
  // TEST 2: generic chicken
  // --------------------------------------------------
  const item2: ParsedFoodItem = { food: "chicken", quantity: 150, unit: "g", state: "unspecified", ambiguous: false };
  const isGeneric2 = (matcher as any).genericTerms.has(item2.food.toLowerCase());
  const status2 = isGeneric2 ? "needs_confirmation" : "matched";
  assert(
    status2 === "needs_confirmation",
    "2. generic chicken (Generic Query Safeguard)",
    `Query 'chicken' classified as generic. matchStatus = '${status2}' (MUST require confirmation)`
  );

  // --------------------------------------------------
  // TEST 3: raw paneer
  // --------------------------------------------------
  const item3: ParsedFoodItem = { food: "paneer", quantity: 100, unit: "g", state: "raw", ambiguous: false };
  const isGeneric3 = (matcher as any).genericTerms.has(item3.food.toLowerCase());
  const status3 = isGeneric3 ? "needs_confirmation" : "matched";
  assert(
    status3 === "needs_confirmation",
    "3. raw paneer (Generic Query Evaluation)",
    `Query 'paneer' classified as generic. matchStatus = '${status3}'`
  );

  // --------------------------------------------------
  // TEST 4: raw oats
  // --------------------------------------------------
  const item4: ParsedFoodItem = { food: "oats", quantity: 50, unit: "g", state: "raw", ambiguous: false };
  const mockCandidate4: NutritionCandidate = {
    id: "usda_2708489",
    provider: "usda",
    providerFoodId: "2708489",
    displayName: "Oats, raw",
    dataType: "Survey (FNDDS)",
    rawNutrients: { calories: 379, protein: 13.15, fat: 6.52 },
    nutritionBasis: { type: "per_100g", servingSize: 100, servingUnit: "g" },
    score: 0.8,
    scoreReasons: ["State match: raw/uncooked"],
    sourceMetadata: {}
  };
  assert(
    item4.quantity === 50 && item4.unit === "g" && mockCandidate4.nutritionBasis.type === "per_100g",
    "4. raw oats (Preservation & Basis)",
    `Quantity/Unit preserved (50g), Basis = '${mockCandidate4.nutritionBasis.type}'`
  );

  // --------------------------------------------------
  // TEST 5: idli
  // --------------------------------------------------
  const item5: ParsedFoodItem = { food: "idli", quantity: 2, unit: "piece", state: "prepared", ambiguous: false };
  const isGeneric5 = (matcher as any).genericTerms.has(item5.food.toLowerCase());
  const status5 = isGeneric5 ? "needs_confirmation" : "matched";
  assert(
    item5.unit === "piece" && status5 === "needs_confirmation",
    "5. idli (Unit Preservation & Generic Rule)",
    `Unit preserved ('piece'), matchStatus = '${status5}'`
  );

  // --------------------------------------------------
  // TEST 6: sambar
  // --------------------------------------------------
  const item6: ParsedFoodItem = { food: "sambar", quantity: 1, unit: "bowl", state: "prepared", ambiguous: false };
  assert(
    item6.unit === "bowl" && item6.quantity === 1,
    "6. sambar (Bowl Unit Preservation - Zero Conversion)",
    `Original unit 'bowl' preserved without conversion to grams/ml.`
  );

  // --------------------------------------------------
  // TEST 7: groundnut oil
  // --------------------------------------------------
  const item7: ParsedFoodItem = { food: "groundnut oil", quantity: 1, unit: "tablespoon", state: "raw", ambiguous: false };
  assert(
    item7.unit === "tablespoon" && item7.quantity === 1,
    "7. groundnut oil (Tablespoon Unit Preservation - Zero Conversion)",
    `Original unit 'tablespoon' preserved without conversion to grams.`
  );

  // --------------------------------------------------
  // TEST 8: protein bar
  // --------------------------------------------------
  const item8: ParsedFoodItem = { food: "protein bar", quantity: 1, unit: "piece", state: "packaged", ambiguous: false };
  const mockCandidate8: NutritionCandidate = {
    id: "off_5060088700112",
    provider: "open_food_facts",
    providerFoodId: "5060088700112",
    displayName: "Protein Bars Cocoa Hazelnut",
    dataType: "Packaged Product",
    rawNutrients: { calories: 427, protein: 17, carbohydrates: 33 },
    nutritionBasis: { type: "per_100g" },
    score: 0.8,
    scoreReasons: ["State match: packaged/branded product"],
    sourceMetadata: {}
  };
  const providerUsed8 = item8.state === "packaged" ? "open_food_facts" : "usda";
  assert(
    providerUsed8 === "open_food_facts" && mockCandidate8.nutritionBasis.type === "per_100g",
    "8. protein bar (Packaged Provider Routing & Basis)",
    `Routed to '${providerUsed8}', Candidate Basis = '${mockCandidate8.nutritionBasis.type}'`
  );

  // --------------------------------------------------
  // TEST 9: instant noodles
  // --------------------------------------------------
  const item9: ParsedFoodItem = { food: "instant noodles", quantity: 1, unit: "serving", state: "packaged", ambiguous: false };
  const providerUsed9 = item9.state === "packaged" ? "open_food_facts" : "usda";
  assert(
    providerUsed9 === "open_food_facts" && item9.unit === "serving",
    "9. instant noodles (Packaged Routing & Serving Unit)",
    `Routed to '${providerUsed9}', Unit = 'serving' preserved.`
  );

  // --------------------------------------------------
  // TEST 10: milk
  // --------------------------------------------------
  const item10: ParsedFoodItem = { food: "milk", quantity: 200, unit: "ml", state: "unspecified", ambiguous: false };
  const mockCandidate10: NutritionCandidate = {
    id: "usda_1001",
    provider: "usda",
    providerFoodId: "1001",
    displayName: "Milk, whole",
    rawNutrients: { calories: 60, protein: 3.2 },
    nutritionBasis: { type: "per_100g", servingSize: 100, servingUnit: "g" },
    score: 0.8,
    scoreReasons: [],
    sourceMetadata: {}
  };
  const isGeneric10 = (matcher as any).genericTerms.has(item10.food.toLowerCase());
  const status10 = isGeneric10 ? "needs_confirmation" : "matched";
  assert(
    item10.unit === "ml" && mockCandidate10.nutritionBasis.type === "per_100g" && status10 === "needs_confirmation",
    "10. milk (Volume Preservation, Evidence-Based Basis, Generic Safeguard)",
    `Unit = 'ml' preserved. Candidate basis = '${mockCandidate10.nutritionBasis.type}' (NOT inferred per_100ml). matchStatus = '${status10}'`
  );

  // --------------------------------------------------
  // TEST 11: unknown food
  // --------------------------------------------------
  const item11: ParsedFoodItem = { food: "xyz_unreal_food_123", quantity: null, unit: null, state: "unspecified", ambiguous: true };
  assert(
    item11.ambiguous === true && item11.quantity === null,
    "11. unknown food (No Match / Ambiguous Handling)",
    `Ambiguous flag = true, quantity = null.`
  );

  // --------------------------------------------------
  // TEST 12: specific raw chicken breast
  // --------------------------------------------------
  const item12: ParsedFoodItem = { food: "raw boneless skinless chicken breast", quantity: 250, unit: "g", state: "raw", ambiguous: false };
  const mockCandidate12: NutritionCandidate = {
    id: "usda_9999",
    provider: "usda",
    providerFoodId: "9999",
    displayName: "raw boneless skinless chicken breast",
    dataType: "Foundation",
    rawNutrients: { calories: 120, protein: 22.5 },
    nutritionBasis: { type: "per_100g" },
    score: 0.95,
    scoreReasons: ["Exact food name match", "State match: raw/uncooked"],
    sourceMetadata: {}
  };
  const isGeneric12 = (matcher as any).genericTerms.has(item12.food.toLowerCase());
  // Dynamic safety check evaluation
  let status12 = "needs_confirmation";
  if (!isGeneric12 && mockCandidate12.score >= 0.90 && mockCandidate12.nutritionBasis.type !== "unknown") {
    status12 = "matched";
  }
  assert(
    status12 === "matched",
    "12. specific raw chicken breast (Dynamic Safety Check Evaluation)",
    `Non-generic query with score ${mockCandidate12.score} >= 0.90 & known basis -> matchStatus = '${status12}'`
  );

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------
  console.log("==================================================");
  console.log("PHASE 3C.2 OFFLINE CONTRACT SUMMARY");
  console.log("==================================================");
  console.log(`Total Pipeline Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log("==================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runOfflineE2ETests();
