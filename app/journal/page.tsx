"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "../../lib/supabase";

const getLocalDateString = (d: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const dNum = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${dNum}`;
};

const parseLogDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
};

export default function Journal() {
  const [selectedDateStr, setSelectedDateStr] = useState(getLocalDateString());
  const [log, setLog] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [latestLoggedDate, setLatestLoggedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch recent history and latest entry date across the database on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error: histErr } = await supabase
          .from("daily_logs")
          .select("*")
          .order("log_date", { ascending: false })
          .limit(30);

        if (histErr) throw histErr;

        if (data && data.length > 0) {
          setRecentLogs(data);
          setLatestLoggedDate(data[0].log_date);

          const todayStr = getLocalDateString();
          const todayEntry = data.find((r: any) => r.log_date === todayStr);
          if (todayEntry) {
            setLog(todayEntry);
          } else {
            // Show the most recent logged date by default so the journal is populated on open
            setSelectedDateStr(data[0].log_date);
            setLog(data[0]);
          }
        }
      } catch (err: any) {
        console.error("Failed to load journal history:", err);
        setError(err.message || "Failed to load journal records");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Fetch record when user changes the selected date
  useEffect(() => {
    const cached = recentLogs.find((r) => r.log_date === selectedDateStr);
    if (cached) {
      setLog(cached);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from("daily_logs")
          .select("*")
          .eq("log_date", selectedDateStr)
          .maybeSingle();

        if (fetchErr) throw fetchErr;
        setLog(data || null);
      } catch (err: any) {
        console.error("Error fetching journal data:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDateStr, recentLogs]);

  const changeDate = (days: number) => {
    const current = parseLogDate(selectedDateStr);
    current.setDate(current.getDate() + days);

    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    setSelectedDateStr(`${y}-${m}-${d}`);
  };

  const getMoodEmoji = (m: string) => {
    if (m === "good") return "😄 Great";
    if (m === "neutral") return "😐 Okay";
    if (m === "bad") return "😞 Challenging";
    return "—";
  };

  const displayDate = parseLogDate(selectedDateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const isToday = selectedDateStr === getLocalDateString();
  const hasData =
    log &&
    (log.weight_kg !== null ||
      log.steps !== null ||
      log.water_glasses !== null ||
      log.meal_status !== null ||
      log.mood !== null);

  return (
    <div className={styles.container}>
      <div className={styles.mobileView}>
        {/* HEADER & DATE SWITCHER */}
        <div className={styles.header}>
          <div className={styles.dateNav}>
            <button
              onClick={() => changeDate(-1)}
              className={styles.arrowBtn}
              title="Previous Day"
              aria-label="Previous Day"
            >
              ‹
            </button>

            <div className={styles.dateCenter}>
              <h1 className={styles.dateTitle}>{displayDate}</h1>
              <div className={styles.dateSub}>
                {!isToday ? (
                  <button
                    onClick={() => setSelectedDateStr(getLocalDateString())}
                    className={styles.returnTodayBtn}
                  >
                    Return to Today
                  </button>
                ) : (
                  <span style={{ fontSize: "0.72rem", color: "#4ade80" }}>Today</span>
                )}
                <span style={{ color: "#64748b" }}>·</span>
                <input
                  type="date"
                  value={selectedDateStr}
                  onChange={(e) => e.target.value && setSelectedDateStr(e.target.value)}
                  className={styles.datePickerInput}
                  title="Choose date"
                />
              </div>
            </div>

            <button
              onClick={() => changeDate(1)}
              className={styles.arrowBtn}
              title="Next Day"
              aria-label="Next Day"
            >
              ›
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className={styles.contentBody}>
          {/* Quick jump to latest recorded date if current day is empty */}
          {!hasData && latestLoggedDate && latestLoggedDate !== selectedDateStr && (
            <div className={styles.jumpBanner}>
              <span className={styles.jumpText}>
                💡 Latest recorded entry was on <strong>{latestLoggedDate}</strong>
              </span>
              <button
                onClick={() => setSelectedDateStr(latestLoggedDate)}
                className={styles.jumpBtn}
              >
                View {latestLoggedDate}
              </button>
            </div>
          )}

          {error ? (
            <div style={{ padding: "2rem", textAlign: "center" }}>
              <p style={{ color: "#f87171" }}>Error: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className={styles.primaryActionBtn}
                style={{ marginTop: "1rem" }}
              >
                Retry
              </button>
            </div>
          ) : loading && !log && recentLogs.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
              Loading journal records...
            </div>
          ) : (
            <>
              {/* Top Weight & Steps Metric Cards */}
              <div className={styles.metricsRow}>
                <div className={styles.metricCard}>
                  <div className={styles.cardLabel}>Weight</div>
                  <div className={styles.cardValueRow}>
                    <span className={styles.cardValue}>
                      {log?.weight_kg !== null && log?.weight_kg !== undefined
                        ? Number(log.weight_kg).toFixed(1)
                        : "--"}
                    </span>
                    <span className={styles.cardUnit}>kg</span>
                  </div>
                  {log?.weight_before_toilet && (
                    <div className={styles.cardSub}>
                      Pre-toilet: {log.weight_before_toilet} kg
                    </div>
                  )}
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.cardLabel}>Daily Steps</div>
                  <div className={styles.cardValueRow}>
                    <span className={styles.cardValue}>
                      {log?.steps !== null && log?.steps !== undefined
                        ? Number(log.steps).toLocaleString()
                        : "--"}
                    </span>
                  </div>
                  <div className={styles.cardSub}>
                    {log?.steps
                      ? `${Math.round((Number(log.steps) / 10000) * 100)}% of 10k goal`
                      : "Target: 10,000"}
                  </div>
                </div>
              </div>

              {/* Trackers Section */}
              <div className={styles.trackersCard}>
                <h3 className={styles.trackersTitle}>Daily Habit Trackers</h3>

                <div className={styles.trackerRow}>
                  <span className={styles.trackerLabel}>💧 Water Intake</span>
                  <span
                    className={styles.trackerVal}
                    style={{ color: log?.water_glasses ? "#4ade80" : "#64748b" }}
                  >
                    {log?.water_glasses
                      ? `${log.water_glasses} ${Number(log.water_glasses) > 6 ? "Glasses" : "L / Glasses"}`
                      : "Not logged"}
                  </span>
                </div>

                <div className={styles.trackerRow}>
                  <span className={styles.trackerLabel}>🍽 Meals & Nutrition</span>
                  <span
                    className={styles.trackerVal}
                    style={{
                      color:
                        log?.meal_status === "clean"
                          ? "#4ade80"
                          : log?.meal_status === "cheat"
                          ? "#fbbf24"
                          : "#64748b",
                      textTransform: "capitalize",
                    }}
                  >
                    {log?.meal_status ? `${log.meal_status} diet` : "Not logged"}
                  </span>
                </div>

                <div className={styles.trackerRow}>
                  <span className={styles.trackerLabel}>🙂 Mood & Energy</span>
                  <span
                    className={styles.trackerVal}
                    style={{ color: log?.mood ? "#4ade80" : "#64748b" }}
                  >
                    {log?.mood ? getMoodEmoji(log.mood) : "Not logged"}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href={`/log?date=${selectedDateStr}`}
                className={styles.primaryActionBtn}
              >
                <span>{hasData ? "✏️ Edit This Day's Log" : "+ Add Log for This Day"}</span>
              </Link>

              {/* Recent Journal Entries History */}
              {recentLogs.length > 0 && (
                <div className={styles.historyCard}>
                  <h3 className={styles.trackersTitle}>
                    Recent Logged Days ({recentLogs.length})
                  </h3>
                  <div className={styles.historyList}>
                    {recentLogs.slice(0, 12).map((entry) => {
                      const isSelected = entry.log_date === selectedDateStr;
                      const formatted = parseLogDate(entry.log_date).toLocaleDateString(
                        "en-US",
                        { weekday: "short", month: "short", day: "numeric", year: "numeric" }
                      );
                      const details: string[] = [];
                      if (entry.steps != null) details.push(`${Number(entry.steps).toLocaleString()} steps`);
                      if (entry.water_glasses != null) details.push(`💧 ${entry.water_glasses}`);
                      if (entry.meal_status) details.push(entry.meal_status);

                      return (
                        <button
                          key={entry.id || entry.log_date}
                          type="button"
                          onClick={() => setSelectedDateStr(entry.log_date)}
                          className={`${styles.historyRowBtn} ${isSelected ? styles.historyRowActive : ""}`}
                        >
                          <div className={styles.historyDateCol}>
                            <span className={styles.historyDateText}>{formatted}</span>
                            <span className={styles.historyDateSub}>
                              {details.length > 0 ? details.join(" · ") : "Logged entry"}
                            </span>
                          </div>
                          <div className={styles.historyMetricsCol}>
                            <span>
                              {entry.weight_kg != null
                                ? `${Number(entry.weight_kg).toFixed(1)} kg`
                                : "—"}
                            </span>
                            <span style={{ color: "#64748b" }}>›</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
