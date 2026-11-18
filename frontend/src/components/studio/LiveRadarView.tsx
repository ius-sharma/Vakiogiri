"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Radio,
  Sparkles,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  RotateCcw,
  Clock,
  Sliders,
  Scissors,
  Flame,
  Tv,
  Eye,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Zap,
  Volume2,
  VolumeX,
  Layers,
  Subtitles,
  Smartphone,
  Monitor,
  RefreshCw,
  Info,
} from "lucide-react";
import { useUIFeedback } from "@/components/UIFeedback";

interface LiveStreamMeta {
  is_live: boolean;
  was_live?: boolean;
  live_status?: string;
  title: string;
  uploader: string;
  video_id: string;
  thumbnail: string;
  concurrent_view_count?: number | null;
  channel_url?: string;
  duration?: number;
  is_dvr_available?: boolean;
}

export interface LiveCapturedClip {
  job_id: string;
  filename: string;
  url: string;
  is_cloud?: boolean;
  title: string;
  start: number;
  end: number;
  duration: number;
  aspect_ratio: string;
  layout_mode: string;
  caption_preset: string;
  quality: string;
  created_at: number;
}

interface LiveRadarViewProps {
  session?: any;
  backendUrl: string;
  theme?: "light" | "dark";
  onOpenAuth?: () => void;
}

export default function LiveRadarView({
  session,
  backendUrl,
  theme = "dark",
  onOpenAuth,
}: LiveRadarViewProps) {
  const isLight = theme === "light";
  const { showToast } = useUIFeedback();

  // Stream URL & Probe state
  const [streamUrl, setStreamUrl] = useState("");
  const [probing, setProbing] = useState(false);
  const [streamMeta, setStreamMeta] = useState<LiveStreamMeta | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);

  // Time & DVR marker state
  const [approxLiveSeconds, setApproxLiveSeconds] = useState<number>(3600); // 1h default
  const [inPointSec, setInPointSec] = useState<number | null>(null);
  const [outPointSec, setOutPointSec] = useState<number | null>(null);
  const [manualDuration, setManualDuration] = useState<number>(45);

  // Layout & Style options
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [layoutMode, setLayoutMode] = useState<"gaming_split" | "face_top_game_bottom" | "original">("gaming_split");
  const [captionPreset, setCaptionPreset] = useState<"hormozi" | "beast" | "karaoke" | "minimal" | "none">("hormozi");
  const [subtitleLanguage, setSubtitleLanguage] = useState<"hinglish" | "english" | "auto">("hinglish");
  const [quality, setQuality] = useState<"1080p" | "720p">("1080p");

  // Job & Processing state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStep, setJobStep] = useState<string>("");
  const [jobMessage, setJobMessage] = useState<string>("");
  const [capturedClips, setCapturedClips] = useState<LiveCapturedClip[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Format seconds to HH:MM:SS
  const formatTimecode = (totalSec: number) => {
    const s = Math.max(0, Math.floor(totalSec));
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Extract video ID helper
  const getVideoId = (url: string) => {
    const match = url.match(/(?:v=|\/|youtu\.be\/|embed\/|live\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
  };

  // Probe Stream
  const handleProbeStream = async (targetUrl?: string) => {
    const urlToTest = (targetUrl || streamUrl).trim();
    if (!urlToTest) {
      showToast("Please enter a valid live stream URL.", "error");
      return;
    }

    setProbing(true);
    setProbeError(null);

    try {
      const res = await fetch(`${backendUrl}/live-stream/probe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToTest }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || "Unable to inspect stream.");
      }

      setStreamMeta(data.metadata);
      if (data.metadata?.duration && data.metadata.duration > 0) {
        setApproxLiveSeconds(data.metadata.duration);
      } else {
        // Ongoing live streams without set duration
        setApproxLiveSeconds(3600);
      }

      if (data.metadata?.is_live) {
        showToast("🔴 Live stream radar locked on target!", "success");
      } else {
        showToast("Stream radar connected (DVR replay active).", "info");
      }
    } catch (err: any) {
      console.error("Probe error:", err);
      setProbeError(err.message || "Failed to inspect live stream.");
      showToast(err.message || "Error probing stream.", "error");
    } finally {
      setProbing(false);
    }
  };

  // Trigger Clip Extraction
  const triggerLiveClip = async (startSec: number, endSec: number, clipLabel?: string) => {
    if (!streamUrl.trim()) {
      showToast("Please enter and lock onto a live stream URL first.", "error");
      return;
    }

    if (endSec <= startSec) {
      showToast("End time must be after start time.", "error");
      return;
    }

    const duration = endSec - startSec;
    if (duration > 300) {
      showToast("Maximum live clip duration is 5 minutes (300s).", "error");
      return;
    }

    setIsProcessing(true);
    setJobProgress(10);
    setJobStep("submitting");
    setJobMessage(`Extracting ${Math.round(duration)}s DVR segment...`);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${backendUrl}/live-stream/clip`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          url: streamUrl.trim(),
          start_sec: Math.max(0, startSec),
          end_sec: endSec,
          layout_mode: layoutMode,
          aspect_ratio: aspectRatio,
          caption_preset: captionPreset,
          subtitle_language: subtitleLanguage,
          quality: quality,
          title: clipLabel || streamMeta?.title || "Live Stream Highlight",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.detail || "Failed to enqueue live clip extraction.");
      }

      const newJobId = data.job_id;
      setActiveJobId(newJobId);
      showToast("Live DVR capture started! Processing in background...", "info");

      // Start Polling
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(newJobId);
      }, 1500);

    } catch (err: any) {
      console.error("Clip submission error:", err);
      setIsProcessing(false);
      showToast(err.message || "Failed to extract live clip.", "error");
    }
  };

  // Poll Job Status
  const pollJobStatus = async (jobId: string) => {
    try {
      const res = await fetch(`${backendUrl}/live-stream/job/${jobId}`);
      if (!res.ok) return;

      const data = await res.json();
      setJobProgress(data.progress || 0);
      setJobStep(data.step || "processing");
      setJobMessage(data.message || "Processing live stream...");

      if (data.status === "completed") {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsProcessing(false);
        setActiveJobId(null);
        if (data.clip) {
          setCapturedClips((prev) => [data.clip, ...prev]);
        }
        showToast("🔥 Live clip rendered successfully!", "success");
      } else if (data.status === "failed") {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsProcessing(false);
        setActiveJobId(null);
        showToast(data.error || "Live clip rendering failed.", "error");
      }
    } catch (e) {
      console.error("Polling error:", e);
    }
  };

  // Quick 1-Click "Clip Last X Seconds" relative to current live timeline
  const handleQuickClipLast = (seconds: number) => {
    // If stream is active, we clip the last N seconds
    const end = approxLiveSeconds;
    const start = Math.max(0, end - seconds);
    triggerLiveClip(start, end, `Last ${seconds}s Clutch Moment`);
  };

  // Handle Mark IN
  const handleSetInPoint = () => {
    setInPointSec(approxLiveSeconds);
    showToast(`Marked [IN] point at ${formatTimecode(approxLiveSeconds)}`, "info");
  };

  // Handle Mark OUT
  const handleSetOutPoint = () => {
    if (inPointSec !== null && approxLiveSeconds <= inPointSec) {
      showToast("OUT point must be greater than IN point.", "error");
      return;
    }
    setOutPointSec(approxLiveSeconds);
    showToast(`Marked [OUT] point at ${formatTimecode(approxLiveSeconds)}`, "info");
  };

  // Trigger from Marked IN/OUT
  const handleTriggerMarkedClip = () => {
    if (inPointSec === null || outPointSec === null) {
      showToast("Please mark both [IN] and [OUT] points first.", "error");
      return;
    }
    triggerLiveClip(inPointSec, outPointSec, `Custom Highlight (${formatTimecode(inPointSec)} - ${formatTimecode(outPointSec)})`);
  };

  // Video ID for embedded player
  const activeVideoId = streamMeta?.video_id || getVideoId(streamUrl);

  const getFullClipUrl = (clipUrl: string) => {
    if (clipUrl.startsWith("http://") || clipUrl.startsWith("https://")) {
      return clipUrl;
    }
    return `${backendUrl}${clipUrl.startsWith("/") ? "" : "/"}${clipUrl}`;
  };

  const handleCopyUrl = (id: string, clipUrl: string) => {
    const full = getFullClipUrl(clipUrl);
    navigator.clipboard.writeText(full);
    setCopiedId(id);
    showToast("Clip download URL copied to clipboard!", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-8 pb-16">
      {/* 1. TOP HEADER BANNER */}
      <div
        className={`w-full p-6 sm:p-8 rounded-3xl border transition-all relative overflow-hidden backdrop-blur-xl ${
          isLight
            ? "bg-gradient-to-br from-white via-red-50/20 to-orange-50/30 border-red-200/80 shadow-[0_4px_20px_rgba(239,68,68,0.06)]"
            : "bg-gradient-to-br from-[#12080a] via-[#0f0b12] to-[#0a0a0e] border-red-500/20 shadow-[0_8px_32px_rgba(239,68,68,0.08)]"
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center text-white shadow-[0_0_24px_rgba(239,68,68,0.4)] relative">
              <Radio className="w-7 h-7" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                  Live Stream Radar
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-extrabold uppercase tracking-wider bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse">
                  DVR Realtime
                </span>
              </div>
              <p className={`text-sm mt-1 max-w-xl ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                Extract high-energy vertical shorts from <strong>ongoing live streams</strong> instantly. Zero full downloads, direct sub-5-second DVR slicing.
              </p>
            </div>
          </div>

          {/* Stream Status indicator */}
          {streamMeta && (
            <div
              className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 ${
                streamMeta.is_live
                  ? isLight
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-red-950/40 border-red-500/40 text-red-400 shadow-[0_0_16px_rgba(239,68,68,0.2)]"
                  : isLight
                  ? "bg-slate-100 border-slate-200 text-slate-700"
                  : "bg-white/[0.05] border-white/10 text-slate-300"
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full ${
                  streamMeta.is_live ? "bg-red-500 animate-ping" : "bg-slate-400"
                }`}
              />
              <div className="text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  {streamMeta.is_live ? "🔴 BROADCAST LIVE" : "⚪ STREAM VOD / REPLAY"}
                </div>
                {streamMeta.concurrent_view_count && (
                  <div className="text-[10px] opacity-80 flex items-center gap-1 mt-0.5">
                    <Eye className="w-3 h-3" />
                    {streamMeta.concurrent_view_count.toLocaleString()} watching now
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. STREAM URL INPUT BAR */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleProbeStream()}
              placeholder="Paste ongoing YouTube or Twitch Live URL (e.g. https://www.youtube.com/watch?v=...)"
              className={`w-full h-12 pl-4 pr-12 rounded-2xl text-sm font-medium border focus:outline-none transition-all ${
                isLight
                  ? "bg-white border-slate-200 focus:border-red-500 text-slate-900 shadow-sm"
                  : "bg-[#18181f] border-white/10 focus:border-red-500/70 text-white placeholder-slate-500 shadow-inner"
              }`}
            />
            {streamUrl && (
              <button
                type="button"
                onClick={() => setStreamUrl("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleProbeStream()}
            disabled={probing || !streamUrl.trim()}
            className={`w-full sm:w-auto h-12 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
              probing
                ? "bg-red-500/50 cursor-not-allowed text-white"
                : "bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-[0_4px_16px_rgba(239,68,68,0.3)] active:scale-95"
            }`}
          >
            {probing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Scanning Stream...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
                Lock Radar
              </>
            )}
          </button>
        </div>

        {probeError && (
          <div className="mt-3 text-xs text-red-500 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4" />
            {probeError}
          </div>
        )}
      </div>

      {/* 3. MAIN LIVE STUDIO CONSOLE (SPLIT VIEW) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: LIVE MONITOR PLAYER & SCRUBBER (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Player Card */}
          <div
            className={`p-5 rounded-3xl border transition-all ${
              isLight ? "bg-white border-slate-200 shadow-md" : "bg-[#121217] border-white/10"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Live Video Stream Feed</span>
              </div>
              {streamMeta?.uploader && (
                <span className="text-xs font-mono opacity-70 truncate max-w-[200px]">
                  {streamMeta.uploader}
                </span>
              )}
            </div>

            {/* Embedded IFrame or Thumbnail Placeholder */}
            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black relative border border-white/10 shadow-2xl">
              {activeVideoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&mute=1&enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}`}
                  title="Live Stream Preview"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3 p-6 text-center">
                  <Tv className="w-12 h-12 opacity-30" />
                  <p className="text-sm font-medium">
                    No active stream connected. Paste a live stream URL above to initialize the live radar.
                  </p>
                </div>
              )}
            </div>

            {/* Stream Title */}
            {streamMeta && (
              <div className="mt-4">
                <h3 className="text-base font-bold line-clamp-2">{streamMeta.title}</h3>
              </div>
            )}

            {/* Interactive Timeline Scrubber & IN/OUT Markers */}
            <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#ff7427]" />
                  <span className="text-xs font-bold uppercase tracking-wider">Timeline Reference</span>
                </div>
                <div className="font-mono text-xs font-bold text-red-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  CURRENT: {formatTimecode(approxLiveSeconds)}
                </div>
              </div>

              {/* Slider representing DVR elapsed timeline */}
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={Math.max(approxLiveSeconds, 7200)}
                  value={approxLiveSeconds}
                  onChange={(e) => setApproxLiveSeconds(Number(e.target.value))}
                  className="w-full accent-red-500 h-2 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>

              {/* IN and OUT Marker Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSetInPoint}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      inPointSec !== null
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-white/[0.05] hover:bg-white/10 border-white/10 text-slate-300"
                    }`}
                  >
                    [ Mark IN ] {inPointSec !== null ? formatTimecode(inPointSec) : ""}
                  </button>

                  <button
                    type="button"
                    onClick={handleSetOutPoint}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      outPointSec !== null
                        ? "bg-red-500/20 text-red-400 border-red-500/40"
                        : "bg-white/[0.05] hover:bg-white/10 border-white/10 text-slate-300"
                    }`}
                  >
                    [ Mark OUT ] {outPointSec !== null ? formatTimecode(outPointSec) : ""}
                  </button>

                  {(inPointSec !== null || outPointSec !== null) && (
                    <button
                      type="button"
                      onClick={() => {
                        setInPointSec(null);
                        setOutPointSec(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-300"
                      title="Clear markers"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {inPointSec !== null && outPointSec !== null && (
                  <button
                    type="button"
                    onClick={handleTriggerMarkedClip}
                    disabled={isProcessing}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-95 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    Extract Range ({Math.max(0, Math.round(outPointSec - inPointSec))}s)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INSTANT REWIND & FORMAT DOCK (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Quick Instant Rewind Catcher */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isLight ? "bg-white border-slate-200 shadow-md" : "bg-[#121217] border-white/10"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Instant 1-Click DVR Capture</h3>
            </div>
            <p className={`text-xs mb-4 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Clip what just happened in the live broadcast right now without waiting for the stream to end:
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { sec: 30, label: "Last 30s", desc: "Clutch / Reaction" },
                { sec: 60, label: "Last 60s", desc: "Full Shorts / TikTok" },
                { sec: 90, label: "Last 90s", desc: "Story Arc / Fight" },
                { sec: 120, label: "Last 2 Min", desc: "Complete Round" },
              ].map((btn) => (
                <button
                  key={btn.sec}
                  type="button"
                  onClick={() => handleQuickClipLast(btn.sec)}
                  disabled={isProcessing || !streamUrl.trim()}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isProcessing
                      ? "opacity-50 cursor-not-allowed border-white/5 bg-white/[0.02]"
                      : isLight
                      ? "bg-slate-50 hover:bg-red-50/50 border-slate-200 hover:border-red-400/50 text-slate-900"
                      : "bg-[#181820] hover:bg-red-950/20 border-white/5 hover:border-red-500/40 text-white shadow-sm hover:shadow-[0_0_16px_rgba(239,68,68,0.15)]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-sm font-extrabold flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-red-500" />
                      {btn.label}
                    </span>
                    <span className="text-[10px] font-mono opacity-50 font-bold">DVR</span>
                  </div>
                  <span className="text-[10px] opacity-70 font-medium">{btn.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style & Layout Presets */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isLight ? "bg-white border-slate-200 shadow-md" : "bg-[#121217] border-white/10"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-[#ff7427]" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Output Layout & Captions</h3>
            </div>

            {/* Aspect Ratio */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-400 mb-2 block">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio("9:16")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    aspectRatio === "9:16"
                      ? "bg-[#ff7427]/20 border-[#ff7427] text-[#ff7427]"
                      : "bg-white/[0.03] border-white/10 text-slate-400"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  9:16 Vertical
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio("16:9")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    aspectRatio === "16:9"
                      ? "bg-[#ff7427]/20 border-[#ff7427] text-[#ff7427]"
                      : "bg-white/[0.03] border-white/10 text-slate-400"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  16:9 Landscape
                </button>
              </div>
            </div>

            {/* Layout Mode (Only if 9:16) */}
            {aspectRatio === "9:16" && (
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-400 mb-2 block">Camera Split Layout</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLayoutMode("gaming_split")}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      layoutMode === "gaming_split"
                        ? "bg-[#ff7427]/20 border-[#ff7427] text-white"
                        : "bg-white/[0.03] border-white/10 text-slate-400"
                    }`}
                  >
                    <div className="text-xs font-bold">Gaming Split 50/50</div>
                    <div className="text-[10px] opacity-60">Game Top / Cam Bot</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode("face_top_game_bottom")}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      layoutMode === "face_top_game_bottom"
                        ? "bg-[#ff7427]/20 border-[#ff7427] text-white"
                        : "bg-white/[0.03] border-white/10 text-slate-400"
                    }`}
                  >
                    <div className="text-xs font-bold">Face Top 37.5%</div>
                    <div className="text-[10px] opacity-60">Cam Top / Game Bot</div>
                  </button>
                </div>
              </div>
            )}

            {/* Caption Preset */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-2 block">Kinetic Subtitles</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "hormozi", label: "Hormozi Neon" },
                  { id: "beast", label: "Beast Yellow" },
                  { id: "none", label: "No Subtitles" },
                ].map((cap) => (
                  <button
                    key={cap.id}
                    type="button"
                    onClick={() => setCaptionPreset(cap.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold text-center cursor-pointer transition-all truncate ${
                      captionPreset === cap.id
                        ? "bg-amber-500/20 border-amber-500 text-amber-400"
                        : "bg-white/[0.03] border-white/10 text-slate-400"
                    }`}
                  >
                    {cap.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REAL-TIME PROCESSING PROGRESS BAR (ACTIVE JOB) */}
      {isProcessing && (
        <div
          className={`w-full p-6 rounded-3xl border transition-all ${
            isLight
              ? "bg-white border-red-200 shadow-lg"
              : "bg-[#14121a] border-red-500/30 shadow-[0_0_24px_rgba(239,68,68,0.12)]"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-red-500 animate-spin" />
              <div>
                <h4 className="text-sm font-bold flex items-center gap-2">
                  Live Stream Radar: Capturing & Slicing DVR
                </h4>
                <p className="text-xs text-slate-400">{jobMessage || "Connecting to live stream segments..."}</p>
              </div>
            </div>
            <span className="font-mono text-sm font-bold text-red-500">{jobProgress}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${jobProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 5. LIVE CAPTURES SHOWCASE (SESSION HISTORY) */}
      {capturedClips.length > 0 && (
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-bold tracking-tight">
                Live Captured Clips ({capturedClips.length})
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500">Ready to download & share</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capturedClips.map((clip, idx) => (
              <div
                key={clip.job_id || idx}
                className={`p-4 rounded-3xl border flex flex-col gap-3 transition-all ${
                  isLight
                    ? "bg-white border-slate-200 shadow-md hover:shadow-lg"
                    : "bg-[#121218] border-white/10 hover:border-red-500/30 shadow-md"
                }`}
              >
                {/* Video Preview */}
                <div className="w-full aspect-[9/16] max-h-[380px] bg-black rounded-2xl overflow-hidden relative shadow-inner">
                  <video
                    src={getFullClipUrl(clip.url)}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/70 text-red-400 border border-red-500/30 backdrop-blur-md">
                    LIVE CAPTURE
                  </span>
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/70 text-white backdrop-blur-md">
                    {Math.round(clip.duration)}s
                  </span>
                </div>

                {/* Metadata & Actions */}
                <div className="flex flex-col gap-2 pt-1">
                  <h4 className="text-xs font-bold line-clamp-1">{clip.title}</h4>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{clip.aspect_ratio} • {clip.layout_mode}</span>
                    <span>{formatTimecode(clip.start)} - {formatTimecode(clip.end)}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={getFullClipUrl(clip.url)}
                      download={clip.filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_2px_10px_rgba(239,68,68,0.3)] cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download MP4
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyUrl(clip.job_id, clip.url)}
                      className="p-2 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 transition-all cursor-pointer"
                      title="Copy Clip Link"
                    >
                      {copiedId === clip.job_id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
