"use client";

import React, { useState, useEffect, useRef } from "react";
import SidebarNav from "@/components/navigation/SidebarNav";
import TopUtilityHeader from "@/components/navigation/TopUtilityHeader";
import FloatingCapsuleNavbar from "@/components/navigation/FloatingCapsuleNavbar";
import HeroInputBar from "@/components/studio/HeroInputBar";
import QuickPresetBar from "@/components/studio/QuickPresetBar";
import AdvancedDrawer from "@/components/studio/AdvancedDrawer";
import LivePipelineTracker from "@/components/studio/LivePipelineTracker";
import ClipShowcaseGrid from "@/components/studio/ClipShowcaseGrid";
import HistoryView, { HistoryProject } from "@/components/studio/HistoryView";
import AuthModal from "@/components/AuthModal";
import { useUIFeedback } from "@/components/UIFeedback";
import { supabase, signOut } from "@/lib/supabase";
import { Sparkles, AlertTriangle, RefreshCw, Flame } from "lucide-react";
import { ClipItemData } from "@/components/studio/ClipCard";

const BACKEND_URL = "http://localhost:8000";

interface UserProfile {
  id: string;
  email: string;
  credits_remaining: number;
  max_daily_credits: number;
}

export default function Home() {
  const { showToast, showConfirm } = useUIFeedback();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  
  // Navigation view
  const [activeView, setActiveView] = useState<"studio" | "history">("studio");
  const [history, setHistory] = useState<HistoryProject[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // Video generation state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [segmentDuration, setSegmentDuration] = useState<number>(45);
  const [clippingMode, setClippingMode] = useState<"heuristic" | "ai_enhanced">("ai_enhanced");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [quality, setQuality] = useState<"1080p" | "720p" | "480p">("1080p");
  const [captionStyle, setCaptionStyle] = useState<"hormozi" | "beast" | "karaoke" | "minimal" | "none">("hormozi");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Job processing state
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
  const [progress, setProgress] = useState<number>(5);
  const [progressMessage, setProgressMessage] = useState<string>("Initializing AI engine...");
  const [step, setStep] = useState<string>("initializing");
  const [clips, setClips] = useState<(string | ClipItemData)[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Download feedback states
  const [downloadingClips, setDownloadingClips] = useState<Record<string, "downloading" | "done">>({});
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef<boolean>(false);

  // Initialize theme & auth
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    document.documentElement.classList.toggle("light", initialTheme === "light");

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "history") {
        setActiveView("history");
      }
    }

    supabase.auth.getSession().then((res: any) => {
      const activeSession = res?.data?.session;
      setSession(activeSession);
      if (activeSession?.access_token) {
        fetchUserProfile(activeSession.access_token);
        fetchUserHistory(activeSession.access_token);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, activeSession: any) => {
      setSession(activeSession);
      if (activeSession?.access_token) {
        fetchUserProfile(activeSession.access_token);
        fetchUserHistory(activeSession.access_token);
      } else {
        setHistory([]);
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

  const fetchUserHistory = async (token?: string) => {
    const activeToken = token || session?.access_token;
    if (!activeToken) return;

    setLoadingHistory(true);
    try {
      const res = await fetch(`${BACKEND_URL}/user/clips`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.warn("Could not fetch user history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
    setHistory([]);
    setActiveView("studio");
    setUserProfile({
      id: "guest",
      email: "guest@vakiogiri.ai",
      credits_remaining: 3,
      max_daily_credits: 3,
    });
    showToast("Signed out successfully.", "info");
  };

  const handleReset = () => {
    stopPolling();
    setStatus("idle");
    setClips([]);
    setErrorMsg(null);
    setProgress(5);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!youtubeUrl.trim()) {
      showToast("Please enter a YouTube video URL", "warning");
      return;
    }

    const trimmedUrl = youtubeUrl.trim();
    const isYouTube = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)/i.test(trimmedUrl);
    if (!isYouTube) {
      setErrorMsg(`"${trimmedUrl}" is not a valid YouTube link. Please paste a link like https://www.youtube.com/watch?v=... or https://youtu.be/...`);
      setStatus("failed");
      return;
    }

    if (userProfile.credits_remaining <= 0) {
      showToast("You have reached your daily quota (0/3 remaining). Resets at midnight UTC!", "error");
      return;
    }

    setErrorMsg(null);
    setClips([]);
    setProgress(6);
    setProgressMessage("Starting 3-stage AI best moment pipeline...");
    setStatus("processing");
    stopPolling();

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${BACKEND_URL}/process`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          youtube_url: trimmedUrl,
          segment_duration: segmentDuration,
          mode: clippingMode,
          aspect_ratio: aspectRatio,
          content_type: "shorts",
          stream_output_mode: "clips",
          quality: quality,
          caption_style: captionStyle,
          synthesize_stories: clippingMode === "ai_enhanced",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      const currentJobId = data.job_id;
      setJobId(currentJobId);
      setProgress(data.progress || 12);
      setProgressMessage(data.message || "Downloading audio & video stream...");

      if (data.credits_remaining !== undefined) {
        setUserProfile((prev) => ({ ...prev, credits_remaining: data.credits_remaining }));
      }

      pollIntervalRef.current = setInterval(() => {
        checkStatus(currentJobId);
      }, 1200);

      checkStatus(currentJobId);
    } catch (err: any) {
      setStatus("failed");
      const cleanErr = (err.message || "Could not process this video. Please verify the URL and retry.")
        .replace(/\x1b\[[0-9;]*[a-zA-Z]|\[[0-9;]+m/g, "");
      setErrorMsg(cleanErr);
    }
  };

  const checkStatus = async (currentJobId: string) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    try {
      const res = await fetch(`${BACKEND_URL}/status/${currentJobId}`);
      if (!res.ok) throw new Error("Could not check pipeline status.");

      const data = await res.json();
      if (data.progress !== undefined) setProgress(data.progress);
      if (data.message) setProgressMessage(data.message);
      if (data.step) setStep(data.step);

      if (data.status === "completed") {
        stopPolling();
        setProgress(100);
        setStatus("completed");
        setClips(data.clips || []);
        showToast("Viral clips extracted successfully!", "success");
        fetchUserProfile();
        fetchUserHistory();
      } else if (data.status === "failed") {
        stopPolling();
        setStatus("failed");
        const cleanErr = (data.error || "Processing failed.")
          .replace(/\x1b\[[0-9;]*[a-zA-Z]|\[[0-9;]+m/g, "");
        setErrorMsg(cleanErr);
      }
    } catch (err) {
      console.warn("Polling error:", err);
    } finally {
      isPollingRef.current = false;
    }
  };

  // Download handling
  const getClipUrl = (clip: string | ClipItemData, targetJobId?: string) => {
    const activeJobId = targetJobId || jobId;
    if (typeof clip === "string") {
      if (clip.startsWith("http")) return clip;
      if (clip.startsWith("/clips/")) return `${BACKEND_URL}${clip}`;
      return `${BACKEND_URL}/clips/${activeJobId}/${clip}`;
    }
    if (clip?.url) {
      if (clip.url.startsWith("http")) return clip.url;
      if (clip.url.startsWith("/clips/")) return `${BACKEND_URL}${clip.url}`;
      return `${BACKEND_URL}/clips/${activeJobId}/${clip.url}`;
    }
    return `${BACKEND_URL}/clips/${activeJobId}/${clip?.filename || "clip.mp4"}`;
  };

  const downloadClipFile = (clipUrl: string, filename: string) => {
    const downloadEndpoint = clipUrl.startsWith("http")
      ? `${BACKEND_URL}/download/proxy?url=${encodeURIComponent(clipUrl)}&filename=${encodeURIComponent(filename)}`
      : clipUrl;

    const link = document.createElement("a");
    link.href = downloadEndpoint;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSingle = (clip: string | ClipItemData, targetJobId?: string) => {
    const filename = typeof clip === "object" ? clip.filename : clip;
    const clipUrl = getClipUrl(clip, targetJobId);

    setDownloadingClips((prev) => ({ ...prev, [filename]: "downloading" }));
    downloadClipFile(clipUrl, filename);

    setTimeout(() => {
      setDownloadingClips((prev) => ({ ...prev, [filename]: "done" }));
      setTimeout(() => {
        setDownloadingClips((prev) => {
          const next = { ...prev };
          delete next[filename];
          return next;
        });
      }, 2500);
    }, 600);
  };

  const handleDownloadAll = () => {
    if (clips.length === 0) return;
    setIsDownloadingAll(true);
    clips.forEach((clip, index) => {
      setTimeout(() => {
        handleDownloadSingle(clip);
        if (index === clips.length - 1) {
          setTimeout(() => setIsDownloadingAll(false), 2000);
        }
      }, index * 400);
    });
  };

  const handleDeleteProject = (projectId: string) => {
    if (!session?.access_token) return;

    showConfirm({
      title: "Delete Project",
      message: "Are you sure you want to delete this project and all its generated clips?",
      confirmText: "Delete Project",
      cancelText: "Keep",
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/projects/${projectId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            setHistory((prev) => prev.filter((p) => p.id !== projectId));
            showToast("Project deleted.", "info");
          }
        } catch (err) {
          showToast("Failed to delete project.", "error");
        }
      },
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#ff7427] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex font-sans antialiased relative selection:bg-[#ff7427]/30 selection:text-white ${theme === "dark" ? "dark bg-black text-white" : "light bg-[#f8fafc] text-[#0f172a]"}`}>
      
      {/* Ambient Studio Spotlight Backdrop */}
      <div className="fixed inset-0 ambient-spotlight pointer-events-none -z-10" />

      {/* Conditional Navigation: Authenticated vs Guest */}
      {session ? (
        <>
          {/* Floating Iconsax-style Sidebar Rail (Only visible after login) */}
          <SidebarNav
            activeView={activeView}
            onSelectView={(view) => {
              if (view === "history" && !session) {
                setAuthModalMode("login");
                setIsAuthModalOpen(true);
              } else {
                setActiveView(view as any);
                if (view === "history") fetchUserHistory();
              }
            }}
            historyCount={history.length}
            session={session}
            userProfile={userProfile}
            onOpenAuth={() => {
              setAuthModalMode("login");
              setIsAuthModalOpen(true);
            }}
            onSignOut={handleSignOut}
          />

          {/* Main Studio Canvas Area (beside Sidebar Rail) */}
          <div className="flex-1 flex flex-col min-w-0 pl-0 md:pl-24 transition-all duration-300">
            <TopUtilityHeader
              title={activeView === "history" ? "My Clips Library" : "Shorts Studio"}
              badge="AI Best Moments"
              userProfile={userProfile}
              session={session}
              onOpenAuth={() => {
                setAuthModalMode("login");
                setIsAuthModalOpen(true);
              }}
              onSignOut={handleSignOut}
              theme={theme}
              onToggleTheme={toggleTheme}
            />

            {/* Main Canvas */}
            <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-6xl mx-auto w-full">
        
        {/* VIEW 1: MY CLIPS / HISTORY */}
        {activeView === "history" && (
          <HistoryView
            history={history}
            loading={loadingHistory}
            onDeleteProject={handleDeleteProject}
            onDownloadSingle={handleDownloadSingle}
            onBackToStudio={() => setActiveView("studio")}
            backendUrl={BACKEND_URL}
          />
        )}

        {/* VIEW 2: SHORTS STUDIO */}
        {activeView === "studio" && (
          <div className="w-full flex flex-col items-center gap-8 text-center my-auto">
            
            {/* Completed Results Showcase */}
            {status === "completed" && clips.length > 0 ? (
              <ClipShowcaseGrid
                clips={clips}
                onReset={handleReset}
                onDownloadSingle={handleDownloadSingle}
                onDownloadAll={handleDownloadAll}
                isDownloadingAll={isDownloadingAll}
                downloadingClips={downloadingClips}
                backendUrl={BACKEND_URL}
                jobId={jobId}
              />
            ) : (
              /* Hero Ingestion & Active Processing State */
              <>
                {/* Hero Header */}
                <div className="flex flex-col items-center gap-4 max-w-3xl">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ff7427]/10 text-[#ff7427] border border-[#ff7427]/20 text-xs font-semibold tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>3-Stage AI Best Moment & Virality Engine</span>
                  </div>

                  <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08] text-white">
                    Turn any YouTube video into shorts,{" "}
                    <span className="bg-gradient-to-r from-[#ff7427] via-amber-400 to-white bg-clip-text text-transparent italic font-serif">
                      instantly.
                    </span>
                  </h1>

                  <p className="text-base sm:text-lg text-slate-400 max-w-2xl font-normal leading-relaxed">
                    AI analyzes vocal energy peaks, audience replay heatmaps, and hooks to extract viral-ready vertical clips with zero editing.
                  </p>
                </div>

                {/* Primary Hero URL Input Bar */}
                <HeroInputBar
                  value={youtubeUrl}
                  onChange={setYoutubeUrl}
                  onSubmit={handleGenerate}
                  isProcessing={status === "processing"}
                  onPasteNotification={(msg) => showToast(msg, "info")}
                />

                {/* Quick Presets (Aspect ratio, Duration, Advanced Drawer) */}
                <QuickPresetBar
                  aspectRatio={aspectRatio}
                  onAspectRatioChange={setAspectRatio}
                  segmentDuration={segmentDuration}
                  onSegmentDurationChange={setSegmentDuration}
                  showAdvanced={showAdvanced}
                  onToggleAdvanced={() => setShowAdvanced((prev) => !prev)}
                  disabled={status === "processing"}
                />

                {/* Collapsible Advanced Settings Drawer */}
                <AdvancedDrawer
                  isOpen={showAdvanced}
                  quality={quality}
                  onQualityChange={setQuality}
                  clippingMode={clippingMode}
                  onClippingModeChange={setClippingMode}
                  captionStyle={captionStyle}
                  onCaptionStyleChange={setCaptionStyle}
                  disabled={status === "processing"}
                />

                {/* Live Animated 4-Stage Pipeline Radar (Processing State) */}
                {status === "processing" && (
                  <LivePipelineTracker
                    progress={progress}
                    step={step}
                    progressMessage={progressMessage}
                  />
                )}

                {/* Error State Banner */}
                {status === "failed" && errorMsg && (
                  <div className="w-full max-w-3xl p-5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Generation Failed</h4>
                        <p className="text-xs text-rose-300 mt-0.5 leading-relaxed">{errorMsg}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGenerate()}
                      className="shrink-0 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}
              </>
            )}

          </div>
        )}

        {/* Main Canvas */}
      </main>
      </div>
    </>
  ) : (
    <div className="flex-1 flex flex-col min-w-0 w-full relative">
      {/* Floating Capsule Navbar (Before Login - Exact Design Replicated) */}
      <FloatingCapsuleNavbar
        navItems={[
          {
            id: "studio",
            label: "Studio",
            isActive: activeView === "studio",
            onClick: () => setActiveView("studio"),
          },
          {
            id: "features",
            label: "Features",
            onClick: () => {
              const el = document.getElementById("features");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            },
          },
          {
            id: "library",
            label: "Library",
            isActive: activeView === "history",
            onClick: () => {
              setAuthModalMode("login");
              setIsAuthModalOpen(true);
            },
          },
        ]}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Canvas for Guest */}
      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12 md:pb-16 max-w-6xl mx-auto w-full">
        {/* VIEW 1: MY CLIPS / HISTORY */}
        {activeView === "history" && (
          <HistoryView
            history={history}
            loading={loadingHistory}
            onDeleteProject={handleDeleteProject}
            onDownloadSingle={handleDownloadSingle}
            onBackToStudio={() => setActiveView("studio")}
            backendUrl={BACKEND_URL}
          />
        )}

        {/* VIEW 2: SHORTS STUDIO */}
        {activeView === "studio" && (
          <div className="w-full flex flex-col items-center gap-8 text-center my-auto">
            {status === "idle" && (
              <>
                {/* Hero Title & Subtitle */}
                <div className="space-y-3 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff7427]/10 border border-[#ff7427]/25 text-[#ff7427] text-xs font-semibold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Video Repurposing</span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                    Turn Long Videos into Viral Shorts
                  </h1>
                  <p className="text-sm sm:text-base text-slate-400">
                    Drop a YouTube link and our AI analyzes speech, facial cadence, and audio peaks to deliver polished vertical clips in seconds.
                  </p>
                </div>

                {/* Primary Hero URL Input Bar */}
                <HeroInputBar
                  value={youtubeUrl}
                  onChange={setYoutubeUrl}
                  onSubmit={handleGenerate}
                  isProcessing={false}
                  onPasteNotification={(msg) => showToast(msg, "info")}
                />

                {/* Quick Presets (Aspect ratio, Duration, Advanced Drawer) */}
                <QuickPresetBar
                  aspectRatio={aspectRatio}
                  onAspectRatioChange={setAspectRatio}
                  segmentDuration={segmentDuration}
                  onSegmentDurationChange={setSegmentDuration}
                  showAdvanced={showAdvanced}
                  onToggleAdvanced={() => setShowAdvanced((prev) => !prev)}
                  disabled={false}
                />

                {/* Collapsible Advanced Settings Drawer */}
                <AdvancedDrawer
                  isOpen={showAdvanced}
                  quality={quality}
                  onQualityChange={setQuality}
                  clippingMode={clippingMode}
                  onClippingModeChange={setClippingMode}
                  captionStyle={captionStyle}
                  onCaptionStyleChange={setCaptionStyle}
                  disabled={false}
                />
              </>
            )}

            {/* In-Flight Pipeline Tracker */}
            {status === "processing" && (
              <LivePipelineTracker
                progress={progress}
                step={step}
                progressMessage={progressMessage}
              />
            )}

            {/* Error State Banner */}
            {status === "failed" && errorMsg && (
              <div className="w-full max-w-3xl p-5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Generation Failed</h4>
                    <p className="text-xs text-rose-300 mt-0.5 leading-relaxed">{errorMsg}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  className="shrink-0 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )}

      {/* Supabase Authentication Modal */}
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
