import { ParsedFoodItem } from '../ai/types';
import { NutritionCandidate, CalculatedNutritionResult, CalculatedNutrients, CalculationStatus } from './types';

export class NutritionCalculator {
  /**
   * Deterministically calculates final nutrition totals for a user-confirmed candidate.
   * Pure mathematical logic with zero LLM/AI model calls.
   */
  public calculate(input: ParsedFoodItem, candidate: NutritionCandidate): CalculatedNutritionResult {
    const notes: string[] = [];

    // Safety Invariant 1: Reject missing or zero quantity
    if (input.quantity === null || input.quantity === undefined || input.quantity <= 0) {
      return this.buildCannotCalculateResult(
        input,
        candidate,
        notes,
        "Cannot calculate: Input quantity is missing or non-positive."
      );
    }

    const quantity = input.quantity;
    const unit = input.unit || 'serving';
    const basis = candidate.nutritionBasis;

    // Safety Invariant 2: Reject unknown measurement basis
    if (!basis || basis.type === 'unknown') {
      return this.buildCannotCalculateResult(
        input,
        candidate,
        notes,
        "Cannot calculate: Candidate nutrition measurement basis is unknown."
      );
    }

    let ratio: number | null = null;
    let status: CalculationStatus = 'cannot_calculate';

    // --------------------------------------------------
    // FORMULA MATRIX EVALUATION
    // --------------------------------------------------

    // 1. Candidate Basis: per_100g
    if (basis.type === 'per_100g') {
      if (unit === 'g' || unit === 'kg') {
        const userGrams = unit === 'kg' ? quantity * 1000 : quantity;
        ratio = userGrams / 100;
        status = unit === 'g' ? 'exact' : 'converted';
        notes.push(`Scaled ${userGrams}g food by ${ratio}x multiplier against per_100g standard basis.`);
      } else if (['tablespoon', 'teaspoon', 'cup', 'bowl', 'piece', 'serving'].includes(unit)) {
        // Requires explicit provider household weight metadata
        const explicitWeightGrams = this.extractExplicitUnitWeightGrams(candidate, unit);
        if (explicitWeightGrams && explicitWeightGrams > 0) {
          const userGrams = quantity * explicitWeightGrams;
          ratio = userGrams / 100;
          status = 'converted';
          notes.push(`Converted ${quantity} ${unit}(s) to ${userGrams}g using candidate explicit weight metadata (${explicitWeightGrams}g per ${unit}); applied ${ratio}x multiplier against per_100g basis.`);
        } else {
          return this.buildCannotCalculateResult(
            input,
            candidate,
            notes,
            `Cannot calculate: Logging in '${unit}' against a per_100g basis requires explicit candidate household weight metadata. No hardcoded or guessed conversions are permitted.`
          );
        }
      } else {
        return this.buildCannotCalculateResult(
          input,
          candidate,
          notes,
          `Cannot calculate: Input unit '${unit}' cannot be safely converted to grams for per_100g basis without explicit provider density metadata.`
        );
      }
    }

    // 2. Candidate Basis: per_100ml
    else if (basis.type === 'per_100ml') {
      if (unit === 'ml' || unit === 'l') {
        const userMl = unit === 'l' ? quantity * 1000 : quantity;
        ratio = userMl / 100;
        status = unit === 'ml' ? 'exact' : 'converted';
        notes.push(`Scaled ${userMl}ml volume by ${ratio}x multiplier against explicit per_100ml basis.`);
      } else if (['tablespoon', 'teaspoon', 'cup', 'bowl', 'serving'].includes(unit)) {
        const explicitVolumeMl = this.extractExplicitUnitVolumeMl(candidate, unit);
        if (explicitVolumeMl && explicitVolumeMl > 0) {
          const userMl = quantity * explicitVolumeMl;
          ratio = userMl / 100;
          status = 'converted';
          notes.push(`Converted ${quantity} ${unit}(s) to ${userMl}ml using candidate explicit volume metadata (${explicitVolumeMl}ml per ${unit}); applied ${ratio}x multiplier against per_100ml basis.`);
        } else {
          return this.buildCannotCalculateResult(
            input,
            candidate,
            notes,
            `Cannot calculate: Logging in '${unit}' against per_100ml basis requires explicit candidate volume metadata.`
          );
        }
      } else {
        return this.buildCannotCalculateResult(
          input,
          candidate,
          notes,
          `Cannot calculate: Unit '${unit}' cannot be converted to ml for per_100ml basis without explicit provider metadata.`
        );
      }
    }

    // 3. Candidate Basis: per_serving
    else if (basis.type === 'per_serving') {
      if (unit === 'serving') {
        ratio = quantity;
        status = 'exact';
        notes.push(`Applied direct ${ratio}x serving multiplier against explicit per_serving basis.`);
      } else if (unit === 'g' || unit === 'kg') {
        const candidateServingWeight = candidate.servingInfo?.servingSize || basis.servingSize;
        if (candidateServingWeight && candidateServingWeight > 0) {
          const userGrams = unit === 'kg' ? quantity * 1000 : quantity;
          ratio = userGrams / candidateServingWeight;
          status = 'converted';
          notes.push(`Converted ${userGrams}g to ${ratio.toFixed(4)} servings using candidate explicit serving size (${candidateServingWeight}g).`);
        } else {
          return this.buildCannotCalculateResult(
            input,
            candidate,
            notes,
            `Cannot calculate: User logged in '${unit}', but candidate per_serving basis has no explicit serving weight metadata.`
          );
        }
      } else {
        return this.buildCannotCalculateResult(
          input,
          candidate,
          notes,
          `Cannot calculate: Unit '${unit}' cannot be mapped to per_serving basis without explicit candidate serving metadata.`
        );
      }
    }

    // 4. Candidate Basis: per_piece
    else if (basis.type === 'per_piece') {
      if (unit === 'piece' || unit === 'serving') {
        ratio = quantity;
        status = 'exact';
        notes.push(`Applied direct ${ratio}x piece multiplier against explicit per_piece basis.`);
      } else {
        return this.buildCannotCalculateResult(
          input,
          candidate,
          notes,
          `Cannot calculate: Unit '${unit}' cannot be mapped to per_piece basis without explicit piece relationship.`
        );
      }
    }

    if (ratio === null || status === 'cannot_calculate') {
      return this.buildCannotCalculateResult(
        input,
        candidate,
        notes,
        "Cannot calculate: Unsupported unit and basis combination."
      );
    }

    // --------------------------------------------------
    // NUTRIENT SCALING & NULL PRESERVATION
    // --------------------------------------------------
    const calculatedNutrients = this.scaleNutrients(candidate.rawNutrients, ratio);

    return {
      input,
      candidate,
      ratioApplied: Math.round(ratio * 10000) / 10000,
      calculatedNutrients,
      calculationStatus: status,
      notes
    };
  }

  /**
   * Scales raw nutrients by ratio at full precision and rounds final reported numbers to 2 decimal places.
   * Safety Rule: Missing nutrients (null or undefined) MUST remain null (NEVER convert missing nutrients to 0).
   */
  private scaleNutrients(raw: any, ratio: number): CalculatedNutrients {
    const keys = ['calories', 'protein', 'carbohydrates', 'fat', 'fiber', 'sodium', 'potassium'];
    const result: CalculatedNutrients = {
      calories: null,
      protein: null,
      carbohydrates: null,
      fat: null,
      fiber: null,
      sodium: null,
      potassium: null
    };

    for (const key of keys) {
      const val = raw ? raw[key] : undefined;
      if (typeof val === 'number' && !isNaN(val)) {
        // Full precision calculation, rounded ONLY at final reporting to 2 decimal places
        result[key] = Math.round(val * ratio * 100) / 100;
      } else {
        // Preserve null or undefined as null
        result[key] = null;
      }
    }

    return result;
  }

  private extractExplicitUnitWeightGrams(candidate: NutritionCandidate, unit: string): number | null {
    const info = candidate.servingInfo;
    const basis = candidate.nutritionBasis;

    // Check servingInfo servingSize if unit matches
    if (info && info.servingSize && info.servingSize > 0) {
      const sUnit = (info.servingUnit || '').toLowerCase();
      if (sUnit === 'g' || sUnit === 'grams') {
        return info.servingSize;
      }
    }

    if (basis && basis.servingSize && basis.servingSize > 0) {
      const bUnit = (basis.servingUnit || '').toLowerCase();
      if (bUnit === 'g' || bUnit === 'grams') {
        return basis.servingSize;
      }
    }

    return null;
  }

  private extractExplicitUnitVolumeMl(candidate: NutritionCandidate, unit: string): number | null {
    const info = candidate.servingInfo;
    const basis = candidate.nutritionBasis;

    if (info && info.servingSize && info.servingSize > 0) {
      const sUnit = (info.servingUnit || '').toLowerCase();
      if (sUnit === 'ml') {
        return info.servingSize;
      }
    }

    if (basis && basis.servingSize && basis.servingSize > 0) {
      const bUnit = (basis.servingUnit || '').toLowerCase();
      if (bUnit === 'ml') {
        return basis.servingSize;
      }
    }

    return null;
  }

  private buildCannotCalculateResult(
    input: ParsedFoodItem,
    candidate: NutritionCandidate,
    notes: string[],
    errorMessage: string
  ): CalculatedNutritionResult {
    notes.push(errorMessage);
    return {
      input,
      candidate,
      ratioApplied: null,
      calculatedNutrients: {
        calories: null,
        protein: null,
        carbohydrates: null,
        fat: null,
        fiber: null,
        sodium: null,
        potassium: null
      },
      calculationStatus: 'cannot_calculate',
      notes,
      error: errorMessage
    };
  }
}
