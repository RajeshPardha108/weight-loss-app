import { NutritionFoodProvider, NutritionCandidate, ProviderType, RawNutrientData, NutritionBasis, NutritionBasisType } from '../types';
import { FoodInputState } from '../../ai/types';

export class USDAProvider implements NutritionFoodProvider {
  readonly name: ProviderType = 'usda';
  private apiKey: string;
  private baseUrl = 'https://api.nal.usda.gov/fdc/v1';

  constructor() {
    const key = process.env.USDA_API_KEY;
    if (!key) {
      this.apiKey = '';
    } else {
      this.apiKey = key;
    }
  }

  async search(query: string, options?: { itemState?: FoodInputState; limit?: number }): Promise<NutritionCandidate[]> {
    if (!this.apiKey) {
      throw new Error('USDA_API_KEY environment variable is missing. Please set USDA_API_KEY in .env.local.');
    }

    const pageSize = options?.limit || 10;
    const url = `${this.baseUrl}/foods/search?api_key=${encodeURIComponent(this.apiKey)}`;

    const payload = {
      query,
      pageSize,
      dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errText = '';
        try {
          errText = await response.text();
        } catch (e) {
          errText = response.statusText;
        }
        throw new Error(`USDA API error (${response.status}): ${errText}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.foods)) {
        return [];
      }

      return data.foods.map((food: any) => this.mapUSDAFoodToCandidate(food));
    } catch (error: any) {
      if (error.message.includes('USDA_API_KEY')) {
        throw error;
      }
      throw new Error(`Failed to search USDA FoodData Central: ${error.message}`);
    }
  }

  async getById(id: string): Promise<NutritionCandidate | null> {
    if (!this.apiKey) {
      throw new Error('USDA_API_KEY environment variable is missing.');
    }

    const url = `${this.baseUrl}/food/${encodeURIComponent(id)}?api_key=${encodeURIComponent(this.apiKey)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`USDA API error (${response.status}): ${response.statusText}`);
      }

      const food = await response.json();
      return this.mapUSDAFoodToCandidate(food);
    } catch (error: any) {
      throw new Error(`Failed to fetch USDA food by ID (${id}): ${error.message}`);
    }
  }

  public mapUSDAFoodToCandidate(food: any): NutritionCandidate {
    const rawNutrients: RawNutrientData = {};
    const nutrientBases: Record<string, NutritionBasisType> = {};

    // Determine primary basis strictly from response evidence
    const basisInfo = this.determineUSDANutritionBasis(food);

    if (Array.isArray(food.foodNutrients)) {
      for (const n of food.foodNutrients) {
        const name = (n.nutrientName || n.name || '').toLowerCase();
        const value = typeof n.value === 'number' ? n.value : (typeof n.amount === 'number' ? n.amount : 0);

        let key: string | null = null;
        if (name.includes('energy')) {
          key = 'calories';
        } else if (name.includes('protein')) {
          key = 'protein';
        } else if (name.includes('carbohydrate')) {
          key = 'carbohydrates';
        } else if (name.includes('total lipid') || name === 'fat') {
          key = 'fat';
        } else if (name.includes('fiber')) {
          key = 'fiber';
        } else if (name.includes('sodium')) {
          key = 'sodium';
        } else if (name.includes('potassium')) {
          key = 'potassium';
        }

        if (key) {
          rawNutrients[key] = value;
          nutrientBases[key] = basisInfo.type;
        }
      }
    }

    const fdcId = String(food.fdcId || food.id || '');
    const displayName = food.description || food.name || 'Unknown USDA Food';

    return {
      id: `usda_${fdcId}`,
      provider: 'usda',
      providerFoodId: fdcId,
      displayName,
      brand: food.brandOwner || food.brandName || undefined,
      dataType: food.dataType || undefined,
      servingInfo: {
        servingSize: food.servingSize ? Number(food.servingSize) : undefined,
        servingUnit: food.servingSizeUnit || undefined,
        householdServingFullText: food.householdServingFullText || undefined,
      },
      rawNutrients,
      nutritionBasis: basisInfo,
      nutrientBases,
      score: 0,
      scoreReasons: [],
      sourceMetadata: {
        publicationDate: food.publicationDate,
        foodCategory: food.foodCategory,
        gtinUpc: food.gtinUpc,
        dataType: food.dataType,
      }
    };
  }

  private determineUSDANutritionBasis(food: any): NutritionBasis {
    const dataType = (food.dataType || '').trim();
    const servingSizeUnit = (food.servingSizeUnit || '').toLowerCase().trim();
    const servingSize = typeof food.servingSize === 'number' ? food.servingSize : undefined;

    // Rule A, B, C: USDA Foundation, SR Legacy, and Survey (FNDDS) foods report standard 100g basis
    if (['Foundation', 'SR Legacy', 'Survey (FNDDS)'].includes(dataType)) {
      // Only mark per_100ml if response explicitly states 100 ml unit
      if (servingSizeUnit === 'ml' && servingSize === 100) {
        return {
          type: 'per_100ml',
          servingSize: 100,
          servingUnit: 'ml',
          householdServingFullText: food.householdServingFullText || undefined,
        };
      }
      return {
        type: 'per_100g',
        servingSize: 100,
        servingUnit: 'g',
        householdServingFullText: food.householdServingFullText || undefined,
      };
    }

    // Rule D: Branded USDA foods
    if (dataType === 'Branded') {
      if (servingSizeUnit === 'g' && servingSize === 100) {
        return {
          type: 'per_100g',
          servingSize: 100,
          servingUnit: 'g',
          householdServingFullText: food.householdServingFullText || undefined,
        };
      }
      if (servingSizeUnit === 'ml' && servingSize === 100) {
        return {
          type: 'per_100ml',
          servingSize: 100,
          servingUnit: 'ml',
          householdServingFullText: food.householdServingFullText || undefined,
        };
      }
      if (servingSize || food.householdServingFullText) {
        return {
          type: 'per_serving',
          servingSize,
          servingUnit: servingSizeUnit || undefined,
          householdServingFullText: food.householdServingFullText || undefined,
        };
      }
    }

    // Rule E: If the response does not provide enough information to safely determine the basis, mark unknown. Never guess.
    return {
      type: 'unknown',
      servingSize,
      servingUnit: servingSizeUnit || undefined,
      householdServingFullText: food.householdServingFullText || undefined,
    };
  }
}
