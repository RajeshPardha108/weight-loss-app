"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "../../lib/supabase";
import BodyVisualizer from "./BodyVisualizer";
import MeasurementCharts from "./MeasurementCharts";

const parseDateStr = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
};

export default function BodyProgress() {
  const [logs, setLogs] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, measurementsRes] = await Promise.all([
          supabase
            .from("daily_logs")
            .select("log_date, weight_kg")
            .order("log_date", { ascending: true }),
          supabase
            .from("body_measurements")
            .select("*")
            .order("measurement_date", { ascending: false }), // latest first
        ]);

        if (logsRes.error) throw logsRes.error;
        if (measurementsRes.error) throw measurementsRes.error;

        if (logsRes.data) setLogs(logsRes.data);
        if (measurementsRes.data) setMeasurements(measurementsRes.data);
      } catch (err: any) {
        console.error("Error loading body progress:", err);
        setError(err?.message || "Failed to load body measurements");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.appContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>Body Progress</h1>
          </div>
          <div className={styles.emptyState}>
            <p style={{ color: "#f87171", marginBottom: "1rem" }}>Error: {error}</p>
            <button
              onClick={() => window.location.reload()}
              className={styles.primaryActionBtn}
              style={{ border: "none", cursor: "pointer" }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

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
  const weightLogs = logs.filter((l) => l.weight_kg !== null && l.weight_kg !== undefined);
  const latestWeight =
    weightLogs.length > 0 ? Number(weightLogs[weightLogs.length - 1].weight_kg) : null;
  const startWeight = weightLogs.length > 0 ? Number(weightLogs[0].weight_kg) : null;
  const weightChange =
    latestWeight !== null && startWeight !== null ? latestWeight - startWeight : null;

  const latestMeas = measurements.length > 0 ? measurements[0] : null;

  const getDeltaStr = (diff: number) => {
    if (diff > 0) return `↑ ${Math.abs(diff).toFixed(1)}`;
    if (diff < 0) return `↓ ${Math.abs(diff).toFixed(1)}`;
    return "0.0";
  };
  const getDeltaClass = (diff: number) => {
    if (diff > 0) return styles.deltaUp;
    if (diff < 0) return styles.deltaDown;
    return styles.deltaNeutral;
  };

  const calcChange = (current: number | null | undefined, prev: number | null | undefined) => {
    if (current === null || current === undefined || prev === null || prev === undefined) {
      return null;
    }
    return Number(current) - Number(prev);
  };

  const getStartVal = (key: string) => {
    for (let i = measurements.length - 1; i >= 0; i--) {
      if (measurements[i][key] !== null && measurements[i][key] !== undefined) {
        return Number(measurements[i][key]);
      }
    }
    return null;
  };

  const startWaist = getStartVal("waist_cm");
  const startAbdomen = getStartVal("abdomen_cm");
  const startHip = getStartVal("hip_cm");

  const waistChange = calcChange(latestMeas?.waist_cm, startWaist);
  const abdomenChange = calcChange(latestMeas?.abdomen_cm, startAbdomen);
  const hipChange = calcChange(latestMeas?.hip_cm, startHip);

  return (
    <div className={styles.container}>
      <div className={styles.appContainer}>
        <div
          className={styles.header}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <h1 className={styles.title}>Body Progress</h1>
          <Link
            href="/measurements"
            style={{
              background: "rgba(56, 189, 248, 0.1)",
              color: "#38bdf8",
              fontSize: "0.875rem",
              textDecoration: "none",
              fontWeight: 600,
              padding: "0.5rem 1rem",
              borderRadius: "2rem",
              border: "1px solid rgba(56, 189, 248, 0.2)",
            }}
          >
            + Add
          </Link>
        </div>

        {measurements.length === 0 ? (
          <div className={styles.emptyState}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📏</div>
            <h2 style={{ fontSize: "1.25rem", color: "#f8fafc", marginBottom: "0.5rem" }}>
              No body measurements recorded yet.
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "2rem" }}>
              Measure yourself whenever convenient.
            </p>
            <Link href="/measurements" className={styles.primaryActionBtn}>
              + Add Measurement
            </Link>
          </div>
        ) : (
          <div className={styles.gridDesktop}>
            {/* LEFT COLUMN */}
            <div className={styles.colLeft}>
              <div
                className={styles.visualizerCard}
                style={{
                  padding: 0,
                  background: "transparent",
                  boxShadow: "none",
                  border: "none",
                }}
              >
                <BodyVisualizer measurements={[...measurements].reverse()} />
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
                    <span className={styles.cardValue}>
                      {latestWeight !== null ? latestWeight.toFixed(1) : "—"}
                    </span>
                    <span className={styles.cardUnit}>kg</span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>Waist</div>
                  <div className={styles.cardValueRow}>
                    <span className={styles.cardValue}>{latestMeas?.waist_cm ?? "—"}</span>
                    <span className={styles.cardUnit}>cm</span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>Abdomen</div>
                  <div className={styles.cardValueRow}>
                    <span className={styles.cardValue}>{latestMeas?.abdomen_cm ?? "—"}</span>
                    <span className={styles.cardUnit}>cm</span>
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>Hip</div>
                  <div className={styles.cardValueRow}>
                    <span className={styles.cardValue}>{latestMeas?.hip_cm ?? "—"}</span>
                    <span className={styles.cardUnit}>cm</span>
                  </div>
                </div>
              </div>

              {/* Change Since Start */}
              {(weightChange !== null ||
                waistChange !== null ||
                abdomenChange !== null ||
                hipChange !== null) && (
                <>
                  <div className={styles.sectionHeader}>Since Start</div>
                  <div className={styles.historyCard}>
                    <div className={styles.historyGrid}>
                      {weightChange !== null && (
                        <div className={styles.metricRow}>
                          <span className={styles.metricName}>Weight</span>
                          <span className={`${styles.metricDelta} ${getDeltaClass(weightChange)}`}>
                            {getDeltaStr(weightChange)} kg
                          </span>
                        </div>
                      )}
                      {waistChange !== null && (
                        <div className={styles.metricRow}>
                          <span className={styles.metricName}>Waist</span>
                          <span className={`${styles.metricDelta} ${getDeltaClass(waistChange)}`}>
                            {getDeltaStr(waistChange)} cm
                          </span>
                        </div>
                      )}
                      {abdomenChange !== null && (
                        <div className={styles.metricRow}>
                          <span className={styles.metricName}>Abdomen</span>
                          <span className={`${styles.metricDelta} ${getDeltaClass(abdomenChange)}`}>
                            {getDeltaStr(abdomenChange)} cm
                          </span>
                        </div>
                      )}
                      {hipChange !== null && (
                        <div className={styles.metricRow}>
                          <span className={styles.metricName}>Hip</span>
                          <span className={`${styles.metricDelta} ${getDeltaClass(hipChange)}`}>
                            {getDeltaStr(hipChange)} cm
                          </span>
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

              {/* Recorded Measurement Sessions */}
              <div className={styles.sectionHeader}>
                Recorded Sessions ({measurements.length})
              </div>
              <div className={styles.historyCard}>
                <div className={styles.historyGrid}>
                  {measurements.map((m) => {
                    const formattedDate = parseDateStr(m.measurement_date).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    );
                    return (
                      <Link
                        key={m.id || m.measurement_date}
                        href={`/measurements?date=${m.measurement_date}`}
                        className={styles.metricRow}
                        style={{ textDecoration: "none" }}
                      >
                        <span className={styles.metricName}>{formattedDate}</span>
                        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                          Waist: <strong style={{ color: "#38bdf8" }}>{m.waist_cm ?? "—"} cm</strong>
                          {" · "}Hip: <strong style={{ color: "#f8fafc" }}>{m.hip_cm ?? "—"} cm</strong>
                          {" ›"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Motivation */}
              <div className={styles.motivationCard}>
                <div className={styles.quoteMark}>&quot;</div>
                <p className={styles.quoteText}>
                  Your body is a reflection of your lifestyle. Keep pushing, the results are
                  showing.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
