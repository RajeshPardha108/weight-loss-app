"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { supabase } from "../../lib/supabase";

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
  const [logs, setLogs] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [goal, setGoal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [chartRange, setChartRange] = useState("all");
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, settingsRes, measurementsRes] = await Promise.all([
          supabase
            .from('daily_logs')
            .select('log_date, weight_kg, steps, water_glasses, meal_status')
            .order('log_date', { ascending: true }),
          supabase
            .from('user_settings')
            .select('goal_weight_kg')
            .eq('id', 1)
            .single(),
          supabase
            .from('body_measurements')
            .select('*')
            .order('measurement_date', { ascending: true })
        ]);
        
        if (logsRes.error) {
          console.error("Failed to fetch logs:", logsRes.error);
        } else if (logsRes.data) {
          setLogs(logsRes.data);
        }

        if (settingsRes.error) {
          console.error("Failed to fetch goal:", settingsRes.error);
        } else if (settingsRes.data && settingsRes.data.goal_weight_kg) {
          setGoal(Number(settingsRes.data.goal_weight_kg));
        }

        if (measurementsRes.error) {
          console.error("Failed to fetch measurements:", measurementsRes.error);
        } else if (measurementsRes.data) {
          setMeasurements(measurementsRes.data);
        }
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
        <div className={styles.mobileView}>
          <div className={styles.header}>
            <h1 className={styles.title}>Progress</h1>
            <Link href="/" className={styles.backBtn}>Back</Link>
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
        <div className={styles.mobileView}>
          <div className={styles.header}>
            <h1 className={styles.title}>Progress</h1>
            <Link href="/" className={styles.backBtn}>Back</Link>
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
  const weightLost = startingWeight - currentWeight;
  const remaining = goal !== null ? (currentWeight > goal ? currentWeight - goal : 0) : null;

  const todayDate = getLocalDateString();
  const msInDay = 24 * 60 * 60 * 1000;
  const todayTime = new Date(todayDate).getTime();
  const sevenDaysAgoTime = todayTime - (6 * msInDay);
  const thirtyDaysAgoTime = todayTime - (29 * msInDay);

  const last7DaysLogs = weightLogs.filter(log => {
    const logTime = parseLogDate(log.log_date).getTime();
    return logTime >= sevenDaysAgoTime && logTime <= todayTime;
  });

  const last30DaysLogs = weightLogs.filter(log => {
    const logTime = parseLogDate(log.log_date).getTime();
    return logTime >= thirtyDaysAgoTime && logTime <= todayTime;
  });

  const avg7Day = last7DaysLogs.length > 0 
    ? last7DaysLogs.reduce((acc, curr) => acc + curr.weight_kg, 0) / last7DaysLogs.length
    : null;

  const avg30Day = last30DaysLogs.length > 0 
    ? last30DaysLogs.reduce((acc, curr) => acc + curr.weight_kg, 0) / last30DaysLogs.length
    : null;

  const finalGoal = goal;
  let activeGoal = finalGoal;
  
  if (finalGoal !== null && startingWeight > finalGoal) {
    const referenceWeight = avg7Day !== null ? avg7Day : currentWeight;
    const milestoneStep = 2.5;
    let candidateGoal = Math.floor(startingWeight / milestoneStep) * milestoneStep;
    
    // Keep dropping the milestone by 2.5kg until we find a goal the user hasn't reached yet.
    while (candidateGoal >= referenceWeight && candidateGoal > finalGoal) {
      candidateGoal -= milestoneStep;
    }
    
    activeGoal = Math.max(finalGoal, candidateGoal);
  }

  let progressPct = (startingWeight !== activeGoal && activeGoal !== null) ? ((startingWeight - currentWeight) / (startingWeight - activeGoal)) * 100 : 100;
  progressPct = Math.max(0, Math.min(100, progressPct));

  const remainingToActive = activeGoal !== null ? (currentWeight > activeGoal ? currentWeight - activeGoal : 0) : null;
  const remainingToFinal = finalGoal !== null ? (currentWeight > finalGoal ? currentWeight - finalGoal : 0) : null;

  // --- INSIGHT CALCULATIONS ---
  let weightInsight = { icon: '➡️', title: 'Weight is holding steady', desc: 'Recent average is similar to longer-term average.' };
  if (avg7Day !== null && avg30Day !== null) {
    if (avg7Day < avg30Day - 0.2) weightInsight = { icon: '📉', title: 'Weight is trending down', desc: 'Recent average is lower than your longer-term average.' };
    else if (avg7Day > avg30Day + 0.2) weightInsight = { icon: '📈', title: 'Weight is trending up', desc: 'Recent average is higher than your longer-term average.' };
  }

  const stepsLogs = logs.filter(l => l.steps !== null && l.steps > 0);
  const avgSteps = stepsLogs.length > 0 ? Math.round(stepsLogs.reduce((acc, curr) => acc + curr.steps, 0) / stepsLogs.length) : null;

  const waterLogs = logs.filter(l => l.water_glasses !== null);
  const avgWater = waterLogs.length > 0 ? (waterLogs.reduce((acc, curr) => acc + curr.water_glasses, 0) / waterLogs.length).toFixed(1) : null;

  const mealLogs = logs.filter(l => l.meal_status !== null);
  const cleanMeals = mealLogs.filter(l => l.meal_status === 'clean').length;
  const mealPct = mealLogs.length > 0 ? Math.round((cleanMeals / mealLogs.length) * 100) : null;
  // -----------------------------

  // Chart Logic
  let chartLogs = weightLogs;
  if (chartRange !== "all" && weightLogs.length > 0) {
    const rangeDays = parseInt(chartRange, 10);
    const latestDateMs = parseLogDate(weightLogs[weightLogs.length - 1].log_date).getTime();
    const startDateMs = latestDateMs - (rangeDays * 24 * 60 * 60 * 1000);
    chartLogs = weightLogs.filter(log => parseLogDate(log.log_date).getTime() >= startDateMs);
  }

  const minHistoricalWeight = Math.min(...chartLogs.map(l => l.weight_kg));
  const maxHistoricalWeight = Math.max(...chartLogs.map(l => l.weight_kg));
  
  // Calculate unified Y domain
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
    
    let closestIdx = 0;
    let minDiff = Infinity;
    pointData.forEach((p, idx) => {
      const diff = Math.abs(p.x - xPct);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    setActivePointIndex(closestIdx);
  };

  return (
    <div className={styles.container}>
      <div className={styles.mobileView}>
        <div className={styles.header}>
          <h1 className={styles.title}>Progress</h1>
          <Link href="/" className={styles.backBtn}>Back</Link>
        </div>

        <div className={styles.content}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard} style={{ gridColumn: '1 / -1' }}>
              <div className={styles.statLabel}>Current</div>
              <div>
                <span className={styles.statValue}>{currentWeight.toFixed(1)}</span>
                <span className={styles.statUnit}>kg</span>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Active Goal</div>
              <div>
                <span className={styles.statValue}>{activeGoal !== null ? activeGoal.toFixed(1) : "--"}</span>
                <span className={styles.statUnit}>kg</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Final Goal</div>
              <div>
                <span className={styles.statValue}>{finalGoal !== null ? finalGoal.toFixed(1) : "--"}</span>
                <span className={styles.statUnit}>kg</span>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Rem. to Active</div>
              <div>
                <span className={styles.statValue}>{remainingToActive !== null ? remainingToActive.toFixed(1) : "--"}</span>
                <span className={styles.statUnit}>kg</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Rem. to Final</div>
              <div>
                <span className={styles.statValue}>{remainingToFinal !== null ? remainingToFinal.toFixed(1) : "--"}</span>
                <span className={styles.statUnit}>kg</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>7-Day Avg</div>
              <div>
                <span className={styles.statValue}>{avg7Day ? avg7Day.toFixed(1) : "--"}</span>
                <span className={styles.statUnit}>kg</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>30-Day Avg</div>
              <div>
                <span className={styles.statValue}>{avg30Day ? avg30Day.toFixed(1) : "--"}</span>
                <span className={styles.statUnit}>kg</span>
              </div>
            </div>
          </div>

          {activeGoal !== null && (
            <div className={styles.goalCard}>
              <div className={styles.goalHeader}>
                <span className={styles.goalTitle}>Active Goal Progress</span>
                <span className={styles.goalPercentage}>{progressPct.toFixed(0)}%</span>
              </div>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressBarFill} style={{ width: `${progressPct}%` }} />
              </div>
              <div className={styles.progressLabels}>
                <span>Start: <span className={styles.progressLabelValue}>{startingWeight.toFixed(1)}kg</span></span>
                <span>Current: <span className={styles.progressLabelValue}>{currentWeight.toFixed(1)}kg</span></span>
                <span>Active: <span className={styles.progressLabelValue}>{activeGoal}kg</span></span>
              </div>
            </div>
          )}

          <div className={styles.insightsContainer}>
            <div className={styles.chartTitle} style={{ marginBottom: '0.25rem' }}>Progress Insights</div>
            
            <div className={styles.insightCard}>
              <div className={styles.insightTitle}>{weightInsight.icon} {weightInsight.title}</div>
              <div className={styles.insightText}>{weightInsight.desc}</div>
            </div>
            
            {activeGoal !== null && remainingToActive !== null && (
              <div className={styles.insightCard}>
                <div className={styles.insightTitle}>🎯 You're {progressPct.toFixed(0)}% toward your active goal</div>
                <div className={styles.insightText}>{remainingToActive > 0 ? `${remainingToActive.toFixed(1)} kg remaining to reach ${activeGoal} kg.` : `You've reached your ${activeGoal} kg active goal!`}</div>
              </div>
            )}

            {avgSteps !== null && (
              <div className={styles.insightCard}>
                <div className={styles.insightTitle}>🚶 Activity</div>
                <div className={styles.insightText}>You're averaging {avgSteps.toLocaleString()} steps/day.</div>
              </div>
            )}

            {avgWater !== null && (
              <div className={styles.insightCard}>
                <div className={styles.insightTitle}>💧 Hydration</div>
                <div className={styles.insightText}>You're averaging {avgWater} L/day.</div>
              </div>
            )}

            {mealPct !== null && (
              <div className={styles.insightCard}>
                <div className={styles.insightTitle}>🥗 Meals</div>
                <div className={styles.insightText}>Clean meals on {mealPct}% of logged days.</div>
              </div>
            )}
          </div>

          <div className={styles.chartCard} style={{ userSelect: 'none', height: 'auto', paddingBottom: '1.25rem' }}>
            <div className={styles.chartHeader}>
              <div className={styles.chartTitle} style={{ marginBottom: 0 }}>Weight Trend</div>
              <select className={styles.rangeSelect} value={chartRange} onChange={(e) => { setChartRange(e.target.value); setActivePointIndex(null); }}>
                <option value="7">7 Days</option>
                <option value="15">15 Days</option>
                <option value="30">30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#64748b', marginBottom: '1.5rem' }}>
              🖐️ Drag across the chart to explore your trend
            </div>
            <div 
              className={styles.chartArea}
              ref={chartRef}
              onPointerDown={(e) => { setIsDragging(true); handlePointerMove(e); e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerMove={(e) => { if (isDragging || activePointIndex !== null) handlePointerMove(e); }}
              onPointerUp={(e) => { setIsDragging(false); e.currentTarget.releasePointerCapture(e.pointerId); }}
              onPointerCancel={(e) => { setIsDragging(false); setActivePointIndex(null); }}
              onPointerLeave={(e) => { if (!isDragging) setActivePointIndex(null); }}
              style={{ touchAction: 'none', cursor: 'crosshair', margin: '0 0.5rem', height: '200px', position: 'relative' }}
            >
              {chartLogs.length > 1 ? (
                <>
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                    {[chartMinWeight, chartMinWeight + (range/2), chartMaxWeight].map((w, i) => {
                      const y = getY(w);
                      return <line key={i} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
                    })}
                    {activeGoal !== null && goalY !== null && (
                      <line x1="0" y1={goalY} x2="100" y2={goalY} stroke="#10b981" strokeWidth="1" strokeDasharray="4" vectorEffect="non-scaling-stroke" />
                    )}
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      points={pointData.map(p => `${p.x},${p.y}`).join(" ")}
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {[chartMinWeight, chartMinWeight + (range/2), chartMaxWeight].map((w, i) => (
                      <div key={i} style={{ position: 'absolute', top: `${getY(w)}%`, left: 0, transform: 'translate(-10px, -50%)', fontSize: '0.65rem', color: '#64748b' }}>
                        {Math.round(w)}
                      </div>
                    ))}
                    {activeGoal !== null && goalY !== null && (
                      <div style={{ position: 'absolute', top: `${goalY}%`, left: 0, transform: 'translateY(-100%)', fontSize: '0.65rem', color: '#10b981', paddingTop: '2px' }}>Goal: {activeGoal}kg</div>
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
                        <div 
                          className={styles.chartTooltip}
                          style={{ 
                            left: `${pointData[activePointIndex].x}%`, 
                            top: `${pointData[activePointIndex].y}%`,
                            transform: `translate(${pointData[activePointIndex].x > 75 ? '-110%' : pointData[activePointIndex].x < 25 ? '10%' : '-50%'}, ${pointData[activePointIndex].y < 15 ? '20%' : '-120%'})` 
                          }}
                        >
                          <span className={styles.tooltipDate}>{pointData[activePointIndex].fullDateStr}</span>
                          <span className={styles.tooltipWeight}>
                            <span className={styles.tooltipDot}>●</span> Weight: {pointData[activePointIndex].weight.toFixed(1)} kg
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', position: 'absolute', bottom: '-1.5rem', left: 0, right: 0, color: '#64748b', fontSize: '0.7rem', pointerEvents: 'none' }}>
                    <span>{pointData[0].shortDateStr}</span>
                    {pointData.length > 2 && (
                      <span>{pointData[Math.floor((pointData.length - 1) / 2)].shortDateStr}</span>
                    )}
                    <span>{pointData[pointData.length - 1].shortDateStr}</span>
                  </div>
                </>
              ) : (
                <div style={{ color: "#94a3b8", fontSize: "0.875rem", textAlign: "center", marginTop: "2rem" }}>
                  Need more data for a trend line
                </div>
              )}
            </div>

            <div className={styles.dateSummary}>
              <div className={styles.dateBlock}>
                <div className={styles.dateValue}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  {chartLogs.length > 0 ? parseLogDate(chartLogs[0].log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "--"}
                </div>
                <div className={styles.dateLabel}>Start</div>
              </div>
              <div className={styles.dateBlock} style={{ alignItems: 'flex-end' }}>
                <div className={styles.dateValue}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  {chartLogs.length > 0 ? parseLogDate(chartLogs[chartLogs.length - 1].log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "--"}
                </div>
                <div className={styles.dateLabel}>Latest</div>
              </div>
            </div>

            {measurements.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <Link href="/body-progress" style={{ display: 'block', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '1rem', padding: '1rem', textAlign: 'center', textDecoration: 'none', color: '#38bdf8', fontWeight: 600, transition: 'all 0.2s ease' }}>
                  Body Progress →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
