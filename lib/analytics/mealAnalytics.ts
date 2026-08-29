// ============================================================
// Meal Analytics — uses actual stored meal_status values
// Does NOT assume only "clean" and "cheat" exist.
// ============================================================

import { DailyLog, MealAnalytics } from './types';

/**
 * Computes meal status analytics from daily logs.
 * Logs should be sorted by log_date ascending.
 */
export function computeMealAnalytics(logs: DailyLog[]): MealAnalytics {
  const mealLogs = logs.filter(l => l.meal_status !== null && l.meal_status !== undefined && l.meal_status !== '');

  if (mealLogs.length === 0) {
    return {
      daysWithMealStatus: 0,
      cleanDays: 0,
      cheatDays: 0,
      otherStatusDays: 0,
      cleanPercentage: null,
      statusDistribution: {},
      recentTrend: {},
    };
  }

  const sorted = [...mealLogs].sort((a, b) =>
    a.log_date.localeCompare(b.log_date)
  );

  // Full distribution
  const statusDistribution: Record<string, number> = {};
  let cleanDays = 0;
  let cheatDays = 0;
  let otherStatusDays = 0;

  for (const log of sorted) {
    const status = log.meal_status!;
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;

    if (status === 'clean') cleanDays++;
    else if (status === 'cheat') cheatDays++;
    else otherStatusDays++;
  }

  const cleanPercentage = sorted.length > 0
    ? Math.round((cleanDays / sorted.length) * 100)
    : null;

  // Recent trend: last 7 entries with meal_status
  const recent = sorted.slice(-7);
  const recentTrend: Record<string, number> = {};
  for (const log of recent) {
    const status = log.meal_status!;
    recentTrend[status] = (recentTrend[status] || 0) + 1;
  }

  return {
    daysWithMealStatus: sorted.length,
    cleanDays,
    cheatDays,
    otherStatusDays,
    cleanPercentage,
    statusDistribution,
    recentTrend,
  };
}
