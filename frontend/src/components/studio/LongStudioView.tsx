"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUIFeedback } from "@/components/UIFeedback";
import {
  Search,
  X,
  Check,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  FileVideo,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Laptop,
  Link2,
  Flame,
  TrendingUp,
  Download,
  Copy,
  Clipboard,
  Loader2,
  Scissors,
  Radio,
  Eye,
  Share2,
  MonitorPlay,
  Play,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
} from "lucide-react";
import LivePipelineTracker from "./LivePipelineTracker";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const Youtube = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export interface StreamChapterItem {
  id: string;
  title: string;
  start: number;
  end: number;
  duration: number;
  score: number;
  heatmap_score?: number;
  reason?: string;
  topic?: string;
}

export interface StreamItemData {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  duration_formatted: string;
  uploader?: string;
  view_count?: number;
  published_at?: string;
}

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

interface YouTubeChannelInfo {
  channel_id?: string;
  channel_title?: string;
  channel_handle?: string;
  channel_thumbnail?: string;
  subscriber_count?: string;
  video_count?: string;
}

interface LongStudioViewProps {
  session?: any;
  userProfile?: UserProfile;
  onRefreshProfile?: () => void;
  theme?: "light" | "dark";
  backendUrl?: string;
}

export default function LongStudioView({
  session,
  userProfile,
  onRefreshProfile,
  theme = "dark",
  backendUrl = BACKEND_URL,
}: LongStudioViewProps) {
  const isLight = theme === "light";
  const { showToast } = useUIFeedback();

  // Navigation tabs (Exact match to Shorts Studio)
  const [activeTab, setActiveTab] = useState<"channel" | "upload" | "url">("channel");

  // Workflow states: "source_select" | "discovering" | "moments_review" | "processing" | "completed" | "failed"
  const [viewMode, setViewMode] = useState<"source_select" | "discovering" | "moments_review" | "processing" | "completed" | "failed">("source_select");

  // YouTube Channel State
  const [channelConnected, setChannelConnected] = useState<boolean>(false);
  const [connectedChannelData, setConnectedChannelData] = useState<YouTubeChannelInfo | null>(null);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState<boolean>(false);
  const [channelStreams, setChannelStreams] = useState<StreamItemData[]>([]);
  const [isLoadingChannel, setIsLoadingChannel] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Selected Source State
  const [selectedSource, setSelectedSource] = useState<{
    sourceType: "channel" | "upload" | "url";
    title: string;
    url: string;
    duration?: number;
    durationFormatted?: string;
    thumbnail?: string;
    uploader?: string;
    filePath?: string;
  } | null>(null);

  // Upload Tab State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<{
    filePath: string;
    fileName: string;
    duration?: number;
    durationFormatted?: string;
    sizeMb?: number;
    title?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // URL Tab State
  const [directUrl, setDirectUrl] = useState<string>("");
  const [isProbingUrl, setIsProbingUrl] = useState<boolean>(false);
  const [probedVideo, setProbedVideo] = useState<{
    title: string;
    duration: number;
    durationFormatted: string;
    thumbnail: string;
    uploader?: string;
  } | null>(null);

  // Stream Pre-flight Generation Settings
  const [targetDuration, setTargetDuration] = useState<number>(180); // seconds per chapter
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [outputMode, setOutputMode] = useState<"single_reel" | "clips">("single_reel");
  const [skipIntroMin, setSkipIntroMin] = useState<number>(15);
  const [quality, setQuality] = useState<string>("1080p");

  // Discovered Moments / Chapters
  const [discoveredChapters, setDiscoveredChapters] = useState<StreamChapterItem[]>([]);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [discoveryStep, setDiscoveryStep] = useState<number>(1);

  // Pipeline Execution State
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(5);
  const [progressMessage, setProgressMessage] = useState<string>("Initializing stream slice...");
  const [step, setStep] = useState<string>("initializing");
  const [clips, setClips] = useState<(string | ClipItem)[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Results State
  const [selectedClipIndex, setSelectedClipIndex] = useState<number>(0);
  const [copiedChapters, setCopiedChapters] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef<boolean>(false);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Fetch channel connection and streams on mount
  useEffect(() => {
    checkChannelStatus();
  }, []);

  const checkChannelStatus = async () => {
    setIsLoadingChannel(true);
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      // 1. Check persistent channel connection
      const statusRes = await fetch(`${backendUrl}/auth/youtube/status`, { headers });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.connected && statusData.channel) {
          setChannelConnected(true);
          setConnectedChannelData(statusData.channel);
        }
      }

      // 2. Fetch ONLY streams from user's channel (/auth/youtube/my-streams)
      const res = await fetch(`${backendUrl}/auth/youtube/my-streams`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.connected && data.channel) {
          setChannelConnected(true);
          setConnectedChannelData(data.channel);
        }
        if (Array.isArray(data.streams)) {
          setChannelStreams(data.streams);
        }
      }
    } catch (err) {
      console.warn("YouTube streams check error:", err);
    } finally {
      setIsLoadingChannel(false);
    }
  };

  const handleInitiateOAuth = async () => {
    setIsConnectingOAuth(true);
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`${backendUrl}/auth/youtube/url`, { headers });
      if (!res.ok) throw new Error("Could not start Google authorization");
      const data = await res.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (err: any) {
      showToast(err.message || "Failed to start YouTube authentication.", "error");
      setIsConnectingOAuth(false);
    }
  };

  const handleDisconnectChannel = async () => {
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`${backendUrl}/auth/youtube/disconnect`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        setChannelConnected(false);
        setConnectedChannelData(null);
        setChannelStreams([]);
        setSelectedSource(null);
        showToast("YouTube channel disconnected.", "info");
      }
    } catch (err: any) {
      showToast("Failed to disconnect YouTube channel.", "error");
    }
  };

  const formatSeconds = (totalSeconds: number) => {
    const total = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);
    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Upload Local File
  const handleFileUpload = async (file: File) => {
    const validExtensions = [".mp4", ".mov", ".mkv", ".webm"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      showToast("Please upload an MP4, MOV, MKV, or WEBM video file.", "error");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${backendUrl}/upload/file`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Video upload failed");
      }

      const data = await res.json();
      const uploadedMeta = {
        filePath: data.file_path,
        fileName: data.file_name,
        duration: data.duration,
        durationFormatted: data.duration_formatted,
        sizeMb: data.size_mb,
        title: data.title,
      };

      setUploadedFile(uploadedMeta);
      setSelectedSource({
        sourceType: "upload",
        title: uploadedMeta.title || uploadedMeta.fileName,
        url: `${backendUrl}/download/${uploadedMeta.fileName}`,
        duration: uploadedMeta.duration,
        durationFormatted: uploadedMeta.durationFormatted,
        filePath: uploadedMeta.filePath,
      });

      showToast("Stream video uploaded successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to upload video.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Direct URL Probe
  const handleProbeUrl = async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setIsProbingUrl(true);
    setProbedVideo(null);

    try {
      const res = await fetch(`${backendUrl}/stream/probe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_url: trimmed }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to inspect YouTube URL");
      }

      const data = await res.json();
      const probeResult = {
        title: data.title || "YouTube Stream",
        duration: data.duration || 0,
        durationFormatted: data.duration_formatted || formatSeconds(data.duration || 0),
        thumbnail: data.thumbnail || (data.video_id ? `https://img.youtube.com/vi/${data.video_id}/hqdefault.jpg` : ""),
        uploader: data.uploader || "",
      };

      setProbedVideo(probeResult);
      setSelectedSource({
        sourceType: "url",
        title: probeResult.title,
        url: trimmed,
        duration: probeResult.duration,
        durationFormatted: probeResult.durationFormatted,
        thumbnail: probeResult.thumbnail,
        uploader: probeResult.uploader,
      });

      showToast("Stream inspected successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Could not inspect YouTube stream URL.", "error");
      setProbedVideo(null);
    } finally {
      setIsProbingUrl(false);
    }
  };

  // Filter streams by search
  const filteredStreams = channelStreams.filter((stream) =>
    stream.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // STAGE 1 -> STAGE 2: Discover Highlights via Vakiogiri Creative Director
  const handleDiscoverHighlights = async () => {
    if (!selectedSource) {
      showToast("Please select a stream video first.", "error");
      return;
    }

    setIsDiscovering(true);
    setViewMode("discovering");
    setDiscoveryStep(1);

    const stepTimer = setInterval(() => {
      setDiscoveryStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1500);

    try {
      const payload: Record<string, any> = {
        target_duration: targetDuration,
        max_moments: 6,
        video_title: selectedSource.title,
        duration: selectedSource.duration,
      };

      if (selectedSource.sourceType === "upload" && selectedSource.filePath) {
        payload.local_file_path = selectedSource.filePath;
      } else {
        payload.video_url = selectedSource.url;
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${backendUrl}/moments/discover`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      clearInterval(stepTimer);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Stream highlight discovery failed.");
      }

      const data = await res.json();
      const moments: any[] = data.moments || [];
      if (moments.length === 0) {
        throw new Error("No high-retention highlights identified for this stream.");
      }

      const chapters: StreamChapterItem[] = moments.map((m: any, idx: number) => ({
        id: m.id || `chapter-${idx + 1}`,
        title: m.title || `Chapter #${idx + 1} • High Energy Climax`,
        start: Number(m.start) || 0,
        end: Number(m.end) || (Number(m.start) || 0) + targetDuration,
        duration: Math.round((Number(m.end) || 0) - (Number(m.start) || 0)) || targetDuration,
        score: Math.round(Number(m.score) || 88),
        heatmap_score: Math.round(Number(m.heatmap_score) || 85),
        reason: m.reason || "High vocal intensity and narrative resolution detected by Vakiogiri Creative Director.",
        topic: m.topic || `Climax Sequence #${idx + 1}`,
      }));

      setDiscoveredChapters(chapters);
      // Pre-select top 3 chapters by default
      const defaultSelected = chapters.slice(0, 3).map((c) => c.id);
      setSelectedChapterIds(defaultSelected);
      setViewMode("moments_review");
      showToast(`Discovered ${chapters.length} high-energy stream chapters!`, "success");
    } catch (err: any) {
      clearInterval(stepTimer);
      setViewMode("source_select");
      showToast(err.message || "Failed to discover stream highlights.", "error");
    } finally {
      setIsDiscovering(false);
    }
  };

  // Toggle chapter selection
  const toggleChapterSelection = (id: string) => {
    setSelectedChapterIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // STAGE 3 -> STAGE 4: Start rendering selected chapters with Live Vakiogiri Engine
  const handleRenderSelectedChapters = async () => {
    if (selectedChapterIds.length === 0) {
      showToast("Please select at least 1 chapter to render.", "error");
      return;
    }

    if ((userProfile?.credits_remaining ?? 3) <= 0) {
      showToast("Daily credit limit reached (0/3 remaining).", "error");
      return;
    }

    setErrorMsg(null);
    setClips([]);
    setProgress(5);
    setProgressMessage("Starting Live Vakiogiri Engine stream compilation...");
    setViewMode("processing");
    stopPolling();

    try {
      const selectedMomentsPayload = discoveredChapters
        .filter((c) => selectedChapterIds.includes(c.id))
        .map((c) => ({
          start: c.start,
          end: c.end,
          title: c.title,
          score: c.score,
        }));

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const startSec = skipIntroMin * 60;
      const endSec = selectedSource?.duration || undefined;

      const bodyPayload = {
        youtube_url: selectedSource?.url || directUrl.trim(),
        start_time: startSec,
        end_time: endSec,
        target_reel_duration: targetDuration,
        aspect_ratio: aspectRatio,
        output_mode: outputMode,
        quality: quality,
        clipping_mode: "ai_enhanced",
        selected_moments: selectedMomentsPayload,
      };

      const res = await fetch(`${backendUrl}/stream/process`, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Stream compilation failed to queue.");
      }

      const data = await res.json();
      const currentJobId = data.job_id;
      setJobId(currentJobId);

      if (onRefreshProfile) onRefreshProfile();
      startPolling(currentJobId);
      showToast("Live Vakiogiri Engine rendering started!", "success");
    } catch (err: any) {
      setViewMode("failed");
      setErrorMsg(err.message || "Failed to start stream compilation.");
      showToast(err.message || "Failed to start stream compilation.", "error");
    }
  };

  const startPolling = (currentJobId: string) => {
    stopPolling();
    isPollingRef.current = true;

    pollIntervalRef.current = setInterval(async () => {
      if (!isPollingRef.current) return;
      try {
        const res = await fetch(`${backendUrl}/status/${currentJobId}`);
        if (!res.ok) return;

        const data = await res.json();
        setProgress(data.progress || 5);
        if (data.progress_message) setProgressMessage(data.progress_message);
        if (data.step) setStep(data.step);

        if (data.status === "completed") {
          stopPolling();
          setViewMode("completed");
          setProgress(100);
          setClips(data.clips || []);
          showToast("Master stream highlights compiled successfully!", "success");
          if (onRefreshProfile) onRefreshProfile();
        } else if (data.status === "failed") {
          stopPolling();
          setViewMode("failed");
          setErrorMsg(data.error_message || "Stream highlight generation failed.");
          showToast("Stream generation failed: " + (data.error_message || "Unknown error"), "error");
          if (onRefreshProfile) onRefreshProfile();
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    }, 2000);
  };

  const stopPolling = () => {
    isPollingRef.current = false;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handleReset = () => {
    stopPolling();
    setViewMode("source_select");
    setClips([]);
    setProgress(5);
    setErrorMsg(null);
    setJobId(null);
    setDiscoveredChapters([]);
    setSelectedChapterIds([]);
  };

  const copyChapterDescription = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChapters(true);
    showToast("YouTube chapters & timestamps copied to clipboard!", "success");
    setTimeout(() => setCopiedChapters(false), 2000);
  };

  const activeClip: ClipItem | null =
    clips.length > 0
      ? typeof clips[selectedClipIndex] === "string"
        ? {
            filename: clips[selectedClipIndex] as string,
            url: `${backendUrl}/clips/${jobId}/${clips[selectedClipIndex]}`,
            title: selectedSource?.title || "Master Highlights Supercut",
          }
        : (clips[selectedClipIndex] as ClipItem)
      : null;

  const activeClipUrl = activeClip?.url
    ? activeClip.url.startsWith("http")
      ? activeClip.url
      : `${backendUrl}${activeClip.url}`
    : "";

  return (
    <div className="w-full flex flex-col gap-6 max-w-7xl mx-auto px-4 sm:px-6">

      {/* STATE 2: DISCOVERY RADAR (Vakiogiri Creative Director) */}
      {viewMode === "discovering" && (
        <div className="w-full max-w-2xl mx-auto p-8 rounded-3xl bg-[#121218] border border-white/10 shadow-2xl flex flex-col items-center gap-6 text-center animate-in fade-in duration-300 my-auto">
          {/* Concentric Telemetry Radar Animation */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-[#ff7427]/20 animate-ping" />
            <div className="absolute inset-3 rounded-full border border-[#ff7427]/30 animate-pulse" />
            <div className="absolute inset-7 rounded-full border border-[#ff7427]/40" />
            <div className="w-16 h-16 rounded-2xl bg-[#ff7427]/15 border border-[#ff7427]/40 flex items-center justify-center text-[#ff7427] shadow-xl">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#ff7427]/15 text-[#ff7427] border border-[#ff7427]/30 self-center flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-[#ff7427]" />
              <span>Vakiogiri Creative Director</span>
            </span>

            <h3 className="text-xl font-bold text-white tracking-tight">
              Analyzing Stream Narrative & High-Energy Peaks
            </h3>
            <p className="text-xs text-slate-400 max-w-md">
              Scanning vocal spikes, chat excitement climaxes, and clutch game rounds across {selectedSource?.title}...
            </p>
          </div>

          {/* Telemetry Progress Checklist */}
          <div className="w-full max-w-md flex flex-col gap-2 text-left p-4 rounded-xl bg-[#171722] border border-white/5">
            {[
              { id: 1, label: "Stream timeline & retention curve ingested" },
              { id: 2, label: "Vakiogiri Creative Director evaluating clutches & laughter..." },
              { id: 3, label: "Identifying narrative arcs & highlight boundaries..." },
              { id: 4, label: "Synthesizing 1080p chapter markers & timestamps..." },
            ].map((st) => {
              const isDone = discoveryStep > st.id;
              const isCurrent = discoveryStep === st.id;
              return (
                <div key={st.id} className="flex items-center gap-2 text-xs">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-[#ff7427] animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                  )}
                  <span className={isDone ? "text-slate-300" : isCurrent ? "text-white font-bold" : "text-slate-500"}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STATE 3: HIGHLIGHTS & CHAPTERS REVIEW CANVAS */}
      {viewMode === "moments_review" && (
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 text-left pb-36 animate-in fade-in duration-300">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#121218] border border-white/10 shadow-lg">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode("source_select")}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                title="Back to stream selection"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Discovered Stream Highlights
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                    {discoveredChapters.length} Chapters Found
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Select the chapters you want to compile into your Master Supercut
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedChapterIds.length === discoveredChapters.length) {
                  setSelectedChapterIds([discoveredChapters[0]?.id].filter(Boolean));
                } else {
                  setSelectedChapterIds(discoveredChapters.map((c) => c.id));
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer self-end sm:self-auto"
            >
              <span>{selectedChapterIds.length === discoveredChapters.length ? "Deselect All" : "Select All"}</span>
            </button>
          </div>

          {/* Chapters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discoveredChapters.map((chapter) => {
              const isSelected = selectedChapterIds.includes(chapter.id);
              const totalStreamDur = selectedSource?.duration || 7200;
              const leftPercent = Math.min(95, Math.max(0, (chapter.start / totalStreamDur) * 100));
              const widthPercent = Math.min(100 - leftPercent, Math.max(3, (chapter.duration / totalStreamDur) * 100));

              return (
                <div
                  key={chapter.id}
                  onClick={() => toggleChapterSelection(chapter.id)}
                  className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 relative select-none ${
                    isSelected
                      ? "bg-[#181824] border-[#ff7427] shadow-lg shadow-[#ff7427]/10"
                      : "bg-[#121218] border-white/10 hover:border-white/20 text-slate-400"
                  }`}
                >
                  <div className="flex flex-col gap-2.5">
                    {/* Top Row: Virality & Timestamps */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          <span>{chapter.score} Virality</span>
                        </span>
                        {chapter.heatmap_score && chapter.heatmap_score > 75 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#ff7427]/15 text-[#ff7427] border border-[#ff7427]/30 flex items-center gap-1">
                            <TrendingUp className="w-2.5 h-2.5" />
                            <span>{chapter.heatmap_score}% Peak</span>
                          </span>
                        )}
                      </div>

                      {/* Checkbox */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded border border-white/10">
                          {formatSeconds(chapter.start)} - {formatSeconds(chapter.end)} ({chapter.duration}s)
                        </span>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            isSelected
                              ? "bg-[#ff7427] border-[#ff7427] text-white"
                              : "border-white/20 bg-white/5"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>

                    {/* Chapter Title */}
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {chapter.title}
                    </h4>

                    {/* Rationale */}
                    <p className="text-xs text-slate-300 leading-relaxed border-l-2 border-[#ff7427]/50 pl-2.5">
                      {chapter.reason}
                    </p>
                  </div>

                  {/* Mini-timeline Scrubber Bar */}
                  <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>00:00</span>
                      <span className="text-[#ff7427] font-semibold">Highlight Placement</span>
                      <span>{formatSeconds(totalStreamDur)}</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-white/5 relative overflow-hidden">
                      <div
                        className="absolute h-full rounded-full bg-gradient-to-r from-[#ff7427] to-amber-400"
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FIXED BOTTOM DOCK (Curate Moments) */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-4xl p-4 rounded-2xl bg-[#121218] border border-[#ff7427]/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-bottom-5">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>{selectedChapterIds.length} of {discoveredChapters.length} Chapters Selected</span>
                <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-slate-300">
                  {aspectRatio === "16:9" ? "16:9 Widescreen" : "9:16 Vertical"} • {quality}
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                {outputMode === "single_reel"
                  ? "Stitches chosen chapters into a seamless Master Supercut with auto timestamps"
                  : "Renders each chosen chapter as an individual highlight MP4"}
              </p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={handleRenderSelectedChapters}
                disabled={selectedChapterIds.length === 0}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#ff7427] hover:bg-[#ff7427]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#ff7427]/25 transition-all cursor-pointer disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>Render with Live Vakiogiri Engine</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 4: LIVE PIPELINE TRACKER */}
      {viewMode === "processing" && (
        <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-6 my-auto pt-6 pb-12 animate-in fade-in">
          <LivePipelineTracker
            progress={progress}
            step={step}
            progressMessage={progressMessage}
            title={selectedSource?.title || "Rendering Stream Highlights"}
            thumbnail={selectedSource?.thumbnail}
            clipsCount={selectedChapterIds.length || 3}
            onCancel={() => setViewMode("moments_review")}
          />
        </div>
      )}

      {/* STATE 5: COMPLETED RESULTS SHOWCASE */}
      {viewMode === "completed" && activeClip && (
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 text-left animate-in fade-in duration-300">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#121218] border border-white/10 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ff7427]/15 border border-[#ff7427]/30 flex items-center justify-center text-[#ff7427] shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Master Highlights Ready
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                    1080p Full HD
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Compiled by Live Vakiogiri Engine • {aspectRatio === "16:9" ? "16:9 Widescreen" : "9:16 Vertical"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <a
                href={activeClipUrl}
                download
                className="px-4 py-2 rounded-xl bg-[#ff7427] hover:bg-[#ff7427]/90 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Video</span>
              </a>

              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clip Another Stream</span>
              </button>
            </div>
          </div>

          {/* Cinema Player (Widescreen 16:9 or 9:16) */}
          <div className="w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl relative flex items-center justify-center aspect-video max-h-[500px]">
            <video
              ref={videoPlayerRef}
              src={activeClipUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          {/* YouTube Chapters & Timestamps Card */}
          {activeClip.chapter_description && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#121218] border border-white/10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#ff7427]" />
                  <span>Auto-Generated YouTube Chapters & Timestamps</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyChapterDescription(activeClip.chapter_description || "")}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#ff7427] border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedChapters ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedChapters ? "Copied to Clipboard!" : "Copy Chapters"}</span>
                </button>
              </div>

              <pre className="p-3 bg-[#0d0d12] rounded-xl text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed border border-white/5 max-h-48 overflow-y-auto">
                {activeClip.chapter_description}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* STATE 1: SOURCE SELECT TABS (EXACT MATCH TO SHORTS STUDIO) */}
      {viewMode === "source_select" && (
        <div className="flex flex-col gap-6 pb-28">
          
          {/* Top 3 Navigation Tabs (Identical to Shorts Studio) */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Tab 1: Channel Feed */}
            <button
              type="button"
              onClick={() => setActiveTab("channel")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                activeTab === "channel"
                  ? "border border-[#ff7427]/50 bg-[#ff7427]/10 text-[#ff7427] font-bold shadow-sm"
                  : isLight
                  ? "border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-xs"
                  : "border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] hover:border-white/15"
              }`}
            >
              <Youtube className="w-4 h-4 shrink-0" />
              <span>My YouTube Channel</span>
            </button>

            {/* Tab 2: Laptop File Upload */}
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                activeTab === "upload"
                  ? "border border-[#ff7427]/50 bg-[#ff7427]/10 text-[#ff7427] font-bold shadow-sm"
                  : isLight
                  ? "border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-xs"
                  : "border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] hover:border-white/15"
              }`}
            >
              <Laptop className="w-4 h-4 shrink-0" />
              <span>Upload from Laptop</span>
              {uploadedFile && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ml-0.5 shrink-0" />
              )}
            </button>

            {/* Tab 3: Paste Direct URL */}
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                activeTab === "url"
                  ? "border border-[#ff7427]/50 bg-[#ff7427]/10 text-[#ff7427] font-bold shadow-sm"
                  : isLight
                  ? "border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-xs"
                  : "border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] hover:border-white/15"
              }`}
            >
              <Link2 className="w-4 h-4 shrink-0" />
              <span>Paste Stream Link</span>
            </button>
          </div>

          {/* TAB 1 CONTENT: YOUTUBE CHANNEL STREAMS GRID */}
          {activeTab === "channel" && (
            <div className="flex flex-col gap-6">
              {!channelConnected ? (
                /* Connect Your YouTube Channel Card */
                <div
                  className={`p-10 sm:p-14 rounded-3xl border text-center flex flex-col items-center justify-center gap-5 transition-all ${
                    isLight ? "bg-white border-slate-200 shadow-sm" : "bg-white/[0.02] border-white/[0.08]"
                  }`}
                >
                  <div className="text-red-500 flex items-center justify-center">
                    <Youtube className="w-10 h-10" />
                  </div>

                  <div className="max-w-md">
                    <h3 className={`text-xl font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                      Connect Your YouTube Channel
                    </h3>
                    <p className={`text-xs mt-1.5 leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      Authenticate with Google to securely view and import your live streams and stream VODs.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleInitiateOAuth}
                    disabled={isConnectingOAuth}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 border shadow-xs ${
                      isLight
                        ? "bg-slate-900 hover:bg-slate-800 text-white border-transparent"
                        : "bg-white hover:bg-zinc-200 text-zinc-950 border-white/20"
                    }`}
                  >
                    <Youtube className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{isConnectingOAuth ? "Connecting with Google..." : "Connect with YouTube"}</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Connected Channel Header Bar & Search */}
                  <div
                    className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl transition-colors ${
                      isLight
                        ? "bg-white border border-slate-200/90 shadow-xs"
                        : "bg-white/[0.02] border border-white/[0.06]"
                    }`}
                  >
                    {/* Channel Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {connectedChannelData?.channel_thumbnail ? (
                        <img
                          src={connectedChannelData.channel_thumbnail}
                          alt={connectedChannelData.channel_title || "Channel"}
                          className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-red-600/10 text-red-500 flex items-center justify-center shrink-0">
                          <Youtube className="w-5 h-5" />
                        </div>
                      )}
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                            {connectedChannelData?.channel_title || "My Channel"}
                          </span>
                          {connectedChannelData?.channel_handle && (
                            <span className="text-xs text-slate-500 font-mono">
                              {connectedChannelData.channel_handle.startsWith("@") ? connectedChannelData.channel_handle : `@${connectedChannelData.channel_handle}`}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              isLight
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            Verified Owner
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                          Showing only your live streams & stream recordings
                        </p>
                      </div>
                    </div>

                    {/* Search, Refresh, and Disconnect */}
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          placeholder="Search your streams..."
                          className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl focus:outline-none transition-colors ${
                            isLight
                              ? "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-300"
                              : "bg-black/40 border border-white/[0.08] text-white placeholder-slate-500 focus:border-white/20"
                          }`}
                        />
                        {searchFilter && (
                          <button
                            type="button"
                            onClick={() => setSearchFilter("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={checkChannelStatus}
                        disabled={isLoadingChannel}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          isLight
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
                            : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/[0.06]"
                        }`}
                        title="Refresh streams"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingChannel ? "animate-spin text-[#ff7427]" : ""}`} />
                      </button>

                      <button
                        type="button"
                        onClick={handleDisconnectChannel}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-colors cursor-pointer font-medium ${
                          isLight
                            ? "text-slate-500 hover:text-rose-600 border-slate-200 hover:border-rose-200 hover:bg-rose-50"
                            : "text-slate-400 hover:text-rose-400 border-white/10 hover:border-rose-500/30 hover:bg-rose-500/10"
                        }`}
                        title="Disconnect Channel"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>

                  {/* Streams Cards Grid (Exact match to Shorts Studio) */}
                  {isLoadingChannel ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((idx) => (
                        <div
                          key={idx}
                          className={`aspect-video rounded-2xl animate-pulse border ${
                            isLight
                              ? "bg-slate-100 border-slate-200"
                              : "bg-white/[0.03] border-white/[0.05]"
                          }`}
                        />
                      ))}
                    </div>
                  ) : filteredStreams.length === 0 ? (
                    <div
                      className={`p-12 text-center rounded-2xl border flex flex-col items-center gap-3 ${
                        isLight
                          ? "bg-white border-slate-200 text-slate-800"
                          : "bg-white/[0.02] border border-white/[0.06] text-white"
                      }`}
                    >
                      <AlertCircle className="w-8 h-8 text-slate-400" />
                      <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                        No live streams found
                      </h3>
                      <p className={`text-xs max-w-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                        {searchFilter
                          ? "No stream titles match your search query."
                          : "Only YouTube live streams and VODs appear here. If your channel hasn't streamed yet, paste any stream link in the 'Paste Stream Link' tab or upload from your laptop!"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                      {filteredStreams.map((stream) => {
                        const isSelected = selectedSource?.url === stream.url;
                        return (
                          <div
                            key={stream.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedSource(null);
                              } else {
                                setSelectedSource({
                                  sourceType: "channel",
                                  title: stream.title,
                                  url: stream.url,
                                  duration: stream.duration,
                                  durationFormatted: stream.duration_formatted,
                                  thumbnail: stream.thumbnail,
                                  uploader: stream.uploader,
                                });
                              }
                            }}
                            className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all border ${
                              isSelected
                                ? "border-[#ff7427] ring-1 ring-[#ff7427]/50 " +
                                  (isLight ? "bg-[#ff7427]/[0.03] shadow-md" : "bg-white/[0.04]")
                                : isLight
                                ? "border-slate-200 bg-white hover:border-slate-300 shadow-xs hover:shadow-md"
                                : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                            }`}
                          >
                            {/* Thumbnail Container */}
                            <div className="relative aspect-video w-full overflow-hidden bg-black/80">
                              {stream.thumbnail ? (
                                <img
                                  src={stream.thumbnail}
                                  alt={stream.title}
                                  className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#09090c] text-slate-500">
                                  <FileVideo className="w-10 h-10" />
                                </div>
                              )}

                              {/* Duration Pill */}
                              <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 text-[11px] font-bold text-white flex items-center gap-1 border border-white/10">
                                <Clock className="w-2.5 h-2.5 text-amber-400" />
                                <span>{stream.duration_formatted}</span>
                              </div>

                              {/* Selected Indicator Checkmark */}
                              {isSelected && (
                                <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#ff7427] text-white flex items-center justify-center shadow-lg">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </div>
                              )}

                              {/* Select Hover Pill */}
                              {!isSelected && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="px-3 py-1.5 rounded-full bg-white text-black font-bold text-xs tracking-wide shadow-md">
                                    Select for Highlights
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Stream Info Card Body */}
                            <div className="p-4 flex flex-col gap-1.5">
                              <h4
                                className={`text-xs font-bold line-clamp-2 leading-snug transition-colors ${
                                  isSelected
                                    ? isLight
                                      ? "text-slate-950 font-extrabold"
                                      : "text-white font-extrabold"
                                    : isLight
                                    ? "text-slate-800 group-hover:text-slate-950"
                                    : "text-slate-200 group-hover:text-white"
                                }`}
                                title={stream.title}
                              >
                                {stream.title}
                              </h4>

                              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 pt-2 border-t border-white/[0.04]">
                                <span>{stream.view_count ? `${stream.view_count.toLocaleString()} views` : "Stream"}</span>
                                <span className="font-mono text-emerald-400">Stream VOD</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2 CONTENT: LAPTOP FILE UPLOAD (EXACT MATCH) */}
          {activeTab === "upload" && (
            <div className="flex flex-col gap-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-12 sm:p-16 rounded-3xl border-2 border-dashed text-center flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
                  isDragging
                    ? "border-[#ff7427] bg-[#ff7427]/[0.05]"
                    : isLight
                    ? "border-slate-300 hover:border-slate-400 bg-white shadow-xs"
                    : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#ff7427]/10 text-[#ff7427] flex items-center justify-center">
                  {isUploading ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <Laptop className="w-7 h-7" />
                  )}
                </div>

                <div className="max-w-md">
                  <h3 className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                    {uploadedFile ? uploadedFile.fileName : "Click or drag your stream recording here"}
                  </h3>
                  <p className={`text-xs mt-1 leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    Supports MP4, MOV, MKV, and WEBM up to 4GB. Streams are probed without full render.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 CONTENT: PASTE STREAM LINK (EXACT MATCH) */}
          {activeTab === "url" && (
            <div className="flex flex-col gap-6">
              <div
                className={`p-8 sm:p-10 rounded-3xl border flex flex-col gap-5 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-white/[0.02] border-white/[0.08]"
                }`}
              >
                <div>
                  <h3 className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                    Paste YouTube Stream / VOD URL
                  </h3>
                  <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    Extract stream highlights from any YouTube livestream recording or long gameplay video.
                  </p>
                </div>

                <div className="relative flex items-center">
                  <Youtube className="w-5 h-5 absolute left-4 text-red-500 pointer-events-none" />
                  <input
                    type="url"
                    value={directUrl}
                    onChange={(e) => {
                      setDirectUrl(e.target.value);
                      if (e.target.value.includes("youtube.com") || e.target.value.includes("youtu.be")) {
                        handleProbeUrl(e.target.value);
                      }
                    }}
                    placeholder="https://www.youtube.com/watch?v=... or https://youtube.com/live/..."
                    className={`w-full pl-11 pr-24 py-3 rounded-2xl text-sm focus:outline-none focus:border-[#ff7427] transition-colors ${
                      isLight
                        ? "bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400"
                        : "bg-black/40 border border-white/10 text-white placeholder-slate-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setDirectUrl(text.trim());
                          handleProbeUrl(text.trim());
                        }
                      } catch {}
                    }}
                    className={`absolute right-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isLight
                        ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-white/10 hover:bg-white/15 text-white border-white/10"
                    }`}
                  >
                    Paste Link
                  </button>
                </div>

                {/* Probed Details Preview */}
                {isProbingUrl && (
                  <div className="flex items-center gap-2 text-xs text-[#ff7427]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Inspecting stream duration & metadata...</span>
                  </div>
                )}

                {probedVideo && (
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4">
                    <img
                      src={probedVideo.thumbnail}
                      alt={probedVideo.title}
                      className="w-20 aspect-video object-cover rounded-xl border border-white/10"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate max-w-md">
                        {probedVideo.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Duration: {probedVideo.durationFormatted} • {probedVideo.uploader || "YouTube"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FLOATING PRE-FLIGHT DOCK (EXACT SIGNATURE DESIGN OF SHORTS STUDIO) */}
          {selectedSource && (
            <div
              className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-6xl p-3 sm:p-4 rounded-2xl border backdrop-blur-xl flex flex-col lg:flex-row items-center justify-between gap-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 ${
                isLight
                  ? "bg-white/95 border-slate-300/80 text-slate-900 shadow-slate-900/10"
                  : "bg-[#121218]/95 border-white/15 text-white shadow-black/80"
              }`}
            >
              {/* Left: Selected Video Preview */}
              <div className="flex items-center gap-3 min-w-0 w-full lg:w-auto">
                {selectedSource.thumbnail ? (
                  <img
                    src={selectedSource.thumbnail}
                    alt={selectedSource.title}
                    className="w-14 h-9 sm:w-16 sm:h-10 rounded-lg object-cover border border-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-9 sm:w-16 sm:h-10 rounded-lg bg-[#ff7427]/15 flex items-center justify-center text-[#ff7427] shrink-0 border border-[#ff7427]/30">
                    <FileVideo className="w-5 h-5" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff7427]">
                      {selectedSource.sourceType === "channel"
                        ? "Stream VOD"
                        : selectedSource.sourceType === "upload"
                        ? "Laptop File"
                        : "Direct Link"}
                    </span>
                    {selectedSource.durationFormatted && (
                      <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                        • {selectedSource.durationFormatted}
                      </span>
                    )}
                  </div>
                  <h4
                    className={`text-xs font-bold truncate max-w-md ${isLight ? "text-slate-900" : "text-white"}`}
                    title={selectedSource.title}
                  >
                    {selectedSource.title}
                  </h4>
                </div>
              </div>

              {/* Middle: Long Stream Configuration Controls Strip */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {/* Compilation Mode Selector */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                    isLight ? "bg-slate-100 border-slate-200" : "bg-white/[0.03] border-white/[0.08]"
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5 text-[#ff7427]" />
                  <select
                    value={outputMode}
                    onChange={(e) => setOutputMode(e.target.value as any)}
                    className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${
                      isLight ? "text-slate-800" : "text-white"
                    }`}
                  >
                    <option value="single_reel" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                      Master Supercut (with Chapters)
                    </option>
                    <option value="clips" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                      Separate Highlight Clips
                    </option>
                  </select>
                </div>

                {/* Aspect Ratio Selector */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                    isLight ? "bg-slate-100 border-slate-200" : "bg-white/[0.03] border-white/[0.08]"
                  }`}
                >
                  <span className="text-xs font-bold text-amber-500">16:9</span>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as any)}
                    className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${
                      isLight ? "text-slate-800" : "text-white"
                    }`}
                  >
                    <option value="16:9" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                      16:9 Widescreen
                    </option>
                    <option value="9:16" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                      9:16 Vertical
                    </option>
                  </select>
                </div>

                {/* Skip Intro Selector */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                    isLight ? "bg-slate-100 border-slate-200" : "bg-white/[0.03] border-white/[0.08]"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={skipIntroMin}
                    onChange={(e) => setSkipIntroMin(Number(e.target.value))}
                    className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${
                      isLight ? "text-slate-800" : "text-white"
                    }`}
                  >
                    <option value={15} className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                      Skip first 15m (Intro)
                    </option>
                    <option value={30} className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                      Skip first 30m
                    </option>
                    <option value={0} className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                      No Skip (Start at 00:00)
                    </option>
                  </select>
                </div>

                {/* Quality Pill */}
                <div
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${
                    isLight ? "bg-slate-100 border-slate-200 text-slate-800" : "bg-white/[0.03] border-white/[0.08] text-white"
                  }`}
                >
                  <span>1080p</span>
                </div>

                {/* Primary Action: Discover Stream Highlights */}
                <button
                  type="button"
                  onClick={handleDiscoverHighlights}
                  disabled={isDiscovering}
                  className="px-6 py-2.5 rounded-xl bg-[#ff7427] hover:bg-[#ff7427]/90 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>{isDiscovering ? "Discovering..." : "Find Stream Highlights"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {/* Deselect / Close Dock Button */}
                <button
                  type="button"
                  onClick={() => setSelectedSource(null)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                    isLight
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 border-slate-200"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border-white/[0.08]"
                  }`}
                  title="Deselect video"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
