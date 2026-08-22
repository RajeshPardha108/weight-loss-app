"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { supabase } from "../../lib/supabase";
import BodyVisualizer from "./BodyVisualizer";
import MeasurementCharts from "./MeasurementCharts";

export default function BodyProgress() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

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
        
        if (logsRes.data) setLogs(logsRes.data);
        if (measurementsRes.data) setMeasurements(measurementsRes.data);
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
        <div className={styles.appContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>Body Progress</h1>
          </div>
          <div className={styles.emptyState}>Loading...</div>
        </div>
      </div>
    );
  }

  // Derived data
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
      <div className={styles.appContainer}>
        
        <div className={styles.header}>
          <h1 className={styles.title}>Body Progress</h1>
        </div>

        {/* SEGMENTED CONTROL */}
        <div className={styles.segmentedControl}>
          <button className={`${styles.segmentBtn} ${activeTab === 'overview' ? styles.active : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`${styles.segmentBtn} ${activeTab === 'measurements' ? styles.active : ''}`} onClick={() => setActiveTab('measurements')}>Measurements</button>
          <button className={`${styles.segmentBtn} ${activeTab === 'charts' ? styles.active : ''}`} onClick={() => setActiveTab('charts')}>Charts</button>
          <button className={`${styles.segmentBtn} ${activeTab === 'photos' ? styles.active : ''}`} onClick={() => setActiveTab('photos')}>Photos</button>
        </div>

        {measurements.length === 0 ? (
          <div className={styles.emptyState}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📏</div>
            <h2 style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: '0.5rem' }}>No body measurements recorded yet.</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '2rem' }}>
              Measure yourself whenever convenient.
            </p>
            <Link href="/measurements" className={styles.primaryActionBtn}>+ Add Measurement</Link>
          </div>
        ) : (
          <div className={styles.gridDesktop}>
            
            {/* LEFT COLUMN */}
            <div className={styles.colLeft}>
              <div className={styles.visualizerCard}>
                <div className={styles.sectionHeader} style={{ padding: 0, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Body View</span>
                  <div className={styles.dateSelector}>Latest</div>
                </div>
                <div className={styles.visualizerWrapper}>
                  <BodyVisualizer measurements={[...measurements].reverse()} />
                </div>
                
                <div className={styles.compositionControls}>
                  <button className={`${styles.compBtn} ${styles.active}`}>Front</button>
                  <button className={styles.compBtn}>Back</button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className={styles.colRight}>
              
              {/* Summary Cards */}
              <div className={styles.sectionHeader}>Current Metrics</div>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>Weight</div>
                  <div className={styles.cardValueRow}>
                    <span className={styles.cardValue}>{latestWeight !== null ? latestWeight : '—'}</span>
                    <span className={styles.cardUnit}>kg</span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>Waist</div>
                  <div className={styles.cardValueRow}>
                    <span className={styles.cardValue}>{latestMeas?.waist_cm || '—'}</span>
                    <span className={styles.cardUnit}>cm</span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>Abdomen</div>
                  <div className={styles.cardValueRow}>
                    <span className={styles.cardValue}>{latestMeas?.abdomen_cm || '—'}</span>
                    <span className={styles.cardUnit}>cm</span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>Hip</div>
                  <div className={styles.cardValueRow}>
                    <span className={styles.cardValue}>{latestMeas?.hip_cm || '—'}</span>
                    <span className={styles.cardUnit}>cm</span>
                  </div>
                </div>
              </div>

              {/* Change Since Start */}
              {(weightChange !== null || waistChange !== null || abdomenChange !== null || hipChange !== null) && (
                <>
                  <div className={styles.sectionHeader}>Since Start</div>
                  <div className={styles.historyCard}>
                    <div className={styles.historyGrid}>
                      {weightChange !== null && (
                        <div className={styles.metricRow}>
                          <span className={styles.metricName}>Weight</span>
                          <span className={`${styles.metricDelta} ${getDeltaClass(weightChange)}`}>{getDeltaStr(weightChange)} kg</span>
                        </div>
                      )}
                      {waistChange !== null && (
                        <div className={styles.metricRow}>
                          <span className={styles.metricName}>Waist</span>
                          <span className={`${styles.metricDelta} ${getDeltaClass(waistChange)}`}>{getDeltaStr(waistChange)} cm</span>
                        </div>
                      )}
                      {abdomenChange !== null && (
                        <div className={styles.metricRow}>
                          <span className={styles.metricName}>Abdomen</span>
                          <span className={`${styles.metricDelta} ${getDeltaClass(abdomenChange)}`}>{getDeltaStr(abdomenChange)} cm</span>
                        </div>
                      )}
                      {hipChange !== null && (
                        <div className={styles.metricRow}>
                          <span className={styles.metricName}>Hip</span>
                          <span className={`${styles.metricDelta} ${getDeltaClass(hipChange)}`}>{getDeltaStr(hipChange)} cm</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Trends Chart */}
              <div className={styles.sectionHeader}>Trends</div>
              <div className={styles.chartCard}>
                <MeasurementCharts measurements={[...measurements].reverse()} />
              </div>

              {/* Motivation */}
              <div className={styles.motivationCard}>
                <div className={styles.quoteMark}>"</div>
                <p className={styles.quoteText}>Your body is a reflection of your lifestyle. Keep pushing, the results are showing.</p>
              </div>

            </div>
          </div>
        )}

        {/* BOTTOM NAV */}
        <div className={styles.bottomNavWrapper}>
          <div className={styles.bottomNav}>
            <Link href="/" className={styles.navItem}>
              <span className={styles.navIcon}>🏠</span>
              <span className={styles.navLabel}>Home</span>
            </Link>
            <Link href="/progress" className={styles.navItem}>
              <span className={styles.navIcon}>📈</span>
              <span className={styles.navLabel}>Progress</span>
            </Link>
            <Link href="/log" className={styles.navItemCenter}>
              <div className={styles.navPlus}>+</div>
            </Link>
            <Link href="/body-progress" className={`${styles.navItem} ${styles.active}`}>
              <span className={styles.navIcon}>🧍‍♂️</span>
              <span className={styles.navLabel}>Body</span>
            </Link>
            <Link href="/journal" className={styles.navItem}>
              <span className={styles.navIcon}>📝</span>
              <span className={styles.navLabel}>Journal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
