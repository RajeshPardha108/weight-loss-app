import { TrendDirection } from '../analytics/types';

// ============================================================
// AI Coaching Layer — Normalized Context Types
// ============================================================

export interface AIWeightContext {
  latestWeight: number | null;
  latestDate: string | null;
  average7d: number | null;
  average30d: number | null;
  trendDirection: TrendDirection;
  absoluteChange: number | null;
}

export interface AIActivityContext {
  latestSteps: number | null;
  average7d: number | null;
  average30d: number | null;
  consistencyPct: number | null;
  trendDirection: TrendDirection;
}

export interface AIHydrationContext {
  latestWater: number | null;
  average7d: number | null;
  consistencyPct: number | null;
  trendDirection: TrendDirection;
}

export interface AIMealContext {
  cleanDays: number;
  cheatDays: number;
  cleanPercentage: number | null;
  recentTrend: Record<string, number>;
}

export interface AIMoodContext {
  mostCommonMood: string | null;
  recentMoods: Array<{ date: string; mood: string }>;
}

export interface AIBodyMeasurementContext {
  latestMeasurementDate: string | null;
  measurements: Record<string, { latest: number | null; trend: TrendDirection; absoluteChange: number | null }>;
}

export interface AIProgressContext {
  weight: AIWeightContext;
  activity: AIActivityContext;
  hydration: AIHydrationContext;
  meals: AIMealContext;
  mood: AIMoodContext;
  bodyMeasurements: AIBodyMeasurementContext;
  generatedAt: string;
}

// ============================================================
// AI Provider Abstractions
// ============================================================

export interface AIProviderRequest {
  systemPrompt: string;
  userPrompt: string;
}

export interface AIProviderResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  /**
   * Generates a response from the AI model based on the given request.
   */
  generate(request: AIProviderRequest): Promise<AIProviderResponse>;
}
