"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Mic, MicOff, Sparkles, Check, Plus, Minus, ArrowRight, TrendingDown, AlertTriangle, Calendar } from "lucide-react";
import styles from "./page.module.css";
import { supabase } from "../lib/supabase";
import { fetchUserGoals } from "../lib/goals";
import { computeSmartAnalytics, type DailyLog } from "../lib/analytics";

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

const DAILY_WATER_TARGET = 3.0; // 3.0 Liters (or 8 glasses if user logs glasses > 6)
const DAILY_STEPS_TARGET = 10000; // 10,000 steps

export default function Home() {
  const [log, setLog] = useState<any>(null);
  const [activeGoal, setActiveGoal] = useState<number | null>(null);
  const [finalGoal, setFinalGoal] = useState<number | null>(null);
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick-action & Natural Language Quick-Log states
  const [savingField, setSavingField] = useState<string | null>(null);
  const [quickToast, setQuickToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [quickInput, setQuickInput] = useState("");
  const [isQuickParsing, setIsQuickParsing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showInlineWeight, setShowInlineWeight] = useState(false);
  const [inlineWeightVal, setInlineWeightVal] = useState("");
  const recognitionRef = useRef<any>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setQuickToast({ type, text });
    setTimeout(() => {
      setQuickToast(prev => (prev?.text === text ? null : prev));
    }, 3200);
  };

  useEffect(() => {
    const fetchTodayData = async () => {
      try {
        const todayDate = getLocalDateString();

        const [logRes, goalsRes, logsHistRes] = await Promise.all([
          supabase
            .from('daily_logs')
            .select('*')
            .eq('log_date', todayDate)
            .maybeSingle(),
          fetchUserGoals(),
          supabase
            .from('daily_logs')
            .select('id, log_date, weight_kg, steps, water_glasses, meal_status, mood, weight_before_toilet, weight_after_toilet')
            .order('log_date', { ascending: true })
        ]);
        
        if (logRes.data) {
          setLog(logRes.data);
          if (logRes.data.weight_kg != null) {
            setInlineWeightVal(String(logRes.data.weight_kg));
          }
        }
        setActiveGoal(goalsRes.activeGoal);
        setFinalGoal(goalsRes.finalGoal);
        
        if (logsHistRes.data && logsHistRes.data.length > 0) {
          const hist: DailyLog[] = logsHistRes.data;
          setAllLogs(hist);
          const withWeight = hist.filter(l => l.weight_kg !== null && l.weight_kg !== undefined);
          if (withWeight.length > 0) {
            setLatestWeight(Number(withWeight[withWeight.length - 1].weight_kg));
          }
        }
      } catch (err) {
        console.error("Error loading home data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTodayData();
  }, []);

  // Upsert helper for 1-Tap Quick Actions on Home Dashboard
  const upsertTodayFields = async (fields: Record<string, any>, fieldKey: string, successLabel: string) => {
    const todayDate = getLocalDateString();
    setSavingField(fieldKey);
    try {
      const payload = {
        log_date: todayDate,
        ...fields,
      };
      const { data, error } = await supabase
        .from('daily_logs')
        .upsert(payload, { onConflict: 'log_date' })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setLog(data);
        if (data.weight_kg != null) {
          setLatestWeight(Number(data.weight_kg));
        }
        setAllLogs(prev => {
          const exists = prev.some(item => item.log_date === todayDate);
          if (exists) {
            return prev.map(item => (item.log_date === todayDate ? { ...item, ...data } : item));
          }
          return [...prev, data].sort((a, b) => a.log_date.localeCompare(b.log_date));
        });
      }
      showToast(successLabel, 'success');
    } catch (err: any) {
      console.error("Quick log error:", err);
      showToast(err.message || "Failed to update log", 'error');
    } finally {
      setSavingField(null);
    }
  };

  // 1-Tap Handlers
  const handleQuickWater = (delta: number) => {
    const current = log?.water_glasses != null ? Number(log.water_glasses) : 0;
    const next = Math.max(0, +(current + delta).toFixed(2));
    upsertTodayFields({ water_glasses: next }, 'water', `Water updated to ${next}L`);
  };

  const handleQuickSteps = (delta: number) => {
    const current = log?.steps != null ? Number(log.steps) : 0;
    const next = Math.max(0, current + delta);
    upsertTodayFields({ steps: next }, 'steps', `Steps updated to ${next.toLocaleString()}`);
  };

  const handleQuickMeal = (status: 'clean' | 'cheat') => {
    const next = log?.meal_status === status ? null : status;
    upsertTodayFields({ meal_status: next }, 'meal', next ? `Marked today's meals as ${next}` : 'Cleared meal status');
  };

  const handleQuickMood = (moodVal: 'good' | 'neutral' | 'bad') => {
    const next = log?.mood === moodVal ? null : moodVal;
    upsertTodayFields({ mood: next }, 'mood', next ? `Mood logged as ${next}` : 'Cleared mood');
  };

  const handleInlineWeightSave = async () => {
    const parsed = parseFloat(inlineWeightVal);
    if (isNaN(parsed) || parsed < 30 || parsed > 300) {
      showToast("Enter a valid weight in kg (30–300)", "error");
      return;
    }
    await upsertTodayFields({ weight_kg: +parsed.toFixed(1) }, 'weight', `Logged ${parsed.toFixed(1)} kg for today`);
    setShowInlineWeight(false);
  };

  // Voice & Natural Language Quick Log
  const toggleVoiceDictation = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      showToast("Voice dictation is not supported in this browser. Type your quick log instead.", "error");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => {
        setIsListening(false);
        showToast("Could not capture audio. Please try typing.", "error");
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        if (transcript) {
          setQuickInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleNaturalQuickLog = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickInput.trim() || isQuickParsing) return;

    setIsQuickParsing(true);
    try {
      const res = await fetch('/api/quick-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: quickInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Could not parse quick log");
      }

      const parsed = json.data;
      const fieldsToUpdate: Record<string, any> = {};
      if (parsed.weight_kg !== null) fieldsToUpdate.weight_kg = parsed.weight_kg;
      if (parsed.steps !== null) fieldsToUpdate.steps = parsed.steps;
      if (parsed.water_glasses !== null) fieldsToUpdate.water_glasses = parsed.water_glasses;
      if (parsed.meal_status !== null) fieldsToUpdate.meal_status = parsed.meal_status;
      if (parsed.mood !== null) fieldsToUpdate.mood = parsed.mood;

      await upsertTodayFields(fieldsToUpdate, 'quick-nl', parsed.summary || "Quick log saved!");
      setQuickInput("");
    } catch (err: any) {
      showToast(err.message || "Could not parse quick log", "error");
    } finally {
      setIsQuickParsing(false);
    }
  };

  // Calculations
  const recentLogs = allLogs.filter(l => l.weight_kg !== null && l.weight_kg !== undefined);
  const currentW = log?.weight_kg ?? latestWeight;
  const remainingToActive = (activeGoal !== null && currentW !== null && currentW > activeGoal) ? (currentW - activeGoal).toFixed(1) : "0.0";
  
  let trend = 0;
  if (recentLogs.length >= 2 && currentW !== null) {
    trend = Number(currentW) - Number(recentLogs[recentLogs.length - 2].weight_kg);
  }
  
  const todayDate = getLocalDateString();
  const msInDay = 24 * 60 * 60 * 1000;
  const todayTime = parseLogDate(todayDate).getTime();
  const latestLogTime = recentLogs.length > 0 ? parseLogDate(recentLogs[recentLogs.length - 1].log_date).getTime() : todayTime;
  const anchorTime = (todayTime - latestLogTime <= 30 * msInDay && todayTime >= latestLogTime) ? todayTime : latestLogTime;
  const sevenDaysAgoTime = anchorTime - (6 * msInDay);
  const thirtyDaysAgoTime = anchorTime - (29 * msInDay);
  
  const last7DaysLogs = recentLogs.filter(l => {
    const t = parseLogDate(l.log_date).getTime();
    return t >= sevenDaysAgoTime && t <= anchorTime;
  });
  const last30DaysLogs = recentLogs.filter(l => {
    const t = parseLogDate(l.log_date).getTime();
    return t >= thirtyDaysAgoTime && t <= anchorTime;
  });
  const avg7Day = last7DaysLogs.length > 0 ? (last7DaysLogs.reduce((acc, curr) => acc + Number(curr.weight_kg), 0) / last7DaysLogs.length).toFixed(1) : '--';
  const avg30Day = last30DaysLogs.length > 0 ? (last30DaysLogs.reduce((acc, curr) => acc + Number(curr.weight_kg), 0) / last30DaysLogs.length).toFixed(1) : '--';
  
  let streak = 0;
  let currTime = anchorTime;
  for (let i = recentLogs.length - 1; i >= 0; i--) {
    const logTime = parseLogDate(recentLogs[i].log_date).getTime();
    if (logTime === currTime) {
      streak++;
      currTime -= msInDay;
    } else if (logTime === currTime - msInDay) {
      if (streak === 0) currTime -= msInDay;
      streak++;
      currTime -= msInDay;
    } else {
      break;
    }
  }

  // Goal Progress & Smart Forecasting (#2)
  const roughStart = recentLogs.length > 0 ? Math.max(...recentLogs.map(l => Number(l.weight_kg))) : 100;
  let activeGoalProgress = 0;
  if (activeGoal !== null && currentW !== null) {
    const totalToLoseActive = roughStart - activeGoal;
    const lostSoFarActive = roughStart - Number(currentW);
    activeGoalProgress = totalToLoseActive > 0 ? Math.max(5, Math.min(100, (lostSoFarActive / totalToLoseActive) * 100)) : 100;
  }

  let finalGoalProgress = 0;
  if (finalGoal !== null && currentW !== null) {
    const totalToLose = roughStart - finalGoal;
    const lostSoFar = roughStart - Number(currentW);
    finalGoalProgress = totalToLose > 0 ? Math.max(0, Math.min(100, (lostSoFar / totalToLose) * 100)) : 100;
  }
  const circleRadius = 36;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleOffset = circleCircumference - (finalGoalProgress / 100) * circleCircumference;

  const smartReport = computeSmartAnalytics(allLogs, activeGoal, finalGoal);
  const { activeGoalForecast, finalGoalForecast, plateau, weeklyCheckIn } = smartReport;

  // Daily Target Progress Calculations (#1)
  const currentWater = log?.water_glasses != null ? Number(log.water_glasses) : 0;
  const waterTarget = currentWater > 6 ? 8 : DAILY_WATER_TARGET;
  const waterUnitLabel = currentWater > 6 ? 'glasses' : 'L';
  const waterPct = Math.min(100, Math.round((currentWater / waterTarget) * 100));

  const currentSteps = log?.steps != null ? Number(log.steps) : 0;
  const stepsPct = Math.min(100, Math.round((currentSteps / DAILY_STEPS_TARGET) * 100));

  const formattedTodayBadge = parseLogDate(todayDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className={styles.container}>
      <div className={styles.appContainer}>
        
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.greeting}>
            <h1>Good morning!</h1>
            <p className={styles.subtitle}>Let&apos;s keep the momentum going.</p>
          </div>
          <div className={styles.dateBadge}>
            {formattedTodayBadge}
          </div>
        </div>

        {/* FLOATING FEEDBACK TOAST */}
        {quickToast && (
          <div className={`${styles.toastBanner} ${quickToast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
            <Check size={15} />
            <span>{quickToast.text}</span>
          </div>
        )}

        <div className={styles.gridDesktop}>
          {/* LEFT COLUMN: Main Metrics, Forecasting & Weekly Check-In */}
          <div className={styles.colLeft}>
            
            {/* HERO CURRENT WEIGHT */}
            <div className={styles.heroCard} style={{ backgroundColor: '#084c08' }}>
              <div className={styles.heroContent}>
                <div className={styles.heroLeft}>
                  <div className={styles.heroLabel}>Current Weight</div>
                  <div className={styles.heroWeight}>
                    {currentW !== null && currentW !== undefined ? Number(currentW).toFixed(1) : '--'}<span className={styles.unit}>kg</span>
                  </div>
                  <div className={styles.heroBadgeRow}>
                    <div className={`${styles.trendPill} ${trend <= 0 ? styles.trendGood : styles.trendBad}`}>
                      {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)} kg vs prior log
                    </div>
                    {smartReport.weeklyRateKg !== null && (
                      <div className={styles.paceText}>
                        {smartReport.weeklyRateKg < 0 ? `${smartReport.weeklyRateKg.toFixed(2)} kg/wk` : `+${smartReport.weeklyRateKg.toFixed(2)} kg/wk`}
                      </div>
                    )}
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

            {/* YOUR GOALS WITH ESTIMATED COMPLETION DATES (#2) */}
            <div className={styles.sectionHeader}>Your Goals &amp; Forecast</div>
            <div className={styles.goalsGrid}>
              <div className={styles.goalCardActive}>
                <div className={styles.goalHeaderRow}>
                  <div className={styles.goalLabel}>Active Milestone</div>
                  <div className={styles.goalTarget}>{activeGoal ?? '--'} kg</div>
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
                      <div className={styles.miniProgressFill} style={{ width: `${activeGoalProgress}%` }}></div>
                    </div>
                    <div className={styles.forecastMeta}>
                      <Calendar size={12} />
                      {activeGoalForecast.status === 'on_track' || activeGoalForecast.status === 'slow_pace' ? (
                        <span>Est. <strong>{activeGoalForecast.estimatedDateFormatted}</strong> (~{activeGoalForecast.estimatedDays}d)</span>
                      ) : activeGoalForecast.status === 'plateau' ? (
                        <span>Pace stalled · See plateau tip</span>
                      ) : (
                        <span>Log 7+ days to forecast date</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.goalCardFinal}>
                <div className={styles.goalHeaderRow}>
                  <div className={styles.goalLabel}>Final Goal</div>
                  <div className={styles.goalTarget}>{finalGoal ?? '--'} kg</div>
                </div>
                <div className={styles.goalRemaining}>
                  <div className={styles.remainingVal}>
                    {finalGoal !== null && currentW !== null && currentW > finalGoal ? (currentW - finalGoal).toFixed(1) : '0.0'} <span className={styles.remainingUnit}>kg to go</span>
                  </div>
                  <div className={styles.miniProgressBar}>
                    <div className={styles.miniProgressFill} style={{ width: `${finalGoalProgress}%`, background: 'linear-gradient(90deg, #4ade80, #22c55e)' }}></div>
                  </div>
                  <div className={styles.forecastMeta}>
                    <Calendar size={12} />
                    {finalGoalForecast.status === 'on_track' || finalGoalForecast.status === 'slow_pace' ? (
                      <span>Est. <strong>{finalGoalForecast.estimatedDateFormatted}</strong> (~{Math.ceil((finalGoalForecast.estimatedDays || 7) / 7)}w)</span>
                    ) : finalGoalForecast.isAchieved ? (
                      <span>Goal reached! 🏆</span>
                    ) : (
                      <span>Based on 7-day moving avg</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AUTOMATIC PLATEAU DETECTION ALERT (#2) */}
            {plateau.isPlateau && (
              <div className={styles.plateauCard}>
                <div className={styles.plateauHeader}>
                  <div className={styles.plateauTitleWrap}>
                    <AlertTriangle size={16} className={styles.plateauIcon} />
                    <span className={styles.plateauTitle}>Plateau Detected ({plateau.spanDays}-Day Window)</span>
                  </div>
                  <Link
                    href={`/coach?role=strategist&q=${encodeURIComponent(plateau.coachPrompt)}`}
                    className={styles.plateauCoachLink}
                  >
                    <span>Break Plateau</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
                <p className={styles.plateauDesc}>{plateau.message}</p>
              </div>
            )}

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

            {/* WEEKLY CHECK-IN SUMMARY CARD: THIS WEEK VS LAST WEEK (#2) */}
            {weeklyCheckIn.hasEnoughData && (
              <div className={styles.weeklyCard}>
                <div className={styles.weeklyHeader}>
                  <div>
                    <div className={styles.weeklyTitle}>Weekly Check-In Summary</div>
                    <div className={styles.weeklySub}>Last 7 days ({weeklyCheckIn.thisWeekRangeLabel}) vs. prior 7 days</div>
                  </div>
                  <span className={styles.weeklyDaysCount}>{weeklyCheckIn.daysLoggedThisWeek}/7 days logged</span>
                </div>

                <div className={styles.weeklyGrid}>
                  <div className={styles.weeklyMetricBox}>
                    <span className={styles.weeklyMetricLabel}>Avg Weight</span>
                    <span className={styles.weeklyMetricVal}>
                      {weeklyCheckIn.weight.thisWeekAvg !== null ? `${weeklyCheckIn.weight.thisWeekAvg} kg` : '--'}
                    </span>
                    <span className={`${styles.weeklyDelta} ${weeklyCheckIn.weight.delta !== null && weeklyCheckIn.weight.delta <= 0 ? styles.deltaPositive : styles.deltaNeutral}`}>
                      {weeklyCheckIn.weight.delta !== null
                        ? `${weeklyCheckIn.weight.delta > 0 ? '+' : ''}${weeklyCheckIn.weight.delta} kg vs last wk`
                        : 'No prior wk data'}
                    </span>
                  </div>

                  <div className={styles.weeklyMetricBox}>
                    <span className={styles.weeklyMetricLabel}>Avg Steps</span>
                    <span className={styles.weeklyMetricVal}>
                      {weeklyCheckIn.steps.thisWeekAvg !== null ? weeklyCheckIn.steps.thisWeekAvg.toLocaleString() : '--'}
                    </span>
                    <span className={`${styles.weeklyDelta} ${weeklyCheckIn.steps.delta !== null && weeklyCheckIn.steps.delta >= 0 ? styles.deltaPositive : styles.deltaNeutral}`}>
                      {weeklyCheckIn.steps.delta !== null
                        ? `${weeklyCheckIn.steps.delta > 0 ? '+' : ''}${weeklyCheckIn.steps.delta.toLocaleString()} vs last wk`
                        : 'No prior wk data'}
                    </span>
                  </div>

                  <div className={styles.weeklyMetricBox}>
                    <span className={styles.weeklyMetricLabel}>Avg Water</span>
                    <span className={styles.weeklyMetricVal}>
                      {weeklyCheckIn.water.thisWeekAvg !== null ? `${weeklyCheckIn.water.thisWeekAvg} ${waterUnitLabel}` : '--'}
                    </span>
                    <span className={`${styles.weeklyDelta} ${weeklyCheckIn.water.delta !== null && weeklyCheckIn.water.delta >= 0 ? styles.deltaPositive : styles.deltaNeutral}`}>
                      {weeklyCheckIn.water.delta !== null
                        ? `${weeklyCheckIn.water.delta > 0 ? '+' : ''}${weeklyCheckIn.water.delta} vs last wk`
                        : 'No prior wk data'}
                    </span>
                  </div>

                  <div className={styles.weeklyMetricBox}>
                    <span className={styles.weeklyMetricLabel}>Clean Meals</span>
                    <span className={styles.weeklyMetricVal}>
                      {weeklyCheckIn.cleanMeals.thisWeekPct !== null ? `${weeklyCheckIn.cleanMeals.thisWeekPct}%` : '--'}
                    </span>
                    <span className={`${styles.weeklyDelta} ${weeklyCheckIn.cleanMeals.deltaPct !== null && weeklyCheckIn.cleanMeals.deltaPct >= 0 ? styles.deltaPositive : styles.deltaNeutral}`}>
                      {weeklyCheckIn.cleanMeals.deltaPct !== null
                        ? `${weeklyCheckIn.cleanMeals.deltaPct > 0 ? '+' : ''}${weeklyCheckIn.cleanMeals.deltaPct}% vs last wk`
                        : 'No prior wk data'}
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
          
          {/* RIGHT COLUMN: Voice/Natural Quick Log & 1-Tap Daily Tracking (#1) */}
          <div className={styles.colRight}>

            {/* NATURAL LANGUAGE / VOICE QUICK LOG BAR (#1) */}
            <div className={styles.quickNlCard}>
              <div className={styles.quickNlHeader}>
                <div className={styles.quickNlTitle}>
                  <Sparkles size={15} className={styles.sparkleIcon} />
                  <span>Instant Voice / Text Log</span>
                </div>
                <span className={styles.quickNlHint}>Auto-fills today&apos;s metrics</span>
              </div>
              <form onSubmit={handleNaturalQuickLog} className={styles.quickNlForm}>
                <input
                  type="text"
                  className={styles.quickNlInput}
                  placeholder='e.g. "94.5 kg, 8k steps, 2.5L water, ate clean"'
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  disabled={isQuickParsing}
                />
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  className={`${styles.micBtn} ${isListening ? styles.micActive : ''}`}
                  title={isListening ? "Stop voice dictation" : "Dictate log with voice"}
                  aria-label="Voice dictation"
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button
                  type="submit"
                  className={styles.quickNlSubmit}
                  disabled={isQuickParsing || !quickInput.trim()}
                >
                  {isQuickParsing ? "Saving..." : "Log"}
                </button>
              </form>
            </div>

            {/* TODAY'S LOG WITH 1-TAP QUICK ACTIONS & PROGRESS BARS (#1) */}
            <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Today&apos;s Log (1-Tap Update)</span>
              <Link href="/log" className={styles.editLink}>
                Full Log →
              </Link>
            </div>
            
            <div className={styles.logSummaryCard}>
              <div className={styles.logInteractiveList}>
                
                {/* 1. WATER CARD WITH TARGET BAR & +0.25L / +0.5L 1-TAP BUTTONS */}
                <div className={styles.interactiveLogCard}>
                  <div className={styles.interactiveTopRow}>
                    <div className={styles.logInfoGroup}>
                      <div className={styles.logIcon} style={{ width: '35px' }}>💧</div>
                      <div>
                        <div className={styles.logLabel}>Hydration Target</div>
                        <div className={styles.logVal}>
                          {currentWater > 0 ? `${currentWater} / ${waterTarget} ${waterUnitLabel}` : `0 / ${waterTarget} ${waterUnitLabel}`}
                          <span className={styles.targetPctText}> · {waterPct}%</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.quickBtnGroup}>
                      {currentWater >= 0.25 && (
                        <button
                          type="button"
                          onClick={() => handleQuickWater(-0.25)}
                          disabled={savingField === 'water'}
                          className={styles.tapBtnSecondary}
                          aria-label="Decrease water"
                        >
                          <Minus size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleQuickWater(0.25)}
                        disabled={savingField === 'water'}
                        className={styles.tapBtnPrimary}
                      >
                        +0.25L
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickWater(0.5)}
                        disabled={savingField === 'water'}
                        className={styles.tapBtnPrimary}
                      >
                        +0.5L
                      </button>
                    </div>
                  </div>
                  <div className={styles.targetBarTrack}>
                    <div
                      className={styles.targetBarFillWater}
                      style={{ width: `${waterPct}%` }}
                    />
                  </div>
                </div>

                {/* 2. STEPS CARD WITH 10K TARGET BAR & +1K / +2.5K 1-TAP BUTTONS */}
                <div className={styles.interactiveLogCard}>
                  <div className={styles.interactiveTopRow}>
                    <div className={styles.logInfoGroup}>
                      <div className={styles.logIcon}>👟</div>
                      <div>
                        <div className={styles.logLabel}>Daily Steps Target</div>
                        <div className={styles.logVal}>
                          {currentSteps.toLocaleString()} / {DAILY_STEPS_TARGET.toLocaleString()}
                          <span className={styles.targetPctText}> · {stepsPct}%</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.quickBtnGroup}>
                      <button
                        type="button"
                        onClick={() => handleQuickSteps(1000)}
                        disabled={savingField === 'steps'}
                        className={styles.tapBtnPrimary}
                      >
                        +1k
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickSteps(2500)}
                        disabled={savingField === 'steps'}
                        className={styles.tapBtnPrimary}
                      >
                        +2.5k
                      </button>
                    </div>
                  </div>
                  <div className={styles.targetBarTrack}>
                    <div
                      className={styles.targetBarFillSteps}
                      style={{ width: `${stepsPct}%` }}
                    />
                  </div>
                </div>

                {/* 3. WEIGHT CARD WITH INLINE QUICK ENTRY */}
                <div className={styles.interactiveLogCard}>
                  <div className={styles.interactiveTopRow}>
                    <div className={styles.logInfoGroup}>
                      <div className={styles.logIcon}>⚖️</div>
                      <div>
                        <div className={styles.logLabel}>Today&apos;s Weight</div>
                        <div className={styles.logVal}>
                          {log?.weight_kg ? `${log.weight_kg} kg` : 'Not logged today'}
                        </div>
                      </div>
                    </div>
                    <div className={styles.quickBtnGroup}>
                      <button
                        type="button"
                        onClick={() => {
                          setInlineWeightVal(log?.weight_kg ? String(log.weight_kg) : currentW ? String(currentW) : "");
                          setShowInlineWeight(!showInlineWeight);
                        }}
                        className={styles.tapBtnSecondaryText}
                      >
                        {showInlineWeight ? 'Cancel' : log?.weight_kg ? 'Update' : 'Quick Log'}
                      </button>
                      <Link href="/log/weight" className={styles.tapBtnLink}>
                        Full
                      </Link>
                    </div>
                  </div>
                  {showInlineWeight && (
                    <div className={styles.inlineWeightRow}>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Weight in kg (e.g. 94.5)"
                        value={inlineWeightVal}
                        onChange={(e) => setInlineWeightVal(e.target.value)}
                        className={styles.inlineWeightInput}
                      />
                      <button
                        type="button"
                        onClick={handleInlineWeightSave}
                        disabled={savingField === 'weight'}
                        className={styles.inlineWeightSaveBtn}
                      >
                        {savingField === 'weight' ? '...' : 'Save kg'}
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. MEALS 1-TAP TOGGLE (CLEAN / CHEAT) */}
                <div className={styles.interactiveLogCard}>
                  <div className={styles.interactiveTopRow}>
                    <div className={styles.logInfoGroup}>
                      <div className={styles.logIcon}>🥗</div>
                      <div>
                        <div className={styles.logLabel}>Meals</div>
                        <div className={styles.logVal} style={{ textTransform: 'capitalize' }}>
                          {log?.meal_status || 'Tap to log'}
                        </div>
                      </div>
                    </div>
                    <div className={styles.quickBtnGroup}>
                      <button
                        type="button"
                        onClick={() => handleQuickMeal('clean')}
                        disabled={savingField === 'meal'}
                        className={`${styles.segmentToggleBtn} ${log?.meal_status === 'clean' ? styles.segmentCleanActive : ''}`}
                      >
                        Clean
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickMeal('cheat')}
                        disabled={savingField === 'meal'}
                        className={`${styles.segmentToggleBtn} ${log?.meal_status === 'cheat' ? styles.segmentCheatActive : ''}`}
                      >
                        Cheat
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. MOOD 1-TAP TOGGLE */}
                <div className={styles.interactiveLogCard}>
                  <div className={styles.interactiveTopRow}>
                    <div className={styles.logInfoGroup}>
                      <div className={styles.logIcon}>
                        {log?.mood === 'good' ? '😄' : log?.mood === 'neutral' ? '😐' : log?.mood === 'bad' ? '😞' : '🙂'}
                      </div>
                      <div>
                        <div className={styles.logLabel}>Mood</div>
                        <div className={styles.logVal} style={{ textTransform: 'capitalize' }}>
                          {log?.mood || 'Tap to log'}
                        </div>
                      </div>
                    </div>
                    <div className={styles.quickBtnGroup}>
                      <button
                        type="button"
                        onClick={() => handleQuickMood('good')}
                        disabled={savingField === 'mood'}
                        className={`${styles.moodTapBtn} ${log?.mood === 'good' ? styles.moodTapActive : ''}`}
                        title="Good"
                      >
                        😄
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickMood('neutral')}
                        disabled={savingField === 'mood'}
                        className={`${styles.moodTapBtn} ${log?.mood === 'neutral' ? styles.moodTapActive : ''}`}
                        title="Neutral"
                      >
                        😐
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickMood('bad')}
                        disabled={savingField === 'mood'}
                        className={`${styles.moodTapBtn} ${log?.mood === 'bad' ? styles.moodTapActive : ''}`}
                        title="Bad"
                      >
                        😞
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* MOTIVATION */}
            <div className={styles.motivationCard}>
              <p className={styles.quoteText}>Consistency is the ultimate metric. Keep showing up for yourself, day after day.</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
