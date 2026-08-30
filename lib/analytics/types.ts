// ============================================================
// Analytics Types — Input and Output interfaces
// ============================================================

// ---- Input Types (match Supabase table shapes) ----

export interface DailyLog {
  id?: number;
  log_date: string; // YYYY-MM-DD
  weight_kg: number | null;
  steps: number | null;
  water_glasses: number | null;
  meal_status: string | null;
  mood: string | null;
  weight_before_toilet: number | null;
  weight_after_toilet: number | null;
}

export interface BodyMeasurement {
  id?: number;
  measurement_date: string; // YYYY-MM-DD
  neck_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  abdomen_cm: number | null;
  hip_cm: number | null;
  thigh_cm: number | null;
  upper_arm_cm: number | null;
}

export interface FoodEntry {
  id?: number;
  daily_log_id: number;
  food_id: number | null;
  recipe_id: number | null;
  meal_type: string | null;
  quantity_g: number | null;
  servings: number | null;
  custom_nutrition?: Partial<Omit<DailyNutrition, 'date'>>;
}

export interface Food {
  id: number;
  calories_kcal: number | null;
  protein_g: number | null;
  carbohydrates_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  saturated_fat_g: number | null;
  sodium_mg: number | null;
  potassium_mg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
  magnesium_mg: number | null;
  zinc_mg: number | null;
  vitamin_c_mg: number | null;
  vitamin_d_ug: number | null;
  vitamin_b12_ug: number | null;
  folate_ug: number | null;
}

export interface Recipe {
  id: number;
  servings: number | null;
}

export interface RecipeIngredient {
  id?: number;
  recipe_id: number;
  food_id: number;
  quantity_g: number | null;
}

// ---- Output Types ----

export type TrendDirection = 'losing' | 'gaining' | 'stable' | 'insufficient_data';

export interface DayValue {
  date: string;
  value: number;
}

export interface WeightAnalytics {
  latestWeight: number | null;
  latestDate: string | null;
  earliestWeight: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  average7d: number | null;
  average30d: number | null;
  previousAverage7d: number | null;
  trendDirection: TrendDirection;
  entryCount: number;
  daysSinceLastEntry: number | null;
}

export interface StepAnalytics {
  latestSteps: number | null;
  latestDate: string | null;
  average7d: number | null;
  average30d: number | null;
  previousAverage7d: number | null;
  highestDay: DayValue | null;
  lowestDay: DayValue | null;
  daysWithData: number;
  consistencyPct: number | null;  // % of last 30 days with step data
  trendDirection: TrendDirection;
}

export interface WaterAnalytics {
  latestWater: number | null;
  latestDate: string | null;
  average7d: number | null;
  average30d: number | null;
  daysWithData: number;
  consistencyPct: number | null;
  trendDirection: TrendDirection;
}

export interface MealAnalytics {
  daysWithMealStatus: number;
  cleanDays: number;
  cheatDays: number;
  otherStatusDays: number;
  cleanPercentage: number | null;
  statusDistribution: Record<string, number>;
  recentTrend: Record<string, number>;  // last 7 entries with meal_status
}

export interface MoodAnalytics {
  daysWithMood: number;
  distribution: Record<string, number>;
  mostCommonMood: string | null;
  recentMoods: Array<{ date: string; mood: string }>;
}

export interface SingleMeasurementAnalytics {
  latest: number | null;
  latestDate: string | null;
  earliest: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  trend: TrendDirection;
}

export interface BodyMeasurementAnalytics {
  neck: SingleMeasurementAnalytics;
  chest: SingleMeasurementAnalytics;
  waist: SingleMeasurementAnalytics;
  abdomen: SingleMeasurementAnalytics;
  hip: SingleMeasurementAnalytics;
  thigh: SingleMeasurementAnalytics;
  upperArm: SingleMeasurementAnalytics;
  latestMeasurementDate: string | null;
  totalMeasurementSessions: number;
}

export interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  saturated_fat: number;
  sodium: number;
  potassium: number;
  calcium: number;
  iron: number;
  magnesium: number;
  zinc: number;
  vitamin_c: number;
  vitamin_d: number;
  vitamin_b12: number;
  folate: number;
}

export interface NutritionAnalytics {
  daysWithData: number;
  averageDaily: {
    calories: number | null;
    protein: number | null;
    carbohydrates: number | null;
    fat: number | null;
    fiber: number | null;
    saturated_fat: number | null;
    sodium: number | null;
    potassium: number | null;
    calcium: number | null;
    iron: number | null;
    magnesium: number | null;
    zinc: number | null;
    vitamin_c: number | null;
    vitamin_d: number | null;
    vitamin_b12: number | null;
    folate: number | null;
  };
  recentDays: DailyNutrition[];  // last 7 days with data
}

export interface AnalyticsSnapshot {
  weight: WeightAnalytics;
  steps: StepAnalytics;
  water: WaterAnalytics;
  meals: MealAnalytics;
  mood: MoodAnalytics;
  bodyMeasurements: BodyMeasurementAnalytics;
  nutrition: NutritionAnalytics;
  generatedAt: string;  // ISO timestamp
}
