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

function FoodLogContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get("date") || getLocalDateString();

  const [logId, setLogId] = useState<number | null>(null);
  const [meal, setMeal] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('daily_logs')
          .select('id, meal_status')
          .eq('log_date', dateParam)
          .maybeSingle();

        if (data) {
          setLogId(data.id);
          if (data.meal_status !== null) setMeal(data.meal_status);
        }
      } catch (err) {
        console.error('Failed to fetch food log:', err);
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
        meal_status: meal || null,
      };

      if (logId) {
        const { error } = await supabase.from('daily_logs').update(payload).eq('id', logId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('daily_logs').insert([payload]).select().single();
        if (error) throw error;
        if (data) setLogId(data.id);
      }

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
            <h1 className={styles.title}>Log Food</h1>
            <div className={styles.date}>{dateParam}</div>
          </div>
        </div>

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Meals</label>
            <div className={styles.statusGrid}>
              <button
                className={`${styles.statusBtn} ${meal === 'clean' ? styles.active : ''}`}
                onClick={() => setMeal(meal === 'clean' ? '' : 'clean')}
              >
                Clean
              </button>
              <button
                className={`${styles.statusBtn} ${meal === 'cheat' ? styles.active : ''}`}
                onClick={() => setMeal(meal === 'cheat' ? '' : 'cheat')}
              >
                Cheat
              </button>
            </div>
          </div>

          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Food"}
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

export default function FoodLog() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.mobileView}><div className={styles.header}>Loading...</div></div></div>}>
      <FoodLogContent />
    </Suspense>
  );
}
