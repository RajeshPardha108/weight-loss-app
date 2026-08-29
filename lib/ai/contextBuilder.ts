import { AnalyticsSnapshot } from '../analytics';
import { AIProgressContext } from './types';

/**
 * Converts a deterministic AnalyticsSnapshot into a normalized AI context.
 * The context is stripped of any non-essential UI formatting, representing
 * purely factual tracking data for an AI model to interpret.
 */
export function buildAIContext(snapshot: AnalyticsSnapshot): AIProgressContext {
  return {
    weight: {
      latestWeight: snapshot.weight.latestWeight,
      latestDate: snapshot.weight.latestDate,
      average7d: snapshot.weight.average7d,
      average30d: snapshot.weight.average30d,
      trendDirection: snapshot.weight.trendDirection,
      absoluteChange: snapshot.weight.absoluteChange,
    },
    activity: {
      latestSteps: snapshot.steps.latestSteps,
      average7d: snapshot.steps.average7d,
      average30d: snapshot.steps.average30d,
      consistencyPct: snapshot.steps.consistencyPct,
      trendDirection: snapshot.steps.trendDirection,
    },
    hydration: {
      latestWater: snapshot.water.latestWater,
      average7d: snapshot.water.average7d,
      consistencyPct: snapshot.water.consistencyPct,
      trendDirection: snapshot.water.trendDirection,
    },
    meals: {
      cleanDays: snapshot.meals.cleanDays,
      cheatDays: snapshot.meals.cheatDays,
      cleanPercentage: snapshot.meals.cleanPercentage,
      recentTrend: snapshot.meals.recentTrend,
    },
    mood: {
      mostCommonMood: snapshot.mood.mostCommonMood,
      recentMoods: snapshot.mood.recentMoods,
    },
    bodyMeasurements: {
      latestMeasurementDate: snapshot.bodyMeasurements.latestMeasurementDate,
      measurements: {
        neck: {
          latest: snapshot.bodyMeasurements.neck.latest,
          trend: snapshot.bodyMeasurements.neck.trend,
          absoluteChange: snapshot.bodyMeasurements.neck.absoluteChange,
        },
        chest: {
          latest: snapshot.bodyMeasurements.chest.latest,
          trend: snapshot.bodyMeasurements.chest.trend,
          absoluteChange: snapshot.bodyMeasurements.chest.absoluteChange,
        },
        waist: {
          latest: snapshot.bodyMeasurements.waist.latest,
          trend: snapshot.bodyMeasurements.waist.trend,
          absoluteChange: snapshot.bodyMeasurements.waist.absoluteChange,
        },
        abdomen: {
          latest: snapshot.bodyMeasurements.abdomen.latest,
          trend: snapshot.bodyMeasurements.abdomen.trend,
          absoluteChange: snapshot.bodyMeasurements.abdomen.absoluteChange,
        },
        hip: {
          latest: snapshot.bodyMeasurements.hip.latest,
          trend: snapshot.bodyMeasurements.hip.trend,
          absoluteChange: snapshot.bodyMeasurements.hip.absoluteChange,
        },
        thigh: {
          latest: snapshot.bodyMeasurements.thigh.latest,
          trend: snapshot.bodyMeasurements.thigh.trend,
          absoluteChange: snapshot.bodyMeasurements.thigh.absoluteChange,
        },
        upperArm: {
          latest: snapshot.bodyMeasurements.upperArm.latest,
          trend: snapshot.bodyMeasurements.upperArm.trend,
          absoluteChange: snapshot.bodyMeasurements.upperArm.absoluteChange,
        }
      }
    },
    generatedAt: snapshot.generatedAt,
  };
}
