"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "../lib/supabase";

const getLocalDateString = () => {
  const dateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const localDate = new Date(dateStr);
  const y = localDate.getFullYear();
  const m = String(localDate.getMonth() + 1).padStart(2, '0');
  const d = String(localDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function Home() {
  const [weightBefore, setWeightBefore] = useState("");
  const [weightAfter, setWeightAfter] = useState("");
  const [savedWeight, setSavedWeight] = useState("");
  const [steps, setSteps] = useState("");
  const [meal, setMeal] = useState("clean");
  const [water, setWater] = useState("");
  const [mood, setMood] = useState("good");
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [logId, setLogId] = useState<number | null>(null);

  useEffect(() => {
    const fetchTodayData = async () => {
      const todayDate = getLocalDateString();
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('log_date', todayDate)
        .maybeSingle();
      
      if (data) {
        setLogId(data.id);
        if (data.weight_kg !== null) {
          setSavedWeight(data.weight_kg.toString());
        }
        if (data.weight_before_toilet !== null) {
          setWeightBefore(data.weight_before_toilet.toString());
        }
        if (data.weight_after_toilet !== null) {
          setWeightAfter(data.weight_after_toilet.toString());
        }
      }
    };
    fetchTodayData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg({ type: "", text: "" });
    try {
      const todayDate = getLocalDateString();
      const finalWeight = weightAfter ? parseFloat(weightAfter) : null;
      const payload = {
        log_date: todayDate,
        weight_kg: finalWeight,
        weight_before_toilet: weightBefore ? parseFloat(weightBefore) : null,
        weight_after_toilet: weightAfter ? parseFloat(weightAfter) : null,
        steps: steps ? parseInt(steps, 10) : null,
        water_glasses: water ? parseFloat(water) : null,
        meal_status: meal,
        mood: mood
      };

      if (logId) {
        const { error } = await supabase
          .from('daily_logs')
          .update(payload)
          .eq('id', logId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('daily_logs')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) setLogId(data.id);
      }
      
      if (finalWeight !== null) {
        setSavedWeight(finalWeight.toString());
      } else {
        setSavedWeight("");
      }
      setStatusMsg({ type: "success", text: "Successfully saved!" });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Failed to save: " + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className={styles.container}>
      <div className={styles.mobileView}>
        <div className={styles.header} style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 className={styles.title}>Daily Progress</h1>
            <div className={styles.date}>{today}</div>
          </div>
          <Link href="/progress" style={{ color: '#38bdf8', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500, padding: '0.25rem 0' }}>
            Progress →
          </Link>
        </div>

        <div className={styles.overview}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Current</div>
            <div>
              <span className={styles.cardValue}>{savedWeight || "--"}</span>
              <span className={styles.cardUnit}>kg</span>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Goal</div>
            <div>
              <span className={styles.cardValue}>97</span>
              <span className={styles.cardUnit}>kg</span>
            </div>
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

          <div className={styles.inputGroup}>
            <label className={styles.label}>Steps</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 8500"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Meals</label>
            <div className={styles.statusGrid}>
              <button
                className={`${styles.statusBtn} ${meal === 'clean' ? styles.active : ''}`}
                onClick={() => setMeal('clean')}
              >
                🥗 Clean
              </button>
              <button
                className={`${styles.statusBtn} ${meal === 'cheat' ? styles.active : ''}`}
                onClick={() => setMeal('cheat')}
              >
                🍔 Cheat
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Water (L)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 2.5"
              value={water}
              onChange={(e) => setWater(e.target.value)}
              step="0.1"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Mood</label>
            <div className={styles.moodGroup}>
              <button
                className={`${styles.moodBtn} ${mood === 'bad' ? styles.active : ''}`}
                onClick={() => setMood('bad')}
              >
                😔
              </button>
              <button
                className={`${styles.moodBtn} ${mood === 'neutral' ? styles.active : ''}`}
                onClick={() => setMood('neutral')}
              >
                😐
              </button>
              <button
                className={`${styles.moodBtn} ${mood === 'good' ? styles.active : ''}`}
                onClick={() => setMood('good')}
              >
                😃
              </button>
            </div>
          </div>

          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Today"}
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
