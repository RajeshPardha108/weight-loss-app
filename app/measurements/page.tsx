"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "../../lib/supabase";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

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

function MeasurementsPageContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get("date");
  const [selectedDate, setSelectedDate] = useState(dateParam || getLocalDateString());
  const [logId, setLogId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  const [neck, setNeck] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [abdomen, setAbdomen] = useState("");
  const [hip, setHip] = useState("");
  const [thigh, setThigh] = useState("");
  const [upperArm, setUpperArm] = useState("");

  useEffect(() => {
    const fetchMeasurements = async () => {
      setLogId(null);
      setNeck("");
      setChest("");
      setWaist("");
      setAbdomen("");
      setHip("");
      setThigh("");
      setUpperArm("");

      if (!selectedDate) return;

      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('measurement_date', selectedDate)
        .maybeSingle();

      if (data) {
        setLogId(data.id);
        if (data.neck_cm !== null) setNeck(data.neck_cm.toString());
        if (data.chest_cm !== null) setChest(data.chest_cm.toString());
        if (data.waist_cm !== null) setWaist(data.waist_cm.toString());
        if (data.abdomen_cm !== null) setAbdomen(data.abdomen_cm.toString());
        if (data.hip_cm !== null) setHip(data.hip_cm.toString());
        if (data.thigh_cm !== null) setThigh(data.thigh_cm.toString());
        if (data.upper_arm_cm !== null) setUpperArm(data.upper_arm_cm.toString());
      }
    };

    fetchMeasurements();
  }, [selectedDate]);

  const handleSave = async () => {
    if (!selectedDate) return;
    setIsSaving(true);
    setStatusMsg({ type: "", text: "" });

    try {
      const payload = {
        measurement_date: selectedDate,
        neck_cm: neck ? parseFloat(neck) : null,
        chest_cm: chest ? parseFloat(chest) : null,
        waist_cm: waist ? parseFloat(waist) : null,
        abdomen_cm: abdomen ? parseFloat(abdomen) : null,
        hip_cm: hip ? parseFloat(hip) : null,
        thigh_cm: thigh ? parseFloat(thigh) : null,
        upper_arm_cm: upperArm ? parseFloat(upperArm) : null,
      };

      let targetId = logId;
      if (!targetId) {
        const { data: existing } = await supabase
          .from('body_measurements')
          .select('id')
          .eq('measurement_date', selectedDate)
          .maybeSingle();
        if (existing?.id) {
          targetId = existing.id;
          setLogId(existing.id);
        }
      }

      if (targetId) {
        const { error } = await supabase
          .from('body_measurements')
          .update(payload)
          .eq('id', targetId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('body_measurements')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) setLogId(data.id);
      }

      setStatusMsg({ type: "success", text: "Measurements saved!" });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Failed to save: " + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.mobileView}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Measurements</h1>
            <input 
              type="date" 
              className={styles.dateInput} 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <button onClick={() => window.history.back()} className={styles.backLink} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#38bdf8' }}>
            ← Back
          </button>
        </div>

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Neck (cm)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 38.5"
              value={neck}
              onChange={(e) => setNeck(e.target.value)}
              step="0.1"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Chest (cm)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 105.0"
              value={chest}
              onChange={(e) => setChest(e.target.value)}
              step="0.1"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Waist (cm)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 92.5"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              step="0.1"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Abdomen (cm)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 95.0"
              value={abdomen}
              onChange={(e) => setAbdomen(e.target.value)}
              step="0.1"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Hip (cm)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 108.0"
              value={hip}
              onChange={(e) => setHip(e.target.value)}
              step="0.1"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Thigh (cm)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 62.5"
              value={thigh}
              onChange={(e) => setThigh(e.target.value)}
              step="0.1"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Upper Arm (cm)</label>
            <input
              type="number"
              className={styles.input}
              placeholder="e.g. 34.0"
              value={upperArm}
              onChange={(e) => setUpperArm(e.target.value)}
              step="0.1"
            />
          </div>

          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Session"}
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

export default function MeasurementsPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.mobileView}><div className={styles.header}>Loading...</div></div></div>}>
      <MeasurementsPageContent />
    </Suspense>
  );
}
