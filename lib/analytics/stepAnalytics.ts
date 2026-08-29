// ============================================================
// Step Analytics — deterministic step trend calculations
// Missing steps are NOT treated as zero.
// ============================================================

import { DailyLog, StepAnalytics, DayValue, TrendDirection } from './types';
import { getLocalDateString, parseLogDate, filterLastNDays } from './dateUtils';

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Computes step analytics from daily logs.
 * Logs should be sorted by log_date ascending.
 */
export function computeStepAnalytics(logs: DailyLog[]): StepAnalytics {
  const stepLogs = logs.filter(l => l.steps !== null && l.steps !== undefined);

  if (stepLogs.length === 0) {
    return {
      latestSteps: null,
      latestDate: null,
      average7d: null,
      average30d: null,
      previousAverage7d: null,
      highestDay: null,
      lowestDay: null,
      daysWithData: 0,
      consistencyPct: null,
      trendDirection: 'insufficient_data',
    };
  }

  const sorted = [...stepLogs].sort((a, b) =>
    a.log_date.localeCompare(b.log_date)
  );

  const latest = sorted[sorted.length - 1];

  // Averages
  const last7 = filterLastNDays(sorted, 7, l => l.log_date);
  const last30 = filterLastNDays(sorted, 30, l => l.log_date);

  const average7d = average(last7.map(l => l.steps!));
  const average30d = average(last30.map(l => l.steps!));

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
  const previousAverage7d = average(prev7Logs.map(l => l.steps!));

  // Highest and lowest
  let highestDay: DayValue | null = null;
  let lowestDay: DayValue | null = null;
  for (const log of sorted) {
    const val = log.steps!;
    if (highestDay === null || val > highestDay.value) {
      highestDay = { date: log.log_date, value: val };
    }
    if (lowestDay === null || val < lowestDay.value) {
      lowestDay = { date: log.log_date, value: val };
    }
  }

  // Consistency: % of last 30 calendar days that have step data
  const consistencyPct = last30.length > 0
    ? Math.round((last30.length / 30) * 100)
    : 0;

  // Trend
  let trendDirection: TrendDirection = 'insufficient_data';
  if (average7d !== null && previousAverage7d !== null) {
    const pctDiff = previousAverage7d !== 0
      ? ((average7d - previousAverage7d) / previousAverage7d) * 100
      : 0;
    if (pctDiff > 5) trendDirection = 'gaining';     // more steps = gaining activity
    else if (pctDiff < -5) trendDirection = 'losing'; // fewer steps
    else trendDirection = 'stable';
  }

  return {
    latestSteps: latest.steps,
    latestDate: latest.log_date,
    average7d: average7d !== null ? Math.round(average7d) : null,
    average30d: average30d !== null ? Math.round(average30d) : null,
    previousAverage7d: previousAverage7d !== null ? Math.round(previousAverage7d) : null,
    highestDay,
    lowestDay,
    daysWithData: sorted.length,
    consistencyPct,
    trendDirection,
  };
}
