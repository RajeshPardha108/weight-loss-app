// ============================================================
// Analytics Module — Barrel Export + Orchestrator
// ============================================================

// Re-export all types
export type {
  DailyLog,
  BodyMeasurement,
  FoodEntry,
  Food,
  Recipe,
  RecipeIngredient,
  WeightAnalytics,
  StepAnalytics,
  WaterAnalytics,
  MealAnalytics,
  MoodAnalytics,
  BodyMeasurementAnalytics,
  NutritionAnalytics,
  AnalyticsSnapshot,
  TrendDirection,
  DayValue,
  SingleMeasurementAnalytics,
  DailyNutrition,
} from './types';

// Re-export date utilities
export {
  getLocalDateString,
  parseLogDate,
  daysAgoDateString,
  daysBetween,
  filterLastNDays,
} from './dateUtils';

// Re-export individual analytics functions
export { computeWeightAnalytics } from './weightAnalytics';
export { computeStepAnalytics } from './stepAnalytics';
export { computeWaterAnalytics } from './waterAnalytics';
export { computeMealAnalytics } from './mealAnalytics';
export { computeMoodAnalytics } from './moodAnalytics';
export { computeBodyMeasurementAnalytics } from './bodyMeasurementAnalytics';
export { computeNutritionAnalytics } from './nutritionAnalytics';
export {
  computeSmartAnalytics,
  getAnchorTimeMs,
  type SingleGoalForecast,
  type PlateauDetection,
  type WeeklyComparison,
  type SmartAnalyticsReport,
} from './forecasting';

// Import for orchestrator
import { DailyLog, BodyMeasurement, FoodEntry, Food, Recipe, RecipeIngredient, AnalyticsSnapshot } from './types';
import { computeWeightAnalytics } from './weightAnalytics';
import { computeStepAnalytics } from './stepAnalytics';
import { computeWaterAnalytics } from './waterAnalytics';
import { computeMealAnalytics } from './mealAnalytics';
import { computeMoodAnalytics } from './moodAnalytics';
import { computeBodyMeasurementAnalytics } from './bodyMeasurementAnalytics';
import { computeNutritionAnalytics } from './nutritionAnalytics';

/**
 * Computes the full analytics snapshot from all available data.
 * All parameters are already-fetched data arrays — no Supabase queries here.
 *
 * Nutrition-related params are optional since those tables may be empty.
 */
export function computeFullAnalytics(
  logs: DailyLog[],
  measurements: BodyMeasurement[],
  foodEntries: FoodEntry[] = [],
  foods: Food[] = [],
  recipes: Recipe[] = [],
  recipeIngredients: RecipeIngredient[] = [],
): AnalyticsSnapshot {
  return {
    weight: computeWeightAnalytics(logs),
    steps: computeStepAnalytics(logs),
    water: computeWaterAnalytics(logs),
    meals: computeMealAnalytics(logs),
    mood: computeMoodAnalytics(logs),
    bodyMeasurements: computeBodyMeasurementAnalytics(measurements),
    nutrition: computeNutritionAnalytics(logs, foodEntries, foods, recipes, recipeIngredients),
    generatedAt: new Date().toISOString(),
  };
}
