"use client";

import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabase";
import { fetchUserGoals } from "@/lib/goals";
import {
  Sparkles,
  Send,
  Square,
  Globe,
  Trash2,
  ExternalLink,
  Dumbbell,
  Apple,
  TrendingDown,
  BrainCircuit,
  RotateCcw,
} from "lucide-react";

interface GroundingSource {
  title: string;
  url: string;
}

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  personaLabel?: string;
  sources?: GroundingSource[];
  grounded?: boolean;
  excludeFromContext?: boolean;
}

const ROLES = [
  { id: "coach", label: "Health Coach", icon: TrendingDown, desc: "Habits, mindset & daily consistency" },
  { id: "nutritionist", label: "Nutritionist", icon: Apple, desc: "Macros, meal balance & swaps" },
  { id: "fitness", label: "Fitness Trainer", icon: Dumbbell, desc: "Step targets & workout plans" },
  { id: "strategist", label: "Plateau Strategist", icon: BrainCircuit, desc: "Metabolic review & deep strategy" },
];

const SUGGESTIONS = [
  {
    role: "coach",
    text: "How do I break through a stubborn weight loss plateau?",
    useSearch: true,
  },
  {
    role: "nutritionist",
    text: "What is the optimal daily protein intake for fat loss with muscle retention?",
    useSearch: true,
  },
  {
    role: "nutritionist",
    text: "Calories and macros for chicken biryani and healthier high-protein swaps",
    useSearch: true,
  },
  {
    role: "fitness",
    text: "Give me a practical 10,000-steps routine and recovery plan for fat loss",
    useSearch: false,
  },
  {
    role: "strategist",
    text: "Analyze my recent metrics and explain if water retention might be masking fat loss",
    useSearch: false,
  },
];

let globalMessageCounter = 0;
function createMessageId(prefix: string) {
  globalMessageCounter += 1;
  return `${prefix}-${Date.now()}-${globalMessageCounter}`;
}

function formatCurrentTime() {
  const d = new Date();
  const hrs = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hrs}:${mins}`;
}

const INITIAL_WELCOME: Message = {
  id: "welcome-1",
  role: "model",
  content:
    "**Hello! I'm your Gemini Health & Weight Loss Coach.**\n\nTap any quick question below or type your own prompt at the bottom. You can switch my coaching persona above or toggle **Live Search** for real-time nutrition and study lookups.",
  timestamp: "10:00",
  personaLabel: "Health Coach",
  excludeFromContext: true,
};

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_WELCOME]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [selectedRole, setSelectedRole] = useState("coach");
  const [useGoogleSearch, setUseGoogleSearch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [userMetrics, setUserMetrics] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatThreadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load saved chat history after mount to avoid SSR hydration mismatch
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("weight_loss_coach_chat_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get("role");
      const queryParam = params.get("q");
      if (roleParam && ROLES.some(r => r.id === roleParam)) {
        setSelectedRole(roleParam);
      }
      if (queryParam) {
        setInput(queryParam);
      }
    } catch {
      // ignore storage errors
    } finally {
      setHydrated(true);
    }
  }, []);

  // Save messages to localStorage once hydrated
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem("weight_loss_coach_chat_v2", JSON.stringify(messages));
    } catch {
      // ignore storage errors
    }
  }, [messages, hydrated]);

  // Track elapsed seconds while a prompt is running
  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  // Fetch user health metrics on mount
  useEffect(() => {
    let isMounted = true;
    const fetchMetrics = async () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const [todayRes, goalsRes, recentRes] = await Promise.all([
          supabase.from("daily_logs").select("*").eq("log_date", todayStr).maybeSingle(),
          fetchUserGoals(),
          supabase
            .from("daily_logs")
            .select("weight_kg")
            .not("weight_kg", "is", null)
            .order("log_date", { ascending: false })
            .limit(7),
        ]);

        if (!isMounted) return;

        const recentWeights: number[] = (recentRes.data || [])
          .map((r: any) => r.weight_kg)
          .filter(Boolean);
        const avg7 =
          recentWeights.length > 0
            ? (recentWeights.reduce((a, b) => a + b, 0) / recentWeights.length).toFixed(1)
            : null;

        setUserMetrics({
          currentWeight: recentWeights[0] || 96.4,
          activeGoal: goalsRes.activeGoal || 95.0,
          finalGoal: goalsRes.finalGoal || 70.0,
          todaySteps: todayRes.data?.steps || null,
          todayWater: todayRes.data?.water_glasses || null,
          todayMealStatus: todayRes.data?.meal_status || null,
          avg7Day: avg7,
        });
      } catch (err) {
        console.error("Failed to load metrics for coach:", err);
      }
    };

    fetchMetrics();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto scroll chat thread to bottom when messages or loading state changes
  useEffect(() => {
    if (chatThreadRef.current) {
      chatThreadRef.current.scrollTo({
        top: chatThreadRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setMessages((prev) => [
      ...prev,
      {
        id: createMessageId("stopped"),
        role: "model",
        content: "*⏹️ Prompt stopped. You can edit your question or tap another prompt below.*",
        timestamp: formatCurrentTime(),
        personaLabel: ROLES.find((r) => r.id === selectedRole)?.label || "AI Coach",
        excludeFromContext: true,
      },
    ]);
  };

  const handleClearChat = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3500);
      return;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setConfirmClear(false);
    try {
      window.localStorage.removeItem("weight_loss_coach_chat_v2");
      window.localStorage.removeItem("weight_loss_coach_chat");
    } catch {
      // ignore
    }
    setMessages([INITIAL_WELCOME]);
  };

  const handleSendMessage = async (
    textToSend?: string,
    roleOverride?: string,
    searchOverride?: boolean
  ) => {
    const text = (textToSend ?? input).trim();
    if (!text) return;

    // If a previous prompt is running, abort it first so the new click works immediately
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const activePersona = roleOverride || selectedRole;
    const activeSearch =
      typeof searchOverride === "boolean" ? searchOverride : useGoogleSearch;
    const personaObj = ROLES.find((r) => r.id === activePersona) || ROLES[0];

    const userMsg: Message = {
      id: createMessageId("user"),
      role: "user",
      content: text,
      timestamp: formatCurrentTime(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!textToSend) {
      setInput("");
    }
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Only send real conversation turns (exclude welcome banner / error / stopped notes)
      const apiMessages = updatedMessages
        .filter((m) => !m.excludeFromContext && m.id !== "welcome-1")
        .map((m) => ({
          role: m.role === "model" ? "model" : "user",
          content: m.content,
        }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: apiMessages,
          persona: activePersona,
          useGoogleSearch: activeSearch,
          userMetrics,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.reply || `Server responded with ${res.status}`);
      }

      const botMsg: Message = {
        id: createMessageId("bot"),
        role: "model",
        content: data.reply || "I couldn't process that response. Please try again.",
        timestamp: formatCurrentTime(),
        personaLabel: personaObj.label,
        sources: data.sources || [],
        grounded: Boolean(data.sources && data.sources.length > 0),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }
      console.error("Chat error:", err);
      const errMsg: Message = {
        id: createMessageId("err"),
        role: "model",
        content: `⚠️ **Unable to complete request:** ${err?.message || "Connection error"}. Please tap a suggestion or try sending your message again.`,
        timestamp: formatCurrentTime(),
        personaLabel: personaObj.label,
        excludeFromContext: true,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) {
        handleSendMessage();
      }
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.appContainer}>
        {/* HEADER */}
        <header className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerAvatar}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className={styles.title}>
                Gemini Health Coach
                <span className={styles.liveBadge}>AI Live</span>
              </div>
              <div className={styles.subtitle}>
                Personalized coaching & live Google Search grounding
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={handleClearChat}
              className={`${styles.clearBtn} ${confirmClear ? styles.clearBtnConfirm : ""}`}
              title="Reset conversation"
            >
              {confirmClear ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tap to Confirm</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* CONTROLS (Persona selector & Live Search toggle) */}
        <div className={styles.controlBar}>
          <div className={styles.roleSelectorRow}>
            {ROLES.map((r) => {
              const Icon = r.icon;
              const isActive = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`${styles.roleBtn} ${isActive ? styles.roleBtnActive : ""}`}
                  title={r.desc}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{r.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setUseGoogleSearch(!useGoogleSearch)}
              className={`${styles.searchToggle} ${useGoogleSearch ? styles.searchToggleActive : ""}`}
              title="Ground responses in live Google Search results"
            >
              <Globe
                className={`w-3.5 h-3.5 ${useGoogleSearch ? "text-sky-400" : "text-slate-400"}`}
              />
              <span className={styles.searchToggleLabel}>
                Search: {useGoogleSearch ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        </div>

        {/* USER CONTEXT BANNER */}
        {userMetrics && (
          <div className={styles.contextBanner}>
            <div className={styles.contextPill}>
              ⚖️ <span className={styles.contextHighlight}>{userMetrics.currentWeight} kg</span>
            </div>
            <div className={styles.contextPill}>
              🎯 Goal: <span className={styles.contextHighlight}>{userMetrics.activeGoal} kg</span>
            </div>
            {userMetrics.todaySteps && (
              <div className={styles.contextPill}>
                👟 <span className={styles.contextHighlight}>{userMetrics.todaySteps.toLocaleString()}</span>
              </div>
            )}
            {userMetrics.todayWater && (
              <div className={styles.contextPill}>
                💧 <span className={styles.contextHighlight}>{userMetrics.todayWater} L</span>
              </div>
            )}
          </div>
        )}

        {/* CHAT MESSAGES THREAD */}
        <div ref={chatThreadRef} className={styles.chatThread}>
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`${styles.messageRow} ${isUser ? styles.userRow : styles.botRow}`}
              >
                <div
                  className={`${styles.msgAvatar} ${isUser ? styles.userAvatar : styles.botAvatar}`}
                >
                  {isUser ? "👤" : <Sparkles className="w-4 h-4" />}
                </div>

                <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.botBubble}`}>
                  {!isUser && (
                    <div className={styles.bubbleHeader}>
                      <span className={styles.botName}>
                        {msg.personaLabel ||
                          ROLES.find((r) => r.id === selectedRole)?.label ||
                          "AI Coach"}
                      </span>
                      {msg.grounded && (
                        <span className={styles.groundedTag}>
                          <Globe className="w-3 h-3" /> Search Grounded
                        </span>
                      )}
                      <span style={{ marginLeft: "auto", fontSize: "0.68rem" }}>{msg.timestamp}</span>
                    </div>
                  )}

                  {/* Message Markdown Content */}
                  <div className={styles.markdownBody}>
                    <Markdown>{msg.content}</Markdown>
                  </div>

                  {/* Google Search Grounding Citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className={styles.sourcesSection}>
                      <div className={styles.sourcesTitle}>
                        <Globe className="w-3 h-3 text-sky-400" />
                        Verified Sources:
                      </div>
                      <div className={styles.sourcesGrid}>
                        {msg.sources.map((src, idx) => (
                          <a
                            key={idx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.sourceLink}
                          >
                            <span className={styles.sourceTitleText}>{src.title}</span>
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing / Running Prompt Indicator + Inline Stop Button */}
          {loading && (
            <div className={`${styles.messageRow} ${styles.botRow}`}>
              <div className={`${styles.msgAvatar} ${styles.botAvatar}`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className={styles.loadingBubble}>
                <div className={styles.loadingDotsGroup}>
                  <div className={styles.dot}></div>
                  <div className={styles.dot}></div>
                  <div className={styles.dot}></div>
                </div>
                <span className={styles.loadingStatusText}>
                  Generating response{elapsedSec > 0 ? ` (${elapsedSec}s)` : "..."}
                </span>
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className={styles.inlineStopBtn}
                  title="Stop generating response"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* SUGGESTION CHIPS */}
        <div className={styles.suggestionsContainer}>
          {SUGGESTIONS.map((sug, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSelectedRole(sug.role);
                setUseGoogleSearch(sug.useSearch);
                handleSendMessage(sug.text, sug.role, sug.useSearch);
              }}
              className={styles.suggestionChip}
            >
              {sug.useSearch && <Globe className="w-3 h-3 text-sky-400 flex-shrink-0" />}
              <span>{sug.text}</span>
            </button>
          ))}
        </div>

        {/* COMPOSER INPUT BAR */}
        <div className={styles.composerArea}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (loading) {
                handleStopGeneration();
              } else {
                handleSendMessage();
              }
            }}
            className={styles.inputForm}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={
                loading
                  ? "Coach is responding... Tap Stop to cancel"
                  : useGoogleSearch
                  ? "Ask about nutrition, foods, plateaus (Search ON)..."
                  : "Ask your coach about habits, steps, progress..."
              }
              className={styles.chatInput}
            />
            {loading ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className={styles.stopBtn}
                title="Stop prompt"
                aria-label="Stop prompt"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className={styles.sendBtn}
                title="Send message"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

