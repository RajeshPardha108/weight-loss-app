import { DeterministicFoodParser } from './deterministicFoodParser';
import { SmartFoodInputService } from './smartFoodInputService';

async function runSmartParserTests() {
  console.log("==================================================");
  console.log("PHASE 3E: SMART FOOD INPUT LAYER OFFLINE TESTS");
  console.log("==================================================");

  const parser = new DeterministicFoodParser();
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, msg: string) {
    totalCount++;
    if (condition) {
      console.log(`[PASS] TEST ${totalCount}: ${msg}`);
      passedCount++;
    } else {
      console.error(`[FAIL] TEST ${totalCount}: ${msg}`);
    }
  }

  // ----------------------------------------------------
  // SECTION 1: DETERMINISTIC PARSING (Cases 1 - 13)
  // Must parse 100% locally with 0 Gemini API calls.
  // ----------------------------------------------------

  // Test 1: 100g quinoa
  const t1 = parser.parse("100g quinoa");
  assert(
    !t1.needsAI && t1.items.length === 1 && t1.items[0].food === "quinoa" && t1.items[0].quantity === 100 && t1.items[0].unit === "g",
    '100g quinoa -> Parsed locally (food="quinoa", qty=100, unit="g")'
  );

  // Test 2: 200g raw chicken breast
  const t2 = parser.parse("200g raw chicken breast");
  assert(
    !t2.needsAI && t2.items.length === 1 && t2.items[0].food === "chicken breast" && t2.items[0].quantity === 200 && t2.items[0].unit === "g" && t2.items[0].state === "raw",
    '200g raw chicken breast -> Parsed state="raw", quantity=200, unit="g"'
  );

  // Test 3: 50g onion
  const t3 = parser.parse("50g onion");
  assert(
    !t3.needsAI && t3.items.length === 1 && t3.items[0].food === "onion" && t3.items[0].quantity === 50 && t3.items[0].unit === "g",
    '50g onion -> Parsed locally'
  );

  // Test 4: 20g peanuts
  const t4 = parser.parse("20g peanuts");
  assert(
    !t4.needsAI && t4.items.length === 1 && t4.items[0].food === "peanuts" && t4.items[0].quantity === 20 && t4.items[0].unit === "g",
    '20g peanuts -> Parsed locally'
  );

  // Test 5: 200ml milk
  const t5 = parser.parse("200ml milk");
  assert(
    !t5.needsAI && t5.items.length === 1 && t5.items[0].food === "milk" && t5.items[0].quantity === 200 && t5.items[0].unit === "ml",
    '200ml milk -> Parsed unit="ml"'
  );

  // Test 6: 1 tablespoon groundnut oil
  const t6 = parser.parse("1 tablespoon groundnut oil");
  assert(
    !t6.needsAI && t6.items.length === 1 && t6.items[0].food === "groundnut oil" && t6.items[0].quantity === 1 && t6.items[0].unit === "tablespoon",
    '1 tablespoon groundnut oil -> Parsed unit="tablespoon"'
  );

  // Test 7: 2 idlis
  const t7 = parser.parse("2 idlis");
  assert(
    !t7.needsAI && t7.items.length === 1 && t7.items[0].food === "idli" && t7.items[0].quantity === 2 && t7.items[0].unit === "piece",
    '2 idlis -> Plural normalized to "idli", unit="piece"'
  );

  // Test 8: 4 Mysore bonda
  const t8 = parser.parse("4 Mysore bonda");
  assert(
    !t8.needsAI && t8.items.length === 1 && t8.items[0].food === "Mysore bonda" && t8.items[0].quantity === 4 && t8.items[0].unit === "piece",
    '4 Mysore bonda -> Parsed quantity=4, unit="piece"'
  );

  // Test 9: 3 pooris
  const t9 = parser.parse("3 pooris");
  assert(
    !t9.needsAI && t9.items.length === 1 && t9.items[0].food === "poori" && t9.items[0].quantity === 3 && t9.items[0].unit === "piece",
    '3 pooris -> Plural normalized to "poori", unit="piece"'
  );

  // Test 10: 1 bowl sambar
  const t10 = parser.parse("1 bowl sambar");
  assert(
    !t10.needsAI && t10.items.length === 1 && t10.items[0].food === "sambar" && t10.items[0].quantity === 1 && t10.items[0].unit === "bowl",
    '1 bowl sambar -> Preserved unit="bowl" WITHOUT converting to grams'
  );

  // Test 11: 100g millet 40g toor dal 20g peanuts
  const t11 = parser.parse("100g millet 40g toor dal 20g peanuts");
  assert(
    !t11.needsAI && t11.items.length === 3 && t11.items[0].food === "millet" && t11.items[1].food === "toor dal" && t11.items[2].food === "peanuts",
    '100g millet 40g toor dal 20g peanuts -> Parsed 3 separate items locally'
  );

  // Test 12: 200g raw chicken + 150g raw rice
  const t12 = parser.parse("200g raw chicken + 150g raw rice");
  assert(
    !t12.needsAI && t12.items.length === 2 && t12.items[0].food === "chicken" && t12.items[0].state === "raw" && t12.items[1].food === "rice" && t12.items[1].state === "raw",
    '200g raw chicken + 150g raw rice -> Parsed 2 raw items locally'
  );

  // Test 13: Full Realistic Indian Meal with explicit quantities
  const mealInput = `100g millet
40g toor dal
40g moong dal
100g channa
50g green peas
40g soya
100g spinach
20g peanuts
90g tomato
120g onion
5g ginger
15g garlic
5g oil`;

  const t13 = parser.parse(mealInput);
  assert(
    !t13.needsAI && t13.items.length === 13 && t13.items[12].food === "oil" && t13.items[12].quantity === 5,
    'Full 13-item realistic meal parsed locally with explicit quantities'
  );

  // ----------------------------------------------------
  // SECTION 2: CONVERSATIONAL FALLBACK (Cases 14 - 16)
  // Must set needsAI = true and NOT guess values.
  // ----------------------------------------------------

  // Test 14: "I had some chicken"
  const t14 = parser.parse("I had some chicken");
  assert(
    t14.needsAI,
    '"I had some chicken" -> Correctly flagged needsAI=true'
  );

  // Test 15: "I ate my usual lunch"
  const t15 = parser.parse("I ate my usual lunch");
  assert(
    t15.needsAI,
    '"I ate my usual lunch" -> Correctly flagged needsAI=true'
  );

  // Test 16: "a little rice and curry"
  const t16 = parser.parse("a little rice and curry");
  assert(
    t16.needsAI,
    '"a little rice and curry" -> Correctly flagged needsAI=true'
  );

  // ----------------------------------------------------
  // SECTION 3: QUANTITY RANGE REJECTION SAFETY CHECK (Test 17)
  // Prove that a range like "4-5g oil" does NOT silently select 4g, 5g, or 4.5g.
  // ----------------------------------------------------

  const t17 = parser.parse("4-5g oil");
  assert(
    t17.needsAI,
    '"4-5g oil" -> Correctly sets needsAI=true (range rejected; NO arbitrary 4g, 5g, or 4.5g selected)'
  );

  // ----------------------------------------------------
  // SECTION 4: SMART FOOD INPUT SERVICE INTEGRATION (Test 18)
  // ----------------------------------------------------

  const service = new SmartFoodInputService();
  const s1 = await service.parseFoodInput("100g quinoa");
  assert(
    s1.source === 'deterministic' && s1.parsed.items.length === 1,
    'SmartFoodInputService routes "100g quinoa" to source="deterministic" (0 Gemini calls)'
  );

  console.log("==================================================");
  console.log(`PHASE 3E SMART PARSER SUMMARY: ${passedCount}/${totalCount} Passed`);
  console.log("==================================================");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runSmartParserTests().catch(err => {
  console.error("Smart Parser Test Error:", err);
  process.exit(1);
});
