"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "../../lib/supabase";
import BodyVisualizer from "./BodyVisualizer";
import MeasurementCharts from "./MeasurementCharts";

export default function BodyProgress() {
  const [logs, setLogs] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, measurementsRes] = await Promise.all([
          supabase
            .from('daily_logs')
            .select('log_date, weight_kg')
            .order('log_date', { ascending: true }),
          supabase
            .from('body_measurements')
            .select('*')
            .order('measurement_date', { ascending: false }) // latest first
        ]);
        
        if (logsRes.data) {
          setLogs(logsRes.data);
        }
        if (measurementsRes.data) {
          setMeasurements(measurementsRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.mobileView}>
          <div className={styles.header}>
            <h1 className={styles.title}>Body Progress</h1>
          </div>
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Derived data for summaries
  const weightLogs = logs.filter(l => l.weight_kg !== null);
  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : null;
  const startWeight = weightLogs.length > 0 ? weightLogs[0].weight_kg : null;
  const weightChange = latestWeight !== null && startWeight !== null ? latestWeight - startWeight : null;

  const latestMeas = measurements.length > 0 ? measurements[0] : null;

  const getDeltaStr = (diff: number) => {
    if (diff > 0) return `↑ ${Math.abs(diff).toFixed(1)}`;
    if (diff < 0) return `↓ ${Math.abs(diff).toFixed(1)}`;
    return '0.0';
  };
  const getDeltaClass = (diff: number) => {
    if (diff > 0) return styles.deltaUp;
    if (diff < 0) return styles.deltaDown;
    return styles.deltaNeutral;
  };

  const calcChange = (current: number | null, prev: number | null) => {
    if (current === null || prev === null) return null;
    return current - prev;
  };

  const getStartVal = (key: string) => {
    for (let i = measurements.length - 1; i >= 0; i--) {
      if (measurements[i][key] !== null) return measurements[i][key];
    }
    return null;
  };

  const startWaist = getStartVal('waist_cm');
  const startAbdomen = getStartVal('abdomen_cm');
  const startHip = getStartVal('hip_cm');

  const waistChange = calcChange(latestMeas?.waist_cm, startWaist);
  const abdomenChange = calcChange(latestMeas?.abdomen_cm, startAbdomen);
  const hipChange = calcChange(latestMeas?.hip_cm, startHip);

  return (
    <div className={styles.container}>
      <div className={styles.mobileView}>
        <div className={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className={styles.title}>Body Progress</h1>
            <Link href="/progress" style={{ color: '#38bdf8', fontSize: '0.875rem', textDecoration: 'none' }}>
              ← Progress
            </Link>
          </div>
        </div>

        <div className={styles.content}>
          {measurements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📏</div>
              <h2 style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: '0.5rem' }}>No body measurements recorded yet.</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '2rem' }}>
                Measure yourself whenever convenient. Weekly or occasional measurements are enough.
              </p>
              <Link href="/measurements" className={styles.linkButton}>
                + Add Measurement
              </Link>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>Weight</div>
                  <div>
                    <span className={styles.cardValue}>{latestWeight !== null ? latestWeight : '—'}</span>
                    <span className={styles.cardUnit}>kg</span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>Waist</div>
                  <div>
                    <span className={styles.cardValue}>{latestMeas?.waist_cm || '—'}</span>
                    <span className={styles.cardUnit}>cm</span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>Abdomen</div>
                  <div>
                    <span className={styles.cardValue}>{latestMeas?.abdomen_cm || '—'}</span>
                    <span className={styles.cardUnit}>cm</span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>Hip</div>
                  <div>
                    <span className={styles.cardValue}>{latestMeas?.hip_cm || '—'}</span>
                    <span className={styles.cardUnit}>cm</span>
                  </div>
                </div>
              </div>

              {/* Body Visualizer */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1.25rem', padding: '1rem' }}>
                <h2 className={styles.sectionTitle}>Body View</h2>
                {/* Reversing measurements so visualizer gets chronological oldest-to-newest if it expects that, 
                    but the original expects an array where we just take the last element for latest. 
                    Wait, let's reverse them so the visualizer sees the latest at the end. */}
                <BodyVisualizer measurements={[...measurements].reverse()} />
              </div>

              {/* Trends Chart */}
              <div>
                <h2 className={styles.sectionTitle}>Trends</h2>
                {/* MeasurementCharts expects oldest-to-newest */}
                <MeasurementCharts measurements={[...measurements].reverse()} />
              </div>

              {/* Change Since Start */}
              {(weightChange !== null || waistChange !== null || abdomenChange !== null || hipChange !== null) && (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1.25rem', padding: '1.25rem' }}>
                  <h2 className={styles.sectionTitle}>Since Start</h2>
                  <div className={styles.historyGrid}>
                    {weightChange !== null && (
                      <div className={styles.metricRow}>
                        <span className={styles.metricName}>Weight</span>
                        <div>
                          <span className={`${styles.metricDelta} ${getDeltaClass(weightChange)}`}>{getDeltaStr(weightChange)} kg</span>
                        </div>
                      </div>
                    )}
                    {waistChange !== null && (
                      <div className={styles.metricRow}>
                        <span className={styles.metricName}>Waist</span>
                        <div>
                          <span className={`${styles.metricDelta} ${getDeltaClass(waistChange)}`}>{getDeltaStr(waistChange)} cm</span>
                        </div>
                      </div>
                    )}
                    {abdomenChange !== null && (
                      <div className={styles.metricRow}>
                        <span className={styles.metricName}>Abdomen</span>
                        <div>
                          <span className={`${styles.metricDelta} ${getDeltaClass(abdomenChange)}`}>{getDeltaStr(abdomenChange)} cm</span>
                        </div>
                      </div>
                    )}
                    {hipChange !== null && (
                      <div className={styles.metricRow}>
                        <span className={styles.metricName}>Hip</span>
                        <div>
                          <span className={`${styles.metricDelta} ${getDeltaClass(hipChange)}`}>{getDeltaStr(hipChange)} cm</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Measurement History */}
              <div>
                <h2 className={styles.sectionTitle}>Measurement History</h2>
                <div className={styles.historyList}>
                  {(showAllHistory ? measurements : measurements.slice(0, 5)).map((m, i) => {
                    // the index i is relative to the slice, but we need to find prev based on the real measurements array
                    // so we find the real index first
                    const realIndex = measurements.findIndex(x => x.id === m.id);
                    // find the previous valid measurement for each metric
                    const getPrev = (key: string) => {
                      for (let j = realIndex + 1; j < measurements.length; j++) {
                        if (measurements[j][key] !== null) return measurements[j][key];
                      }
                      return null;
                    };

                    const dateObj = new Date(m.measurement_date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

                    const metrics = [
                      { key: 'waist_cm', label: 'Waist' },
                      { key: 'abdomen_cm', label: 'Abdomen' },
                      { key: 'hip_cm', label: 'Hip' },
                      { key: 'chest_cm', label: 'Chest' },
                      { key: 'thigh_cm', label: 'Thigh' },
                      { key: 'upper_arm_cm', label: 'Upper Arm' },
                      { key: 'neck_cm', label: 'Neck' }
                    ];

                    const recordedMetrics = metrics.filter(met => m[met.key] !== null);
                    if (recordedMetrics.length === 0) return null;

                    return (
                      <div key={m.id} className={styles.historyCard}>
                        <div className={styles.historyDate}>{formattedDate}</div>
                        <div className={styles.historyGrid}>
                          {recordedMetrics.map(met => {
                            const val = m[met.key];
                            const prev = getPrev(met.key);
                            const diff = calcChange(val, prev);
                            return (
                              <div key={met.key} className={styles.metricRow}>
                                <span className={styles.metricName}>{met.label}</span>
                                <div>
                                  <span className={styles.metricValue}>{val} cm</span>
                                  {diff !== null && (
                                    <span className={`${styles.metricDelta} ${getDeltaClass(diff)}`}>{getDeltaStr(diff)}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {!showAllHistory && measurements.length > 5 && (
                    <button 
                      onClick={() => setShowAllHistory(true)}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        padding: '0.75rem',
                        borderRadius: '1rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginTop: '0.5rem',
                        width: '100%'
                      }}
                    >
                      View More History
                    </button>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <Link href="/measurements" className={styles.linkButton}>
                  + Add / Update Measurements
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
