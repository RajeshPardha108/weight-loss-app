"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../page.module.css";
import { supabase } from "../../lib/supabase";

const getLocalDateString = (d: Date = new Date()) => {
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
};

export default function Journal() {
  const [selectedDateStr, setSelectedDateStr] = useState(getLocalDateString());
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('log_date', selectedDateStr)
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
  }, [selectedDateStr]);

  const changeDate = (days: number) => {
    const current = new Date(selectedDateStr);
    current.setDate(current.getDate() + days);
    
    // Format safely to YYYY-MM-DD
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDateStr(`${y}-${m}-${d}`);
  };

  const getMoodEmoji = (m: string) => {
    if (m === 'good') return '😄';
    if (m === 'neutral') return '😐';
    if (m === 'bad') return '😞';
    return '';
  };

  const displayDate = new Date(selectedDateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const isToday = selectedDateStr === getLocalDateString();

  return (
    <div className={styles.container}>
      <div className={styles.mobileView}>
        <div className={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => changeDate(-1)} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem' }}>‹</button>
            <div style={{ textAlign: 'center' }}>
              <h1 className={styles.title} style={{ fontSize: '1.25rem' }}>{displayDate}</h1>
              {!isToday && (
                <button onClick={() => setSelectedDateStr(getLocalDateString())} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem', cursor: 'pointer', textDecoration: 'underline' }}>
                  Return to Today
                </button>
              )}
            </div>
            <button onClick={() => changeDate(1)} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem' }}>›</button>
          </div>
        </div>

        {error ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#f87171' }}>Error: {error}</p>
            <button onClick={() => window.location.reload()} className={styles.primaryActionBtn} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>Retry</button>
          </div>
        ) : loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className={styles.card} style={{ margin: 0, flex: 1 }}>
                <div className={styles.cardLabel}>Weight</div>
                <div>
                  <span className={styles.cardValue}>{log?.weight_kg || "--"}</span>
                  <span className={styles.cardUnit}>kg</span>
                </div>
              </div>
              <div className={styles.card} style={{ margin: 0, flex: 1 }}>
                <div className={styles.cardLabel}>Steps</div>
                <div>
                  <span className={styles.cardValue}>{log?.steps || "--"}</span>
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1.25rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Trackers</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc', fontWeight: 500 }}>💧 Water</span>
                <span style={{ color: log?.water_glasses ? '#4ade80' : '#64748b' }}>
                  {log?.water_glasses ? `${log.water_glasses} L` : '—'}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc', fontWeight: 500 }}>🍽 Food</span>
                <span style={{ color: log?.meal_status ? '#4ade80' : '#64748b', textTransform: 'capitalize' }}>
                  {log?.meal_status || '—'}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#f8fafc', fontWeight: 500 }}>🙂 Mood</span>
                <span style={{ color: log?.mood ? '#4ade80' : '#64748b' }}>
                  {log?.mood ? getMoodEmoji(log.mood) : '—'}
                </span>
              </div>
            </div>

            <Link href={`/log?date=${selectedDateStr}`} className={styles.primaryActionBtn} style={{ marginTop: '0.5rem' }}>
              + Add / Edit Data
            </Link>

          </div>
        )}
      </div>
    </div>
  );
}
