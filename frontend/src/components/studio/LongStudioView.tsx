"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUIFeedback } from "@/components/UIFeedback";
import {
  Gamepad2,
  Sparkles,
  Play,
  PlayCircle,
  Video,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check,
  Clipboard,
  Zap,
  Film,
  RefreshCw,
  Loader2,
  Scissors,
  Layers,
  MonitorPlay,
  RotateCcw,
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

interface LongStudioViewProps {
  session?: any;
  userProfile?: UserProfile;
  onRefreshProfile?: () => void;
}

export default function LongStudioView({
  session,
  userProfile,
  onRefreshProfile,
}: LongStudioViewProps) {
  const { showToast } = useUIFeedback();

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
    return () => {
      stopPolling();
    };
  }, []);

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

    if ((userProfile?.credits_remaining ?? 3) <= 0) {
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
          start_sec: startSec,
          end_sec: endSec,
          target_reel_duration: targetReelDuration,
          aspect_ratio: aspectRatio,
          output_mode: outputMode,
          quality: quality,
          clipping_mode: "ai_enhanced",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Stream pipeline job failed to queue.");
      }

      const data = await res.json();
      const currentJobId = data.job_id;
      setJobId(currentJobId);

      if (onRefreshProfile) onRefreshProfile();
      startPolling(currentJobId);
      showToast("Stream slicing started!", "success");
    } catch (err: any) {
      setStatus("failed");
      setErrorMsg(err.message || "Failed to start stream processing.");
      showToast(err.message || "Failed to start stream processing.", "error");
    }
  };

  const startPolling = (currentJobId: string) => {
    stopPolling();
    isPollingRef.current = true;

    pollIntervalRef.current = setInterval(async () => {
      if (!isPollingRef.current) return;
      try {
        const res = await fetch(`${BACKEND_URL}/status/${currentJobId}`);
        if (!res.ok) return;

        const data = await res.json();
        setProgress(data.progress || 5);
        if (data.progress_message) setProgressMessage(data.progress_message);
        if (data.step) setStep(data.step);

        if (data.status === "completed") {
          stopPolling();
          setStatus("completed");
          setProgress(100);
          setClips(data.clips || []);
          showToast("Stream highlights extracted successfully!", "success");
          if (onRefreshProfile) onRefreshProfile();
        } else if (data.status === "failed") {
          stopPolling();
          setStatus("failed");
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
    setStatus("idle");
    setClips([]);
    setProgress(5);
    setErrorMsg(null);
    setJobId(null);
  };

  const copyChapterDescription = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChapters(true);
    showToast("YouTube chapters & timestamps copied to clipboard!", "success");
    setTimeout(() => setCopiedChapters(false), 2000);
  };

  const activeClip: ClipItem | null = clips.length > 0
    ? typeof clips[selectedClipIndex] === "string"
      ? { filename: clips[selectedClipIndex] as string, url: `${BACKEND_URL}/clips/${jobId}/${clips[selectedClipIndex]}` }
      : (clips[selectedClipIndex] as ClipItem)
    : null;

  return (
    <div className="w-full flex flex-col items-center gap-8 text-center my-auto">
      {/* Studio Hero Header */}
      <div className="flex flex-col items-center gap-3 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ff7427]/10 text-[#ff7427] border border-[#ff7427]/20 text-xs font-semibold tracking-wide">
          <MonitorPlay className="w-3.5 h-3.5 text-[#ff7427]" />
          <span>Long-Form & Stream Highlight Supercut Engine</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Turn 4-Hour Streams into{" "}
          <span className="bg-gradient-to-r from-[#ff7427] via-amber-400 to-white bg-clip-text text-transparent italic font-serif">
            Master Highlights.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-xl font-normal leading-relaxed">
          Extract high-energy moments, gameplay clutched sequences, and podcast conversations without downloading hours of footage.
        </p>
      </div>

      {/* Main Studio Processing Canvas */}
      {status !== "completed" ? (
        <div className="w-full max-w-3xl flex flex-col gap-6 text-left">
          <form
            onSubmit={handleSubmitStream}
            className="bg-[#0b0b0e] border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 relative"
          >
            {/* Stream URL Bar */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Long Video / Stream URL</span>
                <span className="text-[11px] font-mono text-[#ff7427]">YouTube VOD / Stream Link</span>
              </label>

              <div className="relative flex items-center">
                <PlayCircle className="w-5 h-5 absolute left-4 text-[#ff7427] pointer-events-none" />
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
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 pl-12 pr-28 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff7427]/60 transition-all font-medium disabled:opacity-50"
                />
                <div className="absolute right-2 flex items-center">
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    disabled={status === "processing" || analyzingStream}
                    className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {pasted ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                    <span>{pasted ? "Pasted!" : "Paste"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Notice */}
            {streamAnalysisError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-300 rounded-2xl text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{streamAnalysisError}</span>
              </div>
            )}

            {/* STEP 1: Probe Stream Metadata */}
            {!streamAnalysis ? (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleAnalyzeStream}
                  disabled={analyzingStream || !youtubeUrl.trim() || status === "processing"}
                  className="w-full bg-[#ff7427] hover:bg-[#e65c00] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  {analyzingStream ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Inspecting Stream (Duration & Timeline)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>Inspect Stream Duration & Details</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-500 text-center font-mono">
                  Streams are pre-probed without full download to save 90% bandwidth and compute.
                </p>
              </div>
            ) : (
              /* STEP 2: Slicing Range & Compilation Settings */
              <div className="flex flex-col gap-5 pt-2 border-t border-white/[0.08] animate-in fade-in duration-300">
                
                {/* Stream Card Details */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {streamAnalysis.thumbnail ? (
                      <img
                        src={streamAnalysis.thumbnail}
                        alt="Thumbnail"
                        className="w-16 h-12 object-cover rounded-xl border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#ff7427]/10 border border-[#ff7427]/20 flex items-center justify-center shrink-0 text-[#ff7427]">
                        <Film className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-[#ff7427] uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Stream Probed Successfully</span>
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate max-w-sm">
                        {streamAnalysis.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                        <span>⏱️ {streamAnalysis.duration_formatted}</span>
                        <span>•</span>
                        <span>{streamAnalysis.uploader || "Creator"}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStreamAnalysis(null)}
                    className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer shrink-0"
                  >
                    Change URL
                  </button>
                </div>

                {/* Range Mode Switcher & Slicing Controls */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-[#ff7427]" />
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Stream Slicing Range</span>
                    </div>

                    <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1 self-start sm:self-auto text-xs">
                      <button
                        type="button"
                        onClick={() => setRangeMode("skip_intro")}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                          rangeMode === "skip_intro"
                            ? "bg-[#ff7427] text-white font-bold"
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
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          rangeMode === "custom_range"
                            ? "bg-[#ff7427] text-white font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        <span>Custom 2-Point Cut (A ➔ B)</span>
                      </button>
                    </div>
                  </div>

                  {rangeMode === "skip_intro" ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-300">
                          Discard starting waiting / chatting screen:
                        </span>
                        <span className="text-xs font-mono font-bold text-[#ff7427] bg-[#ff7427]/10 px-2 py-0.5 rounded border border-[#ff7427]/20">
                          Skip first {skipIntroMin}m ({formatMinutesToHms(skipIntroMin)})
                        </span>
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={Math.min(90, Math.floor(streamAnalysis.duration / 60))}
                        value={skipIntroMin}
                        onChange={(e) => setSkipIntroMin(Number(e.target.value))}
                        className="w-full accent-[#ff7427] cursor-pointer"
                      />

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {[0, 10, 15, 20, 30, 45].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setSkipIntroMin(preset)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                              skipIntroMin === preset
                                ? "bg-[#ff7427] text-white font-bold"
                                : "bg-white/5 text-slate-400 hover:text-white"
                            }`}
                          >
                            {preset === 0 ? "No Skip" : `Skip ${preset}m`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {/* Point A */}
                      <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>Point A — Start Slice</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {formatMinutesToHms(startMin)} ({startMin}m)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0, endMin - 1)}
                          value={startMin}
                          onChange={(e) => setStartMin(Math.min(Number(e.target.value), endMin - 1))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      {/* Point B */}
                      <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#ff7427]" />
                            <span>Point B — End Slice</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-[#ff7427] bg-[#ff7427]/10 px-2 py-0.5 rounded border border-[#ff7427]/20">
                            {formatMinutesToHms(endMin)} ({endMin}m)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={startMin + 1}
                          max={Math.floor(streamAnalysis.duration / 60)}
                          value={endMin}
                          onChange={(e) => setEndMin(Math.max(Number(e.target.value), startMin + 1))}
                          className="w-full accent-[#ff7427] cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Aspect Ratio & Quality */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300">Aspect Ratio</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAspectRatio("16:9")}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          aspectRatio === "16:9"
                            ? "bg-[#ff7427] border-[#ff7427] text-white"
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
                            ? "bg-[#ff7427] border-[#ff7427] text-white"
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
                              ? "bg-[#ff7427] border-[#ff7427] text-white"
                              : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit Extraction Button */}
                <button
                  type="submit"
                  disabled={status === "processing"}
                  className="w-full bg-[#ff7427] hover:bg-[#e65c00] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Extract Stream Highlights ({quality})</span>
                </button>
              </div>
            )}
          </form>

          {/* Processing Progress Tracker */}
          {status === "processing" && (
            <div className="p-6 rounded-3xl bg-[#0b0b0e] border border-[#ff7427]/30 shadow-2xl flex flex-col gap-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-5 h-5 text-[#ff7427] animate-spin" />
                  <span className="text-sm font-bold text-white">Extracting Stream Supercut...</span>
                </div>
                <span className="font-mono text-xs font-bold text-[#ff7427] bg-[#ff7427]/10 px-2 py-0.5 rounded border border-[#ff7427]/20">
                  {progress}%
                </span>
              </div>

              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ff7427] to-amber-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="truncate max-w-[80%]">{progressMessage}</span>
                <span className="font-mono uppercase text-[10px] text-[#ff7427]">{step}</span>
              </div>
            </div>
          )}

          {/* Failure Notice */}
          {status === "failed" && errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-bold text-white">Stream Pipeline Notice</span>
                <p className="text-rose-300 leading-relaxed">{errorMsg}</p>
                <button
                  type="button"
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
        <div className="w-full max-w-4xl flex flex-col gap-6 text-left animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0b0b0e] border border-white/[0.08] rounded-3xl p-6 shadow-2xl">
            <div>
              <span className="text-xs font-bold text-[#ff7427] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Highlights Generation Complete
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {activeClip?.title || "Master Highlights Supercut"}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {activeClip?.url && (
                <a
                  href={activeClip.url}
                  download
                  className="px-4 py-2 bg-[#ff7427] hover:bg-[#e65c00] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Video</span>
                </a>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Video</span>
              </button>
            </div>
          </div>

          {activeClip?.url && (
            <div className="w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-black aspect-video relative shadow-2xl">
              <video
                ref={videoPlayerRef}
                src={activeClip.url}
                controls
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {activeClip?.chapter_description && (
            <div className="p-5 rounded-2xl bg-[#0b0b0e] border border-white/[0.08] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Generated YouTube Chapters & Timestamps
                </span>
                <button
                  type="button"
                  onClick={() => copyChapterDescription(activeClip.chapter_description || "")}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedChapters ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedChapters ? "Copied!" : "Copy Chapters"}</span>
                </button>
              </div>
              <pre className="p-3 bg-black/60 rounded-xl text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed border border-white/5">
                {activeClip.chapter_description}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
