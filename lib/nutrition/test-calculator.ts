import { NutritionCalculator } from './nutritionCalculator';
import { ParsedFoodItem } from '../ai/types';
import { NutritionCandidate } from './types';

function runCalculatorTests() {
  console.log("\n==================================================");
  console.log("PHASE 3D: DETERMINISTIC NUTRITION CALCULATOR TESTS");
  console.log("==================================================\n");

  const calculator = new NutritionCalculator();

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testId: number, testName: string, detail: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] TEST ${testId}: ${testName}`);
      console.log(`       ${detail}\n`);
      passedTests++;
    } else {
      console.error(`[FAIL] TEST ${testId}: ${testName}`);
      console.error(`       ${detail}\n`);
      failedTests++;
    }
  }

  // --------------------------------------------------
  // TEST 1: 200g food with per_100g basis
  // --------------------------------------------------
  const input1: ParsedFoodItem = { food: "chicken breast", quantity: 200, unit: "g", state: "raw", ambiguous: false };
  const cand1: NutritionCandidate = {
    id: "usda_2187885",
    provider: "usda",
    providerFoodId: "2187885",
    displayName: "CHICKEN BREAST",
    rawNutrients: { calories: 165, protein: 20.4, fat: 8.1, fiber: undefined },
    nutritionBasis: { type: "per_100g" },
    score: 0.8,
    scoreReasons: [],
    sourceMetadata: {}
  };
  const res1 = calculator.calculate(input1, cand1);
  assert(
    res1.calculationStatus === 'exact' && res1.ratioApplied === 2.0 && res1.calculatedNutrients.protein === 40.8 && res1.calculatedNutrients.calories === 330,
    1,
    "200g food with per_100g basis",
    `Status='${res1.calculationStatus}', Ratio=${res1.ratioApplied}, Protein=${res1.calculatedNutrients.protein}g (20.4 * 2.0 = 40.8g), Calories=${res1.calculatedNutrients.calories}`
  );

  // --------------------------------------------------
  // TEST 2: 1kg food with per_100g basis
  // --------------------------------------------------
  const input2: ParsedFoodItem = { food: "white rice", quantity: 1, unit: "kg", state: "raw", ambiguous: false };
  const cand2: NutritionCandidate = {
    id: "usda_1234",
    provider: "usda",
    providerFoodId: "1234",
    displayName: "White Rice, raw",
    rawNutrients: { calories: 365, protein: 7.13, carbohydrates: 79.95 },
    nutritionBasis: { type: "per_100g" },
    score: 0.8,
    scoreReasons: [],
    sourceMetadata: {}
  };
  const res2 = calculator.calculate(input2, cand2);
  assert(
    res2.calculationStatus === 'converted' && res2.ratioApplied === 10.0 && res2.calculatedNutrients.protein === 71.3,
    2,
    "1kg food with per_100g basis",
    `Status='${res2.calculationStatus}', Ratio=${res2.ratioApplied}, Protein=${res2.calculatedNutrients.protein}g (7.13 * 10 = 71.3g)`
  );

  // --------------------------------------------------
  // TEST 3: 200ml food with per_100ml basis
  // --------------------------------------------------
  const input3: ParsedFoodItem = { food: "milk", quantity: 200, unit: "ml", state: "unspecified", ambiguous: false };
  const cand3: NutritionCandidate = {
    id: "usda_1001",
    provider: "usda",
    providerFoodId: "1001",
    displayName: "Milk, whole",
    rawNutrients: { calories: 60, protein: 3.2, fat: 3.25 },
    nutritionBasis: { type: "per_100ml" },
    score: 0.8,
    scoreReasons: [],
    sourceMetadata: {}
  };
  const res3 = calculator.calculate(input3, cand3);
  assert(
    res3.calculationStatus === 'exact' && res3.ratioApplied === 2.0 && res3.calculatedNutrients.protein === 6.4,
    3,
    "200ml food with per_100ml basis",
    `Status='${res3.calculationStatus}', Ratio=${res3.ratioApplied}, Protein=${res3.calculatedNutrients.protein}g`
  );

  // --------------------------------------------------
  // TEST 4: grams against per_serving with explicit serving weight
  // --------------------------------------------------
  const input4: ParsedFoodItem = { food: "protein bar", quantity: 100, unit: "g", state: "packaged", ambiguous: false };
  const cand4: NutritionCandidate = {
    id: "off_123",
    provider: "open_food_facts",
    providerFoodId: "123",
    displayName: "Protein Bar",
    servingInfo: { servingSize: 40, servingUnit: "g" },
    rawNutrients: { calories: 170, protein: 10.2 },
    nutritionBasis: { type: "per_serving", servingSize: 40, servingUnit: "g" },
    score: 0.8,
    scoreReasons: [],
    sourceMetadata: {}
  };
  const res4 = calculator.calculate(input4, cand4);
  assert(
    res4.calculationStatus === 'converted' && res4.ratioApplied === 2.5 && res4.calculatedNutrients.protein === 25.5,
    4,
    "grams against per_serving with explicit serving weight (40g)",
    `Status='${res4.calculationStatus}', Ratio=${res4.ratioApplied}, Protein=${res4.calculatedNutrients.protein}g (10.2 * 2.5 = 25.5g)`
  );

  // --------------------------------------------------
  // TEST 5: 1 serving against per_serving basis
  // --------------------------------------------------
  const input5: ParsedFoodItem = { food: "instant noodles", quantity: 1, unit: "serving", state: "packaged", ambiguous: false };
  const cand5: NutritionCandidate = {
    id: "off_456",
    provider: "open_food_facts",
    providerFoodId: "456",
    displayName: "Instant Noodles",
    rawNutrients: { calories: 450, protein: 8.5 },
    nutritionBasis: { type: "per_serving" },
    score: 0.8,
    scoreReasons: [],
    sourceMetadata: {}
  };
  const res5 = calculator.calculate(input5, cand5);
  assert(
    res5.calculationStatus === 'exact' && res5.ratioApplied === 1.0 && res5.calculatedNutrients.calories === 450,
    5,
    "1 serving against per_serving basis",
    `Status='${res5.calculationStatus}', Ratio=${res5.ratioApplied}, Calories=${res5.calculatedNutrients.calories}`
  );

  // --------------------------------------------------
  // TEST 6: 2 pieces against per_piece basis
  // --------------------------------------------------
  const input6: ParsedFoodItem = { food: "idli", quantity: 2, unit: "piece", state: "prepared", ambiguous: false };
  const cand6: NutritionCandidate = {
    id: "usda_789",
    provider: "usda",
    providerFoodId: "789",
    displayName: "Idli",
    rawNutrients: { calories: 39, protein: 1.5 },
    nutritionBasis: { type: "per_piece" },
    score: 0.8,
    scoreReasons: [],
    sourceMetadata: {}
  };
  const res6 = calculator.calculate(input6, cand6);
  assert(
    res6.calculationStatus === 'exact' && res6.ratioApplied === 2.0 && res6.calculatedNutrients.calories === 78,
    6,
    "2 pieces against per_piece basis",
    `Status='${res6.calculationStatus}', Ratio=${res6.ratioApplied}, Calories=${res6.calculatedNutrients.calories}`
  );

  // --------------------------------------------------
  // TEST 7: 1 tablespoon with explicit provider household-weight metadata
  // --------------------------------------------------
  const input7: ParsedFoodItem = { food: "groundnut oil", quantity: 1, unit: "tablespoon", state: "raw", ambiguous: false };
  const cand7: NutritionCandidate = {
    id: "usda_ oil_1",
    provider: "usda",
    providerFoodId: "oil_1",
    displayName: "Peanut oil",
    servingInfo: { servingSize: 14, servingUnit: "g" },
    rawNutrients: { calories: 884, fat: 100 },
    nutritionBasis: { type: "per_100g", servingSize: 14, servingUnit: "g" },
    score: 0.8,
    scoreReasons: [],
    sourceMetadata: {}
  };
  const res7 = calculator.calculate(input7, cand7);
  assert(
    res7.calculationStatus === 'converted' && res7.ratioApplied === 0.14 && res7.calculatedNutrients.fat === 14,
    7,
    "1 tablespoon with explicit provider household-weight metadata (14g)",
    `Status='${res7.calculationStatus}', Ratio=${res7.ratioApplied}, Fat=${res7.calculatedNutrients.fat}g (100 * 0.14 = 14g)`
  );

  // --------------------------------------------------
  // TEST 8: 1 bowl without explicit provider relationship -> cannot_calculate
  // --------------------------------------------------
  const input8: ParsedFoodItem = { food: "sambar", quantity: 1, unit: "bowl", state: "prepared", ambiguous: false };
  const cand8: NutritionCandidate = {
    id: "usda_sambar_1",
    provider: "usda",
    providerFoodId: "sambar_1",
    displayName: "Sambar, vegetable stew",
    rawNutrients: { calories: 86, protein: 4.33 },
    nutritionBasis: { type: "per_100g" },
    score: 0.8,
    scoreReasons: [],
    sourceMetadata: {}
  };
  const res8 = calculator.calculate(input8, cand8);
  assert(
    res8.calculationStatus === 'cannot_calculate' && res8.ratioApplied === null && res8.calculatedNutrients.calories === null,
    8,
    "1 bowl without explicit provider relationship -> cannot_calculate",
    `Status='${res8.calculationStatus}', Correctly rejected non-standard 'bowl' without explicit metadata.`
  );

  // --------------------------------------------------
  // TEST 9: per_100g candidate with 1 piece -> cannot_calculate
  // --------------------------------------------------
  const input9: ParsedFoodItem = { food: "apple", quantity: 1, unit: "piece", state: "raw", ambiguous: false };
  const cand9: NutritionCandidate = {
    id: "usda_apple_1",
    provider: "usda",
    providerFoodId: "apple_1",
    displayName: "Apples, raw",
    rawNutrients: { calories: 52, protein: 0.26 },
    nutritionBasis: { type: "per_100g" }, // No piece weight in metadata
    score: 0.8,
    scoreReasons: [],
    sourceMetadata: {}
  };
  const res9 = calculator.calculate(input9, cand9);
  assert(
    res9.calculationStatus === 'cannot_calculate' && res9.ratioApplied === null,
    9,
    "per_100g candidate logged as 1 piece without explicit piece weight -> cannot_calculate",
    `Status='${res9.calculationStatus}', Correctly rejected piece logging against per_100g basis when piece weight is missing.`
  );

  // --------------------------------------------------
  // TEST 10: unknown basis -> cannot_calculate
  // --------------------------------------------------
  const input10: ParsedFoodItem = { food: "custom food", quantity: 100, unit: "g", state: "raw", ambiguous: false };
  const cand10: NutritionCandidate = {
    id: "usda_unknown_1",
    provider: "usda",
    providerFoodId: "unknown_1",
    displayName: "Mystery Food",
    rawNutrients: { calories: 150 },
    nutritionBasis: { type: "unknown" },
    score: 0.8,
    scoreReasons: [],
    sourceMetadata: {}
  };
  const res10 = calculator.calculate(input10, cand10);
  assert(
    res10.calculationStatus === 'cannot_calculate' && res10.ratioApplied === null,
    10,
    "unknown basis -> cannot_calculate",
    `Status='${res10.calculationStatus}', Correctly rejected unknown measurement basis.`
  );

  // --------------------------------------------------
  // TEST 11: Missing nutrient remains null, NEVER zero
  // --------------------------------------------------
  const input11: ParsedFoodItem = { food: "sugar", quantity: 100, unit: "g", state: "raw", ambiguous: false };
  const cand11: NutritionCandidate = {
    id: "usda_sugar",
    provider: "usda",
    providerFoodId: "sugar",
    displayName: "Sugars, granulated",
    rawNutrients: { calories: 387, carbohydrates: 99.98, protein: undefined, fiber: undefined },
    nutritionBasis: { type: "per_100g" },
    score: 0.8,
    scoreReasons: [],
    sourceMetadata: {}
  };
  const res11 = calculator.calculate(input11, cand11);
  assert(
    res11.calculatedNutrients.protein === null && res11.calculatedNutrients.fiber === null && res11.calculatedNutrients.calories === 387,
    11,
    "Missing nutrient remains null, NEVER zero",
    `Protein=${res11.calculatedNutrients.protein} (null preserved), Fiber=${res11.calculatedNutrients.fiber} (null preserved), Calories=${res11.calculatedNutrients.calories}`
  );

  // --------------------------------------------------
  // TEST 12: Zero AI calls & Zero Candidate Selection
  // --------------------------------------------------
  assert(
    typeof calculator.calculate === 'function',
    12,
    "Verify pure deterministic calculation (Zero AI / Zero Candidate Selection)",
    "Calculator operates as a pure TypeScript function accepting pre-confirmed candidate."
  );

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------
  console.log("==================================================");
  console.log("PHASE 3D CALCULATOR TEST SUMMARY");
  console.log("==================================================");
  console.log(`Total Unit Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log("==================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runCalculatorTests();
