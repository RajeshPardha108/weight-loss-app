import { ParsedFoodItem, FoodInputState, FoodQuantityUnit } from '../ai/types';

export type ProviderType = 'usda' | 'open_food_facts';

export type NutritionBasisType =
  | 'per_100g'
  | 'per_100ml'
  | 'per_serving'
  | 'per_piece'
  | 'unknown';

export interface NutritionBasis {
  type: NutritionBasisType;
  servingSize?: number;
  servingUnit?: string;
  householdServingFullText?: string;
}

export interface RawNutrientData {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  potassium?: number;
  [key: string]: number | undefined;
}

export interface ServingInfo {
  servingSize?: number;
  servingUnit?: string;
  householdServingFullText?: string;
}

export interface NutritionCandidate {
  id: string;
  provider: ProviderType;
  providerFoodId: string;
  displayName: string;
  brand?: string;
  dataType?: string; // e.g. "Foundation", "SR Legacy", "Branded", "Survey (FNDDS)"
  barcode?: string;
  servingInfo?: ServingInfo;
  rawNutrients: RawNutrientData;
  nutritionBasis: NutritionBasis;
  nutrientBases?: Record<string, NutritionBasisType>;
  score: number; // 0.0 to 1.0 ranking score
  scoreReasons: string[];
  sourceMetadata: Record<string, any>;
}

export type MatchStatus = 'matched' | 'needs_confirmation' | 'no_match';

export interface ProviderFoodMatch {
  input: ParsedFoodItem;
  matchStatus: MatchStatus;
  candidates: NutritionCandidate[];
  providerUsed: ProviderType;
  error?: string;
}

export interface NutritionFoodProvider {
  name: ProviderType;
  search(query: string, options?: { itemState?: FoodInputState; limit?: number }): Promise<NutritionCandidate[]>;
  getById(id: string): Promise<NutritionCandidate | null>;
}

// Phase 3D — Calculation Types
export type CalculationStatus = 'exact' | 'converted' | 'cannot_calculate';

export interface CalculatedNutrients {
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  fiber: number | null;
  sodium: number | null;
  potassium: number | null;
  [key: string]: number | null;
}

export interface CalculatedNutritionResult {
  input: ParsedFoodItem;
  candidate: NutritionCandidate;
  ratioApplied: number | null;
  calculatedNutrients: CalculatedNutrients;
  calculationStatus: CalculationStatus;
  notes: string[];
  error?: string;
}
