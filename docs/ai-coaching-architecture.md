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

## What is Intentionally NOT Implemented Yet

To maintain a phased, safe rollout, the following components are deliberately excluded from this foundation layer:
- **No Coaching UI**: There are no new React components or UI states for displaying AI messages yet.
- **No Prompt Engineering**: System and user prompt templates are not yet defined.
- **No Database Storage**: AI responses are not currently saved to Supabase.
- **No Medical/Health Advice Generation**: The system currently generates no text at all, preventing premature or unsafe health claims until proper safeguards and prompts are in place.
