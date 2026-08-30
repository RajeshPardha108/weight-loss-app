import { NutritionFoodProvider, NutritionCandidate, ProviderType, RawNutrientData, NutritionBasis, NutritionBasisType } from '../types';
import { FoodInputState } from '../../ai/types';

export class OpenFoodFactsProvider implements NutritionFoodProvider {
  readonly name: ProviderType = 'open_food_facts';
  private baseUrl = 'https://world.openfoodfacts.org';

  async search(query: string, options?: { itemState?: FoodInputState; limit?: number }): Promise<NutritionCandidate[]> {
    const limit = options?.limit || 10;
    
    const isBarcode = /^\d{8,14}$/.test(query.trim());
    if (isBarcode) {
      const barcodeCandidate = await this.getById(query.trim());
      return barcodeCandidate ? [barcodeCandidate] : [];
    }

    const url = `${this.baseUrl}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WeightLossApp-NutritionIntelligence/1.0 (contact@weightlossapp.internal)',
        },
      });

      if (!response.ok) {
        throw new Error(`Open Food Facts API error (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.products)) {
        return [];
      }

      return data.products
        .filter((p: any) => p.product_name || p.product_name_en)
        .map((p: any) => this.mapOFFProductToCandidate(p));
    } catch (error: any) {
      throw new Error(`Failed to search Open Food Facts: ${error.message}`);
    }
  }

  async getById(id: string): Promise<NutritionCandidate | null> {
    const url = `${this.baseUrl}/api/v0/product/${encodeURIComponent(id)}.json`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WeightLossApp-NutritionIntelligence/1.0 (contact@weightlossapp.internal)',
        },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Open Food Facts API error (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      if (!data || data.status !== 1 || !data.product) {
        return null;
      }

      return this.mapOFFProductToCandidate(data.product);
    } catch (error: any) {
      throw new Error(`Failed to fetch Open Food Facts product by barcode/id (${id}): ${error.message}`);
    }
  }

  public mapOFFProductToCandidate(product: any): NutritionCandidate {
    const nutriments = product.nutriments || {};
    const rawNutrients: RawNutrientData = {};
    const nutrientBases: Record<string, NutritionBasisType> = {};

    const nutrientKeys = [
      { name: 'calories', keys: ['energy-kcal_100g', 'energy-kcal_serving', 'energy-kcal'] },
      { name: 'protein', keys: ['proteins_100g', 'proteins_serving', 'proteins'] },
      { name: 'carbohydrates', keys: ['carbohydrates_100g', 'carbohydrates_serving', 'carbohydrates'] },
      { name: 'fat', keys: ['fat_100g', 'fat_serving', 'fat'] },
      { name: 'fiber', keys: ['fiber_100g', 'fiber_serving', 'fiber'] },
      { name: 'sodium', keys: ['sodium_100g', 'sodium_serving', 'sodium'] },
      { name: 'potassium', keys: ['potassium_100g', 'potassium_serving', 'potassium'] },
    ];

    for (const item of nutrientKeys) {
      for (const k of item.keys) {
        if (typeof nutriments[k] === 'number') {
          rawNutrients[item.name] = nutriments[k];
          if (k.endsWith('_100g')) {
            nutrientBases[item.name] = 'per_100g';
          } else if (k.endsWith('_serving')) {
            nutrientBases[item.name] = 'per_serving';
          } else {
            nutrientBases[item.name] = 'unknown';
          }
          break;
        }
      }
    }

    // Determine overall primary basis
    const basisTypes = Object.values(nutrientBases);
    let primaryBasisType: NutritionBasisType = 'unknown';

    if (basisTypes.length > 0) {
      const firstType = basisTypes[0];
      if (firstType !== 'unknown' && basisTypes.every(t => t === firstType)) {
        primaryBasisType = firstType;
      } else {
        primaryBasisType = 'unknown';
      }
    }

    const barcode = product.code || product._id || '';
    const displayName = product.product_name_en || product.product_name || 'Packaged Product';

    return {
      id: `off_${barcode}`,
      provider: 'open_food_facts',
      providerFoodId: barcode,
      displayName,
      brand: product.brands || product.brand_owner || undefined,
      dataType: 'Packaged Product',
      barcode: barcode || undefined,
      servingInfo: {
        servingSize: product.serving_quantity ? Number(product.serving_quantity) : undefined,
        servingUnit: product.serving_quantity_unit || undefined,
        householdServingFullText: product.serving_size || undefined,
      },
      rawNutrients,
      nutritionBasis: {
        type: primaryBasisType,
        servingSize: product.serving_quantity ? Number(product.serving_quantity) : undefined,
        servingUnit: product.serving_quantity_unit || undefined,
        householdServingFullText: product.serving_size || undefined,
      },
      nutrientBases,
      score: 0,
      scoreReasons: [],
      sourceMetadata: {
        categories: product.categories,
        labels: product.labels,
        countries: product.countries,
      }
    };
  }
}
