"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "../../page.module.css";
import { supabase } from "../../../lib/supabase";
import { Suspense } from "react";

function getLocalDateString(d: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const dNum = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${dNum}`;
}

function StepsLogContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get("date") || getLocalDateString();
  
  const [logId, setLogId] = useState<number | null>(null);
  const [steps, setSteps] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('daily_logs')
        .select('id, steps')
        .eq('log_date', dateParam)
        .maybeSingle();

      if (data) {
        setLogId(data.id);
        if (data.steps !== null) setSteps(data.steps.toString());
      }
      setLoading(false);
    };
    fetchData();
  }, [dateParam]);

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg({ type: "", text: "" });
    try {
      const finalSteps = steps ? parseInt(steps, 10) : null;
      const payload = {
        log_date: dateParam,
        steps: finalSteps,
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
            <h1 className={styles.title}>Log Steps</h1>
            <div className={styles.date}>{dateParam}</div>
          </div>
        </div>

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Total Steps</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 10000"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              step="1"
            />
          </div>

          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Steps"}
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

export default function StepsLog() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.mobileView}><div className={styles.header}>Loading...</div></div></div>}>
      <StepsLogContent />
    </Suspense>
  );
}
