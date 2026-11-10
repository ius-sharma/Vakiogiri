"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import TopNavBar from "@/components/TopNavBar";
import { useUIFeedback } from "@/components/UIFeedback";
import { supabase, signOut } from "@/lib/supabase";
import {
  Gamepad2,
  Sparkles,
  Play,
  PlayCircle,
  Video,
  Clock,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Download,
  Copy,
  Check,
  Clipboard,
  Zap,
  Flame,
  Film,
  RefreshCw,
  Loader2,
  SlidersHorizontal,
  Bookmark,
  Scissors,
} from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface ClipItem {
  filename: string;
  url: string;
  is_cloud?: boolean;
  title?: string;
  score?: number;
  heatmap_score?: number;
  start?: number;
  end?: number;
  duration?: number;
  mode?: string;
  aspect_ratio?: string;
  content_type?: string;
  quality?: string;
  resolution?: string;
  chapters?: Array<{ timestamp: string; seconds: number; title: string; duration: number }>;
  chapter_description?: string;
}

interface UserProfile {
  id: string;
  email: string;
  credits_remaining: number;
  max_daily_credits: number;
}

export default function StreamStudio() {
  const { showToast } = useUIFeedback();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Auth state
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: "guest",
    email: "guest@vakiogiri.ai",
    credits_remaining: 3,
    max_daily_credits: 3,
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login");

  // Stream Form Parameters
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pasted, setPasted] = useState(false);

  // Stream Analysis State
  const [analyzingStream, setAnalyzingStream] = useState(false);
  const [streamAnalysis, setStreamAnalysis] = useState<{
    duration: number;
    duration_formatted: string;
    title: string;
    uploader: string;
    thumbnail?: string;
    is_live?: boolean;
    live_status?: string;
    video_id?: string;
  } | null>(null);
  const [streamAnalysisError, setStreamAnalysisError] = useState<string | null>(null);

  // Stream intro skip & range slider state (in minutes)
  const [rangeMode, setRangeMode] = useState<"skip_intro" | "custom_range">("skip_intro");
  const [skipIntroMin, setSkipIntroMin] = useState<number>(15);
  const [startMin, setStartMin] = useState<number>(0);
  const [endMin, setEndMin] = useState<number>(180);

  // Video settings
  const [targetReelDuration, setTargetReelDuration] = useState<number>(300);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [outputMode, setOutputMode] = useState<"single_reel" | "both" | "clips">("single_reel");
  const [quality, setQuality] = useState<"1080p" | "720p" | "480p">("1080p");
  const [clippingMode, setClippingMode] = useState<"heuristic" | "ai_enhanced">("heuristic");

  // Pipeline Status State
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
  const [progress, setProgress] = useState<number>(5);
  const [progressMessage, setProgressMessage] = useState<string>("Initializing stream slice...");
  const [step, setStep] = useState<string>("initializing");
  const [clips, setClips] = useState<(string | ClipItem)[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Results player state
  const [selectedClipIndex, setSelectedClipIndex] = useState<number>(0);
  const [copiedChapters, setCopiedChapters] = useState(false);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef<boolean>(false);

  const formatMinutesToHms = (minutes: number) => {
    const totalSeconds = Math.max(0, Math.round(minutes * 60));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    document.documentElement.classList.toggle("light", initialTheme === "light");

    supabase.auth.getSession().then((res: any) => {
      const activeSession = res?.data?.session;
      setSession(activeSession);
      if (activeSession?.access_token) {
        fetchUserProfile(activeSession.access_token);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, activeSession: any) => {
      setSession(activeSession);
      if (activeSession?.access_token) {
        fetchUserProfile(activeSession.access_token);
      } else {
        setUserProfile({
          id: "guest",
          email: "guest@vakiogiri.ai",
          credits_remaining: 3,
          max_daily_credits: 3,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
      stopPolling();
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.classList.toggle("light", nextTheme === "light");
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    isPollingRef.current = false;
  };

  const fetchUserProfile = async (token?: string) => {
    const activeToken = token || session?.access_token;
    if (!activeToken) return;

    try {
      const res = await fetch(`${BACKEND_URL}/user/me`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (err) {
      console.warn("Could not fetch profile:", err);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setYoutubeUrl(text.trim());
        setPasted(true);
        setStreamAnalysis(null);
        setStreamAnalysisError(null);
        showToast("Stream link pasted from clipboard!", "info");
        setTimeout(() => setPasted(false), 2000);
      }
    } catch (err) {
      console.warn("Clipboard access denied", err);
    }
  };

  const handleAnalyzeStream = async () => {
    if (!youtubeUrl.trim()) return;

    const trimmedUrl = youtubeUrl.trim();
    const isYouTube = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)/i.test(trimmedUrl);
    if (!isYouTube) {
      setStreamAnalysisError(`"${trimmedUrl}" is not a valid YouTube stream URL. Please paste a valid link.`);
      return;
    }

    setAnalyzingStream(true);
    setStreamAnalysisError(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`${BACKEND_URL}/stream/probe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_url: trimmedUrl }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Could not inspect stream (${res.status})`);
      }

      const data = await res.json();

      if (data.is_live || data.live_status === "is_live") {
        throw new Error("This livestream is currently actively broadcasting live. Highlights can be extracted once the live broadcast finishes and YouTube processes the VOD!");
      }

      const totalSec = Number(data.duration) || 0;
      const totalMin = Math.max(1, Math.floor(totalSec / 60));

      setStreamAnalysis({
        duration: totalSec,
        duration_formatted: data.duration_formatted || `${totalMin}m`,
        title: data.title || "YouTube Stream",
        uploader: data.uploader || "",
        thumbnail: data.thumbnail || (data.video_id ? `https://img.youtube.com/vi/${data.video_id}/hqdefault.jpg` : ""),
        is_live: data.is_live,
        live_status: data.live_status,
        video_id: data.video_id,
      });

      setStartMin(0);
      setEndMin(totalMin);
      setSkipIntroMin(Math.min(15, Math.floor(totalMin * 0.2)));
      showToast("Stream analyzed successfully! Select time range below.", "success");
    } catch (err: any) {
      setStreamAnalysisError(err.message || "Failed to analyze stream duration.");
    } finally {
      setAnalyzingStream(false);
    }
  };

  const handleSubmitStream = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!youtubeUrl.trim()) return;

    if (userProfile.credits_remaining <= 0) {
      showToast("You have reached your daily credit limit (0/3 remaining).", "error");
      return;
    }

    if (rangeMode === "custom_range") {
      if (startMin >= endMin) {
        showToast("Start point (Point A) must be strictly less than End point (Point B).", "error");
        return;
      }
      if (endMin - startMin < 1) {
        showToast("Custom slice range must be at least 1 minute.", "error");
        return;
      }
    }

    setErrorMsg(null);
    setClips([]);
    setProgress(5);
    setProgressMessage("Initiating smart stream slice...");
    setStatus("processing");
    stopPolling();

    try {
      const startSec = rangeMode === "skip_intro" ? skipIntroMin * 60 : startMin * 60;
      const endSec = rangeMode === "skip_intro" ? (streamAnalysis?.duration || 10800) : endMin * 60;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${BACKEND_URL}/stream/process`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          youtube_url: youtubeUrl.trim(),
          start_time: startSec,
          end_time: endSec,
          target_reel_duration: targetReelDuration,
          output_mode: outputMode,
          aspect_ratio: aspectRatio,
          quality: quality,
          clipping_mode: clippingMode,
          generate_chapters: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${res.status}`);
      }

      const data = await res.json();
      const currentJobId = data.job_id;
      setJobId(currentJobId);
      setProgress(data.progress || 10);
      setProgressMessage(data.message || "Extracting high-energy stream moments...");

      if (data.credits_remaining !== undefined) {
        setUserProfile((prev) => ({ ...prev, credits_remaining: data.credits_remaining }));
      }

      pollIntervalRef.current = setInterval(() => {
        checkStatus(currentJobId);
      }, 1500);

      checkStatus(currentJobId);
    } catch (err: any) {
      setStatus("failed");
      setErrorMsg(err.message || "Failed to start stream highlight generation.");
    }
  };

  const checkStatus = async (currentJobId: string) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const res = await fetch(`${BACKEND_URL}/status/${currentJobId}`);
      if (!res.ok) throw new Error("Could not fetch status.");

      const data = await res.json();
      if (data.progress !== undefined) setProgress(data.progress);
      if (data.message) setProgressMessage(data.message);
      if (data.step) setStep(data.step);

      if (data.status === "completed") {
        stopPolling();
        setProgress(100);
        setStatus("completed");
        setClips(data.clips || []);
        setSelectedClipIndex(0);
        showToast("Stream highlights generated successfully!", "success");
        fetchUserProfile();
      } else if (data.status === "failed") {
        stopPolling();
        setStatus("failed");
        setErrorMsg(data.error || "Stream processing failed.");
      }
    } catch (err) {
      console.warn("Polling error:", err);
    } finally {
      isPollingRef.current = false;
    }
  };

  const handleReset = () => {
    stopPolling();
    setStatus("idle");
    setClips([]);
    setErrorMsg(null);
    setProgress(5);
    setStreamAnalysis(null);
  };

  const copyChapterDescription = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChapters(true);
    showToast("YouTube chapters & timestamps copied to clipboard!", "success");
    setTimeout(() => setCopiedChapters(false), 2000);
  };

  const seekToTimestamp = (seconds: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = seconds;
      videoPlayerRef.current.play();
    }
  };

  const activeClip: ClipItem | null = clips.length > 0
    ? typeof clips[selectedClipIndex] === "string"
      ? { filename: clips[selectedClipIndex] as string, url: `${BACKEND_URL}/clips/${jobId}/${clips[selectedClipIndex]}` }
      : (clips[selectedClipIndex] as ClipItem)
    : null;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased relative ${theme === "dark" ? "dark bg-[#08080c] text-[#f8fafc]" : "light bg-[#f8fafc] text-[#0f172a]"}`}>
      
      {/* Background ambient spotlight */}
      <div className="fixed inset-0 ambient-spotlight pointer-events-none -z-10" />

      {/* Top Navigation */}
      <TopNavBar
        logo={{
          name: "Vakiogiri",
          icon: "auto_awesome",
          href: "/",
        }}
        navItems={[
          {
            id: "studio",
            label: "Shorts Studio",
            href: "/",
          },
          {
            id: "stream",
            label: "Stream Studio",
            isActive: true,
          },
          {
            id: "history",
            label: "My Clips",
            href: "/?view=history",
          },
        ]}
        authActions={{
          loginLabel: "Log in",
          onLogin: () => {
            setAuthModalMode("login");
            setIsAuthModalOpen(true);
          },
          signupLabel: "Start for free",
          onSignup: () => {
            setAuthModalMode("signup");
            setIsAuthModalOpen(true);
          },
        }}
        session={session}
        userProfile={userProfile}
        onSignOut={() => signOut().then(() => setSession(null))}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Stream Studio Canvas */}
      <main className="flex-grow flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-6xl mx-auto w-full">
        
        {/* Studio Hero Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold tracking-wide mb-3">
            <Gamepad2 className="w-4 h-4" />
            <span>Gaming & Livestream Supercut Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Turn 4-Hour Streams into{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Master Highlights
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-xl">
            Automatically detect gaming screams, clutch 1v4 kills, and hype moments. Skip stream intros with calibrated time sliders.
          </p>
        </div>

        {/* Studio Form & Pipeline */}
        {status !== "completed" ? (
          <div className="w-full max-w-3xl flex flex-col gap-6">
            
            <form
              onSubmit={handleSubmitStream}
              className="bg-[#101018] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 relative"
            >
              {/* Stream URL Bar */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Stream URL</span>
                  <span className="text-[11px] font-mono text-cyan-400">YouTube VOD / Stream links</span>
                </label>

                <div className="relative flex items-center">
                  <PlayCircle className="w-5 h-5 absolute left-4 text-cyan-400 pointer-events-none" />
                  <input
                    type="url"
                    required
                    placeholder="https://www.youtube.com/watch?v=... or https://youtube.com/live/..."
                    value={youtubeUrl}
                    onChange={(e) => {
                      setYoutubeUrl(e.target.value);
                      if (streamAnalysis) setStreamAnalysis(null);
                      if (streamAnalysisError) setStreamAnalysisError(null);
                    }}
                    disabled={status === "processing" || analyzingStream}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-28 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-medium disabled:opacity-50"
                  />
                  <div className="absolute right-2 flex items-center">
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      disabled={status === "processing" || analyzingStream}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {pasted ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                      <span>{pasted ? "Pasted!" : "Paste"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Box */}
              {streamAnalysisError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-300 rounded-2xl text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{streamAnalysisError}</span>
                </div>
              )}

              {/* STEP 1: INITIAL STATE (Only "Analyse Stream" button shown) */}
              {!streamAnalysis ? (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleAnalyzeStream}
                    disabled={analyzingStream || !youtubeUrl.trim() || status === "processing"}
                    className="w-full bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
                  >
                    {analyzingStream ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Inspecting Stream (Duration & Details)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-cyan-200" />
                        <span>Inspect Stream Duration & Details</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-500 text-center font-mono">
                    Streams are pre-scanned without full download to save 90% bandwidth.
                  </p>
                </div>
              ) : (
                /* STEP 2: STREAM INSPECTED -> SHOW SLIDERS & OPTIONS */
                <div className="flex flex-col gap-5 pt-2 border-t border-white/10 animate-in fade-in duration-300">
                  
                  {/* Stream Card Details */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {streamAnalysis.thumbnail ? (
                        <img
                          src={streamAnalysis.thumbnail}
                          alt="Thumbnail"
                          className="w-16 h-12 object-cover rounded-xl border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400">
                          <Film className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Stream Probed Successfully</span>
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate max-w-sm">
                          {streamAnalysis.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                          <span>⏱️ {streamAnalysis.duration_formatted}</span>
                          <span>•</span>
                          <span>{streamAnalysis.uploader || "Streamer"}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStreamAnalysis(null)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer shrink-0"
                    >
                      Change URL
                    </button>
                  </div>

                  {/* Range Mode Switcher & Slicing Controls */}
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/8 flex flex-col gap-4">
                    
                    {/* Header with Mode Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Stream Slicing Range</span>
                      </div>

                      {/* Mode Switch Tabs */}
                      <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setRangeMode("skip_intro")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            rangeMode === "skip_intro"
                              ? "bg-cyan-500 text-white font-bold shadow-xs"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Skip Intro
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRangeMode("custom_range");
                            if (endMin <= startMin) {
                              setEndMin(Math.floor(streamAnalysis.duration / 60));
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            rangeMode === "custom_range"
                              ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold shadow-xs"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Scissors className="w-3.5 h-3.5" />
                          <span>Custom 2-Point Cut (A ➔ B)</span>
                        </button>
                      </div>
                    </div>

                    {/* Mode A: Skip Intro Slider */}
                    {rangeMode === "skip_intro" ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300">
                            Cut and discard the starting waiting/chat screen:
                          </span>
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                            Skip first {skipIntroMin} mins ({formatMinutesToHms(skipIntroMin)})
                          </span>
                        </div>

                        <input
                          type="range"
                          min={0}
                          max={Math.min(90, Math.floor(streamAnalysis.duration / 60))}
                          value={skipIntroMin}
                          onChange={(e) => setSkipIntroMin(Number(e.target.value))}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {[0, 10, 15, 20, 30, 45].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setSkipIntroMin(preset)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                                skipIntroMin === preset
                                  ? "bg-cyan-500 text-white font-bold"
                                  : "bg-white/5 text-slate-400 hover:text-white"
                              }`}
                            >
                              {preset === 0 ? "No Skip" : `Skip ${preset}m`}
                            </button>
                          ))}
                        </div>

                        <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15 flex items-center justify-between text-xs text-slate-400 font-mono">
                          <span>Active Range: <strong>{formatMinutesToHms(skipIntroMin)}</strong> ➔ <strong>{streamAnalysis.duration_formatted}</strong></span>
                          <span className="text-cyan-400">⚡ Downloads from {skipIntroMin}m to end</span>
                        </div>
                      </div>
                    ) : (
                      /* Mode B: Custom 2-Point Cut (Point A to Point B) */
                      <div className="flex flex-col gap-4">
                        
                        {/* Point A (Start Time) */}
                        <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span>Point A — Start Slice (From)</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                {formatMinutesToHms(startMin)} ({startMin}m)
                              </span>
                            </div>
                          </div>

                          <input
                            type="range"
                            min={0}
                            max={Math.max(0, endMin - 1)}
                            value={startMin}
                            onChange={(e) => setStartMin(Math.min(Number(e.target.value), endMin - 1))}
                            className="w-full accent-emerald-500 cursor-pointer"
                          />

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-mono mr-1">Quick Set:</span>
                            {[0, 15, 30, 45, 60, 90].map((preset) => (
                              preset < endMin && (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setStartMin(preset)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                                    startMin === preset
                                      ? "bg-emerald-500 text-white font-bold"
                                      : "bg-white/5 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {preset === 0 ? "0m (Start)" : `${preset}m`}
                                </button>
                              )
                            ))}
                          </div>
                        </div>

                        {/* Point B (End Time) */}
                        <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-400" />
                              <span>Point B — End Slice (To)</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                {formatMinutesToHms(endMin)} ({endMin}m)
                              </span>
                            </div>
                          </div>

                          <input
                            type="range"
                            min={startMin + 1}
                            max={Math.floor(streamAnalysis.duration / 60)}
                            value={endMin}
                            onChange={(e) => setEndMin(Math.max(Number(e.target.value), startMin + 1))}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-mono mr-1">Quick Set:</span>
                            {[30, 60, 90, 120, 180, Math.floor(streamAnalysis.duration / 60)].map((preset, idx) => (
                              preset > startMin && preset <= Math.floor(streamAnalysis.duration / 60) && (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setEndMin(preset)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                                    endMin === preset
                                      ? "bg-indigo-500 text-white font-bold"
                                      : "bg-white/5 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {preset === Math.floor(streamAnalysis.duration / 60) ? "Stream End" : `${preset}m`}
                                </button>
                              )
                            ))}
                          </div>
                        </div>

                        {/* Slice Summary Card */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                              <span>2-Point Slice: {formatMinutesToHms(startMin)} ➔ {formatMinutesToHms(endMin)}</span>
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Duration: <strong className="text-cyan-300">{endMin - startMin} minutes</strong> • Downloads ONLY this portion!
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-500/30">
                            ⚡ Saves ~{Math.max(0, Math.round((1 - ((endMin - startMin) / Math.max(1, streamAnalysis.duration / 60))) * 100))}% bandwidth
                          </span>
                        </div>

                      </div>
                    )}

                  </div>

                  {/* Format & Aspect Ratio Selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-300">Aspect Ratio</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAspectRatio("16:9")}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            aspectRatio === "16:9"
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-xs"
                              : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                          }`}
                        >
                          16:9 Widescreen
                        </button>
                        <button
                          type="button"
                          onClick={() => setAspectRatio("9:16")}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            aspectRatio === "9:16"
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-xs"
                              : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                          }`}
                        >
                          9:16 Vertical
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-300">Output Quality</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["1080p", "720p", "480p"] as const).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setQuality(q)}
                            className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              quality === q
                                ? "bg-indigo-600 border-indigo-500 text-white shadow-xs"
                                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={status === "processing"}
                      className="w-full bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4 text-cyan-200" />
                      <span>Extract Stream Highlights ({quality})</span>
                    </button>
                  </div>

                </div>
              )}
            </form>

            {/* Processing Progress Tracker */}
            {status === "processing" && (
              <div className="p-6 rounded-3xl bg-[#101018] border border-cyan-500/30 shadow-2xl flex flex-col gap-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                    <span className="text-sm font-bold text-white">Extracting Stream Supercut...</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {progress}%
                  </span>
                </div>

                <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full shimmer-progress transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate max-w-[80%]">{progressMessage}</span>
                  <span className="font-mono uppercase text-[10px] text-cyan-400">{step}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {status === "failed" && errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-white">Stream Notice</span>
                  <p className="text-rose-300 leading-relaxed">{errorMsg}</p>
                  <button
                    onClick={handleReset}
                    className="self-start mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

          </div>
        ) : (
          /* RESULTS VIEW: 16:9 Cinema Player & Chapters */
          <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
            
            {/* Top Bar Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#101018] border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Highlights Generation Complete
                </span>
                <h2 className="text-2xl font-extrabold text-white mt-1">
                  {activeClip?.title || "Master Highlights Supercut"}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                  <span>Quality: <strong className="text-white">{activeClip?.quality || quality}</strong></span>
                  <span>•</span>
                  <span>Duration: <strong className="text-white">{Math.round((activeClip?.duration || 0) / 60)} mins</strong></span>
                  <span>•</span>
                  <span>Ratio: <strong className="text-white">{activeClip?.aspect_ratio || "16:9"}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Clip Another</span>
                </button>
                {activeClip && (
                  <a
                    href={activeClip.url?.includes("/clips/") ? activeClip.url.replace("/clips/", "/download/") : activeClip.url}
                    download={activeClip.filename}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Master Highlights (16:9)</span>
                  </a>
                )}
              </div>
            </div>

            {/* Video Player & Chapters Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: Video Player */}
              <div className="lg:col-span-2 bg-[#101018] border border-white/10 rounded-3xl p-4 sm:p-6 flex flex-col gap-4 shadow-2xl">
                <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative shadow-inner">
                  {activeClip ? (
                    <video
                      ref={videoPlayerRef}
                      src={activeClip.url}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      Loading video player...
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
                  <span>Aspect: {activeClip?.aspect_ratio || "16:9 Widescreen"}</span>
                  <span>PTS-Synchronized Master Cut (FFmpeg)</span>
                </div>
              </div>

              {/* Right 1 Col: Chapters */}
              <div className="bg-[#101018] border border-white/10 rounded-3xl p-5 flex flex-col gap-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-bold text-white">YouTube Chapters</span>
                  </div>
                  {activeClip?.chapter_description && (
                    <button
                      type="button"
                      onClick={() => copyChapterDescription(activeClip.chapter_description || "")}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedChapters ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedChapters ? "Copied!" : "Copy"}</span>
                    </button>
                  )}
                </div>

                {/* Chapter List */}
                {activeClip?.chapters && activeClip.chapters.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                    {activeClip.chapters.map((ch, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => seekToTimestamp(ch.seconds)}
                        className="text-left p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all flex items-center justify-between gap-2 text-xs group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="font-mono font-bold text-cyan-400 text-[11px] bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                            {ch.timestamp}
                          </span>
                          <span className="text-white font-medium truncate group-hover:text-cyan-300">
                            {ch.title}
                          </span>
                        </div>
                        <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-8 text-center font-mono">
                    Continuous 16:9 master compilation rendered.
                  </div>
                )}

                {/* Chapter description snippet */}
                {activeClip?.chapter_description && (
                  <div className="mt-auto pt-3 border-t border-white/10 flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Ready for Description:
                    </span>
                    <div className="bg-black/50 p-2.5 rounded-xl font-mono text-[11px] text-slate-400 max-h-24 overflow-y-auto border border-white/5">
                      {activeClip.chapter_description}
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Supabase Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={() => {
          showToast("Signed in successfully!", "success");
        }}
      />
    </div>
  );
}
