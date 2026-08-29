// ============================================================
// Mood Analytics — no numerical scores invented
// Uses actual stored mood string values.
// ============================================================

import { DailyLog, MoodAnalytics } from './types';

/**
 * Computes mood analytics from daily logs.
 * Logs should be sorted by log_date ascending.
 */
export function computeMoodAnalytics(logs: DailyLog[]): MoodAnalytics {
  const moodLogs = logs.filter(l => l.mood !== null && l.mood !== undefined && l.mood !== '');

  if (moodLogs.length === 0) {
    return {
      daysWithMood: 0,
      distribution: {},
      mostCommonMood: null,
      recentMoods: [],
    };
  }

  const sorted = [...moodLogs].sort((a, b) =>
    a.log_date.localeCompare(b.log_date)
  );

  // Distribution
  const distribution: Record<string, number> = {};
  for (const log of sorted) {
    const mood = log.mood!;
    distribution[mood] = (distribution[mood] || 0) + 1;
  }

  // Most common mood
  let mostCommonMood: string | null = null;
  let maxCount = 0;
  for (const [mood, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonMood = mood;
    }
  }

  // Recent moods: last 7 entries with mood data
  const recentMoods = sorted.slice(-7).map(l => ({
    date: l.log_date,
    mood: l.mood!,
  }));

  return {
    daysWithMood: sorted.length,
    distribution,
    mostCommonMood,
    recentMoods,
  };
}
