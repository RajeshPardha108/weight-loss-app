"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { supabase } from "../../lib/supabase";
import { fetchUserGoals } from "../../lib/goals";
import {
  computeFullAnalytics,
  computeSmartAnalytics,
  getLocalDateString,
  parseLogDate,
  type DailyLog,
  type BodyMeasurement,
  type AnalyticsSnapshot,
  type TrendDirection,
} from "../../lib/analytics";
import { Calendar, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

const getMoodEmoji = (mood: string): string => {
  if (mood === 'good') return '😄';
  if (mood === 'neutral') return '😐';
  if (mood === 'bad') return '😞';
  return mood;
};

const getTrendLabel = (trend: TrendDirection, context: 'weight' | 'activity' | 'neutral'): { icon: string; text: string; className: string } => {
  switch (trend) {
    case 'losing':
      return context === 'weight'
        ? { icon: '↓', text: 'Trending down', className: styles.trendDown }
        : { icon: '↓', text: 'Decreasing', className: styles.trendUp };
    case 'gaining':
      return context === 'weight'
        ? { icon: '↑', text: 'Trending up', className: styles.trendUp }
        : { icon: '↑', text: 'Increasing', className: styles.trendDown };
    case 'stable':
      return { icon: '→', text: 'Stable', className: styles.trendStable };
    default:
      return { icon: '·', text: 'Not enough data', className: styles.trendNA };
  }
};

export default function Progress() {
  const router = useRouter();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [goalObj, setGoalObj] = useState<{ activeGoal: number, finalGoal: number } | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
            .select('id, log_date, weight_kg, steps, water_glasses, meal_status, mood, weight_before_toilet, weight_after_toilet')
            .order('log_date', { ascending: true }),
          fetchUserGoals(),
          supabase
            .from('body_measurements')
            .select('*')
            .order('measurement_date', { ascending: true })
        ]);
        
        if (logsRes.error) throw logsRes.error;
        if (measurementsRes.error) throw measurementsRes.error;

        const fetchedLogs: DailyLog[] = logsRes.data || [];
        const fetchedMeasurements: BodyMeasurement[] = measurementsRes.data || [];

        setLogs(fetchedLogs);
        setGoalObj(goalsRes);
        setMeasurements(fetchedMeasurements);

        // Compute analytics from fetched data
        const snapshot = computeFullAnalytics(fetchedLogs, fetchedMeasurements);
        setAnalytics(snapshot);
      } catch (err: any) {
        console.error("Unexpected error in fetchData:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.appContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>Progress</h1>
          </div>
          <div className={styles.emptyState}>
            <p style={{ color: '#f87171' }}>Error: {error}</p>
            <button onClick={() => window.location.reload()} className={styles.primaryActionBtn} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

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

  const weightLogs = logs.filter(l => l.weight_kg !== null && l.weight_kg !== undefined);
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

  // ---- Existing chart/goal calculations (preserved) ----
  const startingWeight = Number(weightLogs[0].weight_kg);
  const currentWeight = Number(weightLogs[weightLogs.length - 1].weight_kg);
  const bestWeight = Math.min(...weightLogs.map(l => Number(l.weight_kg)));
  const weightLost = startingWeight - currentWeight;

  const todayDate = getLocalDateString();
  const msInDay = 24 * 60 * 60 * 1000;
  const todayTime = parseLogDate(todayDate).getTime();

  const activeGoal = goalObj?.activeGoal ?? null;
  const finalGoal = goalObj?.finalGoal ?? null;

  let progressPct = (startingWeight !== activeGoal && activeGoal !== null) ? ((startingWeight - currentWeight) / (startingWeight - activeGoal)) * 100 : 100;
  progressPct = Math.max(0, Math.min(100, progressPct));

  const remainingToActive = activeGoal !== null ? (currentWeight > activeGoal ? currentWeight - activeGoal : 0) : null;
  const remainingToFinal = finalGoal !== null ? (currentWeight > finalGoal ? currentWeight - finalGoal : 0) : null;

  // Analytics shortcuts
  const wa = analytics?.weight;
  const sa = analytics?.steps;
  const wta = analytics?.water;
  const ma = analytics?.meals;
  const moa = analytics?.mood;
  const ba = analytics?.bodyMeasurements;
  const na = analytics?.nutrition;

  let weightInsight = { icon: '➡️', title: 'Weight holding steady', desc: 'Recent average is similar to longer-term average.' };
  if (wa && wa.trendDirection === 'losing') {
    weightInsight = { icon: '📉', title: 'Weight trending down', desc: 'Recent average is lower than your longer-term average.' };
  } else if (wa && wa.trendDirection === 'gaining') {
    weightInsight = { icon: '📈', title: 'Weight trending up', desc: 'Recent average is higher than your longer-term average.' };
  }

  // Chart Logic (preserved)
  const recent7Logs = weightLogs.slice(-7);
  const fallbackAvg7 = recent7Logs.length > 0 ? (recent7Logs.reduce((acc, c) => acc + Number(c.weight_kg), 0) / recent7Logs.length) : null;
  const recent30Logs = weightLogs.slice(-30);
  const fallbackAvg30 = recent30Logs.length > 0 ? (recent30Logs.reduce((acc, c) => acc + Number(c.weight_kg), 0) / recent30Logs.length) : null;
  const displayAvg7 = wa?.average7d ?? fallbackAvg7;
  const displayAvg30 = wa?.average30d ?? fallbackAvg30;

  const stepLogs = logs.filter(l => l.steps !== null && l.steps !== undefined);
  const recentSteps = stepLogs.slice(-7);
  const fallbackStepsAvg7 = recentSteps.length > 0 ? Math.round(recentSteps.reduce((acc, c) => acc + Number(c.steps), 0) / recentSteps.length) : null;
  const displayStepsAvg7 = sa?.average7d ?? fallbackStepsAvg7;

  const waterLogs = logs.filter(l => l.water_glasses !== null && l.water_glasses !== undefined);
  const recentWater = waterLogs.slice(-7);
  const fallbackWaterAvg7 = recentWater.length > 0 ? +(recentWater.reduce((acc, c) => acc + Number(c.water_glasses), 0) / recentWater.length).toFixed(1) : null;
  const displayWaterAvg7 = wta?.average7d ?? fallbackWaterAvg7;

  let chartLogs = weightLogs;
  if (chartRange !== "all" && weightLogs.length > 0) {
    const rangeDays = parseInt(chartRange, 10);
    const latestDateMs = parseLogDate(weightLogs[weightLogs.length - 1].log_date).getTime();
    const startDateMs = latestDateMs - (rangeDays * msInDay);
    chartLogs = weightLogs.filter(log => parseLogDate(log.log_date).getTime() >= startDateMs);
  }

  const minHistoricalWeight = chartLogs.length > 0 ? Math.min(...chartLogs.map(l => Number(l.weight_kg))) : currentWeight;
  const maxHistoricalWeight = chartLogs.length > 0 ? Math.max(...chartLogs.map(l => Number(l.weight_kg))) : currentWeight;
  
  const chartMinWeight = activeGoal !== null ? Math.floor(Math.min(minHistoricalWeight, activeGoal)) - 2 : minHistoricalWeight - 2;
  const chartMaxWeight = activeGoal !== null ? Math.ceil(Math.max(maxHistoricalWeight, activeGoal)) + 2 : maxHistoricalWeight + 2;
  const range = Math.max(1, chartMaxWeight - chartMinWeight);
  const getY = (val: number) => 100 - (((val - chartMinWeight) / range) * 100);

  const pointData = chartLogs.map((log, i) => {
    const xPct = chartLogs.length > 1 ? (i / (chartLogs.length - 1)) * 100 : 50;
    const parsedDate = parseLogDate(log.log_date);
    return {
      index: i,
      x: xPct,
      y: getY(Number(log.weight_kg)),
      weight: Number(log.weight_kg),
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

  const smartReport = computeSmartAnalytics(logs, activeGoal, finalGoal);
  const { activeGoalForecast, finalGoalForecast, plateau, weeklyCheckIn } = smartReport;

  return (
    <div className={styles.container}>
      <div className={styles.appContainer}>
        
        {/* HEADER */}
        <div className={styles.header}>
          <h1 className={styles.title}>Progress</h1>
          {smartReport.weeklyRateKg !== null && (
            <div className={styles.paceBadgeHeader}>
              Pace: {smartReport.weeklyRateKg > 0 ? `+${smartReport.weeklyRateKg.toFixed(2)}` : smartReport.weeklyRateKg.toFixed(2)} kg/wk
            </div>
          )}
        </div>

        <div className={styles.gridDesktop}>
          
          {/* LEFT COLUMN: Main Chart, Goal Forecasts & Weekly Check-In */}
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

            {/* YOUR GOALS & FORECAST CARDS */}
            <div className={styles.sectionHeader}>Goal Forecast</div>
            <div className={styles.goalsGrid}>
              <div className={styles.goalCard}>
                <div className={styles.goalLabel}>Active Goal</div>
                <div className={styles.goalValue}>{activeGoal ? `${activeGoal.toFixed(1)} kg` : '--'}</div>
                <div className={styles.goalRemaining}>
                  {activeGoal && currentWeight <= activeGoal 
                    ? <span className={styles.achievedText}>Goal achieved! 🎯</span> 
                    : `${remainingToActive ? remainingToActive.toFixed(1) : '--'} kg to go`}
                </div>
                <div className={styles.goalForecastLine}>
                  <Calendar size={12} />
                  {activeGoalForecast.status === 'on_track' || activeGoalForecast.status === 'slow_pace' ? (
                    <span>Est. <strong>{activeGoalForecast.estimatedDateFormatted}</strong> (~{activeGoalForecast.estimatedDays}d)</span>
                  ) : activeGoalForecast.isAchieved ? (
                    <span>Completed</span>
                  ) : (
                    <span>{activeGoalForecast.estimatedDateFormatted || 'Needs 7d trend'}</span>
                  )}
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
                <div className={styles.goalForecastLine}>
                  <Calendar size={12} />
                  {finalGoalForecast.status === 'on_track' || finalGoalForecast.status === 'slow_pace' ? (
                    <span>Est. <strong>{finalGoalForecast.estimatedDateFormatted}</strong> (~{Math.ceil((finalGoalForecast.estimatedDays || 7) / 7)}w)</span>
                  ) : finalGoalForecast.isAchieved ? (
                    <span>Completed</span>
                  ) : (
                    <span>{finalGoalForecast.estimatedDateFormatted || 'Needs 7d trend'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* PLATEAU DETECTOR STATUS CARD */}
            <div className={plateau.isPlateau ? styles.plateauAlertBox : styles.plateauNormalBox}>
              <div className={styles.plateauBoxTop}>
                <div className={styles.plateauBoxTitleRow}>
                  {plateau.isPlateau ? (
                    <AlertTriangle size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
                  ) : (
                    <CheckCircle2 size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
                  )}
                  <span className={styles.plateauBoxTitle}>
                    {plateau.isPlateau ? 'Plateau Detected' : 'Plateau Monitor: Clear'}
                  </span>
                </div>
                {plateau.isPlateau && (
                  <Link
                    href={`/coach?role=strategist&q=${encodeURIComponent(plateau.coachPrompt)}`}
                    className={styles.plateauBoxAction}
                  >
                    <span>Get Plan</span>
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>
              <p className={styles.plateauBoxDesc}>{plateau.message}</p>
            </div>

            {/* WEEKLY CHECK-IN COMPARISON CARD */}
            {weeklyCheckIn.hasEnoughData && (
              <div className={styles.weeklySummaryCard}>
                <div className={styles.weeklySummaryHeader}>
                  <div>
                    <div className={styles.weeklySummaryTitle}>Weekly Check-In Comparison</div>
                    <div className={styles.weeklySummarySub}>Last 7 days ({weeklyCheckIn.thisWeekRangeLabel}) vs. previous 7 days</div>
                  </div>
                  <span className={styles.weeklySummaryCount}>{weeklyCheckIn.daysLoggedThisWeek}/7 days</span>
                </div>
                <div className={styles.weeklySummaryGrid}>
                  <div className={styles.weeklySummaryCell}>
                    <span className={styles.weeklyCellLabel}>Weight Avg</span>
                    <span className={styles.weeklyCellValue}>
                      {weeklyCheckIn.weight.thisWeekAvg !== null ? `${weeklyCheckIn.weight.thisWeekAvg} kg` : '--'}
                    </span>
                    <span className={styles.weeklyCellDelta}>
                      {weeklyCheckIn.weight.delta !== null
                        ? `${weeklyCheckIn.weight.delta > 0 ? '+' : ''}${weeklyCheckIn.weight.delta} kg vs last wk`
                        : 'No prior week'}
                    </span>
                  </div>
                  <div className={styles.weeklySummaryCell}>
                    <span className={styles.weeklyCellLabel}>Daily Steps</span>
                    <span className={styles.weeklyCellValue}>
                      {weeklyCheckIn.steps.thisWeekAvg !== null ? weeklyCheckIn.steps.thisWeekAvg.toLocaleString() : '--'}
                    </span>
                    <span className={styles.weeklyCellDelta}>
                      {weeklyCheckIn.steps.delta !== null
                        ? `${weeklyCheckIn.steps.delta > 0 ? '+' : ''}${weeklyCheckIn.steps.delta.toLocaleString()} vs last wk`
                        : 'No prior week'}
                    </span>
                  </div>
                  <div className={styles.weeklySummaryCell}>
                    <span className={styles.weeklyCellLabel}>Hydration</span>
                    <span className={styles.weeklyCellValue}>
                      {weeklyCheckIn.water.thisWeekAvg !== null ? `${weeklyCheckIn.water.thisWeekAvg}` : '--'}
                    </span>
                    <span className={styles.weeklyCellDelta}>
                      {weeklyCheckIn.water.delta !== null
                        ? `${weeklyCheckIn.water.delta > 0 ? '+' : ''}${weeklyCheckIn.water.delta} vs last wk`
                        : 'No prior week'}
                    </span>
                  </div>
                  <div className={styles.weeklySummaryCell}>
                    <span className={styles.weeklyCellLabel}>Clean Meals</span>
                    <span className={styles.weeklyCellValue}>
                      {weeklyCheckIn.cleanMeals.thisWeekPct !== null ? `${weeklyCheckIn.cleanMeals.thisWeekPct}%` : '--'}
                    </span>
                    <span className={styles.weeklyCellDelta}>
                      {weeklyCheckIn.cleanMeals.deltaPct !== null
                        ? `${weeklyCheckIn.cleanMeals.deltaPct > 0 ? '+' : ''}${weeklyCheckIn.cleanMeals.deltaPct}% vs last wk`
                        : 'No prior week'}
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
          
          {/* RIGHT COLUMN: Stats, Insights & Analytics */}
          <div className={styles.colRight}>
            
            {/* STATS STRIP — uses analytics with robust fallback */}
            <div className={styles.statsStrip}>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>Recent 7D Avg</div>
                <div className={styles.statBoxVal}>{displayAvg7 !== null && displayAvg7 !== undefined ? displayAvg7.toFixed(1) : '--'}</div>
              </div>
              <div className={styles.statDivider}></div>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>Recent 30D Avg</div>
                <div className={styles.statBoxVal}>{displayAvg30 !== null && displayAvg30 !== undefined ? displayAvg30.toFixed(1) : '--'}</div>
              </div>
              <div className={styles.statDivider}></div>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>Best Weight</div>
                <div className={styles.statBoxVal} style={{ color: '#4ade80' }}>{bestWeight.toFixed(1)}</div>
              </div>
            </div>

            {/* INSIGHTS — uses analytics for trend */}
            <div className={styles.sectionHeader}>Progress Insights</div>
            <div className={styles.insightsList}>
              <div className={styles.insightItem}>
                <div className={styles.insightIcon}>{weightInsight.icon}</div>
                <div>
                  <div className={styles.insightTitle}>{weightInsight.title}</div>
                  <div className={styles.insightDesc}>{weightInsight.desc}</div>
                </div>
              </div>
              
              {displayStepsAvg7 !== null && (
                <div className={styles.insightItem}>
                  <div className={styles.insightIcon}>🚶</div>
                  <div>
                    <div className={styles.insightTitle}>Activity</div>
                    <div className={styles.insightDesc}>Averaging {displayStepsAvg7.toLocaleString()} steps/day.</div>
                  </div>
                </div>
              )}

              {displayWaterAvg7 !== null && (
                <div className={styles.insightItem}>
                  <div className={styles.insightIcon}>💧</div>
                  <div>
                    <div className={styles.insightTitle}>Hydration</div>
                    <div className={styles.insightDesc}>Averaging {displayWaterAvg7} glasses/day.</div>
                  </div>
                </div>
              )}

              {ma && ma.cleanPercentage !== null && (
                <div className={styles.insightItem}>
                  <div className={styles.insightIcon}>🥗</div>
                  <div>
                    <div className={styles.insightTitle}>Meals</div>
                    <div className={styles.insightDesc}>Clean meals on {ma.cleanPercentage}% of logged days.</div>
                  </div>
                </div>
              )}
            </div>

            {/* ======================================= */}
            {/* ANALYTICS SUMMARY — New Section         */}
            {/* ======================================= */}
            <div className={styles.analyticsSectionHeader}>Analytics Summary</div>
            <div className={styles.analyticsSubtitle}>Factual metrics from your tracking data</div>

            <div className={styles.analyticsGrid}>

              {/* Weight Card */}
              {wa && wa.latestWeight !== null && (
                <div className={styles.analyticsCard}>
                  <div className={styles.analyticsCardIcon}>⚖️</div>
                  <div className={styles.analyticsCardLabel}>Weight</div>
                  <div className={styles.analyticsCardValue}>{wa.latestWeight.toFixed(1)} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>kg</span></div>
                  {wa.absoluteChange !== null && (
                    <div className={styles.analyticsCardSub}>
                      {wa.absoluteChange > 0 ? '+' : ''}{wa.absoluteChange.toFixed(1)} kg total
                    </div>
                  )}
                  {(() => {
                    const t = getTrendLabel(wa.trendDirection, 'weight');
                    return <div className={`${styles.trendBadge} ${t.className}`}>{t.icon} {t.text}</div>;
                  })()}
                </div>
              )}

              {/* Steps Card */}
              {sa && sa.daysWithData > 0 && (
                <div className={styles.analyticsCard}>
                  <div className={styles.analyticsCardIcon}>👟</div>
                  <div className={styles.analyticsCardLabel}>Steps</div>
                  <div className={styles.analyticsCardValue}>
                    {sa.average7d !== null ? sa.average7d.toLocaleString() : '--'}
                    <span style={{ fontSize: '0.6rem', color: '#64748b' }}> /day</span>
                  </div>
                  <div className={styles.analyticsCardSub}>
                    {sa.consistencyPct !== null ? `${sa.consistencyPct}% consistency (30d)` : `${sa.daysWithData} days tracked`}
                  </div>
                  {(() => {
                    const t = getTrendLabel(sa.trendDirection, 'activity');
                    return <div className={`${styles.trendBadge} ${t.className}`}>{t.icon} {t.text}</div>;
                  })()}
                </div>
              )}

              {/* Water Card */}
              {wta && wta.daysWithData > 0 && (
                <div className={styles.analyticsCard}>
                  <div className={styles.analyticsCardIcon}>💧</div>
                  <div className={styles.analyticsCardLabel}>Water</div>
                  <div className={styles.analyticsCardValue}>
                    {wta.average7d !== null ? wta.average7d : '--'}
                    <span style={{ fontSize: '0.6rem', color: '#64748b' }}> glasses/day</span>
                  </div>
                  <div className={styles.analyticsCardSub}>
                    {wta.consistencyPct !== null ? `${wta.consistencyPct}% consistency (30d)` : `${wta.daysWithData} days tracked`}
                  </div>
                </div>
              )}

              {/* Meals Card */}
              {ma && ma.daysWithMealStatus > 0 && (
                <div className={styles.analyticsCard}>
                  <div className={styles.analyticsCardIcon}>🥗</div>
                  <div className={styles.analyticsCardLabel}>Meals</div>
                  <div className={styles.analyticsCardValue}>
                    {ma.cleanPercentage !== null ? `${ma.cleanPercentage}%` : '--'}
                    <span style={{ fontSize: '0.6rem', color: '#64748b' }}> clean</span>
                  </div>
                  <div className={styles.analyticsCardSub}>
                    {ma.cleanDays} clean · {ma.cheatDays} cheat · {ma.daysWithMealStatus} total
                  </div>
                </div>
              )}

              {/* Mood Card */}
              {moa && moa.daysWithMood > 0 && (
                <div className={styles.analyticsCard}>
                  <div className={styles.analyticsCardIcon}>🧠</div>
                  <div className={styles.analyticsCardLabel}>Mood</div>
                  <div className={styles.analyticsCardValue}>
                    {moa.mostCommonMood ? getMoodEmoji(moa.mostCommonMood) : '--'}
                  </div>
                  <div className={styles.analyticsCardSub}>
                    Most common · {moa.daysWithMood} days tracked
                  </div>
                  {moa.recentMoods.length > 0 && (
                    <div className={styles.moodRow}>
                      {moa.recentMoods.map((m, i) => (
                        <span key={i} className={styles.moodDot} title={m.date}>{getMoodEmoji(m.mood)}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Nutrition Card — only if data exists */}
              {na && na.daysWithData > 0 && (
                <div className={styles.analyticsCard}>
                  <div className={styles.analyticsCardIcon}>🔥</div>
                  <div className={styles.analyticsCardLabel}>Nutrition</div>
                  <div className={styles.analyticsCardValue}>
                    {na.averageDaily.calories !== null ? na.averageDaily.calories.toLocaleString() : '--'}
                    <span style={{ fontSize: '0.6rem', color: '#64748b' }}> kcal/day</span>
                  </div>
                  <div className={styles.analyticsCardSub}>
                    P: {na.averageDaily.protein ?? '--'}g · C: {na.averageDaily.carbohydrates ?? '--'}g · F: {na.averageDaily.fat ?? '--'}g
                  </div>
                </div>
              )}
            </div>

            {/* Body Measurements Link */}
            {ba && ba.totalMeasurementSessions > 0 && (
              <Link href="/body-progress" className={styles.bodyLink}>
                <div className={styles.bodyLinkText}>
                  <div className={styles.bodyLinkTitle}>📏 Body Measurements</div>
                  <div className={styles.bodyLinkSub}>
                    {ba.totalMeasurementSessions} session{ba.totalMeasurementSessions !== 1 ? 's' : ''}
                    {ba.waist.latest !== null ? ` · Waist: ${ba.waist.latest} cm` : ''}
                    {ba.waist.absoluteChange !== null && ba.waist.absoluteChange !== 0
                      ? ` (${ba.waist.absoluteChange > 0 ? '+' : ''}${ba.waist.absoluteChange} cm)`
                      : ''}
                  </div>
                </div>
                <div className={styles.bodyLinkArrow}>›</div>
              </Link>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
