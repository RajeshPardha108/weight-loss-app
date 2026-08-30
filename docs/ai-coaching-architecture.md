# AI Coaching Layer Architecture

This document describes the architectural foundation for Phase 3: the AI Coaching Layer. This layer is designed to bridge the gap between deterministic data analysis and natural language coaching, while adhering strictly to existing UI and database constraints.

## Why Analytics Remain Deterministic

The AI Coaching Layer sits strictly *on top* of the existing `lib/analytics` module. 

- **Accuracy & Reliability**: Mathematical calculations (like 7-day averages, trends, and consistency percentages) remain perfectly deterministic, fast, and testable. AI models are notoriously unreliable at math and exact data extraction.
- **Single Source of Truth**: The UI (`app/progress`) and the AI rely on the exact same computed metrics. If the UI says "Losing weight (-2.5kg)", the AI will see the exact same factual state.
- **Cost & Latency**: Running analytics locally in TypeScript is virtually instantaneous. We only invoke the AI when we need qualitative interpretation (the "Coaching"), not quantitative calculation.

## Role of the AI Context Builder

The `contextBuilder.ts` acts as a data adapter. 
- **Input**: The raw, comprehensive `AnalyticsSnapshot` produced by the analytics module.
- **Output**: A normalized `AIProgressContext` interface.
- **Purpose**: It strips away non-essential formatting or raw data rows that the LLM doesn't need to see, converting the data into a clean, flat state object perfectly suited for injection into a prompt template. Crucially, the context builder **does not call an AI model**.

## Provider Abstraction

The application interacts with AI models through the `AIProvider` interface (`lib/ai/provider.ts`). 
- `generate(request: AIProviderRequest): Promise<AIProviderResponse>`
This shields the rest of the application from provider-specific SDKs, HTTP quirks, and configuration logic.

## Ollama Implementation

The initial implementation uses Ollama for local, privacy-first inference.
- Implemented in `lib/ai/providers/ollama.ts` using the native `fetch` API.
- Relies on environment variables (`OLLAMA_BASE_URL` and `OLLAMA_MODEL`) rather than hardcoded credentials or endpoints.
- Implements comprehensive error handling for network timeouts, non-200 responses, and malformed JSON, ensuring the app fails gracefully if the local AI service is down.

## Future Provider Support

Because of the `AIProvider` abstraction, supporting OpenAI, Anthropic, or specialized edge models simply requires creating a new class (e.g., `OpenAIProvider`) that implements the interface. The context builder and the prompt generation logic remain untouched.

## Food Text Parsing (NLP Pipeline)

In Phase 3B, we introduced the `FoodParser` to handle natural language food logging. The core architecture isolates AI entity extraction from deterministic nutrition calculation:

1. **User Natural Language**: "I ate 200g raw chicken breast"
2. **Food Parser**: Constructs a strict system prompt.
3. **AIProvider (e.g. Gemini)**: Executes the cloud API request enforcing JSON output.
4. **Structured Food Entities**: Extracts `{ food: "chicken breast", quantity: 200, unit: "g", state: "raw" }`.
5. **Validation**: Runtime TypeScript validation ensuring no hallucinated nutrition values or negative quantities.
6. **Database Matching (Phase 3C)**: Matches the validated `ParsedFoodItem` against authoritative nutrition databases (USDA FoodData Central or Open Food Facts).
7. **Candidate Selection & User Confirmation**: Returns ordered candidate matches (`ProviderFoodMatch`) with match statuses (`matched`, `needs_confirmation`, `no_match`). The user is the final authority to confirm a match.
8. **Deterministic Nutrition Engine (Future)**: Calculates final calories and macros based strictly on user-confirmed database items.

**Architectural System Boundaries**:
- **LLM**: Probabilistic entity & quantity parser only.
- **Database Providers**: Factual source for raw nutrition values.
- **Food Matcher**: Deterministic ranking and candidate discovery.
- **User**: Final authority for food candidate confirmation.
- **Deterministic Engine**: Mathematical nutrition calculator.

**Crucial Safety Principle**: The AI identifies food entities and quantities. It does NOT determine nutrition values.

## Phase 3C.1 — Nutrition Data Contract & Measurement Basis

In Phase 3C.1, we introduced explicit measurement basis tracking and conservative matching safeguards:

- **Explicit Measurement Basis**: Every candidate carries `nutritionBasis: { type }` and `nutrientBases: Record<string, type>` with values:
  - `per_100g`: Standard 100 grams nutrient basis (USDA Foundation/SR Legacy/FNDDS, OFF `*_100g`).
  - `per_100ml`: Standard 100 milliliters nutrient basis (explicit provider response evidence only).
  - `per_serving`: Explicit per-serving nutrient basis.
  - `per_piece`: Per single unit/piece nutrient basis.
  - `unknown`: Explicit fallback when provider data is insufficient to safely determine the basis (never inferred).
- **Generic Matching Safeguards**: Generic single-word or category queries (`chicken`, `rice`, `paneer`, `dosa`, `oil`, `onion`, `potato`, `tomato`, `oats`, etc.) MUST NEVER automatically produce `matchStatus = 'matched'`. They ALWAYS require user confirmation.
- **Downstream Scope**: Phase 3D (Deterministic Calculation Engine) consumes user-confirmed candidates and applies exact mathematical conversions.

## Phase 3D — Deterministic Nutrition Calculation Engine

In Phase 3D, we implemented `NutritionCalculator` (`lib/nutrition/nutritionCalculator.ts`) to perform pure mathematical scaling on user-confirmed candidates:

- **100% Deterministic Pure Math**: ZERO LLM/AI model calls during calculation. Accepts ONLY a user-confirmed `NutritionCandidate`.
- **No Guessed Conversions**: Conversions execute strictly when candidate/provider metadata establishes explicit evidence.
- **Null Preservation**: Missing nutrient values (`null` or `undefined` in `rawNutrients`) MUST remain `null` in calculated outputs (NEVER converted to `0`).
- **Formula Matrix**:
  - `g` / `kg` against `per_100g` → `multiplier = userGrams / 100` (`kg → g` exact metric conversion).
  - `ml` / `l` against `per_100ml` → `multiplier = userMl / 100` (`l → ml` exact metric conversion).
  - `serving` against `per_serving` → `multiplier = quantity`.
  - `piece` against `per_piece` → `multiplier = quantity`.
  - `g` / `kg` against `per_serving` → `multiplier = userGrams / candidateServingWeight` (requires explicit `servingInfo.servingSize` weight).
  - Household units (`tablespoon`, `teaspoon`, `cup`, `bowl`, `piece`) → require explicit provider weight/volume metadata (`servingInfo`). Non-standard units (e.g. `bowl`) without explicit metadata return `cannot_calculate`.
- **Status Semantics**: Results report `exact` (direct basis match), `converted` (explicit metric or provider metadata conversion), or `cannot_calculate` (missing basis or unsupported conversion).

## Phase 3E — Smart Food Input Layer

In Phase 3E, we introduced the `SmartFoodInputService` (`lib/ai/smartFoodInputService.ts`) and `DeterministicFoodParser` (`lib/ai/deterministicFoodParser.ts`):

- **AI is OPTIONAL**: Simple, structured food logging (`100g quinoa`, `2 idlis`, `200ml milk`, `200g raw chicken + 150g raw rice`, `100g millet 40g toor dal`) is parsed 100% locally with **ZERO Gemini API calls**.
- **Smart Routing**:
  ```
  User Food Text -> Deterministic Parser -> Simple/Structured? -> YES -> ParsedFoodItem[] (0 AI Calls)
                                         -> NO (Conversational) -> Gemini FoodParser Fallback
  ```
- **Zero Fabrication & Zero Guessed Conversions**:
  - Non-standard units (e.g. `1 bowl sambar`) preserve `unit = 'bowl'`. `NutritionCalculator` converts `bowl` into grams ONLY if database metadata explicitly provides conversion info. It NEVER guesses weights.
  - Conversational or ambiguous entries (`"I had some chicken"`, `"a little rice"`) return `needsAI = true`.
- **Graceful Degradation**: If Gemini hits a rate limit or network error, the system returns `aiUnavailable = true` and displays friendly user guidance (`"AI parsing is temporarily unavailable. You can enter food in a simple format such as 100g rice, 2 idlis, or 200ml milk."`) instead of crashing or fabricating dummy data.
- **Safety Invariant Maintenance**: `FoodMatcher` database candidate search/ranking, user explicit confirmation, and `NutritionCalculator` deterministic scaling remain 100% unchanged.

## What is Intentionally NOT Implemented Yet

To maintain a phased, safe rollout, the following components are deliberately excluded from this foundation layer:
- **No Coaching UI**: There are no new React components or UI states for displaying AI messages yet.
- **No Prompt Engineering**: System and user prompt templates are not yet defined.
- **No Database Storage**: AI responses are not currently saved to Supabase.
- **No Medical/Health Advice Generation**: The system currently generates no text at all, preventing premature or unsafe health claims until proper safeguards and prompts are in place.
