"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "../log-form.module.css";
import { supabase } from "../../../lib/supabase";

function getLocalDateString(d: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const dNum = parts.find(p => p.type === 'day')?.value;
  return y + '-' + m + '-' + dNum;
}

function MoodLogContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get("date") || getLocalDateString();

  const [logId, setLogId] = useState<number | null>(null);
  const [mood, setMood] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('daily_logs')
          .select('id, mood')
          .eq('log_date', dateParam)
          .maybeSingle();

        if (data) {
          setLogId(data.id);
          if (data.mood !== null) setMood(data.mood);
        }
      } catch (err) {
        console.error('Failed to fetch mood log:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateParam]);

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg({ type: "", text: "" });
    try {
      const payload = {
        log_date: dateParam,
        mood: mood || null,
      };

      const { data, error } = await supabase
        .from('daily_logs')
        .upsert(payload, { onConflict: 'log_date' })
        .select()
        .single();
      if (error) throw error;
      if (data) setLogId(data.id);

      setStatusMsg({ type: "success", text: "Saved!" });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Failed to save: " + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.container}><div className={styles.mobileView}><div className={styles.header}>Loading...</div></div></div>;
  }

  const querySuffix = searchParams?.get("date") ? "?date=" + searchParams.get("date") : "";

  return (
    <div className={styles.container}>
      <div className={styles.mobileView}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href={"/log" + querySuffix} className={styles.backLink}>← Back</Link>
            <h1 className={styles.title}>Log Mood</h1>
            <div className={styles.date}>{dateParam}</div>
          </div>
        </div>

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>How are you feeling?</label>
            <div className={styles.moodGroup}>
              <button
                className={`${styles.moodBtn} ${mood === 'bad' ? styles.active : ''}`}
                onClick={() => setMood(mood === 'bad' ? '' : 'bad')}
              >
                😞
              </button>
              <button
                className={`${styles.moodBtn} ${mood === 'neutral' ? styles.active : ''}`}
                onClick={() => setMood(mood === 'neutral' ? '' : 'neutral')}
              >
                😐
              </button>
              <button
                className={`${styles.moodBtn} ${mood === 'good' ? styles.active : ''}`}
                onClick={() => setMood(mood === 'good' ? '' : 'good')}
              >
                😄
              </button>
            </div>
          </div>

          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Mood"}
          </button>

          {statusMsg.text && (
            <div style={{ textAlign: "center", color: statusMsg.type === "error" ? "#f87171" : "#4ade80", fontSize: "0.875rem", marginTop: "-0.5rem" }}>
              {statusMsg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MoodLog() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.mobileView}><div className={styles.header}>Loading...</div></div></div>}>
      <MoodLogContent />
    </Suspense>
  );
}
