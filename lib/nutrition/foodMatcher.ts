import { ParsedFoodItem, FoodInputState } from '../ai/types';
import { ProviderFoodMatch, NutritionCandidate, ProviderType, MatchStatus } from './types';
import { USDAProvider } from './providers/usda';
import { OpenFoodFactsProvider } from './providers/openFoodFacts';

export class FoodMatcher {
  private usdaProvider: USDAProvider;
  private offProvider: OpenFoodFactsProvider;

  // Generic terms that represent broad categories rather than specific products
  private genericTerms = new Set([
    'chicken', 'rice', 'paneer', 'dosa', 'idli', 'poori', 'puri', 'oil',
    'dal', 'curry', 'bread', 'fish', 'egg', 'eggs', 'milk', 'oats',
    'roti', 'chapathi', 'sambar', 'rasam', 'biryani', 'meat', 'beef', 'pork',
    'potato', 'tomato'
  ]);

  constructor() {
    this.usdaProvider = new USDAProvider();
    this.offProvider = new OpenFoodFactsProvider();
  }

  async matchFoodItem(item: ParsedFoodItem): Promise<ProviderFoodMatch> {
    // 1. Determine provider routing
    const providerType: ProviderType = item.state === 'packaged' ? 'open_food_facts' : 'usda';
    const provider = providerType === 'open_food_facts' ? this.offProvider : this.usdaProvider;

    try {
      // 2. Perform search
      const rawCandidates = await provider.search(item.food, { itemState: item.state, limit: 10 });

      if (!rawCandidates || rawCandidates.length === 0) {
        return {
          input: item,
          matchStatus: 'no_match',
          candidates: [],
          providerUsed: providerType,
        };
      }

      // 3. Score and rank candidates
      const scoredCandidates = rawCandidates.map(candidate => {
        const { score, reasons } = this.calculateCandidateScore(item, candidate);
        return {
          ...candidate,
          score,
          scoreReasons: reasons,
        };
      });

      // Sort descending by score
      scoredCandidates.sort((a, b) => b.score - a.score);

      // 4. Determine match status conservatively
      const queryLower = item.food.toLowerCase().trim();
      const isGeneric = this.genericTerms.has(queryLower) || queryLower.split(/\s+/).length === 1;

      let matchStatus: MatchStatus = 'needs_confirmation';

      if (scoredCandidates.length === 0 || scoredCandidates[0].score < 0.2) {
        matchStatus = 'no_match';
      } else if (isGeneric) {
        // Generic queries MUST NEVER automatically become matched; require user confirmation
        matchStatus = 'needs_confirmation';
      } else if (
        scoredCandidates.length === 1 &&
        scoredCandidates[0].score >= 0.90 &&
        scoredCandidates[0].nutritionBasis.type !== 'unknown'
      ) {
        matchStatus = 'matched';
      } else if (
        scoredCandidates.length > 1 &&
        scoredCandidates[0].score >= 0.90 &&
        (scoredCandidates[0].score - scoredCandidates[1].score) >= 0.3 &&
        scoredCandidates[0].nutritionBasis.type !== 'unknown'
      ) {
        matchStatus = 'matched';
      } else {
        matchStatus = 'needs_confirmation';
      }

      return {
        input: item,
        matchStatus,
        candidates: scoredCandidates,
        providerUsed: providerType,
      };
    } catch (error: any) {
      return {
        input: item,
        matchStatus: 'no_match',
        candidates: [],
        providerUsed: providerType,
        error: error.message || 'Error occurred while querying nutrition database',
      };
    }
  }

  public calculateCandidateScore(
    input: ParsedFoodItem,
    candidate: NutritionCandidate
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    const queryLower = input.food.toLowerCase().trim();
    const candidateLower = candidate.displayName.toLowerCase().trim();

    // Factor A: Text Similarity / Keyword Match (Max 0.6)
    if (candidateLower === queryLower) {
      score += 0.6;
      reasons.push('Exact food name match');
    } else if (candidateLower.startsWith(queryLower)) {
      score += 0.5;
      reasons.push('Food name prefix match');
    } else {
      const queryTokens = queryLower.split(/\s+/).filter(t => t.length > 2);
      const candidateTokens = new Set(candidateLower.split(/[\s,()\/-]+/));

      let matchedTokens = 0;
      for (const token of queryTokens) {
        if (candidateTokens.has(token)) {
          matchedTokens++;
        }
      }

      if (queryTokens.length > 0) {
        const tokenRatio = matchedTokens / queryTokens.length;
        const textScore = tokenRatio * 0.45;
        score += textScore;
        reasons.push(`Token match ratio: ${matchedTokens}/${queryTokens.length}`);
      }
    }

    // Factor B: State Compatibility (Max 0.3)
    if (input.state && input.state !== 'unspecified') {
      if (input.state === 'raw') {
        if (candidateLower.includes('raw') || candidateLower.includes('uncooked') || candidateLower.includes('dry')) {
          score += 0.3;
          reasons.push('State match: raw/uncooked');
        } else if (candidateLower.includes('cooked') || candidateLower.includes('roasted') || candidateLower.includes('fried')) {
          score -= 0.15;
          reasons.push('State mismatch: candidate is cooked/processed');
        }
      } else if (input.state === 'cooked' || input.state === 'prepared') {
        if (candidateLower.includes('cooked') || candidateLower.includes('prepared') || candidateLower.includes('roasted') || candidateLower.includes('baked')) {
          score += 0.3;
          reasons.push('State match: cooked/prepared');
        } else if (candidateLower.includes('raw') || candidateLower.includes('uncooked')) {
          score -= 0.15;
          reasons.push('State mismatch: candidate is raw');
        }
      } else if (input.state === 'packaged') {
        if (candidate.provider === 'open_food_facts' || candidate.dataType === 'Branded' || candidate.brand) {
          score += 0.3;
          reasons.push('State match: packaged/branded product');
        }
      }
    }

    // Factor C: Data Type / Authority Bonus (Max 0.1)
    if (candidate.dataType === 'Foundation' || candidate.dataType === 'SR Legacy') {
      score += 0.1;
      reasons.push(`Authoritative database category (${candidate.dataType})`);
    }

    // Clamp score between 0.0 and 1.0
    const finalScore = Math.max(0, Math.min(1.0, Math.round(score * 100) / 100));

    return {
      score: finalScore,
      reasons,
    };
  }
}
