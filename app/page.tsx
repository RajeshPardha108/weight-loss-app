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
  const [log, setLog] = useState<any>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayData = async () => {
      const todayDate = getLocalDateString();
      const [logRes, settingsRes] = await Promise.all([
        supabase
          .from('daily_logs')
          .select('*')
          .eq('log_date', todayDate)
          .maybeSingle(),
        supabase
          .from('user_settings')
          .select('goal_weight_kg')
          .eq('id', 1)
          .single()
      ]);
      
      if (logRes.data) {
        setLog(logRes.data);
      }
      if (settingsRes.data && settingsRes.data.goal_weight_kg) {
        setGoal(Number(settingsRes.data.goal_weight_kg));
      }
      setLoading(false);
    };
    fetchTodayData();
  }, []);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const getMoodEmoji = (m: string) => {
    if (m === 'good') return '😄';
    if (m === 'neutral') return '😐';
    if (m === 'bad') return '😞';
    return '';
  };

  return (
    <div className={styles.container}>
      <div className={styles.mobileView}>
        <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className={styles.title}>Today's Overview</h1>
            <div className={styles.date}>{todayStr}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#818cf8', fontSize: '0.875rem', fontWeight: 600 }}>Goal</div>
            <div style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: 700 }}>{goal ? `${goal} kg` : '--'}</div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : (
          <div className={styles.form} style={{ gap: '1rem' }}>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className={styles.card} style={{ margin: 0 }}>
                <div className={styles.cardLabel}>Current Weight</div>
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

            <Link href="/log" style={{
              background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
              color: 'white',
              borderRadius: '1rem',
              padding: '1rem',
              textAlign: 'center',
              textDecoration: 'none',
              fontWeight: 600,
              marginTop: '0.5rem',
              boxShadow: '0 10px 20px -10px rgba(56, 189, 248, 0.5)'
            }}>
              + Log Activity
            </Link>

          </div>
        )}
      </div>
    </div>
  );
}
