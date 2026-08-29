// ============================================================
// Body Measurement Analytics
// Missing measurements stay null — never converted to zero.
// ============================================================

import { BodyMeasurement, BodyMeasurementAnalytics, SingleMeasurementAnalytics, TrendDirection } from './types';

type MeasurementKey = 'neck_cm' | 'chest_cm' | 'waist_cm' | 'abdomen_cm' | 'hip_cm' | 'thigh_cm' | 'upper_arm_cm';

function computeSingle(
  measurements: BodyMeasurement[],
  key: MeasurementKey
): SingleMeasurementAnalytics {
  // Filter to entries that have this measurement
  const withValue = measurements.filter(m => m[key] !== null && m[key] !== undefined);

  if (withValue.length === 0) {
    return {
      latest: null,
      latestDate: null,
      earliest: null,
      absoluteChange: null,
      percentageChange: null,
      trend: 'insufficient_data',
    };
  }

  const sorted = [...withValue].sort((a, b) =>
    a.measurement_date.localeCompare(b.measurement_date)
  );

  const earliest = sorted[0];
  const latest = sorted[sorted.length - 1];

  const latestVal = latest[key] as number;
  const earliestVal = earliest[key] as number;

  const absoluteChange = latestVal - earliestVal;
  const percentageChange = earliestVal !== 0
    ? (absoluteChange / earliestVal) * 100
    : null;

  // Trend: compare last 2 entries if available
  let trend: TrendDirection = 'insufficient_data';
  if (sorted.length >= 2) {
    const prevVal = sorted[sorted.length - 2][key] as number;
    const diff = latestVal - prevVal;
    if (diff < -0.3) trend = 'losing';
    else if (diff > 0.3) trend = 'gaining';
    else trend = 'stable';
  }

  return {
    latest: latestVal,
    latestDate: latest.measurement_date,
    earliest: earliestVal,
    absoluteChange: Math.round(absoluteChange * 10) / 10,
    percentageChange: percentageChange !== null ? Math.round(percentageChange * 10) / 10 : null,
    trend,
  };
}

/**
 * Computes body measurement analytics for all 7 measurement types.
 * Measurements should be sorted by measurement_date ascending.
 */
export function computeBodyMeasurementAnalytics(
  measurements: BodyMeasurement[]
): BodyMeasurementAnalytics {
  const sorted = [...measurements].sort((a, b) =>
    a.measurement_date.localeCompare(b.measurement_date)
  );

  const latestMeasurementDate = sorted.length > 0
    ? sorted[sorted.length - 1].measurement_date
    : null;

  return {
    neck: computeSingle(sorted, 'neck_cm'),
    chest: computeSingle(sorted, 'chest_cm'),
    waist: computeSingle(sorted, 'waist_cm'),
    abdomen: computeSingle(sorted, 'abdomen_cm'),
    hip: computeSingle(sorted, 'hip_cm'),
    thigh: computeSingle(sorted, 'thigh_cm'),
    upperArm: computeSingle(sorted, 'upper_arm_cm'),
    latestMeasurementDate,
    totalMeasurementSessions: sorted.length,
  };
}
