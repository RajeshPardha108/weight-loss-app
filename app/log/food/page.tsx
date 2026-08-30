"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "../log-form.module.css";
import { supabase } from "../../../lib/supabase";
import { NutritionCalculator } from "../../../lib/nutrition/nutritionCalculator";
import { ProviderFoodMatch, NutritionCandidate, CalculatedNutritionResult } from "../../../lib/nutrition/types";
import { FoodParseResult, ParsedFoodItem } from "../../../lib/ai/types";
import { SmartFoodInputResult } from "../../../lib/ai/smartFoodInputService";

function getLocalDateString(d: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const dNum = parts.find(p => p.type === 'day')?.value;
  return y + '-' + m + '-' + dNum;
}

function FoodLogContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get("date") || getLocalDateString();

  // Existing Meal Status State (Clean/Cheat)
  const [logId, setLogId] = useState<number | null>(null);
  const [meal, setMeal] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);

  // Phase 3 Pipeline Integration State
  const [foodInputText, setFoodInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [smartResult, setSmartResult] = useState<SmartFoodInputResult | null>(null);
  const [matchResults, setMatchResults] = useState<ProviderFoodMatch[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<number, NutritionCandidate | null>>({});
  const [calculatedResults, setCalculatedResults] = useState<Record<number, CalculatedNutritionResult | null>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('daily_logs')
          .select('id, meal_status')
          .eq('log_date', dateParam)
          .maybeSingle();

        if (data) {
          setLogId(data.id);
          if (data.meal_status !== null) setMeal(data.meal_status);
        }
      } catch (err) {
        console.error('Failed to fetch food log:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateParam]);

  // Existing Clean/Cheat Meal Status Save Handler
  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg({ type: "", text: "" });
    try {
      const payload = {
        log_date: dateParam,
        meal_status: meal || null,
      };

      if (logId) {
        const { error } = await supabase.from('daily_logs').update(payload).eq('id', logId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('daily_logs').insert([payload]).select().single();
        if (error) throw error;
        if (data) setLogId(data.id);
      }

      setStatusMsg({ type: "success", text: "Saved!" });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Failed to save: " + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Analyze Food (Calls secure server API route /api/parse-food which executes SmartFoodInputService)
  const handleAnalyzeFood = async () => {
    if (!foodInputText.trim()) return;

    setIsAnalyzing(true);
    setParseError(null);
    setSmartResult(null);
    setMatchResults([]);
    setSelectedCandidates({});
    setCalculatedResults({});

    try {
      // Step 1: Call /api/parse-food endpoint (runs DeterministicFoodParser -> Gemini Fallback)
      const parseRes = await fetch('/api/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: foodInputText }),
      });

      const parseJson = await parseRes.json();
      if (!parseJson.success) {
        throw new Error(parseJson.error || 'Failed to parse food text.');
      }

      const smartResData: SmartFoodInputResult = parseJson.data;
      setSmartResult(smartResData);

      // Handle AI Unavailable case gracefully
      if (smartResData.aiUnavailable) {
        setParseError("AI parsing is temporarily unavailable. You can enter food in a simple format such as 100g rice, 2 idlis, or 200ml milk.");
        return;
      }

      const parseResultData: FoodParseResult = smartResData.parsed;

      if (!parseResultData.items || parseResultData.items.length === 0) {
        setParseError("Could not extract food items. Please enter food in a simple format such as 100g rice, 2 idlis, or 200ml milk.");
        return;
      }

      // Step 2: Call /api/match-food for each parsed item
      const matches: ProviderFoodMatch[] = [];
      const autoSelected: Record<number, NutritionCandidate | null> = {};
      const autoCalculated: Record<number, CalculatedNutritionResult | null> = {};

      for (let i = 0; i < parseResultData.items.length; i++) {
        const item = parseResultData.items[i];
        const matchRes = await fetch('/api/match-food', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item }),
        });

        const matchJson = await matchRes.json();
        if (!matchJson.success) {
          throw new Error(matchJson.error || `Failed to match database candidates for ${item.food}.`);
        }

        const matchData: ProviderFoodMatch = matchJson.data;
        matches.push(matchData);

        autoSelected[i] = null;
        autoCalculated[i] = null;
      }

      setMatchResults(matches);
      setSelectedCandidates(autoSelected);
      setCalculatedResults(autoCalculated);
    } catch (err: any) {
      console.error("[Phase 3 Pipeline UI Error]:", err);
      setParseError(err.message || "Failed to analyze food input. Please check your network connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 3: Explicit Candidate Selection & Deterministic Calculation (Phase 3D)
  const handleSelectCandidate = (itemIndex: number, candidate: NutritionCandidate) => {
    if (!smartResult || !smartResult.parsed.items[itemIndex]) return;

    const item = smartResult.parsed.items[itemIndex];
    const calculator = new NutritionCalculator();

    const calcResult = calculator.calculate(item, candidate);

    setSelectedCandidates(prev => ({ ...prev, [itemIndex]: candidate }));
    setCalculatedResults(prev => ({ ...prev, [itemIndex]: calcResult }));
  };

  // Calculate totals for Meal Summary Card
  const activeCalculatedItems = Object.values(calculatedResults).filter(
    (res): res is CalculatedNutritionResult => res !== null && res.calculationStatus !== 'cannot_calculate'
  );

  const totalCalories = activeCalculatedItems.reduce((sum, res) => sum + (res.calculatedNutrients.calories || 0), 0);
  const totalProtein = activeCalculatedItems.reduce((sum, res) => sum + (res.calculatedNutrients.protein || 0), 0);
  const totalCarbs = activeCalculatedItems.reduce((sum, res) => sum + (res.calculatedNutrients.carbohydrates || 0), 0);
  const totalFat = activeCalculatedItems.reduce((sum, res) => sum + (res.calculatedNutrients.fat || 0), 0);

  if (loading) {
    return <div className={styles.container}><div className={styles.mobileView}><div className={styles.header}>Loading...</div></div></div>;
  }

  const querySuffix = searchParams?.get("date") ? "?date=" + searchParams.get("date") : "";

  return (
    <div className={styles.container}>
      <div className={styles.mobileView}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href={"/log" + querySuffix} className={styles.backLink}>← Back</Link>
            <h1 className={styles.title}>Log Food</h1>
            <div className={styles.date}>{dateParam}</div>
          </div>
        </div>

        <div className={styles.form}>

          {/* ============================================================ */}
          {/* DEVELOPMENT / TEST ARCHITECTURE INDICATOR BANNER */}
          {/* ============================================================ */}
          <div
            style={{
              background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              borderRadius: "0.85rem",
              padding: "0.65rem 0.85rem",
              fontSize: "0.75rem",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              lineHeight: "1.3"
            }}
          >
            <span>ℹ️</span>
            <div>
              <strong>Phase 3E Smart Input Layer:</strong> Local deterministic parsing first (0 AI calls), fallback to Gemini AI only for complex input.
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 1: NATURAL LANGUAGE FOOD INPUT & PARSER (PHASE 3E) */}
          {/* ============================================================ */}
          <div className={styles.inputGroup} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1.5rem" }}>
            <label className={styles.label}>What did you eat?</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <textarea
                className={styles.input}
                style={{ height: "90px", resize: "none", fontFamily: "inherit" }}
                placeholder="100g millet, 40g toor dal, 40g moong dal..."
                value={foodInputText}
                onChange={(e) => setFoodInputText(e.target.value)}
              />
              <button
                type="button"
                className={styles.saveBtn}
                style={{
                  background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
                  padding: "0.85rem",
                  fontSize: "0.95rem",
                  marginTop: 0
                }}
                onClick={handleAnalyzeFood}
                disabled={isAnalyzing || !foodInputText.trim()}
              >
                {isAnalyzing ? "Analyzing food input..." : "Analyze Food"}
              </button>
            </div>

            {/* Error / AI-Unavailable Banner */}
            {parseError && (
              <div style={{ color: "#fbbf24", fontSize: "0.85rem", marginTop: "0.75rem", background: "rgba(251,191,36,0.1)", padding: "0.75rem", borderRadius: "0.75rem", border: "1px solid rgba(251,191,36,0.25)", lineHeight: "1.4" }}>
                ⚠️ {parseError}
              </div>
            )}

            {/* Parser Source Badge & Pipeline Results */}
            {smartResult && smartResult.parsed.items.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1rem" }}>

                {/* Source Badge */}
                <div
                  style={{
                    alignSelf: "flex-start",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.25rem 0.65rem",
                    borderRadius: "1rem",
                    background: smartResult.source === 'deterministic' ? "rgba(74, 222, 128, 0.15)" : "rgba(56, 189, 248, 0.15)",
                    color: smartResult.source === 'deterministic' ? "#4ade80" : "#38bdf8",
                    border: smartResult.source === 'deterministic' ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid rgba(56, 189, 248, 0.3)"
                  }}
                >
                  {smartResult.source === 'deterministic' ? '⚡ Parsed locally — no AI used' : '✨ Parsed using Gemini AI'}
                </div>

                {smartResult.parsed.items.map((item: ParsedFoodItem, idx: number) => {
                  const match = matchResults[idx];
                  const selectedCand = selectedCandidates[idx];
                  const calcRes = calculatedResults[idx];

                  return (
                    <div
                      key={idx}
                      style={{
                        background: "rgba(15, 23, 42, 0.7)",
                        border: "1px solid rgba(56, 189, 248, 0.2)",
                        borderRadius: "1rem",
                        padding: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem"
                      }}
                    >
                      {/* Parsed Entity Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc" }}>
                            {item.food}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                            Parsed: <span style={{ color: "#38bdf8" }}>{item.quantity ? `${item.quantity} ${item.unit || ''}` : 'No quantity'}</span> | State: <span style={{ color: "#a5b4fc" }}>{item.state}</span>
                          </div>
                        </div>

                        {/* Match Status Badge */}
                        {match && (
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "0.25rem 0.6rem",
                              borderRadius: "1rem",
                              textTransform: "uppercase",
                              background:
                                match.matchStatus === 'matched'
                                  ? "rgba(74, 222, 128, 0.15)"
                                  : match.matchStatus === 'needs_confirmation'
                                  ? "rgba(251, 191, 36, 0.15)"
                                  : "rgba(248, 113, 113, 0.15)",
                              color:
                                match.matchStatus === 'matched'
                                  ? "#4ade80"
                                  : match.matchStatus === 'needs_confirmation'
                                  ? "#fbbf24"
                                  : "#f87171",
                              border:
                                match.matchStatus === 'matched'
                                  ? "1px solid rgba(74, 222, 128, 0.3)"
                                  : match.matchStatus === 'needs_confirmation'
                                  ? "1px solid rgba(251, 191, 36, 0.3)"
                                  : "1px solid rgba(248, 113, 113, 0.3)"
                            }}
                          >
                            {match.matchStatus === 'matched'
                              ? 'Matched'
                              : match.matchStatus === 'needs_confirmation'
                              ? 'Needs Confirmation'
                              : 'No Match'}
                          </div>
                        )}
                      </div>

                      {/* Case A: no_match state */}
                      {match && match.matchStatus === 'no_match' && (
                        <div style={{ fontSize: "0.85rem", color: "#f87171", background: "rgba(248,113,113,0.08)", padding: "0.75rem", borderRadius: "0.75rem", border: "1px solid rgba(248,113,113,0.15)" }}>
                          No matching food found in USDA FoodData Central or Open Food Facts for "{item.food}".
                        </div>
                      )}

                      {/* Case B: Candidate Results & Explicit Confirmation Cards */}
                      {match && match.candidates.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#cbd5e1" }}>
                            Select / Confirm Database Candidate:
                          </div>
                          {match.candidates.map((cand: NutritionCandidate) => {
                            const isSelected = selectedCand?.id === cand.id;
                            return (
                              <button
                                key={cand.id}
                                type="button"
                                onClick={() => handleSelectCandidate(idx, cand)}
                                style={{
                                  background: isSelected ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.03)",
                                  border: isSelected ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                                  borderRadius: "0.75rem",
                                  padding: "0.65rem 0.85rem",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  transition: "all 0.2s ease"
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: isSelected ? "#38bdf8" : "#f8fafc" }}>
                                    {cand.displayName}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                    Provider: <span style={{ color: "#94a3b8" }}>{cand.provider === 'usda' ? 'USDA' : 'Open Food Facts'}</span> | Basis: <span style={{ color: "#a5b4fc" }}>{cand.nutritionBasis.type}</span> {cand.brand ? `| Brand: ${cand.brand}` : ''}
                                  </div>
                                  {cand.servingInfo?.servingSize && (
                                    <div style={{ fontSize: "0.7rem", color: "#475569" }}>
                                      Serving Info: {cand.servingInfo.servingSize} {cand.servingInfo.servingUnit || ''}
                                    </div>
                                  )}
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8" }}>
                                    Score: {(cand.score * 100).toFixed(0)}%
                                  </div>
                                  <div style={{ fontSize: "0.7rem", color: isSelected ? "#4ade80" : "#64748b", fontWeight: isSelected ? 700 : 400 }}>
                                    {isSelected ? "✓ Confirmed" : "Tap to Select"}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Case C: Deterministic Calculation Output (Phase 3D Engine) */}
                      {calcRes && (
                        <div
                          style={{
                            marginTop: "0.5rem",
                            background: "rgba(30, 41, 59, 0.9)",
                            border: "1px solid rgba(99, 102, 241, 0.3)",
                            borderRadius: "0.85rem",
                            padding: "0.85rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#818cf8" }}>
                              Calculated Nutrition (Phase 3D Engine)
                            </div>
                            <div
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.5rem",
                                borderRadius: "0.5rem",
                                background:
                                  calcRes.calculationStatus === 'exact'
                                    ? "rgba(74, 222, 128, 0.2)"
                                    : calcRes.calculationStatus === 'converted'
                                    ? "rgba(56, 189, 248, 0.2)"
                                    : "rgba(251, 191, 36, 0.2)",
                                color:
                                  calcRes.calculationStatus === 'exact'
                                    ? "#4ade80"
                                    : calcRes.calculationStatus === 'converted'
                                    ? "#38bdf8"
                                    : "#fbbf24",
                              }}
                            >
                              Status: {calcRes.calculationStatus.toUpperCase()}
                            </div>
                          </div>

                          {/* cannot_calculate warning note */}
                          {calcRes.calculationStatus === 'cannot_calculate' ? (
                            <div style={{ fontSize: "0.8rem", color: "#fbbf24", background: "rgba(251,191,36,0.08)", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid rgba(251,191,36,0.2)", lineHeight: "1.4" }}>
                              ⚠️ Nutrition cannot be calculated safely because the database candidate does not provide the weight/volume of one {item.unit || 'unit'}.
                            </div>
                          ) : (
                            <>
                              {/* Macro grid */}
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem", marginTop: "0.25rem" }}>
                                <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.5rem", borderRadius: "0.5rem", textAlign: "center" }}>
                                  <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>CALORIES</div>
                                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f8fafc" }}>
                                    {calcRes.calculatedNutrients.calories !== null ? `${calcRes.calculatedNutrients.calories} kcal` : '—'}
                                  </div>
                                </div>
                                <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.5rem", borderRadius: "0.5rem", textAlign: "center" }}>
                                  <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>PROTEIN</div>
                                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#38bdf8" }}>
                                    {calcRes.calculatedNutrients.protein !== null ? `${calcRes.calculatedNutrients.protein}g` : '—'}
                                  </div>
                                </div>
                                <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.5rem", borderRadius: "0.5rem", textAlign: "center" }}>
                                  <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>CARBS</div>
                                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#a5b4fc" }}>
                                    {calcRes.calculatedNutrients.carbohydrates !== null ? `${calcRes.calculatedNutrients.carbohydrates}g` : '—'}
                                  </div>
                                </div>
                                <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.5rem", borderRadius: "0.5rem", textAlign: "center" }}>
                                  <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>FAT</div>
                                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fb7185" }}>
                                    {calcRes.calculatedNutrients.fat !== null ? `${calcRes.calculatedNutrients.fat}g` : '—'}
                                  </div>
                                </div>
                              </div>

                              {/* Secondary Nutrients (Missing nutrients show as '—', NOT 0) */}
                              <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
                                <span>Fiber: <strong style={{ color: "#cbd5e1" }}>{calcRes.calculatedNutrients.fiber !== null ? `${calcRes.calculatedNutrients.fiber}g` : '—'}</strong></span>
                                <span>Sodium: <strong style={{ color: "#cbd5e1" }}>{calcRes.calculatedNutrients.sodium !== null ? `${calcRes.calculatedNutrients.sodium}mg` : '—'}</strong></span>
                                <span>Potassium: <strong style={{ color: "#cbd5e1" }}>{calcRes.calculatedNutrients.potassium !== null ? `${calcRes.calculatedNutrients.potassium}mg` : '—'}</strong></span>
                              </div>

                              {/* Ratio applied & Explanation Notes */}
                              <div style={{ fontSize: "0.7rem", color: "#64748b", fontStyle: "italic", marginTop: "0.2rem" }}>
                                ℹ️ Ratio applied: {calcRes.ratioApplied}x | {calcRes.notes[0] || ''}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ============================================================ */}
                {/* TOTAL MEAL SUMMARY CARD (Aggregates Confirmed Items) */}
                {/* ============================================================ */}
                {activeCalculatedItems.length > 0 && (
                  <div
                    style={{
                      background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)",
                      border: "1px solid rgba(74, 222, 128, 0.3)",
                      borderRadius: "1rem",
                      padding: "1.1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      marginTop: "0.5rem"
                    }}
                  >
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#4ade80", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>📊 Total Meal Summary</span>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 400 }}>{activeCalculatedItems.length} item(s) confirmed</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
                      <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.6rem", borderRadius: "0.5rem", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>TOTAL CALS</div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#4ade80" }}>{totalCalories.toFixed(0)} kcal</div>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.6rem", borderRadius: "0.5rem", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>PROTEIN</div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#38bdf8" }}>{totalProtein.toFixed(1)}g</div>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.6rem", borderRadius: "0.5rem", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>CARBS</div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#a5b4fc" }}>{totalCarbs.toFixed(1)}g</div>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.6rem", borderRadius: "0.5rem", textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>FAT</div>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fb7185" }}>{totalFat.toFixed(1)}g</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* SECTION 2: EXISTING MEAL STATUS FUNCTIONALITY (CLEAN/CHEAT) */}
          {/* ============================================================ */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Daily Meal Log Status</label>
            <div className={styles.statusGrid}>
              <button
                type="button"
                className={`${styles.statusBtn} ${meal === 'clean' ? styles.active : ''}`}
                onClick={() => setMeal(meal === 'clean' ? '' : 'clean')}
              >
                Clean
              </button>
              <button
                type="button"
                className={`${styles.statusBtn} ${meal === 'cheat' ? styles.active : ''}`}
                onClick={() => setMeal(meal === 'cheat' ? '' : 'cheat')}
              >
                Cheat
              </button>
            </div>
          </div>

          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Food Status"}
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

export default function FoodLog() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.mobileView}><div className={styles.header}>Loading...</div></div></div>}>
      <FoodLogContent />
    </Suspense>
  );
}
