"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "../../page.module.css";
import { supabase } from "../../../lib/supabase";

const getLocalDateString = () => {
  const dateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const localDate = new Date(dateStr);
  const y = localDate.getFullYear();
  const m = String(localDate.getMonth() + 1).padStart(2, '0');
  const d = String(localDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

import { Suspense } from "react";

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
      const { data } = await supabase
        .from('daily_logs')
        .select('id, mood')
        .eq('log_date', dateParam)
        .maybeSingle();

      if (data) {
        setLogId(data.id);
        if (data.mood !== null) setMood(data.mood);
      }
      setLoading(false);
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

      if (logId) {
        const { error } = await supabase.from('daily_logs').update(payload).eq('id', logId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('daily_logs').insert([payload]).select().single();
        if (error) throw error;
        if (data) setLogId(data.id);
      }
      
      setStatusMsg({ type: "success", text: "Successfully saved!" });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Failed to save: " + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.container}><div className={styles.mobileView}><div className={styles.header}>Loading...</div></div></div>;
  }

  const querySuffix = searchParams?.get("date") ? `?date=${searchParams.get("date")}` : "";

  return (
    <div className={styles.container}>
      <div className={styles.mobileView}>
        <div className={styles.header} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
          <Link href={`/log${querySuffix}`} style={{ color: '#38bdf8', fontSize: '0.875rem', textDecoration: 'none' }}>
            ← Back
          </Link>
          <div>
            <h1 className={styles.title}>Log Mood</h1>
            <div className={styles.date}>{dateParam}</div>
          </div>
        </div>

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Mood</label>
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
