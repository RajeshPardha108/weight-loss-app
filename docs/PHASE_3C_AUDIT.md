# 1. VERDICT

YELLOW - proceed only after specific fixes

Phase 3B/3C has the right broad separation: Gemini is used for food entity parsing, providers retrieve external database candidates, and `FoodMatcher` ranks candidates without calculating nutrition. However, Phase 3C is not yet a safe foundation for Phase 3D because nutrition basis metadata is missing/ambiguous, Open Food Facts can silently mix per-100g and per-serving values, and the matcher can produce `matched` without an explicit user-confirmation contract.

# 2. CRITICAL ISSUES

- `lib/nutrition/types.ts:5`-`13` stores flattened `rawNutrients` numbers without any basis field. Phase 3D will not know whether a value is per 100g, per serving, per package, label-as-entered, or provider-specific.
- `lib/nutrition/providers/openFoodFacts.ts:75`-`91` chooses `_100g`, then `_serving`, then unsuffixed nutrient values, but stores only the number. This can directly confuse serving nutrition with per-100g nutrition.
- `lib/nutrition/providers/usda.ts:93`-`113` maps USDA nutrients into normalized numbers but does not preserve nutrient unit names, nutrient IDs, derivation/source field, or an explicit per-100g/per-serving basis. USDA search results are usually per 100g, but the code contract does not say that.
- `lib/nutrition/foodMatcher.ts:46`-`54` allows `matchStatus: 'matched'` for a single high-scoring candidate. That can bypass the documented "user confirmation" step and is unsafe for ambiguous foods before Phase 3D.

# 3. IMPORTANT ISSUES

- `lib/ai/foodParser.ts:23` and `lib/ai/foodParser.ts:24` conflict: one says ambiguous state like "150g rice" should be `unspecified`, the next says measured ingredients like "20g quinoa" imply `raw`. This weakens raw/cooked routing.
- `lib/ai/foodParser.ts:104`-`110` rejects common macro fields, but does not reject all nutrition fields such as `saturated_fat`, `sodium`, `potassium`, `calcium`, `iron`, vitamins, or nested nutrition objects.
- `lib/nutrition/providers/usda.ts:31`-`32` requests Foundation, SR Legacy, Survey, and Branded data types but does not enforce post-fetch prioritization. Final ordering is left mostly to USDA response order plus the local scoring bonus.
- `lib/nutrition/foodMatcher.ts:91`-`105` token scoring only checks exact token overlap and ignores stemming, spelling variants, synonyms, word order risk, and negative/exclusion terms.
- `lib/nutrition/foodMatcher.ts:109`-`132` state compatibility is a display-name substring heuristic. It misses many USDA/OFF state signals and can misread candidate names.
- `lib/nutrition/foodMatcher.ts:17` routes only `state === 'packaged'` to Open Food Facts. Packaged-looking text not parsed as `packaged` will go to USDA only.
- `lib/nutrition/test-food-matcher.ts` and `lib/ai/test-food-parser.ts` are live scripts, not deterministic tests. They can consume Gemini/USDA/OFF quota and do not integrate with `package.json`.
- `.env.example:7` lists `GEMINI_MODEL=gemini-3.6-flash`, while `lib/ai/providers/gemini.ts:14` defaults to `gemini-1.5-flash`. The configured sample model may be invalid or inconsistent with the fallback.
- `eslint.config.mjs` does not ignore `ios/App/App/public/**`, so `npm run lint` scans generated bundled assets and reports thousands of unrelated warnings/errors.

# 4. WHAT IS CORRECT

- The intended AI/database/calculation separation is mostly present in code. `FoodParser` calls Gemini, provider classes call USDA/OFF, and `FoodMatcher` only searches, scores, and ranks.
- `lib/ai/foodParser.ts:16` forbids AI nutrition values in the prompt, and `lib/ai/foodParser.ts:104`-`110` rejects several hallucinated nutrition fields.
- `lib/ai/foodParser.ts:112`-`147` preserves parsed quantity/unit and rejects negative quantities. It does not convert `g`, `kg`, `ml`, `l`, `tablespoon`, `teaspoon`, `bowl`, `piece`, or `serving`.
- `lib/nutrition/foodMatcher.ts` does not scale calories/macros by user quantity and does not invent serving sizes. That calculation is still absent, as Phase 3C intended.
- USDA IDs (`providerFoodId`) and OFF barcodes/product IDs are preserved in `lib/nutrition/providers/usda.ts:116`-`123` and `lib/nutrition/providers/openFoodFacts.ts:93`-`103`.
- `.gitignore:33`-`34` ignores `.env*`, and my `.env.local` inspection exposed only variable names, not values.
- `.env.local` currently has Supabase/Gemini variable names but no `USDA_API_KEY`, so the matcher would safely fail USDA searches instead of silently using a fake key.
- `npx tsc --noEmit` completed successfully. `npm run lint` failed, largely because of existing lint violations and generated iOS public bundle files being linted.

# 5. TESTING GAPS

- No fixture-based provider tests for USDA and Open Food Facts mapping.
- No tests proving nutrient basis is preserved for `_100g` versus `_serving` OFF fields.
- No tests for USDA nutrient unit, nutrient ID, or data type preservation.
- No deterministic matcher tests for false positives, near-ties, low-confidence candidates, barcode matches, and ambiguous raw/cooked foods.
- No tests requiring user confirmation for all non-barcode or ambiguous matches.
- No tests for missing USDA key, 401/403/429 API errors, malformed API payloads, or empty provider responses.
- No unit tests proving all accepted user units remain unconverted through parser and matcher.
- No CI-safe `package.json` test script for Phase 3B/3C contracts.

# 6. PHASE 3D READINESS

Ready:

- Parser, provider, matcher, and future calculator are separated enough to continue design.
- Parsed item quantity/unit/state survive into `ProviderFoodMatch.input`.
- External provider candidates include source IDs, display names, provider names, data type, brand/barcode where present, and raw nutrient numbers.

Not ready:

- The candidate contract does not encode nutrition measurement basis, so deterministic scaling would be unsafe.
- OFF mapping can already collapse per-serving and per-100g values into the same fields.
- Match confirmation semantics are not strict enough for a nutrition calculator to trust `matched`.
- The current application UI does not implement the Phase 3C confirmation step; `app/log/food/page.tsx` still only logs clean/cheat meal status.
- Existing analytics code has its own nutrition calculation assumptions (`lib/analytics/nutritionAnalytics.ts:88`-`92`) that should not be reused blindly for Phase 3D.

# 7. REQUIRED FILE CHANGES

- `lib/nutrition/types.ts` - add explicit nutrient basis metadata, source nutrient units, source field/key, and confirmation requirements.
- `lib/nutrition/providers/openFoodFacts.ts` - preserve exact OFF nutrient keys and separate per-100g from per-serving values.
- `lib/nutrition/providers/usda.ts` - preserve USDA nutrient IDs, nutrient units, data type/basis assumptions, serving metadata, and apply safer data-type prioritization.
- `lib/nutrition/foodMatcher.ts` - tighten scoring/status rules so ambiguous or non-barcode candidates require confirmation before Phase 3D.
- `lib/ai/foodParser.ts` - resolve the raw/unspecified state prompt conflict and reject a broader set of nutrition fields.
- `lib/ai/types.ts` - if shared unit/state semantics remain here, make them stricter for future Phase 3D use.
- `lib/ai/test-food-parser.ts` - replace quota-consuming live parser checks with mocked/fixture tests.
- `lib/nutrition/test-food-matcher.ts` - replace live provider tests with deterministic provider/matcher fixtures.
- `package.json` - add CI-safe test scripts for parser, provider mapping, and matcher behavior.
- `eslint.config.mjs` - ignore generated iOS public bundle output.
- `docs/ai-coaching-architecture.md` - document the required basis metadata and the hard user-confirmation rule.
- `.env.example` - align Gemini model naming with actual supported/default model and document `USDA_API_KEY`.

# 8. FINAL RECOMMENDATION

Do not start Phase 3D calculations yet. The safest next step is to first fix the nutrition candidate data contract: make basis explicit, split OFF per-100g/per-serving data, preserve USDA nutrient metadata, and force confirmation for ambiguous matches. After that, add deterministic fixture tests around provider mapping and matcher status before implementing the Phase 3D nutrition engine.
