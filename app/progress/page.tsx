"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { supabase } from "../../lib/supabase";
import { fetchUserGoals } from "../../lib/goals";

const getLocalDateString = () => {
  const dateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const localDate = new Date(dateStr);
  const y = localDate.getFullYear();
  const m = String(localDate.getMonth() + 1).padStart(2, '0');
  const d = String(localDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseLogDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-');
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
};

export default function Progress() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [goalObj, setGoalObj] = useState<{ activeGoal: number, finalGoal: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("weight");
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [chartRange, setChartRange] = useState("all");
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, goalsRes, measurementsRes] = await Promise.all([
          supabase
            .from('daily_logs')
            .select('log_date, weight_kg, steps, water_glasses, meal_status')
            .order('log_date', { ascending: true }),
          fetchUserGoals(),
          supabase
            .from('body_measurements')
            .select('*')
            .order('measurement_date', { ascending: true })
        ]);
        
        if (logsRes.data) setLogs(logsRes.data);
        setGoalObj(goalsRes);
        if (measurementsRes.data) setMeasurements(measurementsRes.data);
      } catch (err) {
        console.error("Unexpected error in fetchData:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.appContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>Progress</h1>
          </div>
          <div className={styles.emptyState}>Loading...</div>
        </div>
      </div>
    );
  }

  const weightLogs = logs.filter(l => l.weight_kg !== null);
  if (weightLogs.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.appContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>Progress</h1>
          </div>
          <div className={styles.emptyState}>
            <p>No weight data recorded yet.</p>
            <p>Log your first official weight to unlock your progress dashboard!</p>
          </div>
        </div>
      </div>
    );
  }

  const startingWeight = weightLogs[0].weight_kg;
  const currentWeight = weightLogs[weightLogs.length - 1].weight_kg;
  const bestWeight = Math.min(...weightLogs.map(l => l.weight_kg));
  const weightLost = startingWeight - currentWeight;

  const todayDate = getLocalDateString();
  const msInDay = 24 * 60 * 60 * 1000;
  const todayTime = new Date(todayDate).getTime();
  const sevenDaysAgoTime = todayTime - (6 * msInDay);
  const thirtyDaysAgoTime = todayTime - (29 * msInDay);

  const last7DaysLogs = weightLogs.filter(l => parseLogDate(l.log_date).getTime() >= sevenDaysAgoTime);
  const last30DaysLogs = weightLogs.filter(l => parseLogDate(l.log_date).getTime() >= thirtyDaysAgoTime);

  const avg7Day = last7DaysLogs.length > 0 ? (last7DaysLogs.reduce((acc, curr) => acc + curr.weight_kg, 0) / last7DaysLogs.length).toFixed(1) : "--";
  const avg30Day = last30DaysLogs.length > 0 ? (last30DaysLogs.reduce((acc, curr) => acc + curr.weight_kg, 0) / last30DaysLogs.length).toFixed(1) : "--";

  const activeGoal = goalObj?.activeGoal ?? null;
  const finalGoal = goalObj?.finalGoal ?? null;

  let progressPct = (startingWeight !== activeGoal && activeGoal !== null) ? ((startingWeight - currentWeight) / (startingWeight - activeGoal)) * 100 : 100;
  progressPct = Math.max(0, Math.min(100, progressPct));

  const remainingToActive = activeGoal !== null ? (currentWeight > activeGoal ? currentWeight - activeGoal : 0) : null;
  const remainingToFinal = finalGoal !== null ? (currentWeight > finalGoal ? currentWeight - finalGoal : 0) : null;

  let weightInsight = { icon: '➡️', title: 'Weight holding steady', desc: 'Recent average is similar to longer-term average.' };
  if (avg7Day !== "--" && avg30Day !== "--") {
    if (parseFloat(avg7Day) < parseFloat(avg30Day) - 0.2) weightInsight = { icon: '📉', title: 'Weight trending down', desc: 'Recent average is lower than your longer-term average.' };
    else if (parseFloat(avg7Day) > parseFloat(avg30Day) + 0.2) weightInsight = { icon: '📈', title: 'Weight trending up', desc: 'Recent average is higher than your longer-term average.' };
  }

  const stepsLogs = logs.filter(l => l.steps !== null && l.steps > 0);
  const avgSteps = stepsLogs.length > 0 ? Math.round(stepsLogs.reduce((acc, curr) => acc + curr.steps, 0) / stepsLogs.length) : null;
  const waterLogs = logs.filter(l => l.water_glasses !== null);
  const avgWater = waterLogs.length > 0 ? (waterLogs.reduce((acc, curr) => acc + curr.water_glasses, 0) / waterLogs.length).toFixed(1) : null;
  const mealLogs = logs.filter(l => l.meal_status !== null);
  const cleanMeals = mealLogs.filter(l => l.meal_status === 'clean').length;
  const mealPct = mealLogs.length > 0 ? Math.round((cleanMeals / mealLogs.length) * 100) : null;

  // Chart Logic
  let chartLogs = weightLogs;
  if (chartRange !== "all" && weightLogs.length > 0) {
    const rangeDays = parseInt(chartRange, 10);
    const latestDateMs = parseLogDate(weightLogs[weightLogs.length - 1].log_date).getTime();
    const startDateMs = latestDateMs - (rangeDays * msInDay);
    chartLogs = weightLogs.filter(log => parseLogDate(log.log_date).getTime() >= startDateMs);
  }

  const minHistoricalWeight = chartLogs.length > 0 ? Math.min(...chartLogs.map(l => l.weight_kg)) : currentWeight;
  const maxHistoricalWeight = chartLogs.length > 0 ? Math.max(...chartLogs.map(l => l.weight_kg)) : currentWeight;
  
  const chartMinWeight = activeGoal !== null ? Math.floor(Math.min(minHistoricalWeight, activeGoal)) - 2 : minHistoricalWeight - 2;
  const chartMaxWeight = activeGoal !== null ? Math.ceil(Math.max(maxHistoricalWeight, activeGoal)) + 2 : maxHistoricalWeight + 2;
  const range = chartMaxWeight - chartMinWeight;
  const getY = (val: number) => 100 - (((val - chartMinWeight) / range) * 100);

  const pointData = chartLogs.map((log, i) => {
    const xPct = chartLogs.length > 1 ? (i / (chartLogs.length - 1)) * 100 : 50;
    const parsedDate = parseLogDate(log.log_date);
    return {
      index: i,
      x: xPct,
      y: getY(log.weight_kg),
      weight: log.weight_kg,
      shortDateStr: parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDateStr: parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
  });
  const goalY = activeGoal !== null ? getY(activeGoal) : null;

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!chartRef.current || pointData.length === 0) return;
    const rect = chartRef.current.getBoundingClientRect();
    const xPos = e.clientX - rect.left;
    const xPct = (xPos / rect.width) * 100;
    let closestIdx = 0; let minDiff = Infinity;
    pointData.forEach((p, idx) => {
      const diff = Math.abs(p.x - xPct);
      if (diff < minDiff) { minDiff = diff; closestIdx = idx; }
    });
    setActivePointIndex(closestIdx);
  };

  return (
    <div className={styles.container}>
      <div className={styles.appContainer}>
        
        {/* HEADER */}
        <div className={styles.header}>
          <h1 className={styles.title}>Progress</h1>
        </div>

        {/* SEGMENTED CONTROL */}
        <div className={styles.segmentedControl}>
          <button className={`${styles.segmentBtn} ${activeTab === 'weight' ? styles.active : ''}`} onClick={() => setActiveTab('weight')}>Weight</button>
          <button className={`${styles.segmentBtn} ${activeTab === 'measurements' ? styles.active : ''}`} onClick={() => router.push('/body-progress')}>Measurements</button>
          <button className={`${styles.segmentBtn} ${activeTab === 'trends' ? styles.active : ''}`} onClick={() => setActiveTab('trends')}>Trends</button>
        </div>

        <div className={styles.gridDesktop}>
          
          {/* LEFT COLUMN: Main Chart & Goals */}
          <div className={styles.colLeft}>
            
            {/* HERO CHART CARD */}
            <div className={styles.chartHeroCard}>
              <div className={styles.chartHeader}>
                <div>
                  <div className={styles.chartHeroLabel}>Current Weight</div>
                  <div className={styles.chartHeroWeight}>{currentWeight.toFixed(1)} <span className={styles.unit}>kg</span></div>
                </div>
                <select className={styles.rangeSelect} value={chartRange} onChange={(e) => { setChartRange(e.target.value); setActivePointIndex(null); }}>
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <div 
                className={styles.chartArea} ref={chartRef}
                onPointerDown={(e) => { setIsDragging(true); handlePointerMove(e); e.currentTarget.setPointerCapture(e.pointerId); }}
                onPointerMove={(e) => { if (isDragging || activePointIndex !== null) handlePointerMove(e); }}
                onPointerUp={(e) => { setIsDragging(false); e.currentTarget.releasePointerCapture(e.pointerId); }}
                onPointerCancel={() => { setIsDragging(false); setActivePointIndex(null); }}
                onPointerLeave={() => { if (!isDragging) setActivePointIndex(null); }}
              >
                {chartLogs.length > 1 ? (
                  <>
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                      {[chartMinWeight, chartMinWeight + (range/2), chartMaxWeight].map((w, i) => {
                        const y = getY(w);
                        return <line key={i} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
                      })}
                      {activeGoal !== null && goalY !== null && (
                        <line x1="0" y1={goalY} x2="100" y2={goalY} stroke="#4ade80" strokeWidth="1" strokeDasharray="4" vectorEffect="non-scaling-stroke" />
                      )}
                      <polyline
                        fill="none" stroke="#38bdf8" strokeWidth="2"
                        points={pointData.map(p => `${p.x},${p.y}`).join(" ")}
                        vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                      {activeGoal !== null && goalY !== null && (
                        <div style={{ position: 'absolute', top: `${goalY}%`, left: 0, transform: 'translateY(-100%)', fontSize: '0.65rem', color: '#4ade80', paddingTop: '2px' }}>Goal: {activeGoal}kg</div>
                      )}
                      {pointData.map((p) => {
                        const isActive = activePointIndex === p.index;
                        return (
                          <div key={p.index} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%` }}>
                            <div style={{ 
                              position: 'absolute', transform: 'translate(-50%, -50%)',
                              width: isActive ? '8px' : '4px', height: isActive ? '8px' : '4px', 
                              backgroundColor: isActive ? '#ffffff' : '#38bdf8', borderRadius: '50%',
                              boxShadow: isActive ? '0 0 8px #ffffff' : 'none', transition: 'all 0.1s ease'
                            }} />
                          </div>
                        )
                      })}
                      {activePointIndex !== null && pointData[activePointIndex] && (
                        <>
                          <div className={styles.crosshairLine} style={{ left: `${pointData[activePointIndex].x}%` }} />
                          <div className={styles.chartTooltip} style={{ left: `${pointData[activePointIndex].x}%`, top: `${pointData[activePointIndex].y}%`, transform: `translate(${pointData[activePointIndex].x > 75 ? '-110%' : pointData[activePointIndex].x < 25 ? '10%' : '-50%'}, ${pointData[activePointIndex].y < 15 ? '20%' : '-120%'})` }}>
                            <span className={styles.tooltipDate}>{pointData[activePointIndex].fullDateStr}</span>
                            <span className={styles.tooltipWeight}><span className={styles.tooltipDot}>●</span> {pointData[activePointIndex].weight.toFixed(1)} kg</span>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyChart}>Need more data for a trend line</div>
                )}
              </div>
            </div>

            {/* YOUR GOALS CARDS */}
            <div className={styles.sectionHeader}>Your Goals</div>
            <div className={styles.goalsGrid}>
              <div className={styles.goalCard}>
                <div className={styles.goalLabel}>Active Goal</div>
                <div className={styles.goalValue}>{activeGoal ? `${activeGoal.toFixed(1)} kg` : '--'}</div>
                <div className={styles.goalRemaining}>
                  {activeGoal && currentWeight <= activeGoal 
                    ? <span className={styles.achievedText}>Goal achieved! 🎯</span> 
                    : `${remainingToActive ? remainingToActive.toFixed(1) : '--'} kg to go`}
                </div>
              </div>
              <div className={styles.goalCard}>
                <div className={styles.goalLabel}>Final Goal</div>
                <div className={styles.goalValue}>{finalGoal ? `${finalGoal.toFixed(1)} kg` : '--'}</div>
                <div className={styles.goalRemaining}>
                  {finalGoal && currentWeight <= finalGoal 
                    ? <span className={styles.achievedText}>Goal achieved! 🏆</span> 
                    : `${remainingToFinal ? remainingToFinal.toFixed(1) : '--'} kg to go`}
                </div>
              </div>
            </div>

          </div>
          
          {/* RIGHT COLUMN: Avgs & Insights */}
          <div className={styles.colRight}>
            
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
                <div className={styles.statBoxLabel}>Best Weight</div>
                <div className={styles.statBoxVal} style={{ color: '#4ade80' }}>{bestWeight.toFixed(1)}</div>
              </div>
            </div>

            {/* INSIGHTS */}
            <div className={styles.sectionHeader}>Progress Insights</div>
            <div className={styles.insightsList}>
              <div className={styles.insightItem}>
                <div className={styles.insightIcon}>{weightInsight.icon}</div>
                <div>
                  <div className={styles.insightTitle}>{weightInsight.title}</div>
                  <div className={styles.insightDesc}>{weightInsight.desc}</div>
                </div>
              </div>
              
              {avgSteps !== null && (
                <div className={styles.insightItem}>
                  <div className={styles.insightIcon}>🚶</div>
                  <div>
                    <div className={styles.insightTitle}>Activity</div>
                    <div className={styles.insightDesc}>Averaging {avgSteps.toLocaleString()} steps/day.</div>
                  </div>
                </div>
              )}

              {avgWater !== null && (
                <div className={styles.insightItem}>
                  <div className={styles.insightIcon}>💧</div>
                  <div>
                    <div className={styles.insightTitle}>Hydration</div>
                    <div className={styles.insightDesc}>Averaging {avgWater} L/day.</div>
                  </div>
                </div>
              )}

              {mealPct !== null && (
                <div className={styles.insightItem}>
                  <div className={styles.insightIcon}>🥗</div>
                  <div>
                    <div className={styles.insightTitle}>Meals</div>
                    <div className={styles.insightDesc}>Clean meals on {mealPct}% of logged days.</div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* BOTTOM NAV */}
        <div className={styles.bottomNavWrapper}>
          <div className={styles.bottomNav}>
            <Link href="/" className={styles.navItem}>
              <span className={styles.navIcon}>🏠</span>
              <span className={styles.navLabel}>Home</span>
            </Link>
            <Link href="/progress" className={`${styles.navItem} ${styles.active}`}>
              <span className={styles.navIcon}>📈</span>
              <span className={styles.navLabel}>Progress</span>
            </Link>
            <Link href="/log" className={styles.navItemCenter}>
              <div className={styles.navPlus}>+</div>
            </Link>
            <Link href="/body-progress" className={styles.navItem}>
              <span className={styles.navIcon}>🧍‍♂️</span>
              <span className={styles.navLabel}>Body</span>
            </Link>
            <Link href="/journal" className={styles.navItem}>
              <span className={styles.navIcon}>📝</span>
              <span className={styles.navLabel}>Journal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
