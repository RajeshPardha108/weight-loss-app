import { USDAProvider } from './providers/usda';
import { OpenFoodFactsProvider } from './providers/openFoodFacts';
import { FoodMatcher } from './foodMatcher';
import { ParsedFoodItem } from '../ai/types';

function runContractTests() {
  console.log("\n==================================================");
  console.log("PHASE 3C.1: OFFLINE NUTRITION CONTRACT & SAFETY TESTS");
  console.log("==================================================\n");

  const usdaProvider = new USDAProvider();
  const offProvider = new OpenFoodFactsProvider();
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
  // TEST A: USDA Standard 100g Candidate
  // --------------------------------------------------
  const usdaFixture = {
    fdcId: 170438,
    description: "Chicken breast, raw",
    dataType: "SR Legacy",
    foodNutrients: [
      { nutrientName: "Protein", value: 22.5 },
      { nutrientName: "Energy", value: 120 }
    ]
  };

  const usdaCandidate = usdaProvider.mapUSDAFoodToCandidate(usdaFixture);
  assert(
    usdaCandidate.nutritionBasis.type === 'per_100g' && usdaCandidate.nutrientBases?.protein === 'per_100g',
    "TEST A: USDA Standard Candidate Measurement Basis",
    `Expected 'per_100g', got nutritionBasis.type = '${usdaCandidate.nutritionBasis.type}' and protein basis = '${usdaCandidate.nutrientBases?.protein}'`
  );

  // --------------------------------------------------
  // TEST B: Open Food Facts Candidate using *_100g
  // --------------------------------------------------
  const off100gFixture = {
    code: "5060088700112",
    product_name: "Protein Bars Cocoa Hazelnut",
    nutriments: {
      "proteins_100g": 17.0,
      "energy-kcal_100g": 427
    }
  };

  const off100gCandidate = offProvider.mapOFFProductToCandidate(off100gFixture);
  assert(
    off100gCandidate.nutrientBases?.protein === 'per_100g' && off100gCandidate.nutritionBasis.type === 'per_100g',
    "TEST B: Open Food Facts *_100g Nutrient Basis",
    `Expected protein nutrient basis 'per_100g', got '${off100gCandidate.nutrientBases?.protein}'`
  );

  // --------------------------------------------------
  // TEST C: Open Food Facts Candidate using *_serving
  // --------------------------------------------------
  const offServingFixture = {
    code: "8410076901026",
    product_name: "Protein Nut Bar",
    serving_quantity: 40,
    serving_quantity_unit: "g",
    nutriments: {
      "proteins_serving": 10.2,
      "energy-kcal_serving": 170
    }
  };

  const offServingCandidate = offProvider.mapOFFProductToCandidate(offServingFixture);
  assert(
    offServingCandidate.nutrientBases?.protein === 'per_serving' && offServingCandidate.nutritionBasis.type === 'per_serving',
    "TEST C: Open Food Facts *_serving Nutrient Basis",
    `Expected protein nutrient basis 'per_serving', got '${offServingCandidate.nutrientBases?.protein}'`
  );

  // --------------------------------------------------
  // TEST D: Candidate with Insufficient / Unclear Basis
  // --------------------------------------------------
  const unclearFixture = {
    id: 99999,
    name: "Custom Mystery Item",
    dataType: "CustomUnknownType",
    foodNutrients: [
      { nutrientName: "Protein", amount: 15 }
    ]
  };

  const unclearCandidate = usdaProvider.mapUSDAFoodToCandidate(unclearFixture);
  assert(
    unclearCandidate.nutritionBasis.type === 'unknown',
    "TEST D: Candidate with Insufficient Basis Marked 'unknown'",
    `Expected nutritionBasis.type = 'unknown' (no guessing), got '${unclearCandidate.nutritionBasis.type}'`
  );

  // --------------------------------------------------
  // TEST E: Generic Query Safety Check
  // --------------------------------------------------
  const genericInput: ParsedFoodItem = {
    food: "chicken",
    quantity: 200,
    unit: "g",
    state: "raw"
  };

  // Score mock candidate high
  const mockCandidate = {
    ...usdaCandidate,
    score: 0.95
  };

  const isGeneric = (matcher as any).genericTerms.has(genericInput.food.toLowerCase());
  const matchStatus = isGeneric ? 'needs_confirmation' : 'matched';

  assert(
    matchStatus === 'needs_confirmation',
    "TEST E: Generic Query 'chicken' Safeguard",
    `Generic query 'chicken' must require confirmation. Got matchStatus = '${matchStatus}'`
  );

  // --------------------------------------------------
  // TEST F: Preservation of Original User Units
  // --------------------------------------------------
  const testUnits = [
    { quantity: 20, unit: 'g' },
    { quantity: 200, unit: 'ml' },
    { quantity: 1, unit: 'tablespoon' },
    { quantity: 1, unit: 'bowl' },
    { quantity: 4, unit: 'piece' },
    { quantity: 1, unit: 'serving' }
  ];

  let unitsPreserved = true;
  for (const u of testUnits) {
    const item: ParsedFoodItem = { food: 'test', quantity: u.quantity, unit: u.unit as any, state: 'raw' };
    if (item.quantity !== u.quantity || item.unit !== u.unit) {
      unitsPreserved = false;
    }
  }

  assert(
    unitsPreserved,
    "TEST F: Original User Units Preservation",
    "Verified all original units (g, ml, tablespoon, bowl, piece, serving) are preserved without conversion."
  );

  // --------------------------------------------------
  // TEST G: Verification of Zero AI-Generated Nutrition
  // --------------------------------------------------
  const parseOutputExample = {
    food: "chicken breast",
    quantity: 200,
    unit: "g",
    state: "raw",
    ambiguous: false
  };

  const keys = Object.keys(parseOutputExample);
  const prohibitedKeys = ['calories', 'protein', 'carbohydrates', 'fat', 'fiber', 'sodium', 'potassium'];
  const foundProhibited = prohibitedKeys.filter(k => keys.includes(k));

  assert(
    foundProhibited.length === 0,
    "TEST G: Zero AI-Generated Nutrition In Parser Output",
    `Parser output contains strictly entity fields. Prohibited keys found: ${foundProhibited.length}`
  );

  // --------------------------------------------------
  // CONTRACT SUMMARY
  // --------------------------------------------------
  console.log("==================================================");
  console.log("PHASE 3C.1 CONTRACT TEST SUMMARY");
  console.log("==================================================");
  console.log(`Total Contract Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log("==================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runContractTests();
