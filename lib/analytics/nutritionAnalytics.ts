// ============================================================
// Nutrition Analytics
// Resolves: food_entry → food (direct) OR food_entry → recipe → ingredients → foods
// OR food_entry -> custom_nutrition (packaged food)
// ============================================================

import { FoodEntry, Food, Recipe, RecipeIngredient, NutritionAnalytics, DailyNutrition, DailyLog } from './types';

type NutrientTotals = Omit<DailyNutrition, 'date'>;

function emptyTotals(): NutrientTotals {
  return {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fiber: 0,
    saturated_fat: 0,
    sodium: 0,
    potassium: 0,
    calcium: 0,
    iron: 0,
    magnesium: 0,
    zinc: 0,
    vitamin_c: 0,
    vitamin_d: 0,
    vitamin_b12: 0,
    folate: 0,
  };
}

function addFoodNutrients(totals: NutrientTotals, food: Food, multiplier: number) {
  totals.calories += (food.calories_kcal ?? 0) * multiplier;
  totals.protein += (food.protein_g ?? 0) * multiplier;
  totals.carbohydrates += (food.carbohydrates_g ?? 0) * multiplier;
  totals.fat += (food.fat_g ?? 0) * multiplier;
  totals.fiber += (food.fiber_g ?? 0) * multiplier;
  totals.saturated_fat += (food.saturated_fat_g ?? 0) * multiplier;
  totals.sodium += (food.sodium_mg ?? 0) * multiplier;
  totals.potassium += (food.potassium_mg ?? 0) * multiplier;
  totals.calcium += (food.calcium_mg ?? 0) * multiplier;
  totals.iron += (food.iron_mg ?? 0) * multiplier;
  totals.magnesium += (food.magnesium_mg ?? 0) * multiplier;
  totals.zinc += (food.zinc_mg ?? 0) * multiplier;
  totals.vitamin_c += (food.vitamin_c_mg ?? 0) * multiplier;
  totals.vitamin_d += (food.vitamin_d_ug ?? 0) * multiplier;
  totals.vitamin_b12 += (food.vitamin_b12_ug ?? 0) * multiplier;
  totals.folate += (food.folate_ug ?? 0) * multiplier;
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

  // Path 3: Packaged food using nutrition values supplied from the package label
  if (entry.custom_nutrition) {
    const totals = emptyTotals();
    totals.calories = entry.custom_nutrition.calories ?? 0;
    totals.protein = entry.custom_nutrition.protein ?? 0;
    totals.carbohydrates = entry.custom_nutrition.carbohydrates ?? 0;
    totals.fat = entry.custom_nutrition.fat ?? 0;
    totals.fiber = entry.custom_nutrition.fiber ?? 0;
    totals.saturated_fat = entry.custom_nutrition.saturated_fat ?? 0;
    totals.sodium = entry.custom_nutrition.sodium ?? 0;
    totals.potassium = entry.custom_nutrition.potassium ?? 0;
    totals.calcium = entry.custom_nutrition.calcium ?? 0;
    totals.iron = entry.custom_nutrition.iron ?? 0;
    totals.magnesium = entry.custom_nutrition.magnesium ?? 0;
    totals.zinc = entry.custom_nutrition.zinc ?? 0;
    totals.vitamin_c = entry.custom_nutrition.vitamin_c ?? 0;
    totals.vitamin_d = entry.custom_nutrition.vitamin_d ?? 0;
    totals.vitamin_b12 = entry.custom_nutrition.vitamin_b12 ?? 0;
    totals.folate = entry.custom_nutrition.folate ?? 0;
    return totals;
  }

  // Path 2: Outside/restaurant food using a directly selected food item
  if (entry.food_id !== null) {
    const food = foodsMap.get(entry.food_id);
    if (!food) return null;

    // Use quantity_g if provided, otherwise assume servings directly multiplies the per-100g values
    // This allows a restaurant meal to just be "1 serving"
    const multiplier = entry.quantity_g !== null
      ? entry.quantity_g / 100
      : (entry.servings ?? 1);

    const totals = emptyTotals();
    addFoodNutrients(totals, food, multiplier);
    return totals;
  }

  // Path 1: Home-cooked meals using measured raw ingredients in grams
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

      addFoodNutrients(totals, food, multiplier);
    }

    // Scale by servings consumed vs recipe servings
    const recipeServings = recipe.servings ?? 1;
    const consumedServings = entry.servings ?? 1;
    const servingMultiplier = consumedServings / recipeServings;

    const scaledTotals = emptyTotals();
    scaledTotals.calories = totals.calories * servingMultiplier;
    scaledTotals.protein = totals.protein * servingMultiplier;
    scaledTotals.carbohydrates = totals.carbohydrates * servingMultiplier;
    scaledTotals.fat = totals.fat * servingMultiplier;
    scaledTotals.fiber = totals.fiber * servingMultiplier;
    scaledTotals.saturated_fat = totals.saturated_fat * servingMultiplier;
    scaledTotals.sodium = totals.sodium * servingMultiplier;
    scaledTotals.potassium = totals.potassium * servingMultiplier;
    scaledTotals.calcium = totals.calcium * servingMultiplier;
    scaledTotals.iron = totals.iron * servingMultiplier;
    scaledTotals.magnesium = totals.magnesium * servingMultiplier;
    scaledTotals.zinc = totals.zinc * servingMultiplier;
    scaledTotals.vitamin_c = totals.vitamin_c * servingMultiplier;
    scaledTotals.vitamin_d = totals.vitamin_d * servingMultiplier;
    scaledTotals.vitamin_b12 = totals.vitamin_b12 * servingMultiplier;
    scaledTotals.folate = totals.folate * servingMultiplier;

    return scaledTotals;
  }

  return null;
}

function roundNutrient(val: number): number {
  return Math.round(val * 10) / 10;
}

/**
 * Computes nutrition analytics from food entries + reference tables.
 */
export function computeNutritionAnalytics(
  logs: DailyLog[],
  entries: FoodEntry[],
  foods: Food[],
  recipes: Recipe[],
  recipeIngredients: RecipeIngredient[]
): NutritionAnalytics {
  if (entries.length === 0 && foods.length === 0) {
    // Return empty stats
    return {
      daysWithData: 0,
      averageDaily: {
        calories: null, protein: null, carbohydrates: null, fat: null, fiber: null,
        saturated_fat: null, sodium: null, potassium: null, calcium: null,
        iron: null, magnesium: null, zinc: null, vitamin_c: null,
        vitamin_d: null, vitamin_b12: null, folate: null
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

  const logDateMap = new Map<number, string>();
  for (const log of logs) {
    if (log.id !== undefined) logDateMap.set(log.id, log.log_date);
  }

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
    existing.saturated_fat += nutrients.saturated_fat;
    existing.sodium += nutrients.sodium;
    existing.potassium += nutrients.potassium;
    existing.calcium += nutrients.calcium;
    existing.iron += nutrients.iron;
    existing.magnesium += nutrients.magnesium;
    existing.zinc += nutrients.zinc;
    existing.vitamin_c += nutrients.vitamin_c;
    existing.vitamin_d += nutrients.vitamin_d;
    existing.vitamin_b12 += nutrients.vitamin_b12;
    existing.folate += nutrients.folate;
  }

  const dailyData: DailyNutrition[] = Array.from(dayTotals.entries())
    .map(([date, totals]) => ({
      date,
      calories: Math.round(totals.calories),
      protein: roundNutrient(totals.protein),
      carbohydrates: roundNutrient(totals.carbohydrates),
      fat: roundNutrient(totals.fat),
      fiber: roundNutrient(totals.fiber),
      saturated_fat: roundNutrient(totals.saturated_fat),
      sodium: Math.round(totals.sodium),
      potassium: Math.round(totals.potassium),
      calcium: Math.round(totals.calcium),
      iron: roundNutrient(totals.iron),
      magnesium: Math.round(totals.magnesium),
      zinc: roundNutrient(totals.zinc),
      vitamin_c: roundNutrient(totals.vitamin_c),
      vitamin_d: roundNutrient(totals.vitamin_d),
      vitamin_b12: roundNutrient(totals.vitamin_b12),
      folate: roundNutrient(totals.folate),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const daysWithData = dailyData.length;

  const avg: Record<keyof NutrientTotals, number | null> = {
    calories: null, protein: null, carbohydrates: null, fat: null, fiber: null,
    saturated_fat: null, sodium: null, potassium: null, calcium: null,
    iron: null, magnesium: null, zinc: null, vitamin_c: null,
    vitamin_d: null, vitamin_b12: null, folate: null
  };

  if (daysWithData > 0) {
    const keys = Object.keys(avg) as (keyof NutrientTotals)[];
    for (const key of keys) {
      const sum = dailyData.reduce((acc, curr) => acc + curr[key], 0);
      avg[key] = key === 'calories' || key === 'sodium' || key === 'potassium' || key === 'calcium' || key === 'magnesium'
        ? Math.round(sum / daysWithData)
        : roundNutrient(sum / daysWithData);
    }
  }

  return {
    daysWithData,
    averageDaily: avg as NutritionAnalytics['averageDaily'],
    recentDays: dailyData.slice(-7),
  };
}
