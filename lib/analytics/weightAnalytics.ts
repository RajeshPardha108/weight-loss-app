// ============================================================
// Weight Analytics — deterministic weight trend calculations
// ============================================================

import { DailyLog, WeightAnalytics, TrendDirection } from './types';
import { getLocalDateString, parseLogDate, filterLastNDays, daysBetween } from './dateUtils';

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Computes weight analytics from an array of daily logs.
 * Logs should be sorted by log_date ascending.
 */
export function computeWeightAnalytics(logs: DailyLog[]): WeightAnalytics {
  const weightLogs = logs.filter(l => l.weight_kg !== null && l.weight_kg !== undefined);

  if (weightLogs.length === 0) {
    return {
      latestWeight: null,
      latestDate: null,
      earliestWeight: null,
      absoluteChange: null,
      percentageChange: null,
      average7d: null,
      average30d: null,
      previousAverage7d: null,
      trendDirection: 'insufficient_data',
      entryCount: 0,
      daysSinceLastEntry: null,
    };
  }

  // Ensure ascending sort
  const sorted = [...weightLogs].sort((a, b) =>
    a.log_date.localeCompare(b.log_date)
  );

  const earliest = sorted[0];
  const latest = sorted[sorted.length - 1];

  const latestWeight = latest.weight_kg!;
  const earliestWeight = earliest.weight_kg!;
  const absoluteChange = latestWeight - earliestWeight;
  const percentageChange = earliestWeight !== 0
    ? (absoluteChange / earliestWeight) * 100
    : null;

  // 7-day and 30-day averages
  const last7 = filterLastNDays(sorted, 7, l => l.log_date);
  const last30 = filterLastNDays(sorted, 30, l => l.log_date);

  const average7d = average(last7.map(l => l.weight_kg!));
  const average30d = average(last30.map(l => l.weight_kg!));

  // Previous 7-day average (days 8-14 ago relative to anchor)
  const today = getLocalDateString();
  const todayMs = parseLogDate(today).getTime();
  const latestMs = parseLogDate(latest.log_date).getTime();
  const msInDay = 24 * 60 * 60 * 1000;
  const anchorMs = (todayMs - latestMs <= 30 * msInDay && todayMs >= latestMs) ? todayMs : latestMs;
  const prev7Start = anchorMs - (13 * msInDay);
  const prev7End = anchorMs - (7 * msInDay);
  const prev7Logs = sorted.filter(l => {
    const ms = parseLogDate(l.log_date).getTime();
    return ms >= prev7Start && ms <= prev7End;
  });
  const previousAverage7d = average(prev7Logs.map(l => l.weight_kg!));

  // Trend direction: compare current 7d avg vs previous 7d avg
  let trendDirection: TrendDirection = 'insufficient_data';
  if (average7d !== null && previousAverage7d !== null) {
    const diff = average7d - previousAverage7d;
    if (diff < -0.3) trendDirection = 'losing';
    else if (diff > 0.3) trendDirection = 'gaining';
    else trendDirection = 'stable';
  }

  // Days since last entry
  const daysSinceLastEntry = daysBetween(latest.log_date, today);

  return {
    latestWeight,
    latestDate: latest.log_date,
    earliestWeight,
    absoluteChange,
    percentageChange,
    average7d,
    average30d,
    previousAverage7d,
    trendDirection,
    entryCount: sorted.length,
    daysSinceLastEntry,
  };
}
