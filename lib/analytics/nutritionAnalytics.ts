// ============================================================
// Nutrition Analytics
// Resolves: food_entry → food (direct) OR food_entry → recipe → ingredients → foods
// Only calculates where data reliably allows it.
// ============================================================

import { FoodEntry, Food, Recipe, RecipeIngredient, NutritionAnalytics, DailyNutrition, DailyLog } from './types';

interface NutrientTotals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
}

function emptyTotals(): NutrientTotals {
  return { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 };
}

/**
 * Resolves a single food entry into its nutrient contribution.
 */
function resolveEntryNutrients(
  entry: FoodEntry,
  foodsMap: Map<number, Food>,
  recipesMap: Map<number, Recipe>,
  recipeIngredientsMap: Map<number, RecipeIngredient[]>
): NutrientTotals | null {
  // Path 1: Direct food reference
  if (entry.food_id !== null) {
    const food = foodsMap.get(entry.food_id);
    if (!food) return null;

    // quantity_g: how many grams of this food. Nutrient values are per 100g by convention.
    const quantityG = entry.quantity_g ?? 100;
    const multiplier = quantityG / 100;

    return {
      calories: (food.calories_kcal ?? 0) * multiplier,
      protein: (food.protein_g ?? 0) * multiplier,
      carbohydrates: (food.carbohydrates_g ?? 0) * multiplier,
      fat: (food.fat_g ?? 0) * multiplier,
      fiber: (food.fiber_g ?? 0) * multiplier,
    };
  }

  // Path 2: Recipe reference → resolve via ingredients
  if (entry.recipe_id !== null) {
    const recipe = recipesMap.get(entry.recipe_id);
    if (!recipe) return null;

    const ingredients = recipeIngredientsMap.get(entry.recipe_id);
    if (!ingredients || ingredients.length === 0) return null;

    const totals = emptyTotals();
    for (const ing of ingredients) {
      const food = foodsMap.get(ing.food_id);
      if (!food) continue;

      const ingQuantityG = ing.quantity_g ?? 100;
      const multiplier = ingQuantityG / 100;

      totals.calories += (food.calories_kcal ?? 0) * multiplier;
      totals.protein += (food.protein_g ?? 0) * multiplier;
      totals.carbohydrates += (food.carbohydrates_g ?? 0) * multiplier;
      totals.fat += (food.fat_g ?? 0) * multiplier;
      totals.fiber += (food.fiber_g ?? 0) * multiplier;
    }

    // Scale by servings consumed vs recipe servings
    const recipeServings = recipe.servings ?? 1;
    const consumedServings = entry.servings ?? 1;
    const servingMultiplier = consumedServings / recipeServings;

    return {
      calories: totals.calories * servingMultiplier,
      protein: totals.protein * servingMultiplier,
      carbohydrates: totals.carbohydrates * servingMultiplier,
      fat: totals.fat * servingMultiplier,
      fiber: totals.fiber * servingMultiplier,
    };
  }

  return null;
}

/**
 * Computes nutrition analytics from food entries + reference tables.
 * Also needs daily_logs to map daily_log_id → log_date.
 */
export function computeNutritionAnalytics(
  logs: DailyLog[],
  entries: FoodEntry[],
  foods: Food[],
  recipes: Recipe[],
  recipeIngredients: RecipeIngredient[]
): NutritionAnalytics {
  if (entries.length === 0 || foods.length === 0) {
    return {
      daysWithData: 0,
      averageDaily: {
        calories: null,
        protein: null,
        carbohydrates: null,
        fat: null,
        fiber: null,
      },
      recentDays: [],
    };
  }

  // Build lookup maps
  const foodsMap = new Map<number, Food>();
  for (const f of foods) foodsMap.set(f.id, f);

  const recipesMap = new Map<number, Recipe>();
  for (const r of recipes) recipesMap.set(r.id, r);

  const recipeIngredientsMap = new Map<number, RecipeIngredient[]>();
  for (const ri of recipeIngredients) {
    if (!recipeIngredientsMap.has(ri.recipe_id)) {
      recipeIngredientsMap.set(ri.recipe_id, []);
    }
    recipeIngredientsMap.get(ri.recipe_id)!.push(ri);
  }

  // Map daily_log_id → log_date
  const logDateMap = new Map<number, string>();
  for (const log of logs) {
    if (log.id !== undefined) logDateMap.set(log.id, log.log_date);
  }

  // Group entries by date
  const dayTotals = new Map<string, NutrientTotals>();

  for (const entry of entries) {
    const date = logDateMap.get(entry.daily_log_id);
    if (!date) continue;

    const nutrients = resolveEntryNutrients(entry, foodsMap, recipesMap, recipeIngredientsMap);
    if (!nutrients) continue;

    if (!dayTotals.has(date)) {
      dayTotals.set(date, emptyTotals());
    }

    const existing = dayTotals.get(date)!;
    existing.calories += nutrients.calories;
    existing.protein += nutrients.protein;
    existing.carbohydrates += nutrients.carbohydrates;
    existing.fat += nutrients.fat;
    existing.fiber += nutrients.fiber;
  }

  const dailyData: DailyNutrition[] = Array.from(dayTotals.entries())
    .map(([date, totals]) => ({
      date,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      carbohydrates: Math.round(totals.carbohydrates * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      fiber: Math.round(totals.fiber * 10) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const daysWithData = dailyData.length;

  // Average daily
  let avgCalories: number | null = null;
  let avgProtein: number | null = null;
  let avgCarbs: number | null = null;
  let avgFat: number | null = null;
  let avgFiber: number | null = null;

  if (daysWithData > 0) {
    avgCalories = Math.round(dailyData.reduce((s, d) => s + d.calories, 0) / daysWithData);
    avgProtein = Math.round(dailyData.reduce((s, d) => s + d.protein, 0) / daysWithData * 10) / 10;
    avgCarbs = Math.round(dailyData.reduce((s, d) => s + d.carbohydrates, 0) / daysWithData * 10) / 10;
    avgFat = Math.round(dailyData.reduce((s, d) => s + d.fat, 0) / daysWithData * 10) / 10;
    avgFiber = Math.round(dailyData.reduce((s, d) => s + d.fiber, 0) / daysWithData * 10) / 10;
  }

  return {
    daysWithData,
    averageDaily: {
      calories: avgCalories,
      protein: avgProtein,
      carbohydrates: avgCarbs,
      fat: avgFat,
      fiber: avgFiber,
    },
    recentDays: dailyData.slice(-7),
  };
}
