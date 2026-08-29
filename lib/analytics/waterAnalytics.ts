// ============================================================
// Water Analytics — deterministic hydration tracking
// No hydration target invented.
// ============================================================

import { DailyLog, WaterAnalytics, TrendDirection } from './types';
import { getLocalDateString, parseLogDate, filterLastNDays } from './dateUtils';

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Computes water intake analytics from daily logs.
 * Logs should be sorted by log_date ascending.
 */
export function computeWaterAnalytics(logs: DailyLog[]): WaterAnalytics {
  const waterLogs = logs.filter(l => l.water_glasses !== null && l.water_glasses !== undefined);

  if (waterLogs.length === 0) {
    return {
      latestWater: null,
      latestDate: null,
      average7d: null,
      average30d: null,
      daysWithData: 0,
      consistencyPct: null,
      trendDirection: 'insufficient_data',
    };
  }

  const sorted = [...waterLogs].sort((a, b) =>
    a.log_date.localeCompare(b.log_date)
  );

  const latest = sorted[sorted.length - 1];

  const last7 = filterLastNDays(sorted, 7, l => l.log_date);
  const last30 = filterLastNDays(sorted, 30, l => l.log_date);

  const average7d = average(last7.map(l => l.water_glasses!));
  const average30d = average(last30.map(l => l.water_glasses!));

  // Previous 7-day average (days 8-14)
  const today = getLocalDateString();
  const todayMs = parseLogDate(today).getTime();
  const msInDay = 24 * 60 * 60 * 1000;
  const prev7Start = todayMs - (13 * msInDay);
  const prev7End = todayMs - (7 * msInDay);
  const prev7Logs = sorted.filter(l => {
    const ms = parseLogDate(l.log_date).getTime();
    return ms >= prev7Start && ms <= prev7End;
  });
  const previousAverage7d = average(prev7Logs.map(l => l.water_glasses!));

  // Consistency
  const consistencyPct = last30.length > 0
    ? Math.round((last30.length / 30) * 100)
    : 0;

  // Trend
  let trendDirection: TrendDirection = 'insufficient_data';
  if (average7d !== null && previousAverage7d !== null) {
    const diff = average7d - previousAverage7d;
    if (diff > 0.3) trendDirection = 'gaining';
    else if (diff < -0.3) trendDirection = 'losing';
    else trendDirection = 'stable';
  }

  return {
    latestWater: latest.water_glasses,
    latestDate: latest.log_date,
    average7d: average7d !== null ? Math.round(average7d * 10) / 10 : null,
    average30d: average30d !== null ? Math.round(average30d * 10) / 10 : null,
    daysWithData: sorted.length,
    consistencyPct,
    trendDirection,
  };
}
