"use client";

import { useState, useEffect, useRef } from "react";
import AuthModal from "../components/AuthModal";
import TopNavBar, { NavItem } from "../components/TopNavBar";
import { supabase, signOut } from "../lib/supabase";

const BACKEND_URL = "http://localhost:8000";

interface ClipItem {
  filename: string;
  url: string;
  is_cloud?: boolean;
  title?: string;
  score?: number;
  start?: number;
  end?: number;
  duration?: number;
}

interface JobStatusResponse {
  job_id: string;
  status: "processing" | "completed" | "failed";
  step?: string;
  progress?: number;
  message?: string;
  clips?: (string | ClipItem)[];
  error?: string;
}

interface UserProfile {
  id: string;
  email: string;
  credits_remaining: number;
  max_daily_credits: number;
}

interface HistoryProject {
  id: string;
  youtube_url: string;
  status: string;
  segment_duration: number;
  clips_count: number;
  clips: (string | ClipItem)[];
  created_at: string;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
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
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
  const [progress, setProgress] = useState<number>(5);
  const [progressMessage, setProgressMessage] = useState<string>("Initializing...");
  const [step, setStep] = useState<string>("initializing");
  const [clips, setClips] = useState<(string | ClipItem)[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load theme and auth session
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Check initial Supabase session
    supabase.auth.getSession().then((res: any) => {
      const session = res?.data?.session;
      setSession(session);
      if (session?.access_token) {
        fetchUserProfile(session.access_token);
        fetchUserHistory(session.access_token);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session?.access_token) {
        fetchUserProfile(session.access_token);
        fetchUserHistory(session.access_token);
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

  const fetchUserProfile = async (token?: string) => {
    const activeToken = token || session?.access_token;
    if (!activeToken) {
      setUserProfile({
        id: "guest",
        email: "guest@vakiogiri.ai",
        credits_remaining: 3,
        max_daily_credits: 3,
      });
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/user/me`, {
        headers: {
          "Authorization": `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (err) {
      console.warn("Could not fetch user profile from backend:", err);
    }
  };

  const fetchUserHistory = async (token?: string) => {
    const activeToken = token || session?.access_token;
    if (!activeToken) return;

    setLoadingHistory(true);
    try {
      const res = await fetch(`${BACKEND_URL}/user/clips`, {
        headers: {
          "Authorization": `Bearer ${activeToken}`
        }
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

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handleOpenAuth = (mode: "login" | "signup") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
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
  };

  const getClipUrl = (clip: any, targetJobId?: string) => {
    const activeJobId = targetJobId || jobId;
    if (!clip) return "";
    if (typeof clip === "string") {
      if (clip.startsWith("http://") || clip.startsWith("https://")) return clip;
      if (clip.startsWith("/clips/")) return `${BACKEND_URL}${clip}`;
      return `${BACKEND_URL}/clips/${activeJobId}/${clip}`;
    }
    if (typeof clip === "object") {
      if (clip.url) {
        if (clip.url.startsWith("http://") || clip.url.startsWith("https://")) return clip.url;
        if (clip.url.startsWith("/clips/")) return `${BACKEND_URL}${clip.url}`;
        return `${BACKEND_URL}/clips/${activeJobId}/${clip.url}`;
      }
      if (clip.filename) {
        return `${BACKEND_URL}/clips/${activeJobId}/${clip.filename}`;
      }
    }
    return "";
  };

  const getClipFilename = (clip: any) => {
    if (!clip) return "clip.mp4";
    if (typeof clip === "string") {
      return clip.split("/").pop() || clip;
    }
    if (typeof clip === "object") {
      return clip.filename || "clip.mp4";
    }
    return "clip.mp4";
  };

  const isClipCloudHosted = (clip: any) => {
    return typeof clip === "object" && clip.is_cloud === true;
  };

  const formatSeconds = (sec?: number) => {
    if (sec === undefined || sec === null || isNaN(sec)) return "";
    const totalSeconds = Math.max(0, Math.floor(sec));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getClipTitle = (clip: any, index: number) => {
    if (typeof clip === "object" && clip.title) {
      return clip.title;
    }
    return `Best Moment #${index + 1}`;
  };

  const getClipScore = (clip: any) => {
    if (typeof clip === "object" && typeof clip.score === "number") {
      return clip.score;
    }
    return 85;
  };

  const getClipTimeRange = (clip: any) => {
    if (typeof clip === "object" && clip.start !== undefined && clip.end !== undefined) {
      return `${formatSeconds(clip.start)} - ${formatSeconds(clip.end)}`;
    }
    return null;
  };

  // Direct forced MP4 file download (solves browser popup / XML issues)
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

  const handleDownloadSingle = (clip: string | ClipItem, targetJobId?: string) => {
    const clipUrl = getClipUrl(clip, targetJobId);
    const filename = getClipFilename(clip);
    downloadClipFile(clipUrl, filename);
  };

  const handleDownloadAll = (targetClips = clips, targetJobId = jobId) => {
    if (targetClips.length === 0) return;
    targetClips.forEach((clip, index) => {
      setTimeout(() => {
        handleDownloadSingle(clip, targetJobId || undefined);
      }, index * 250);
    });
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!session?.access_token) return;
    if (!window.confirm("Are you sure you want to delete this project and its clips?")) return;

    try {
      const res = await fetch(`${BACKEND_URL}/user/clips/${projectId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        setHistory((prev) => prev.filter((p) => p.id !== projectId));
      } else {
        alert("Could not delete project. Please try again.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!youtubeUrl.trim()) {
      setErrorMsg("Please paste a YouTube URL first.");
      return;
    }

    const trimmedUrl = youtubeUrl.trim();
    const isYouTube = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)/i.test(trimmedUrl);
    if (!isYouTube) {
      setErrorMsg(`"${trimmedUrl}" is not a valid YouTube video link. Please enter a valid link like https://www.youtube.com/watch?v=... or https://youtu.be/...`);
      setStatus("failed");
      return;
    }

    if (userProfile.credits_remaining <= 0) {
      setErrorMsg("You have reached your daily quota (0/3 video generations remaining). Quota resets at midnight UTC!");
      return;
    }

    setErrorMsg(null);
    setClips([]);
    setProgress(5);
    setProgressMessage("Starting video processing...");
    setStatus("processing");
    stopPolling();

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${BACKEND_URL}/process`, {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          youtube_url: youtubeUrl.trim(),
          segment_duration: segmentDuration
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error (${res.status})`);
      }

      const data = await res.json();
      const currentJobId = data.job_id;
      setJobId(currentJobId);
      setProgress(data.progress || 10);
      setProgressMessage(data.message || "Downloading video...");

      if (data.credits_remaining !== undefined) {
        setUserProfile((prev) => ({ ...prev, credits_remaining: data.credits_remaining }));
      }

      pollIntervalRef.current = setInterval(() => {
        checkStatus(currentJobId);
      }, 800);

      checkStatus(currentJobId);
    } catch (err: any) {
      setStatus("failed");
      setErrorMsg(err.message || "We couldn't process that link. Please check if the video is public and try again.");
    }
  };

  const checkStatus = async (currentJobId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/status/${currentJobId}`);
      if (!res.ok) {
        throw new Error("Failed to read job status from backend.");
      }

      const data: JobStatusResponse = await res.json();

      if (data.progress !== undefined) {
        setProgress(data.progress);
      }
      if (data.message) {
        setProgressMessage(data.message);
      }
      if (data.step) {
        setStep(data.step);
      }

      if (data.status === "completed") {
        stopPolling();
        setProgress(100);
        setStatus("completed");
        setClips(data.clips || []);
        fetchUserProfile(session?.access_token);
        fetchUserHistory(session?.access_token);
      } else if (data.status === "failed") {
        stopPolling();
        setStatus("failed");
        setErrorMsg(data.error || "We couldn't process that video. Please check if the link is valid.");
        fetchUserProfile(session?.access_token);
        fetchUserHistory(session?.access_token);
      }
    } catch (err: any) {
      stopPolling();
      setStatus("failed");
      setErrorMsg(err.message || "Error polling backend status.");
    }
  };

  const handleReset = () => {
    stopPolling();
    setStatus("idle");
    setJobId(null);
    setProgress(5);
    setProgressMessage("");
    setClips([]);
    setErrorMsg(null);
    setYoutubeUrl("");
    setActiveView("studio");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background text-on-background flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-body-md antialiased relative ${theme === "dark" ? "dark bg-slate-950 text-slate-100" : "bg-background text-on-background"}`}>
      
      {/* Background radial glow */}
      <div className="absolute inset-0 premium-bg pointer-events-none -z-10"></div>

      {/* TopNavBar */}
      <TopNavBar
        logo={{
          name: "Vakiogiri",
          icon: "auto_awesome",
          onClick: handleReset,
        }}
        navItems={[
          {
            id: "studio",
            label: "Studio",
            icon: "auto_fix_high",
            isActive: activeView === "studio",
            onClick: () => setActiveView("studio"),
          },
          {
            id: "history",
            label: "My Clips",
            icon: "video_library",
            badgeCount: history.length > 0 ? history.length : undefined,
            isActive: activeView === "history",
            onClick: () => {
              if (!session) {
                handleOpenAuth("login");
              } else {
                setActiveView("history");
                fetchUserHistory();
              }
            },
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
        onSignOut={handleSignOut}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Canvas */}
      <main className="flex-grow flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop py-stack-lg max-w-container-max mx-auto w-full min-h-[75vh]">
        
        {/* ========================================================================= */}
        {/* VIEW 2: MY CLIPS / GENERATION HISTORY                                      */}
        {/* ========================================================================= */}
        {activeView === "history" && (
          <div className="w-full max-w-container-max flex flex-col gap-8 fade-in my-auto py-4">
            
            {/* Gallery Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/40 pb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-on-surface tracking-tight">My Generated Clips</h1>
                <p className="text-sm text-secondary mt-1">
                  Access, stream, and download all your past vertical video cut projects.
                </p>
              </div>

              <button
                onClick={() => setActiveView("studio")}
                className="bg-primary text-on-primary font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-surface-tint transition-all shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>New Video</span>
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-secondary">
                <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
                <p className="text-sm">Loading your clips gallery...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-surface-container-lowest border border-outline-variant/50 rounded-3xl p-8 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-3xl">video_library</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">No clips generated yet</h3>
                  <p className="text-xs text-secondary mt-1 max-w-xs">
                    Paste a YouTube link in the Studio to create your first viral shorts project!
                  </p>
                </div>
                <button
                  onClick={() => setActiveView("studio")}
                  className="mt-2 px-6 py-2.5 bg-primary text-on-primary font-semibold text-xs rounded-xl hover:bg-surface-tint transition-all shadow-sm cursor-pointer"
                >
                  Go to Studio
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                {history.map((project, pIndex) => (
                  <div 
                    key={project.id || pIndex}
                    className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6 flex flex-col gap-6 shadow-sm relative overflow-hidden"
                  >
                    {/* Project Meta Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-outline-variant/30 pb-4">
                      <div className="flex flex-col gap-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-lg">smart_display</span>
                          <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                            Project #{history.length - pIndex}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container-low text-secondary font-medium">
                            {project.segment_duration || 45}s Cuts
                          </span>
                        </div>
                        <a 
                          href={project.youtube_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-on-surface hover:text-primary transition-colors truncate max-w-md"
                        >
                          {project.youtube_url}
                        </a>
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-xs text-outline">
                          {new Date(project.created_at).toLocaleDateString()}
                        </span>
                        {project.clips && project.clips.length > 0 && (
                          <button
                            onClick={() => handleDownloadAll(project.clips, project.id)}
                            className="px-3.5 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold rounded-xl border border-outline-variant/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">download</span>
                            <span>Download All</span>
                          </button>
                        )}
                        {/* Delete Project Button */}
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          title="Delete project"
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Clips Grid */}
                    {project.clips && project.clips.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {project.clips.map((clip, cIndex) => {
                          const clipUrl = getClipUrl(clip, project.id);
                          const filename = getClipFilename(clip);
                          const isCloud = isClipCloudHosted(clip);
                          const title = getClipTitle(clip, cIndex);
                          const score = getClipScore(clip);
                          const timeRange = getClipTimeRange(clip);

                          return (
                            <div 
                              key={filename + cIndex}
                              className="bg-surface-container-low border border-outline-variant/40 rounded-2xl overflow-hidden flex flex-col shadow-xs"
                            >
                              <div className="relative aspect-[9/16] bg-slate-900 overflow-hidden">
                                <video
                                  src={clipUrl}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              <div className="p-3 flex flex-col gap-2 justify-between flex-grow">
                                <div className="flex flex-col gap-1">
                                  <div className="flex justify-between items-start gap-1">
                                    <span className="font-semibold text-on-surface text-xs truncate max-w-[140px]" title={title}>
                                      {title}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                      score >= 90
                                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                        : "bg-primary/15 text-primary"
                                    }`}>
                                      🔥 {score}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-[10px] text-secondary">
                                    {timeRange && (
                                      <span className="font-mono bg-surface-container px-1 rounded">
                                        {timeRange}
                                      </span>
                                    )}
                                    {isCloud && (
                                      <span className="px-1 bg-primary/10 text-primary font-bold rounded">
                                        CDN
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDownloadSingle(clip, project.id)}
                                  className="w-full py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 border border-outline-variant/40 transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[14px]">download</span>
                                  <span>Download MP4</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-4 text-xs text-secondary italic">
                        {project.status === "failed" ? "Processing failed for this video." : "No clips available."}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: STUDIO (GENERATOR CANVAS)                                         */}
        {/* ========================================================================= */}
        {activeView === "studio" && (
          <>
            {/* STATE 1: IDLE / LANDING */}
            {status === "idle" && (
              <div className="max-w-[840px] w-full text-center flex flex-col gap-10 items-center fade-in my-auto py-6">
                
                {/* Hero Typography */}
                <div className="flex flex-col gap-5 items-center">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide">
                    <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                    <span>3-Stage AI Best Moment Detector</span>
                  </div>
                  <h1 className="text-[44px] leading-[1.1] md:text-[72px] md:leading-[1.05] font-bold text-on-surface tracking-tighter">
                    Turn any YouTube video into shorts, <span className="text-primary italic font-medium">instantly.</span>
                  </h1>
                  <p className="text-[18px] md:text-[20px] leading-[28px] md:leading-[32px] text-secondary max-w-2xl mt-1 font-light">
                    Smart AI finds the highest-energy, viral spikes using audio energy peaks, comment timestamps, and speech hook validation.
                  </p>
                </div>

                {/* Input Form */}
                <form onSubmit={handleGenerate} className="w-full max-w-[680px] relative mt-2 flex flex-col gap-4 group">
                  <div className="relative flex items-center bg-surface-container-lowest rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline-variant/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-outline-variant transition-all duration-300 p-2 overflow-hidden">
                    <div className="pl-4 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">link</span>
                    </div>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="w-full pl-3 pr-4 py-4 bg-transparent border-none text-[18px] text-on-surface placeholder:text-outline/70 focus:ring-0 focus:outline-none transition-all"
                      required
                    />
                    <button
                      type="submit"
                      disabled={!youtubeUrl.trim() || userProfile.credits_remaining <= 0}
                      className="px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md text-[15px] font-semibold hover:bg-surface-tint transition-all flex items-center gap-2 shadow-sm active:scale-[0.98] shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <span>Detect & Clip</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>

                  {/* Options & Duration Selector */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs">
                    {/* Duration Pills */}
                    <div className="flex items-center gap-2">
                      <span className="text-secondary font-medium">Moment Length:</span>
                      {[30, 45, 60].map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setSegmentDuration(dur)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            segmentDuration === dur
                              ? "bg-primary text-on-primary shadow-sm"
                              : "bg-surface-container-low text-secondary hover:text-on-surface border border-outline-variant/60"
                          }`}
                        >
                          {dur}s
                        </button>
                      ))}
                    </div>

                    <span className="text-outline font-label-sm">
                      Max 1080p • Auto 9:16 Center Crop
                    </span>
                  </div>

                  {userProfile.credits_remaining <= 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-600 dark:text-amber-400 text-center">
                      Daily free limit reached (0/3 generations left). Your quota resets at midnight UTC!
                    </div>
                  )}
                </form>

                {/* Three-step preview */}
                <div id="how-it-works" className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-3xl mt-12 pt-10 border-t border-outline-variant/30 text-left">
                  <div className="flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary font-bold font-label-md mb-1">1</div>
                    <h3 className="font-headline-sm text-[18px] text-on-surface font-semibold">1. Audio Spike Vibe Check</h3>
                    <p className="font-body-sm text-secondary leading-relaxed">Librosa scans dB amplitude peaks for high energy, laughter, and climaxes.</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary font-bold font-label-md mb-1">2</div>
                    <h3 className="font-headline-sm text-[18px] text-on-surface font-semibold">2. Social Proof & Comments</h3>
                    <p className="font-body-sm text-secondary leading-relaxed">Mines YouTube comment timestamps to boost community-favorite moments.</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary font-bold font-label-md mb-1">3</div>
                    <h3 className="font-headline-sm text-[18px] text-on-surface font-semibold">3. AI Sense & 9:16 Shorts</h3>
                    <p className="font-body-sm text-secondary leading-relaxed">Whisper transcripts & LLM hook ratings pick the top 3 viral vertical shorts.</p>
                  </div>
                </div>

              </div>
            )}

            {/* STATE 2: PROCESSING */}
            {status === "processing" && (
              <div className="w-full max-w-2xl flex flex-col items-center text-center fade-in my-auto py-8">
                
                {/* Animated Processing Icon */}
                <div className="w-16 h-16 mb-6 flex items-center justify-center rounded-2xl bg-primary/10">
                  <span className="material-symbols-outlined text-4xl text-primary animate-spin" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>sync</span>
                </div>

                <h1 className="font-display-lg text-[36px] md:text-[48px] text-on-surface mb-2 font-bold">Detecting best moments...</h1>
                <p className="font-body-lg text-body-lg text-secondary mb-6 max-w-lg">
                  {progressMessage || "Processing video and scoring highest engagement moments..."}
                </p>

                {/* Live 3-Stage Stepper */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  {/* Stage 1: Audio Vibe */}
                  <div className={`p-3.5 rounded-2xl border flex flex-col gap-1.5 transition-all text-left ${
                    step === "analyzing_audio" || (progress >= 35 && progress < 55)
                      ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                      : progress >= 55
                      ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-surface-container-low border-outline-variant/40 opacity-70"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-base">graphic_eq</span>
                        <span>1. Vibe Check</span>
                      </div>
                      {progress >= 55 ? (
                        <span className="material-symbols-outlined text-base text-emerald-500">check_circle</span>
                      ) : step === "analyzing_audio" || (progress >= 35 && progress < 55) ? (
                        <span className="material-symbols-outlined text-base text-primary animate-spin">progress_activity</span>
                      ) : (
                        <span className="text-[10px] text-secondary font-mono">dB Spikes</span>
                      )}
                    </div>
                    <p className="text-[11px] text-secondary">Librosa amplitude peaks</p>
                  </div>

                  {/* Stage 2: Social Proof */}
                  <div className={`p-3.5 rounded-2xl border flex flex-col gap-1.5 transition-all text-left ${
                    step === "analyzing_comments" || (progress >= 55 && progress < 70)
                      ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                      : progress >= 70
                      ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-surface-container-low border-outline-variant/40 opacity-70"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-base">forum</span>
                        <span>2. Social Proof</span>
                      </div>
                      {progress >= 70 ? (
                        <span className="material-symbols-outlined text-base text-emerald-500">check_circle</span>
                      ) : step === "analyzing_comments" || (progress >= 55 && progress < 70) ? (
                        <span className="material-symbols-outlined text-base text-primary animate-spin">progress_activity</span>
                      ) : (
                        <span className="text-[10px] text-secondary font-mono">Comments</span>
                      )}
                    </div>
                    <p className="text-[11px] text-secondary">Timestamp mention boost</p>
                  </div>

                  {/* Stage 3: Sense Check */}
                  <div className={`p-3.5 rounded-2xl border flex flex-col gap-1.5 transition-all text-left ${
                    step === "analyzing_transcript" || (progress >= 70 && progress < 85)
                      ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                      : progress >= 85
                      ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-surface-container-low border-outline-variant/40 opacity-70"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-base">psychology</span>
                        <span>3. Sense Check</span>
                      </div>
                      {progress >= 85 ? (
                        <span className="material-symbols-outlined text-base text-emerald-500">check_circle</span>
                      ) : step === "analyzing_transcript" || (progress >= 70 && progress < 85) ? (
                        <span className="material-symbols-outlined text-base text-primary animate-spin">progress_activity</span>
                      ) : (
                        <span className="text-[10px] text-secondary font-mono">AI Hooks</span>
                      )}
                    </div>
                    <p className="text-[11px] text-secondary">Whisper & viral hook rating</p>
                  </div>
                </div>

                {/* Live Progress Card */}
                <div className="w-full bg-surface-container-low border border-outline-variant rounded-2xl p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden text-left">
                  <div className="flex items-center justify-between text-secondary text-sm">
                    <div className="flex items-center gap-2 truncate max-w-[80%]">
                      <span className="material-symbols-outlined text-base">link</span>
                      <span className="truncate">{youtubeUrl}</span>
                    </div>
                    <span className="font-bold text-primary">{progress}%</span>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="w-full bg-outline-variant/30 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-secondary pt-1">
                    <span className="capitalize">{step.replace('_', ' ')}</span>
                    <span>{segmentDuration}s best moments • Auto 9:16</span>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="font-body-sm text-body-sm text-outline">Lightweight center-cropping & zero-disk cloud sync active.</p>
                </div>
              </div>
            )}

            {/* STATE 3: ERROR STATE */}
            {status === "failed" && (
              <div className="max-w-[480px] w-full text-center flex flex-col items-center fade-in my-auto py-8">
                <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mb-stack-lg">
                  <span className="material-symbols-outlined text-primary text-[32px]">error</span>
                </div>

                <h1 className="font-display-lg text-[36px] md:text-[48px] text-on-surface mb-stack-sm tracking-tight font-bold">Something went wrong.</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant mb-stack-lg max-w-[400px]">
                  {errorMsg || "We couldn't process that link. Please check if the video is public and try again."}
                </p>

                <button
                  onClick={() => handleGenerate()}
                  className="bg-primary text-on-primary font-label-md text-label-md px-gutter py-3 rounded-full flex items-center gap-2 hover:opacity-90 transition-all duration-300 shadow-md active:opacity-100 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  <span>Try again</span>
                </button>
              </div>
            )}

            {/* STATE 4: RESULTS */}
            {status === "completed" && (
              <div className="w-full max-w-container-max flex flex-col gap-stack-lg fade-in my-auto">
                
                {/* Header */}
                <header className="flex flex-col gap-stack-sm md:items-center text-left md:text-center">
                  <h1 className="font-display-lg text-[40px] md:text-[56px] text-on-background font-bold">Your Clips are Ready</h1>
                  <p className="font-body-lg text-body-lg text-secondary max-w-[600px] mx-auto">
                    We've auto-framed and rendered {clips.length} vertical short(s) for your video.
                  </p>
                </header>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/40 pb-stack-sm">
                  <span className="font-label-md text-label-md text-secondary">
                    {clips.length} clip{clips.length !== 1 ? "s" : ""} generated (1080x1920)
                  </span>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => handleDownloadAll()}
                      className="w-full sm:w-auto bg-primary text-on-primary font-label-md text-label-md px-gutter py-2.5 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
                      <span>Download All</span>
                    </button>
                  </div>
                </div>

                {/* Video Cards Grid */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
                  {clips.map((clip, index) => {
                    const clipUrl = getClipUrl(clip);
                    const filename = getClipFilename(clip);
                    const isCloud = isClipCloudHosted(clip);
                    const title = getClipTitle(clip, index);
                    const score = getClipScore(clip);
                    const timeRange = getClipTimeRange(clip);

                    return (
                      <article 
                        key={filename + index}
                        className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all group"
                      >
                        {/* Video Player */}
                        <div className="relative aspect-[9/16] bg-slate-900 overflow-hidden flex items-center justify-center">
                          <video
                            src={clipUrl}
                            controls
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Meta & Download */}
                        <div className="p-4 flex flex-col gap-3 justify-between flex-grow">
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-start gap-2">
                              <h2 className="font-label-lg text-[15px] text-on-surface font-bold leading-tight">
                                {title}
                              </h2>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs ${
                                  score >= 90
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    : score >= 80
                                    ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                                    : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                                }`}>
                                  <span>🔥</span>
                                  <span>{score} Score</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-secondary">
                              <span className="text-[11px] font-medium text-secondary">
                                Rank #{index + 1}
                              </span>
                              {timeRange && (
                                <span className="flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md bg-surface-container text-secondary">
                                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                                  <span>{timeRange}</span>
                                </span>
                              )}
                              {isCloud && (
                                <span className="font-label-sm text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-md font-semibold">
                                  CDN
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDownloadSingle(clip)}
                            className="w-full bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs py-2.5 rounded-xl border border-primary/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            <span>Download MP4 (9:16)</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>

              </div>
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-outline-variant/30 py-6 mt-auto">
        <div className="max-w-container-max mx-auto px-gutter flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-secondary">
          <div>
            © 2026 Vakiogiri. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>Daily 3 Free Generations Policy</span>
            <span>Zero-Disk Cloud Storage</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={() => {
          supabase.auth.getSession().then((res: any) => {
            const session = res?.data?.session;
            setSession(session);
            fetchUserProfile(session?.access_token);
            if (session?.access_token) {
              fetchUserHistory(session.access_token);
            }
          });
        }}
      />

    </div>
  );
}
