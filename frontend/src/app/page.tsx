"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import SidebarNav from "@/components/navigation/SidebarNav";
import TopUtilityHeader from "@/components/navigation/TopUtilityHeader";
import FloatingCapsuleNavbar from "@/components/navigation/FloatingCapsuleNavbar";
import LandingPage from "@/components/landing/LandingPage";
import HeroInputBar from "@/components/studio/HeroInputBar";
import QuickPresetBar from "@/components/studio/QuickPresetBar";
import AdvancedDrawer from "@/components/studio/AdvancedDrawer";
import LivePipelineTracker from "@/components/studio/LivePipelineTracker";
import ClipShowcaseGrid from "@/components/studio/ClipShowcaseGrid";
import LongStudioView from "@/components/studio/LongStudioView";
import { ShortsStudioCommandCenter, SelectedVideoSource, GenerationConfig } from "@/components/studio/ShortsStudioCommandCenter";
import HistoryView, { HistoryProject } from "@/components/studio/HistoryView";
import { useUIFeedback } from "@/components/UIFeedback";
import { supabase, signOut } from "@/lib/supabase";
import { isAuthorizedEmail } from "@/lib/authConfig";
import { Sparkles, AlertTriangle, RefreshCw, Flame } from "lucide-react";
import { ClipItemData } from "@/components/studio/ClipCard";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface UserProfile {
  id: string;
  email: string;
  credits_remaining: number;
  max_daily_credits: number;
}

export default function Home() {
  const router = useRouter();
  const { showToast, showConfirm } = useUIFeedback();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  
  // Navigation view
  const [activeView, setActiveView] = useState<"studio" | "long_studio" | "history">("studio");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
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
  const handleOpenAuth = (mode: "login" | "signup" = "login") => {
    router.push(mode === "login" ? "/login" : "/signup");
  };

  // Check for pending video URL after signin redirect
  useEffect(() => {
    if (session && typeof window !== "undefined") {
      const pendingUrl = sessionStorage.getItem("pending_youtube_url");
      if (pendingUrl) {
        sessionStorage.removeItem("pending_youtube_url");
        setYoutubeUrl(pendingUrl);
        showToast("Welcome back! Starting shorts generation...", "info");
        setTimeout(() => {
          handleStartCommandCenterGeneration(
            {
              sourceType: "url",
              url: pendingUrl,
              title: "YouTube Video",
            },
            {
              targetDuration: 45,
              aspectRatio: "9:16",
              captionPreset: "hormozi",
              subtitleLanguage: "hinglish",
              layoutMode: "gaming_split",
              clipsCount: 3,
              mode: "ai_enhanced",
              quality: "1080p",
            }
          );
        }, 500);
      }
    }
  }, [session]);

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
  const [activeGenerationSource, setActiveGenerationSource] = useState<SelectedVideoSource | null>(null);
  const [activeGenerationConfig, setActiveGenerationConfig] = useState<GenerationConfig | null>(null);

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
      if (activeSession) {
        const userEmail = activeSession.user?.email;
        if (!isAuthorizedEmail(userEmail)) {
          signOut();
          setSession(null);
          showToast("Access restricted: Only authorized creator (risewithius@gmail.com) can log in.", "error");
          return;
        }
      }
      setSession(activeSession);
      if (activeSession?.access_token) {
        fetchUserProfile(activeSession.access_token);
        fetchUserHistory(activeSession.access_token);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, activeSession: any) => {
      if (activeSession) {
        const userEmail = activeSession.user?.email;
        if (!isAuthorizedEmail(userEmail)) {
          signOut();
          setSession(null);
          showToast("Access restricted: Only authorized creator (risewithius@gmail.com) can log in.", "error");
          return;
        }
      }
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

  const toggleTheme = (e?: React.MouseEvent) => {
    if (typeof window === "undefined") return;

    const nextTheme = theme === "dark" ? "light" : "dark";
    const doc = document as any;

    const updateDOM = () => {
      setTheme(nextTheme);
      localStorage.setItem("theme", nextTheme);
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      document.documentElement.classList.toggle("light", nextTheme === "light");
    };

    // Ultra-Smooth Circular Iris Ripple Transition via View Transitions API
    if (typeof doc.startViewTransition === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const target = (e?.currentTarget || e?.target) as HTMLElement | null;
      let finalX = e?.clientX;
      let finalY = e?.clientY;

      if (target && typeof target.getBoundingClientRect === "function") {
        const rect = target.getBoundingClientRect();
        finalX = rect.left + rect.width / 2;
        finalY = rect.top + rect.height / 2;
      }

      finalX = finalX ?? window.innerWidth - 60;
      finalY = finalY ?? 32;

      const endRadius = Math.hypot(
        Math.max(finalX, window.innerWidth - finalX),
        Math.max(finalY, window.innerHeight - finalY)
      );

      const transition = doc.startViewTransition(() => {
        updateDOM();
      });

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${finalX}px ${finalY}px)`,
              `circle(${endRadius}px at ${finalX}px ${finalY}px)`,
            ],
          },
          {
            duration: 650,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            pseudoElement: "::view-transition-new(root)",
            fill: "forwards",
          }
        );
      });
    } else {
      // Fallback with smooth cubic-bezier CSS transition
      document.documentElement.classList.add("theme-transitioning");
      updateDOM();
      setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
      }, 500);
    }
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
    setActiveGenerationSource(null);
    setActiveGenerationConfig(null);
  };

  const handleStartCommandCenterGeneration = async (
    source: SelectedVideoSource,
    config: GenerationConfig
  ) => {
    setActiveGenerationSource(source);
    setActiveGenerationConfig(config);
    if (config.mode === "ai_enhanced" && userProfile.credits_remaining <= 0) {
      showToast("You have reached your daily quota (0/3 remaining). Switch to Fast Free mode!", "error");
      return;
    }

    setErrorMsg(null);
    setClips([]);
    setProgress(6);
    setProgressMessage("Starting AI Virality pipeline for selected content...");
    setStatus("processing");
    stopPolling();

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const payload: Record<string, any> = {
        segment_duration: config.targetDuration,
        mode: config.mode,
        aspect_ratio: config.aspectRatio,
        content_type: "shorts",
        stream_output_mode: "clips",
        quality: config.quality,
        caption_style: config.captionPreset,
        subtitle_language: (config as any).subtitleLanguage || "hinglish",
        layout_mode: (config as any).layoutMode || "gaming_split",
        synthesize_stories: (config as any).selectedMoments?.length ? false : config.mode === "ai_enhanced",
        max_clips: (config as any).selectedMoments?.length || config.clipsCount,
        selected_moments: (config as any).selectedMoments || null,
        title: source.title,
      };

      if (source.isStream && config.streamStartMin !== undefined) {
        payload.stream_start_min = config.streamStartMin;
        payload.stream_end_min = config.streamEndMin;
      }

      if (source.localFilePath) {
        payload.local_file_path = source.localFilePath;
      } else if (source.url) {
        payload.youtube_url = source.url;
      } else {
        throw new Error("No video source provided.");
      }

      const res = await fetch(`${BACKEND_URL}/process`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      const currentJobId = data.job_id;
      setJobId(currentJobId);
      setProgress(data.progress || 12);
      setProgressMessage(data.message || "Initializing video pipeline...");

      if (data.credits_remaining !== undefined) {
        setUserProfile((prev) => ({ ...prev, credits_remaining: data.credits_remaining }));
      }

      pollIntervalRef.current = setInterval(() => {
        checkStatus(currentJobId);
      }, 1200);

      checkStatus(currentJobId);
    } catch (err: any) {
      setStatus("failed");
      const cleanErr = (err.message || "Could not process this video. Please verify and retry.")
        .replace(/\x1b\[[0-9;]*[a-zA-Z]|\[[0-9;]+m/g, "");
      setErrorMsg(cleanErr);
    }
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
    setActiveGenerationSource({
      sourceType: "url",
      title: "YouTube Video Stream",
      url: trimmedUrl,
    });
    setActiveGenerationConfig({
      targetDuration: segmentDuration,
      aspectRatio: aspectRatio,
      captionPreset: captionStyle,
      clipsCount: 3,
      mode: clippingMode,
      quality: quality,
    });
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
          subtitle_language: "hinglish",
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

  const downloadClipFile = (clipUrl: string, filename: string, targetJobId?: string | null) => {
    // Dedicated clean download endpoint with no query strings to prevent browser naming bugs (e.g. saving as '1')
    const activeJobId = targetJobId || jobId;
    let downloadEndpoint = clipUrl;
    if (activeJobId && filename && !filename.startsWith("http")) {
      downloadEndpoint = `${BACKEND_URL}/download/${activeJobId}/${filename}`;
    } else if (clipUrl.includes("/clips/")) {
      downloadEndpoint = clipUrl.replace("/clips/", "/download/");
    } else {
      const separator = clipUrl.includes("?") ? "&" : "?";
      downloadEndpoint = `${clipUrl}${separator}download=1`;
    }

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
    downloadClipFile(clipUrl, filename, targetJobId || jobId || undefined);

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
    showConfirm({
      title: "Delete Project",
      message: "Are you sure you want to delete this project and all its generated clips?",
      confirmText: "Delete Project",
      cancelText: "Keep",
      isDanger: true,
      onConfirm: async () => {
        try {
          const headers: Record<string, string> = {};
          if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }

          const res = await fetch(`${BACKEND_URL}/projects/${projectId}`, {
            method: "DELETE",
            headers,
          });

          if (res.ok) {
            setHistory((prev) => prev.filter((p) => p.id !== projectId));
            showToast("Project deleted successfully.", "info");
          } else {
            showToast("Could not delete project. Please retry.", "error");
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
          {/* Integrated Modern Sidebar Rail / Panel (Only visible after login) */}
          <SidebarNav
            activeView={activeView}
            onSelectView={(view) => {
              if (view === "history" && !session) {
                handleOpenAuth("login");
              } else {
                setActiveView(view as any);
                if (view === "history") fetchUserHistory();
              }
            }}
            historyCount={history.length}
            session={session}
            userProfile={userProfile}
            onOpenAuth={() => handleOpenAuth("login")}
            onSignOut={handleSignOut}
            isExpanded={isSidebarExpanded}
            onToggleExpand={() => setIsSidebarExpanded((prev) => !prev)}
            theme={theme}
          />

          {/* Main Studio Canvas Area (seamlessly unified with Sidebar and TopUtilityHeader) */}
          <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isSidebarExpanded ? "pl-0 md:pl-[240px]" : "pl-0 md:pl-[72px]"
          }`}>
            <TopUtilityHeader
              title={
                activeView === "history"
                  ? "My Clips Library"
                  : activeView === "long_studio"
                  ? "Long Studio"
                  : "Shorts Studio"
              }
              userProfile={userProfile}
              session={session}
              onOpenAuth={() => handleOpenAuth("login")}
              onSignOut={handleSignOut}
              theme={theme}
              onToggleTheme={toggleTheme}
              isSidebarExpanded={isSidebarExpanded}
              onToggleSidebar={() => setIsSidebarExpanded((prev) => !prev)}
            />

            {/* Main Canvas */}
            <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-[1720px] mx-auto w-full transition-all duration-300">
        
        {/* VIEW 1: MY CLIPS / HISTORY */}
        {activeView === "history" && (
          <HistoryView
            history={history}
            loading={loadingHistory}
            onDeleteProject={handleDeleteProject}
            onDownloadSingle={handleDownloadSingle}
            onBackToStudio={() => setActiveView("studio")}
            backendUrl={BACKEND_URL}
            theme={theme}
          />
        )}

        {/* VIEW 2: LONG STUDIO (STREAM HIGHLIGHTS & SUPERCUTS) */}
        {activeView === "long_studio" && (
          <LongStudioView
            session={session}
            userProfile={userProfile}
            onRefreshProfile={() => {
              if (session?.access_token) {
                fetchUserProfile(session.access_token);
              }
            }}
          />
        )}

        {/* VIEW 3: SHORTS STUDIO COMMAND CENTER */}
        {activeView === "studio" && (
          <div className="w-full flex flex-col gap-8">
            
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
            ) : status === "processing" ? (
              /* Live Multi-Short Production Grid (Processing State) */
              <div className="w-full flex flex-col items-center gap-6 my-auto pt-6 pb-12 animate-in fade-in">
                <LivePipelineTracker
                  progress={progress}
                  step={step}
                  progressMessage={progressMessage}
                  title={activeGenerationSource?.title || "Rendering Curated Shorts"}
                  thumbnail={activeGenerationSource?.thumbnail}
                  selectedMoments={activeGenerationConfig?.selectedMoments}
                  clipsCount={activeGenerationConfig?.selectedMoments?.length || activeGenerationConfig?.clipsCount || 3}
                  onCancel={handleReset}
                />
              </div>
            ) : (
              /* Creator Ingestion Command Center */
              <ShortsStudioCommandCenter
                backendUrl={BACKEND_URL}
                isProcessing={false}
                creditsRemaining={userProfile.credits_remaining}
                onStartGeneration={handleStartCommandCenterGeneration}
                showToast={showToast}
                sessionToken={session?.access_token}
                theme={theme}
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
                  onClick={handleReset}
                  className="shrink-0 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            )}

          </div>
        )}

        {/* Main Canvas */}
      </main>
      </div>
    </>
  ) : (
    <div className="flex-1 flex flex-col min-w-0 w-full relative bg-black">
      {/* Floating Capsule Navbar (Before Login - Exact Design Replicated & Preserved) */}
      <FloatingCapsuleNavbar
        navItems={[
          {
            id: "how-it-works",
            label: "How It Works",
            onClick: () => {
              const el = document.getElementById("how-it-works");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            },
          },
          {
            id: "styles",
            label: "Styles",
            onClick: () => {
              const el = document.getElementById("styles");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            },
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
            id: "faq",
            label: "FAQ",
            onClick: () => {
              const el = document.getElementById("faq");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            },
          },
        ]}
        onOpenAuth={(mode) => handleOpenAuth(mode || "login")}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Canvas for Guest */}
      <main className="flex-grow flex flex-col items-center justify-start w-full">
        {/* VIEW 1: MY CLIPS / HISTORY */}
        {activeView === "history" && (
          <div className="px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12 md:pb-16 max-w-[1720px] mx-auto w-full transition-all duration-300">
            <HistoryView
              history={history}
              loading={loadingHistory}
              onDeleteProject={handleDeleteProject}
              onDownloadSingle={handleDownloadSingle}
              onBackToStudio={() => setActiveView("studio")}
              backendUrl={BACKEND_URL}
            />
          </div>
        )}

        {/* VIEW 2: SHORTS STUDIO OR FULL LANDING PAGE */}
        {activeView === "studio" && (
          <>
            {status === "idle" ? (
              <LandingPage
                onGenerate={(url) => {
                  setYoutubeUrl(url);
                  if (!session) {
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("pending_youtube_url", url);
                    }
                    handleOpenAuth("signup");
                  } else {
                    handleGenerate();
                  }
                }}
                onOpenAuth={(mode) => handleOpenAuth(mode || "signup")}
              />
            ) : (
              <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-8 text-center px-4 pt-28 pb-16">
                {/* In-Flight Pipeline Tracker */}
                {status === "processing" && (
                  <LivePipelineTracker
                    progress={progress}
                    step={step}
                    progressMessage={progressMessage}
                    title={activeGenerationSource?.title || "Rendering Curated Shorts"}
                    thumbnail={activeGenerationSource?.thumbnail}
                    selectedMoments={activeGenerationConfig?.selectedMoments}
                    clipsCount={activeGenerationConfig?.selectedMoments?.length || activeGenerationConfig?.clipsCount || 3}
                    onCancel={handleReset}
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
          </>
        )}
      </main>
    </div>
  )}


    </div>
  );
}
