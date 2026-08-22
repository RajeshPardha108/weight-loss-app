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

function WeightLogContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get("date") || getLocalDateString();

  const [logId, setLogId] = useState<number | null>(null);
  const [weightBefore, setWeightBefore] = useState("");
  const [weightAfter, setWeightAfter] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('daily_logs')
          .select('id, weight_before_toilet, weight_after_toilet')
          .eq('log_date', dateParam)
          .maybeSingle();

        if (data) {
          setLogId(data.id);
          if (data.weight_before_toilet !== null) setWeightBefore(data.weight_before_toilet.toString());
          if (data.weight_after_toilet !== null) setWeightAfter(data.weight_after_toilet.toString());
        }
      } catch (err) {
        console.error('Failed to fetch weight log:', err);
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
      const finalWeight = weightAfter ? parseFloat(weightAfter) : null;
      const payload = {
        log_date: dateParam,
        weight_kg: finalWeight,
        weight_before_toilet: weightBefore ? parseFloat(weightBefore) : null,
        weight_after_toilet: weightAfter ? parseFloat(weightAfter) : null,
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
            <h1 className={styles.title}>Log Weight</h1>
            <div className={styles.date}>{dateParam}</div>
          </div>
        </div>

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Before toilet (kg)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 102.5"
              value={weightBefore}
              onChange={(e) => setWeightBefore(e.target.value)}
              step="0.1"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>After toilet (kg)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 101.8"
              value={weightAfter}
              onChange={(e) => setWeightAfter(e.target.value)}
              step="0.1"
            />
          </div>

          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Weight"}
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

export default function WeightLog() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.mobileView}><div className={styles.header}>Loading...</div></div></div>}>
      <WeightLogContent />
    </Suspense>
  );
}
