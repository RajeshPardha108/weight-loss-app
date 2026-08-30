import { computeNutritionAnalytics } from './nutritionAnalytics';
import { FoodEntry, Food, Recipe, RecipeIngredient, DailyLog } from './types';

// Mock data
const mockFoods: Food[] = [
  {
    id: 1,
    calories_kcal: 100, protein_g: 10, carbohydrates_g: 5, fat_g: 2, fiber_g: 1,
    saturated_fat_g: 0.5, sodium_mg: 100, potassium_mg: 50, calcium_mg: 20,
    iron_mg: 1, magnesium_mg: 10, zinc_mg: 0.5, vitamin_c_mg: 0, vitamin_d_ug: 0,
    vitamin_b12_ug: 0, folate_ug: 0
  }
];

const mockRecipes: Recipe[] = [
  { id: 1, servings: 2 }
];

const mockIngredients: RecipeIngredient[] = [
  { recipe_id: 1, food_id: 1, quantity_g: 200 } // 200g of food 1 = 200 kcal, 20g protein
];

const mockLogs: DailyLog[] = [
  { id: 1, log_date: '2026-08-20', weight_kg: null, steps: null, water_glasses: null, meal_status: null, mood: null, weight_before_toilet: null, weight_after_toilet: null }
];

// 1. Direct Food (2 servings of a direct food)
const entryDirect: FoodEntry = {
  daily_log_id: 1,
  food_id: 1,
  recipe_id: null,
  meal_type: 'lunch',
  quantity_g: null,
  servings: 2 // 2 servings * 100g = 200 kcal
};

// 2. Recipe (1 serving of recipe which has 2 servings total)
const entryRecipe: FoodEntry = {
  daily_log_id: 1,
  food_id: null,
  recipe_id: 1,
  meal_type: 'dinner',
  quantity_g: null,
  servings: 1 // (200 kcal total / 2 recipe servings) * 1 = 100 kcal
};

// 3. Custom Packaged Food
const entryPackaged: FoodEntry = {
  daily_log_id: 1,
  food_id: null,
  recipe_id: null,
  meal_type: 'snack',
  quantity_g: null,
  servings: null,
  custom_nutrition: {
    calories: 250,
    protein: 15,
    carbohydrates: 20,
    fat: 10,
    fiber: 5,
    sodium: 300,
    // other missing fields should default to 0
  }
};

const result = computeNutritionAnalytics(
  mockLogs,
  [entryDirect, entryRecipe, entryPackaged],
  mockFoods,
  mockRecipes,
  mockIngredients
);

console.log(JSON.stringify(result, null, 2));
