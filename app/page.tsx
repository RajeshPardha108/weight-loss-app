"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "../lib/supabase";
import { fetchUserGoals } from "../lib/goals";

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

const parseLogDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-');
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
};

export default function Home() {
  const [log, setLog] = useState<any>(null);
  const [activeGoal, setActiveGoal] = useState<number | null>(null);
  const [finalGoal, setFinalGoal] = useState<number | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayData = async () => {
      const todayDate = getLocalDateString();
      const msInDay = 24 * 60 * 60 * 1000;
      const thirtyDaysAgoTime = new Date().getTime() - (30 * msInDay);
      const thirtyDaysAgoDate = new Date(thirtyDaysAgoTime).toISOString().split('T')[0];

      const [logRes, goalsRes, logsHistRes] = await Promise.all([
        supabase
          .from('daily_logs')
          .select('*')
          .eq('log_date', todayDate)
          .maybeSingle(),
        fetchUserGoals(),
        supabase
          .from('daily_logs')
          .select('log_date, weight_kg, steps, water_glasses, meal_status')
          .gte('log_date', thirtyDaysAgoDate)
          .not('weight_kg', 'is', null)
          .order('log_date', { ascending: true })
      ]);
      
      if (logRes.data) {
        setLog(logRes.data);
      }
      setActiveGoal(goalsRes.activeGoal);
      setFinalGoal(goalsRes.finalGoal);
      
      if (logsHistRes.data && logsHistRes.data.length > 0) {
        const hist = logsHistRes.data;
        setLatestWeight(hist[hist.length - 1].weight_kg);
        setRecentLogs(hist);
      }
      
      setLoading(false);
    };
    fetchTodayData();
  }, []);

  const getMoodEmoji = (m: string) => {
    if (m === 'good') return '😄';
    if (m === 'neutral') return '😐';
    if (m === 'bad') return '😞';
    return '—';
  };

  // Calculations
  const currentW = log?.weight_kg || latestWeight;
  const remainingToActive = (activeGoal !== null && currentW !== null && currentW > activeGoal) ? (currentW - activeGoal).toFixed(1) : "0.0";
  
  let trend = 0;
  if (recentLogs.length >= 2) {
    trend = currentW - recentLogs[recentLogs.length - 2].weight_kg;
  }
  
  const todayDate = getLocalDateString();
  const msInDay = 24 * 60 * 60 * 1000;
  const todayTime = new Date(todayDate).getTime();
  const sevenDaysAgoTime = todayTime - (6 * msInDay);
  
  const last7DaysLogs = recentLogs.filter(l => parseLogDate(l.log_date).getTime() >= sevenDaysAgoTime);
  const avg7Day = last7DaysLogs.length > 0 ? (last7DaysLogs.reduce((acc, curr) => acc + curr.weight_kg, 0) / last7DaysLogs.length).toFixed(1) : '--';
  const avg30Day = recentLogs.length > 0 ? (recentLogs.reduce((acc, curr) => acc + curr.weight_kg, 0) / recentLogs.length).toFixed(1) : '--';
  
  let streak = 0;
  let currTime = todayTime;
  for (let i = recentLogs.length - 1; i >= 0; i--) {
    const logTime = parseLogDate(recentLogs[i].log_date).getTime();
    if (logTime === currTime) {
      streak++;
      currTime -= msInDay;
    } else if (logTime === currTime - msInDay) {
      // missed today, but streak goes on from yesterday
      if (streak === 0) currTime -= msInDay;
      streak++;
      currTime -= msInDay;
    } else {
      break;
    }
  }

  // Circular Final Goal Progress (start to 70kg, assuming max weight from history as rough start)
  const roughStart = recentLogs.length > 0 ? Math.max(...recentLogs.map(l => l.weight_kg)) : 100;
  let finalGoalProgress = 0;
  if (finalGoal !== null && currentW !== null) {
      const totalToLose = roughStart - finalGoal;
      const lostSoFar = roughStart - currentW;
      finalGoalProgress = totalToLose > 0 ? Math.max(0, Math.min(100, (lostSoFar / totalToLose) * 100)) : 100;
  }
  const circleRadius = 36;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleOffset = circleCircumference - (finalGoalProgress / 100) * circleCircumference;

  return (
    <div className={styles.container}>
      <div className={styles.appContainer}>
        
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.greeting}>
            <h1>Good morning!</h1>
            <p className={styles.subtitle}>Let's keep the momentum going.</p>
          </div>
          <div className={styles.dateBadge}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>

        <div className={styles.gridDesktop}>
          {/* LEFT COLUMN: Main Metrics */}
          <div className={styles.colLeft}>
            
            {/* HERO CURRENT WEIGHT */}
            <div className={styles.heroCard}>
              <div className={styles.heroContent}>
                <div className={styles.heroLeft}>
                  <div className={styles.heroLabel}>Current Weight</div>
                  <div className={styles.heroWeight}>
                    {currentW ? currentW.toFixed(1) : '--'}<span className={styles.unit}>kg</span>
                  </div>
                  <div className={`${styles.trendPill} ${trend <= 0 ? styles.trendGood : styles.trendBad}`}>
                    {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)} kg from yesterday
                  </div>
                </div>
                
                {/* Circular Final Goal Progress */}
                <div className={styles.heroRight}>
                  <div className={styles.circularProgress}>
                    <svg width="90" height="90" viewBox="0 0 90 90">
                      <circle cx="45" cy="45" r={circleRadius} stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                      <circle cx="45" cy="45" r={circleRadius} stroke="#38bdf8" strokeWidth="6" fill="none" 
                              strokeDasharray={circleCircumference} strokeDashoffset={circleOffset} strokeLinecap="round" 
                              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease-in-out' }} />
                    </svg>
                    <div className={styles.circleText}>
                      <span className={styles.circleValue}>{Math.round(finalGoalProgress)}%</span>
                      <span className={styles.circleLabel}>Final</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* YOUR GOALS */}
            <div className={styles.sectionHeader}>Your Goals</div>
            <div className={styles.goalsGrid}>
              <div className={styles.goalCardActive}>
                <div className={styles.goalHeaderRow}>
                  <div className={styles.goalLabel}>Active Goal</div>
                  <div className={styles.goalTarget}>{activeGoal} kg</div>
                </div>
                {activeGoal !== null && currentW !== null && currentW <= activeGoal ? (
                  <div className={styles.goalAchieved}>
                    <div className={styles.achievedIcon}>🎯</div>
                    <div className={styles.achievedText}>Active goal achieved!</div>
                  </div>
                ) : (
                  <div className={styles.goalRemaining}>
                    <div className={styles.remainingVal}>{remainingToActive} <span className={styles.remainingUnit}>kg to go</span></div>
                    <div className={styles.miniProgressBar}>
                      <div className={styles.miniProgressFill} style={{ width: '80%' }}></div> {/* simplified */}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.goalCardFinal}>
                <div className={styles.goalHeaderRow}>
                  <div className={styles.goalLabel}>Final Goal</div>
                  <div className={styles.goalTarget}>{finalGoal} kg</div>
                </div>
                <div className={styles.goalRemaining}>
                  <div className={styles.remainingVal}>
                    {finalGoal !== null && currentW !== null && currentW > finalGoal ? (currentW - finalGoal).toFixed(1) : '0.0'} <span className={styles.remainingUnit}>kg to go</span>
                  </div>
                  <div className={styles.miniProgressBar}>
                    <div className={styles.miniProgressFill} style={{ width: `${finalGoalProgress}%`, background: 'linear-gradient(90deg, #4ade80, #22c55e)' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* STATS STRIP */}
            <div className={styles.statsStrip}>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>7-Day Avg</div>
                <div className={styles.statBoxVal}>{avg7Day}</div>
              </div>
              <div className={styles.statDivider}></div>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>30-Day Avg</div>
                <div className={styles.statBoxVal}>{avg30Day}</div>
              </div>
              <div className={styles.statDivider}></div>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>Log Streak</div>
                <div className={styles.statBoxVal}>{streak} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>days</span></div>
              </div>
            </div>

          </div>
          
          {/* RIGHT COLUMN: Logs & Motivation */}
          <div className={styles.colRight}>
            
            {/* MOTIVATION */}
            <div className={styles.motivationCard}>
              <div className={styles.quoteMark}>"</div>
              <p className={styles.quoteText}>Consistency is the ultimate metric. Keep showing up for yourself, day after day.</p>
            </div>

            {/* TODAY'S LOG */}
            <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Today's Log</span>
            </div>
            
            <div className={styles.logSummaryCard}>
              <div className={styles.logGrid}>
                <div className={styles.logItem}>
                  <div className={styles.logIcon}>⚖️</div>
                  <div className={styles.logDetails}>
                    <div className={styles.logLabel}>Weight</div>
                    <div className={styles.logVal}>{log?.weight_kg ? `${log.weight_kg} kg` : 'Not logged'}</div>
                  </div>
                </div>
                
                <div className={styles.logItem}>
                  <div className={styles.logIcon}>🥗</div>
                  <div className={styles.logDetails}>
                    <div className={styles.logLabel}>Meals</div>
                    <div className={styles.logVal} style={{ textTransform: 'capitalize' }}>{log?.meal_status || 'Not logged'}</div>
                  </div>
                </div>

                <div className={styles.logItem}>
                  <div className={styles.logIcon}>💧</div>
                  <div className={styles.logDetails}>
                    <div className={styles.logLabel}>Water</div>
                    <div className={styles.logVal}>{log?.water_glasses != null ? `${log.water_glasses} glasses` : 'Not logged'}</div>
                  </div>
                </div>

                <div className={styles.logItem}>
                  <div className={styles.logIcon}>👟</div>
                  <div className={styles.logDetails}>
                    <div className={styles.logLabel}>Steps</div>
                    <div className={styles.logVal}>{log?.steps ? log.steps.toLocaleString() : 'Not logged'}</div>
                  </div>
                </div>

                <div className={styles.logItem}>
                  <div className={styles.logIcon}>
                    {getMoodEmoji(log?.mood)}
                  </div>
                  <div className={styles.logDetails}>
                    <div className={styles.logLabel}>Mood</div>
                    <div className={styles.logVal} style={{ textTransform: 'capitalize' }}>{log?.mood || 'Not logged'}</div>
                  </div>
                </div>
              </div>
              
              {!log && (
                <Link href="/log" className={styles.primaryActionBtn}>
                  Log Today's Data
                </Link>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
