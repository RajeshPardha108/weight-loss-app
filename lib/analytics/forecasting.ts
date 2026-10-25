// ============================================================
// Goal Forecasting, Plateau Detection & Weekly Check-In Summary
// ============================================================

import { DailyLog } from './types';
import { getLocalDateString, parseLogDate } from './dateUtils';

export interface SingleGoalForecast {
  targetWeight: number | null;
  remainingKg: number | null;
  isAchieved: boolean;
  estimatedDays: number | null;
  estimatedDateFormatted: string | null;
  weeklyPaceKg: number | null; // negative means losing (e.g. -0.6 kg/wk)
  status: 'achieved' | 'on_track' | 'slow_pace' | 'plateau' | 'moving_away' | 'insufficient_data';
}

export interface PlateauDetection {
  isPlateau: boolean;
  daysTrackedInWindow: number;
  spanDays: number;
  current7dAvg: number | null;
  previous7dAvg: number | null;
  weeklyChangeKg: number | null;
  message: string;
  coachPrompt: string;
}

export interface WeeklyComparison {
  hasEnoughData: boolean;
  thisWeekRangeLabel: string;
  daysLoggedThisWeek: number;
  daysLoggedLastWeek: number;
  weight: {
    thisWeekAvg: number | null;
    lastWeekAvg: number | null;
    delta: number | null; // negative = lost weight
  };
  steps: {
    thisWeekAvg: number | null;
    lastWeekAvg: number | null;
    delta: number | null;
  };
  water: {
    thisWeekAvg: number | null;
    lastWeekAvg: number | null;
    delta: number | null;
  };
  cleanMeals: {
    thisWeekPct: number | null;
    lastWeekPct: number | null;
    deltaPct: number | null;
  };
}

export interface SmartAnalyticsReport {
  activeGoalForecast: SingleGoalForecast;
  finalGoalForecast: SingleGoalForecast;
  weeklyRateKg: number | null; // negative = losing weight per week
  plateau: PlateauDetection;
  weeklyCheckIn: WeeklyComparison;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Determines the reference anchor timestamp (ms).
 * Uses today if there is data within the last 30 days; otherwise anchors to the latest log date.
 */
export function getAnchorTimeMs(logs: DailyLog[]): number {
  const todayStr = getLocalDateString();
  const todayMs = parseLogDate(todayStr).getTime();
  if (!logs || logs.length === 0) return todayMs;

  const sortedDates = logs
    .map(l => l.log_date)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  if (sortedDates.length === 0) return todayMs;

  const latestMs = parseLogDate(sortedDates[sortedDates.length - 1]).getTime();
  const msInDay = 24 * 60 * 60 * 1000;

  return (todayMs - latestMs <= 30 * msInDay && todayMs >= latestMs) ? todayMs : latestMs;
}

/**
 * Computes linear regression slope (kg per day) over a set of weight logs.
 */
function computeLinearSlopePerDay(weightLogs: DailyLog[]): number | null {
  if (weightLogs.length < 2) return null;
  const msInDay = 24 * 60 * 60 * 1000;
  const firstMs = parseLogDate(weightLogs[0].log_date).getTime();

  const points = weightLogs.map(l => ({
    x: (parseLogDate(l.log_date).getTime() - firstMs) / msInDay,
    y: Number(l.weight_kg),
  }));

  const spanDays = points[points.length - 1].x - points[0].x;
  if (spanDays < 2) return null;

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-9) return null;

  return (n * sumXY - sumX * sumY) / denominator;
}

function buildSingleGoalForecast(
  currentWeight: number | null,
  targetWeight: number | null,
  weeklyRateKg: number | null,
  isPlateau: boolean,
  anchorMs: number
): SingleGoalForecast {
  if (targetWeight === null || currentWeight === null) {
    return {
      targetWeight,
      remainingKg: null,
      isAchieved: false,
      estimatedDays: null,
      estimatedDateFormatted: null,
      weeklyPaceKg: weeklyRateKg,
      status: 'insufficient_data',
    };
  }

  if (currentWeight <= targetWeight) {
    return {
      targetWeight,
      remainingKg: 0,
      isAchieved: true,
      estimatedDays: 0,
      estimatedDateFormatted: 'Achieved',
      weeklyPaceKg: weeklyRateKg,
      status: 'achieved',
    };
  }

  const remainingKg = +(currentWeight - targetWeight).toFixed(1);

  if (weeklyRateKg === null) {
    return {
      targetWeight,
      remainingKg,
      isAchieved: false,
      estimatedDays: null,
      estimatedDateFormatted: null,
      weeklyPaceKg: null,
      status: 'insufficient_data',
    };
  }

  if (isPlateau && Math.abs(weeklyRateKg) < 0.15) {
    return {
      targetWeight,
      remainingKg,
      isAchieved: false,
      estimatedDays: null,
      estimatedDateFormatted: 'Pace stalled',
      weeklyPaceKg: weeklyRateKg,
      status: 'plateau',
    };
  }

  // Losing weight requires weeklyRateKg < -0.05
  if (weeklyRateKg >= -0.05) {
    return {
      targetWeight,
      remainingKg,
      isAchieved: false,
      estimatedDays: null,
      estimatedDateFormatted: weeklyRateKg > 0.1 ? 'Trending up' : 'Holding steady',
      weeklyPaceKg: weeklyRateKg,
      status: weeklyRateKg > 0.1 ? 'moving_away' : 'plateau',
    };
  }

  const dailyLossKg = Math.abs(weeklyRateKg) / 7;
  const estimatedDays = Math.min(730, Math.max(1, Math.ceil(remainingKg / dailyLossKg)));
  const msInDay = 24 * 60 * 60 * 1000;
  const targetDate = new Date(anchorMs + estimatedDays * msInDay);

  const sameYear = targetDate.getFullYear() === new Date(anchorMs).getFullYear();
  const estimatedDateFormatted = targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });

  return {
    targetWeight,
    remainingKg,
    isAchieved: false,
    estimatedDays,
    estimatedDateFormatted,
    weeklyPaceKg: weeklyRateKg,
    status: Math.abs(weeklyRateKg) >= 0.25 ? 'on_track' : 'slow_pace',
  };
}

export function computeSmartAnalytics(
  logs: DailyLog[],
  activeGoal: number | null,
  finalGoal: number | null
): SmartAnalyticsReport {
  const msInDay = 24 * 60 * 60 * 1000;
  const anchorMs = getAnchorTimeMs(logs);

  const weightLogs = logs
    .filter(l => l.weight_kg !== null && l.weight_kg !== undefined)
    .sort((a, b) => a.log_date.localeCompare(b.log_date));

  const currentWeight = weightLogs.length > 0 ? Number(weightLogs[weightLogs.length - 1].weight_kg) : null;

  // Windows relative to anchorMs
  const thisWeekStartMs = anchorMs - 6 * msInDay;
  const lastWeekStartMs = anchorMs - 13 * msInDay;
  const lastWeekEndMs = anchorMs - 7 * msInDay;
  const last21DaysStartMs = anchorMs - 20 * msInDay;

  const thisWeekWeightLogs = weightLogs.filter(l => {
    const t = parseLogDate(l.log_date).getTime();
    return t >= thisWeekStartMs && t <= anchorMs;
  });

  const lastWeekWeightLogs = weightLogs.filter(l => {
    const t = parseLogDate(l.log_date).getTime();
    return t >= lastWeekStartMs && t <= lastWeekEndMs;
  });

  const recent21WeightLogs = weightLogs.filter(l => {
    const t = parseLogDate(l.log_date).getTime();
    return t >= last21DaysStartMs && t <= anchorMs;
  });

  const current7dAvg = mean(thisWeekWeightLogs.map(l => Number(l.weight_kg)));
  const previous7dAvg = mean(lastWeekWeightLogs.map(l => Number(l.weight_kg)));

  // Determine weekly rate of change (kg/week)
  let weeklyRateKg: number | null = null;
  if (current7dAvg !== null && previous7dAvg !== null) {
    weeklyRateKg = +(current7dAvg - previous7dAvg).toFixed(2);
  } else {
    const slopePerDay = computeLinearSlopePerDay(recent21WeightLogs.length >= 2 ? recent21WeightLogs : weightLogs.slice(-10));
    if (slopePerDay !== null) {
      weeklyRateKg = +(slopePerDay * 7).toFixed(2);
    }
  }

  // Plateau Detection:
  // Checks if user has logged at least 4 weight entries across >= 10 days, is above goal, and weekly rate is between -0.18 and +0.18 kg/wk
  const recent14Logs = weightLogs.filter(l => {
    const t = parseLogDate(l.log_date).getTime();
    return t >= lastWeekStartMs && t <= anchorMs;
  });

  const spanDays = recent14Logs.length >= 2
    ? Math.round((parseLogDate(recent14Logs[recent14Logs.length - 1].log_date).getTime() - parseLogDate(recent14Logs[0].log_date).getTime()) / msInDay)
    : 0;

  const isAboveGoal = activeGoal !== null && currentWeight !== null ? currentWeight > activeGoal : true;
  const isPlateau =
    isAboveGoal &&
    recent14Logs.length >= 4 &&
    spanDays >= 8 &&
    weeklyRateKg !== null &&
    Math.abs(weeklyRateKg) <= 0.18;

  const plateauMessage = isPlateau
    ? `Your 7-day moving average (${current7dAvg?.toFixed(1) ?? currentWeight?.toFixed(1)} kg) has shifted by only ${weeklyRateKg !== null ? `${weeklyRateKg > 0 ? '+' : ''}${weeklyRateKg.toFixed(1)}` : '0.0'} kg over the last 2 weeks.`
    : weeklyRateKg !== null && weeklyRateKg < -0.18
    ? `Moving down steadily at ${Math.abs(weeklyRateKg).toFixed(2)} kg/week. No plateau detected.`
    : 'Keep logging daily weights to unlock 14-day plateau detection.';

  const plateauCoachPrompt = `My weight has plateaued around ${currentWeight?.toFixed(1) ?? ''} kg over the past 2 weeks (7-day avg: ${current7dAvg?.toFixed(1) ?? 'N/A'} kg, active goal: ${activeGoal ?? 'N/A'} kg). Analyze my recent steps, water, and meals and give me a concrete 5-day plateau-breaker plan.`;

  const plateau: PlateauDetection = {
    isPlateau,
    daysTrackedInWindow: recent14Logs.length,
    spanDays,
    current7dAvg: current7dAvg !== null ? +current7dAvg.toFixed(1) : null,
    previous7dAvg: previous7dAvg !== null ? +previous7dAvg.toFixed(1) : null,
    weeklyChangeKg: weeklyRateKg,
    message: plateauMessage,
    coachPrompt: plateauCoachPrompt,
  };

  // Weekly Check-In Comparison (all logs, not just weight logs)
  const thisWeekLogs = logs.filter(l => {
    const t = parseLogDate(l.log_date).getTime();
    return t >= thisWeekStartMs && t <= anchorMs;
  });

  const lastWeekLogs = logs.filter(l => {
    const t = parseLogDate(l.log_date).getTime();
    return t >= lastWeekStartMs && t <= lastWeekEndMs;
  });

  const thisWeekSteps = mean(thisWeekLogs.filter(l => l.steps != null).map(l => Number(l.steps)));
  const lastWeekSteps = mean(lastWeekLogs.filter(l => l.steps != null).map(l => Number(l.steps)));

  const thisWeekWater = mean(thisWeekLogs.filter(l => l.water_glasses != null).map(l => Number(l.water_glasses)));
  const lastWeekWater = mean(lastWeekLogs.filter(l => l.water_glasses != null).map(l => Number(l.water_glasses)));

  const thisWeekMeals = thisWeekLogs.filter(l => l.meal_status && l.meal_status.trim() !== '');
  const lastWeekMeals = lastWeekLogs.filter(l => l.meal_status && l.meal_status.trim() !== '');

  const thisWeekCleanPct = thisWeekMeals.length > 0
    ? Math.round((thisWeekMeals.filter(l => l.meal_status?.toLowerCase() === 'clean').length / thisWeekMeals.length) * 100)
    : null;
  const lastWeekCleanPct = lastWeekMeals.length > 0
    ? Math.round((lastWeekMeals.filter(l => l.meal_status?.toLowerCase() === 'clean').length / lastWeekMeals.length) * 100)
    : null;

  const startLabel = new Date(thisWeekStartMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = new Date(anchorMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const weeklyCheckIn: WeeklyComparison = {
    hasEnoughData: thisWeekLogs.length > 0 || lastWeekLogs.length > 0,
    thisWeekRangeLabel: `${startLabel} – ${endLabel}`,
    daysLoggedThisWeek: thisWeekLogs.length,
    daysLoggedLastWeek: lastWeekLogs.length,
    weight: {
      thisWeekAvg: current7dAvg !== null ? +current7dAvg.toFixed(1) : null,
      lastWeekAvg: previous7dAvg !== null ? +previous7dAvg.toFixed(1) : null,
      delta: current7dAvg !== null && previous7dAvg !== null ? +(current7dAvg - previous7dAvg).toFixed(1) : null,
    },
    steps: {
      thisWeekAvg: thisWeekSteps !== null ? Math.round(thisWeekSteps) : null,
      lastWeekAvg: lastWeekSteps !== null ? Math.round(lastWeekSteps) : null,
      delta: thisWeekSteps !== null && lastWeekSteps !== null ? Math.round(thisWeekSteps - lastWeekSteps) : null,
    },
    water: {
      thisWeekAvg: thisWeekWater !== null ? +thisWeekWater.toFixed(1) : null,
      lastWeekAvg: lastWeekWater !== null ? +lastWeekWater.toFixed(1) : null,
      delta: thisWeekWater !== null && lastWeekWater !== null ? +(thisWeekWater - lastWeekWater).toFixed(1) : null,
    },
    cleanMeals: {
      thisWeekPct: thisWeekCleanPct,
      lastWeekPct: lastWeekCleanPct,
      deltaPct: thisWeekCleanPct !== null && lastWeekCleanPct !== null ? thisWeekCleanPct - lastWeekCleanPct : null,
    },
  };

  return {
    activeGoalForecast: buildSingleGoalForecast(currentWeight, activeGoal, weeklyRateKg, isPlateau, anchorMs),
    finalGoalForecast: buildSingleGoalForecast(currentWeight, finalGoal, weeklyRateKg, isPlateau, anchorMs),
    weeklyRateKg,
    plateau,
    weeklyCheckIn,
  };
}
