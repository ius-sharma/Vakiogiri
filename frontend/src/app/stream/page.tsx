"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AuthModal from "../../components/AuthModal";
import TopNavBar from "../../components/TopNavBar";
import { supabase, signOut } from "../../lib/supabase";

const BACKEND_URL = "http://localhost:8000";

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
  is_synthesized?: boolean;
  is_compilation?: boolean;
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
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

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
  const [skipIntroMin, setSkipIntroMin] = useState<number>(15); // default skip 15 min intro
  const [startMin, setStartMin] = useState<number>(0);
  const [endMin, setEndMin] = useState<number>(180); // 3 hours cap default

  // Video settings
  const [targetReelDuration, setTargetReelDuration] = useState<number>(300); // 300s = 5 mins
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9"); // 16:9 default for streams
  const [outputMode, setOutputMode] = useState<"single_reel" | "both" | "clips">("single_reel");
  const [quality, setQuality] = useState<"1080p" | "720p" | "480p">("1080p");
  const [clippingMode, setClippingMode] = useState<"heuristic" | "ai_enhanced">("heuristic");

  // Pipeline Status State
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
  const [progress, setProgress] = useState<number>(5);
  const [progressMessage, setProgressMessage] = useState<string>("Initializing...");
  const [step, setStep] = useState<string>("initializing");
  const [clips, setClips] = useState<(string | ClipItem)[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Results player state
  const [selectedClipIndex, setSelectedClipIndex] = useState<number>(0);
  const [copiedChapters, setCopiedChapters] = useState(false);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef<boolean>(false);

  // Paste helper
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setYoutubeUrl(text.trim());
        setPasted(true);
        setTimeout(() => setPasted(false), 2000);
      }
    } catch (err) {
      console.warn("Clipboard access denied", err);
    }
  };

  // Mount & Auth Init
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    supabase.auth.getSession().then((res: any) => {
      const session = res?.data?.session;
      setSession(session);
      if (session?.access_token) {
        fetchUserProfile(session.access_token);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session?.access_token) {
        fetchUserProfile(session.access_token);
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

  const fetchUserProfile = async (token?: string) => {
    const activeToken = token || session?.access_token;
    if (!activeToken) return;
    try {
      const res = await fetch(`${BACKEND_URL}/user/me`, {
        headers: { "Authorization": `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (err) {
      console.warn("Could not fetch user profile", err);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  const handleOpenAuth = (mode: "login" | "signup") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    isPollingRef.current = false;
  };

  const handleReset = () => {
    stopPolling();
    setStatus("idle");
    setJobId(null);
    setClips([]);
    setErrorMsg(null);
    setProgress(5);
    setStreamAnalysis(null);
    setStreamAnalysisError(null);
  };

  // Step 1: Pre-flight Stream Analysis (Duration & Info)
  const handleAnalyzeStream = async () => {
    if (!youtubeUrl.trim()) {
      setStreamAnalysisError("Please paste a YouTube stream URL first.");
      return;
    }

    const trimmedUrl = youtubeUrl.trim();
    const isYouTube = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)/i.test(trimmedUrl);
    if (!isYouTube) {
      setStreamAnalysisError(`"${trimmedUrl}" is not a valid YouTube stream URL. Please paste a valid link like https://www.youtube.com/watch?v=... or https://youtube.com/live/...`);
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
        throw new Error("Yeh live stream abhi chal rahi hai (Live). Stream khatam hone ke baad hi highlight clips banaye ja sakte hain!");
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

      // Calibrate slider bounds to the stream's exact duration
      setEndMin(totalMin);
      setStartMin(0);
      const safeIntro = Math.min(15, Math.max(0, Math.floor(totalMin * 0.2)));
      setSkipIntroMin(safeIntro);

    } catch (err: any) {
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        setStreamAnalysisError("Backend server se connect nahi ho pa raha (Port 8000). Kripya check karein ki backend server chal raha hai: 'uvicorn main:app --reload --port 8000'");
      } else {
        setStreamAnalysisError(err.message || "Failed to analyze stream. Please check the URL.");
      }
    } finally {
      setAnalyzingStream(false);
    }
  };

  // Start Stream Processing
  const handleSubmitStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim() || status === "processing") return;

    if (userProfile.credits_remaining <= 0) {
      setErrorMsg("Daily credit limit reached! You will receive 3 free credits tomorrow.");
      return;
    }

    setErrorMsg(null);
    setClips([]);
    setProgress(5);
    setProgressMessage("Starting stream highlight extraction...");
    setStatus("processing");
    stopPolling();

    // Compute effective stream bounds
    const streamStartMin = rangeMode === "skip_intro" ? skipIntroMin : startMin;
    const streamEndMin = rangeMode === "custom_range" && endMin > startMin ? endMin : undefined;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const payload = {
        youtube_url: youtubeUrl.trim(),
        content_type: "stream",
        aspect_ratio: aspectRatio,
        segment_duration: targetReelDuration,
        stream_output_mode: outputMode,
        quality: quality,
        mode: clippingMode,
        stream_start_min: streamStartMin,
        stream_end_min: streamEndMin,
        synthesize_stories: false,
      };

      const res = await fetch(`${BACKEND_URL}/process`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error (${res.status})`);
      }

      const data = await res.json();
      const currentJobId = data.job_id;
      setJobId(currentJobId);
      setProgress(data.progress || 8);
      setProgressMessage(data.message || "Downloading stream recording...");

      if (data.credits_remaining !== undefined) {
        setUserProfile((prev) => ({ ...prev, credits_remaining: data.credits_remaining }));
      }

      pollIntervalRef.current = setInterval(() => {
        checkStatus(currentJobId);
      }, 1400);

      checkStatus(currentJobId);
    } catch (err: any) {
      setStatus("failed");
      const cleanError = (err.message || "Failed to start stream highlights processing.")
        .replace(/\x1b\[[0-9;]*[a-zA-Z]|\[[0-9;]+m/g, "");
      setErrorMsg(cleanError);
    }
  };

  const checkStatus = async (currentJobId: string) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    try {
      const res = await fetch(`${BACKEND_URL}/status/${currentJobId}`);
      if (!res.ok) throw new Error("Status check failed");
      const data = await res.json();

      setStep(data.step || "processing");
      if (data.progress !== undefined) setProgress(data.progress);
      if (data.message) setProgressMessage(data.message);

      if (data.status === "completed") {
        setStatus("completed");
        setClips(data.clips || []);
        setSelectedClipIndex(0);
        stopPolling();
      } else if (data.status === "failed") {
        setStatus("failed");
        const cleanError = (data.error || "Stream processing failed.")
          .replace(/\x1b\[[0-9;]*[a-zA-Z]|\[[0-9;]+m/g, "");
        setErrorMsg(cleanError);
        stopPolling();
      }
    } catch (err) {
      console.warn("Poll status check error:", err);
    } finally {
      isPollingRef.current = false;
    }
  };

  const getActiveClip = (): ClipItem | null => {
    if (!clips || clips.length === 0) return null;
    const item = clips[selectedClipIndex];
    if (typeof item === "string") {
      return { filename: item, url: `${BACKEND_URL}/clips/${jobId}/${item}` };
    }
    return item;
  };

  const copyChapterDescription = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChapters(true);
    setTimeout(() => setCopiedChapters(false), 2500);
  };

  const seekToTimestamp = (seconds: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = seconds;
      videoPlayerRef.current.play().catch(() => {});
    }
  };

  const activeClip = getActiveClip();

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-body transition-colors duration-200">
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={() => {
          setIsAuthModalOpen(false);
          supabase.auth.getSession().then((res: any) => {
            const sess = res?.data?.session;
            setSession(sess);
            if (sess?.access_token) fetchUserProfile(sess.access_token);
          });
        }}
      />

      {/* Top Navigation */}
      <TopNavBar
        logo={{
          name: "Vakiogiri",
          icon: "sports_esports",
          onClick: handleReset,
        }}
        navItems={[
          {
            id: "shorts",
            label: "Shorts Studio",
            icon: "auto_fix_high",
            href: "/",
          },
          {
            id: "stream",
            label: "Stream Studio",
            icon: "sports_esports",
            isActive: true,
          },
        ]}
        authActions={{
          loginLabel: "Log in",
          onLogin: () => handleOpenAuth("login"),
          signupLabel: "Start for free",
          onSignup: () => handleOpenAuth("signup"),
        }}
        session={session}
        userProfile={userProfile}
        onSignOut={() => signOut().then(() => setSession(null))}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-grow flex flex-col items-center px-4 md:px-8 py-8 max-w-6xl mx-auto w-full">
        {/* Studio Hero Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold uppercase tracking-wider mb-3">
            <span className="material-symbols-outlined text-sm">stadia_controller</span>
            <span>Gaming & Stream Supercut Engine</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-tight">
            Turn 4-Hour Streams into <span className="text-primary">Master Highlights</span>
          </h1>
          <p className="text-sm md:text-base text-secondary mt-2 max-w-xl">
            Automatically detect gaming screams, clutch 1v4 kills, and rage moments. Skip boring stream intros with precision sliders.
          </p>
        </div>

        {/* Studio View */}
        {status !== "completed" ? (
          <div className="w-full max-w-3xl flex flex-col gap-6">
            {/* Input Card */}
            <form
              onSubmit={handleSubmitStream}
              className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 relative"
            >
              {/* YouTube URL Bar */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center justify-between">
                  <span>Stream URL</span>
                  <span className="text-[11px] text-primary/80 lowercase">YouTube VOD / Stream links</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-secondary flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-xl text-primary">play_circle</span>
                  </div>
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
                    className="w-full bg-surface-container/40 border border-outline-variant/60 rounded-2xl py-3.5 pl-12 pr-28 text-sm text-on-surface placeholder:text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:opacity-50"
                  />
                  <div className="absolute right-2 flex items-center">
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      disabled={status === "processing" || analyzingStream}
                      className="px-3.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-secondary hover:text-on-surface text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {pasted ? "done" : "content_paste"}
                      </span>
                      <span>{pasted ? "Pasted!" : "Paste"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Analysis Error Notification */}
              {streamAnalysisError && (
                <div className="p-3.5 bg-error-container/20 border border-error/30 text-on-surface rounded-2xl text-xs flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-error text-lg shrink-0">info</span>
                  <span className="text-secondary leading-snug">{streamAnalysisError}</span>
                </div>
              )}

              {/* STEP 1: INITIAL STATE (Only "Analyse Stream" button shown) */}
              {!streamAnalysis ? (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleAnalyzeStream}
                    disabled={analyzingStream || !youtubeUrl.trim() || status === "processing"}
                    className="w-full bg-primary hover:bg-surface-tint text-on-primary font-bold py-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {analyzingStream ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                        <span>Analyzing Stream (Checking Duration & Details)...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xl">query_stats</span>
                        <span>Analyse Stream</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2 text-xs text-secondary bg-surface-container/30 border border-outline-variant/30 rounded-xl p-3">
                    <span className="material-symbols-outlined text-primary text-base shrink-0">info</span>
                    <span>Paste any YouTube gaming stream or VOD link. We will inspect the stream duration first so you can configure highlight filters accurately.</span>
                  </div>
                </div>
              ) : (
                /* STEP 2: STREAM ANALYZED (All controls and filters unlocked) */
                <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                  {/* Stream Overview Card */}
                  <div className="bg-surface-container/40 border border-primary/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {streamAnalysis.thumbnail ? (
                        <img
                          src={streamAnalysis.thumbnail}
                          alt={streamAnalysis.title}
                          className="w-20 h-14 object-cover rounded-xl border border-outline-variant/40 shrink-0 bg-surface-container-high"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                          <span className="material-symbols-outlined text-2xl">movie</span>
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                          <span>Stream Analyzed</span>
                        </span>
                        <h4 className="text-sm font-bold text-on-surface truncate" title={streamAnalysis.title}>
                          {streamAnalysis.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-secondary mt-0.5">
                          {streamAnalysis.uploader && <span className="font-medium text-on-surface/80">{streamAnalysis.uploader}</span>}
                          {streamAnalysis.uploader && <span>•</span>}
                          <span className="font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            ⏱️ Duration: {streamAnalysis.duration_formatted} ({Math.floor(streamAnalysis.duration / 60)} mins)
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStreamAnalysis(null);
                        setStreamAnalysisError(null);
                      }}
                      className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-secondary hover:text-on-surface rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">swap_horiz</span>
                      <span>Change URL</span>
                    </button>
                  </div>

                  {/* STREAM SEGMENT SLIDER (Calibrated to stream duration) */}
                  {(() => {
                    const totalStreamMin = Math.max(1, Math.floor(streamAnalysis.duration / 60));
                    const maxIntroMin = Math.min(60, Math.max(10, Math.floor(totalStreamMin * 0.75)));
                    const presets = [0, 10, 15, 25, 40].filter((p) => p <= maxIntroMin);

                    return (
                      <div className="bg-surface-container/30 border border-outline-variant/40 rounded-2xl p-5 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">tune</span>
                            <span className="text-sm font-bold text-on-surface">Stream Segment & Intro Filter</span>
                          </div>

                          {/* Mode Tabs */}
                          <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-xl self-start sm:self-auto text-xs">
                            <button
                              type="button"
                              onClick={() => setRangeMode("skip_intro")}
                              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                                rangeMode === "skip_intro"
                                  ? "bg-primary text-on-primary shadow-xs"
                                  : "text-secondary hover:text-on-surface"
                              }`}
                            >
                              Skip Intro Chit-Chat
                            </button>
                            <button
                              type="button"
                              onClick={() => setRangeMode("custom_range")}
                              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                                rangeMode === "custom_range"
                                  ? "bg-primary text-on-primary shadow-xs"
                                  : "text-secondary hover:text-on-surface"
                              }`}
                            >
                              Custom Range
                            </button>
                          </div>
                        </div>

                        {/* Skip Intro Slider View */}
                        {rangeMode === "skip_intro" ? (
                          <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-secondary">
                                Streamer chatting & mic testing will be ignored for first:
                              </span>
                              <span className="font-mono font-bold text-primary text-sm bg-primary/10 px-2.5 py-0.5 rounded-md">
                                {skipIntroMin} Minutes ({skipIntroMin * 60}s)
                              </span>
                            </div>

                            <input
                              type="range"
                              min={0}
                              max={maxIntroMin}
                              step={5}
                              value={skipIntroMin}
                              onChange={(e) => setSkipIntroMin(Number(e.target.value))}
                              disabled={status === "processing"}
                              className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                            />

                            {/* Quick Presets */}
                            <div className="flex items-center justify-between text-[11px] text-secondary">
                              <span>0m (Full Stream)</span>
                              <div className="flex items-center gap-1.5">
                                {presets.map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setSkipIntroMin(preset)}
                                    className={`px-2 py-0.5 rounded border transition-all ${
                                      skipIntroMin === preset
                                        ? "border-primary bg-primary/10 text-primary font-bold"
                                        : "border-outline-variant/60 text-secondary hover:text-on-surface"
                                    }`}
                                  >
                                    {preset}m {preset === 15 ? "⭐" : ""}
                                  </button>
                                ))}
                              </div>
                              <span>{maxIntroMin}m Max</span>
                            </div>

                            <p className="text-[11px] text-secondary italic">
                              💡 Tip: Setting 15m ignores streamer greetings/chatting and starts detecting when actual gameplay begins.
                            </p>
                          </div>
                        ) : (
                          /* Custom Time Range (Start Min to End Min) */
                          <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs">
                                  <span className="text-secondary">Start From:</span>
                                  <span className="font-mono font-bold text-primary">{startMin} min</span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={Math.max(0, totalStreamMin - 5)}
                                  step={5}
                                  value={startMin}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setStartMin(val);
                                    if (val >= endMin) setEndMin(Math.min(totalStreamMin, val + 15));
                                  }}
                                  className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs">
                                  <span className="text-secondary">Analyze Until:</span>
                                  <span className="font-mono font-bold text-primary">{endMin} min</span>
                                </div>
                                <input
                                  type="range"
                                  min={startMin + 5}
                                  max={totalStreamMin}
                                  step={5}
                                  value={endMin}
                                  onChange={(e) => setEndMin(Number(e.target.value))}
                                  className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                              </div>
                            </div>
                            <div className="text-[11px] text-secondary bg-surface-container-high/40 p-2 rounded-lg">
                              Analyzing stream slice: <span className="font-semibold text-on-surface">{startMin}m ➔ {endMin}m</span> (Duration: {endMin - startMin} mins out of {totalStreamMin} mins).
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Target Highlight Reel Length */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center justify-between">
                      <span>Target Reel Length</span>
                      <span className="text-[11px] text-secondary">Master compilation runtime</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: "⚡ 2 Mins", duration: 120, sub: "Quick Teaser" },
                        { label: "🎬 3 Mins", duration: 180, sub: "Fast Highlights" },
                        { label: "🔥 5 Mins", duration: 300, sub: "YouTube Ideal" },
                        { label: "🏆 10 Mins", duration: 600, sub: "Extended Supercut" },
                      ].map((item) => (
                        <button
                          key={item.duration}
                          type="button"
                          onClick={() => setTargetReelDuration(item.duration)}
                          className={`p-3 rounded-2xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                            targetReelDuration === item.duration
                              ? "border-primary bg-primary/10 text-on-surface shadow-xs ring-1 ring-primary"
                              : "border-outline-variant/60 bg-surface-container/20 text-secondary hover:text-on-surface hover:border-outline-variant"
                          }`}
                        >
                          <span className="font-bold text-xs sm:text-sm text-on-surface">{item.label}</span>
                          <span className="text-[10px] text-secondary">{item.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality & Aspect Ratio Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Target Quality */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
                        Export Quality
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "1080p", label: "1080p FHD" },
                          { id: "720p", label: "720p HD" },
                          { id: "480p", label: "480p Fast" },
                        ].map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setQuality(q.id as any)}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                              quality === q.id
                                ? "bg-primary text-on-primary border-primary shadow-xs"
                                : "border-outline-variant/60 text-secondary hover:text-on-surface bg-surface-container/20"
                            }`}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
                        Aspect Ratio
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAspectRatio("16:9")}
                          className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                            aspectRatio === "16:9"
                              ? "bg-primary text-on-primary border-primary shadow-xs"
                              : "border-outline-variant/60 text-secondary hover:text-on-surface bg-surface-container/20"
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">tv</span>
                          <span>16:9 Widescreen</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAspectRatio("9:16")}
                          className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                            aspectRatio === "9:16"
                              ? "bg-primary text-on-primary border-primary shadow-xs"
                              : "border-outline-variant/60 text-secondary hover:text-on-surface bg-surface-container/20"
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">stay_current_portrait</span>
                          <span>9:16 Vertical</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="flex flex-col gap-3 pt-2 border-t border-outline-variant/40">
                    <button
                      type="submit"
                      disabled={status === "processing"}
                      className="w-full bg-primary hover:bg-surface-tint text-on-primary font-bold py-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined">auto_videocam</span>
                      <span>Extract Stream Highlights ({quality})</span>
                    </button>

                    <div className="flex items-center justify-between text-xs text-secondary px-1">
                      <span>Available Credits: <strong className="text-on-surface">{userProfile.credits_remaining}</strong></span>
                      <span>100% Free & Local Processing</span>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Live Progress Bar (During Processing) */}
            {status === "processing" && (
              <div className="bg-surface-container-lowest border border-primary/30 rounded-3xl p-6 shadow-sm flex flex-col gap-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
                    <span className="text-sm font-bold text-on-surface">Extracting Stream Highlights...</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {progress}%
                  </span>
                </div>

                <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-secondary">
                  <span className="truncate max-w-[85%]">{progressMessage}</span>
                  <span className="font-mono uppercase text-[11px] text-primary">{step}</span>
                </div>
              </div>
            )}

            {/* Error Message Display */}
            {status === "failed" && errorMsg && (
              <div className="bg-error-container/20 border border-error/30 text-on-surface rounded-3xl p-5 flex items-start gap-3">
                <span className="material-symbols-outlined text-error text-xl shrink-0 mt-0.5">error</span>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-bold text-error">Stream Clipping Notice</span>
                  <p className="text-secondary leading-relaxed">{errorMsg}</p>
                  <button
                    onClick={handleReset}
                    className="self-start mt-2 px-3 py-1 bg-surface-container text-on-surface font-semibold rounded-lg hover:bg-surface-container-high transition-all text-xs"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* RESULTS VIEW: 16:9 Cinema Player & Chapters */
          <div className="w-full flex flex-col gap-6 animate-in fade-in duration-400">
            {/* Top Bar Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6">
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Highlights Generation Complete
                </span>
                <h2 className="text-2xl font-extrabold text-on-surface mt-1">
                  {activeClip?.title || "Master Highlights Supercut"}
                </h2>
                <div className="flex items-center gap-3 text-xs text-secondary mt-1">
                  <span>Quality: <strong className="text-on-surface">{activeClip?.quality || quality}</strong></span>
                  <span>•</span>
                  <span>Duration: <strong className="text-on-surface">{Math.round((activeClip?.duration || 0) / 60)} mins</strong></span>
                  <span>•</span>
                  <span>Ratio: <strong className="text-on-surface">{activeClip?.aspect_ratio || "16:9"}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-secondary hover:text-on-surface rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Clip Another</span>
                </button>
                {activeClip && (
                  <a
                    href={activeClip.url}
                    download={activeClip.filename}
                    className="px-5 py-2.5 bg-primary text-on-primary hover:bg-surface-tint rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span>Download Master Reel</span>
                  </a>
                )}
              </div>
            </div>

            {/* Video Player & Chapters Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: 16:9 Cinema Video Player */}
              <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-4 sm:p-6 flex flex-col gap-4">
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
                    <div className="w-full h-full flex items-center justify-center text-secondary">
                      Loading video player...
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-secondary px-1">
                  <span>Aspect: {activeClip?.aspect_ratio || "16:9 Widescreen"}</span>
                  <span>Bitrate-Optimized H.264 (Lossless Master)</span>
                </div>
              </div>

              {/* Right 1 Col: Interactive Chapters & Description */}
              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">bookmarks</span>
                    <span className="text-sm font-bold text-on-surface">YouTube Chapters</span>
                  </div>
                  {activeClip?.chapter_description && (
                    <button
                      onClick={() => copyChapterDescription(activeClip.chapter_description || "")}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {copiedChapters ? "check" : "content_copy"}
                      </span>
                      <span>{copiedChapters ? "Copied!" : "Copy"}</span>
                    </button>
                  )}
                </div>

                {/* Chapter Timestamp List */}
                {activeClip?.chapters && activeClip.chapters.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                    {activeClip.chapters.map((ch, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => seekToTimestamp(ch.seconds)}
                        className="text-left p-3 rounded-xl bg-surface-container/30 hover:bg-surface-container-high/60 border border-outline-variant/30 transition-all flex items-center justify-between gap-2 text-xs group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="font-mono font-bold text-primary text-[11px] bg-primary/10 px-2 py-0.5 rounded">
                            {ch.timestamp}
                          </span>
                          <span className="text-on-surface font-medium truncate group-hover:text-primary">
                            {ch.title}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-sm text-secondary group-hover:text-primary shrink-0">
                          play_arrow
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-secondary py-8 text-center">
                    Seamless continuous highlight reel rendered.
                  </div>
                )}

                {/* YouTube Description Box */}
                {activeClip?.chapter_description && (
                  <div className="mt-auto pt-3 border-t border-outline-variant/30 flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                      Ready for YouTube Description:
                    </span>
                    <div className="bg-surface-container/40 p-2.5 rounded-xl font-mono text-[11px] text-secondary max-h-24 overflow-y-auto">
                      {activeClip.chapter_description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
