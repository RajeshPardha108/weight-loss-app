"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../page.module.css";
import { supabase } from "../../lib/supabase";

const getLocalDateString = (d: Date = new Date()) => {
  const dateStr = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const localDate = new Date(dateStr);
  const y = localDate.getFullYear();
  const m = String(localDate.getMonth() + 1).padStart(2, '0');
  const dNum = String(localDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${dNum}`;
};

export default function Journal() {
  const [selectedDateStr, setSelectedDateStr] = useState(getLocalDateString());
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('log_date', selectedDateStr)
        .maybeSingle();
      
      setLog(data || null);
      setLoading(false);
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

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : (
          <div className={styles.form} style={{ gap: '1rem' }}>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className={styles.card} style={{ margin: 0 }}>
                <div className={styles.cardLabel}>Weight</div>
                <div>
                  <span className={styles.cardValue}>{log?.weight_kg || "--"}</span>
                  <span className={styles.cardUnit}>kg</span>
                </div>
              </div>
              <div className={styles.card} style={{ margin: 0 }}>
                <div className={styles.cardLabel}>Steps</div>
                <div>
                  <span className={styles.cardValue}>{log?.steps || "--"}</span>
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '1.25rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Trackers</h3>
              
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

            <Link href={`/log?date=${selectedDateStr}`} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '1rem',
              padding: '1rem',
              textAlign: 'center',
              textDecoration: 'none',
              fontWeight: 600,
              marginTop: '0.5rem',
              transition: 'all 0.2s ease'
            }}>
              + Add / Edit Data
            </Link>

          </div>
        )}
      </div>
    </div>
  );
}
