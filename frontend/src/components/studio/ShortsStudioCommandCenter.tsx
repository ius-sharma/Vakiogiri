"use strict";
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Link2,
  Sparkles,
  Check,
  Clock,
  Eye,
  RefreshCw,
  Search,
  X,
  FileVideo,
  CheckCircle2,
  SlidersHorizontal,
  Zap,
  Flame,
  ArrowRight,
  Laptop,
  AlertCircle,
  ArrowLeft,
  CheckSquare,
  Square
} from "lucide-react";

const Youtube = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export interface SelectedVideoSource {
  sourceType: "channel" | "upload" | "url";
  title: string;
  url?: string;
  localFilePath?: string;
  duration?: number;
  durationFormatted?: string;
  thumbnail?: string;
  fileSizeMb?: number;
  uploader?: string;
}

export interface ViralMomentCandidate {
  id: string;
  title: string;
  start: number;
  end: number;
  duration: number;
  duration_formatted?: string;
  start_formatted?: string;
  end_formatted?: string;
  virality_score: number;
  virality_reason?: string;
  hook_quote?: string;
}

export interface GenerationConfig {
  targetDuration: number;
  aspectRatio: "9:16" | "16:9";
  captionPreset: string;
  clipsCount: number;
  mode: "heuristic" | "ai_enhanced";
  quality: string;
  selectedMoments?: ViralMomentCandidate[];
}

interface ChannelVideoItem {
  id: string;
  title: string;
  url: string;
  duration: number;
  duration_formatted: string;
  thumbnail: string;
  view_count?: number;
  uploader?: string;
}

interface ShortsStudioCommandCenterProps {
  backendUrl: string;
  isProcessing: boolean;
  creditsRemaining: number;
  onStartGeneration: (source: SelectedVideoSource, config: GenerationConfig) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  sessionToken?: string;
  theme?: "light" | "dark";
}

export const ShortsStudioCommandCenter: React.FC<ShortsStudioCommandCenterProps> = ({
  backendUrl,
  isProcessing,
  creditsRemaining,
  onStartGeneration,
  showToast,
  sessionToken,
  theme = "dark",
}) => {
  const isLight = theme === "light";

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"channel" | "upload" | "url">("channel");

  // Authenticated YouTube Channel state
  const [channelConnected, setChannelConnected] = useState<boolean>(false);
  const [connectedChannelData, setConnectedChannelData] = useState<{
    channel_id?: string;
    channel_title?: string;
    channel_handle?: string;
    channel_thumbnail?: string;
    subscriber_count?: string;
    video_count?: string;
  } | null>(null);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState<boolean>(false);
  const [channelVideos, setChannelVideos] = useState<ChannelVideoItem[]>([]);
  const [isLoadingChannel, setIsLoadingChannel] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Check user's verified YouTube channel status
  const checkChannelStatus = async () => {
    setIsLoadingChannel(true);
    try {
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers["Authorization"] = `Bearer ${sessionToken}`;
      }

      // 1. Check persistent channel connection first
      const statusRes = await fetch(`${backendUrl}/auth/youtube/status`, { headers });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.connected && statusData.channel) {
          setChannelConnected(true);
          setConnectedChannelData(statusData.channel);
        }
      }

      // 2. Fetch authenticated channel videos
      const res = await fetch(`${backendUrl}/auth/youtube/my-videos`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.connected && data.channel) {
          setChannelConnected(true);
          setConnectedChannelData(data.channel);
          if (data.videos && data.videos.length > 0) {
            setChannelVideos(data.videos);
          }
          return;
        }
      }
    } catch (err) {
      console.warn("YouTube channel status check error:", err);
    } finally {
      setIsLoadingChannel(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("youtube_connected") === "true") {
        showToast("Your YouTube channel has been connected successfully!", "success");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get("youtube_error")) {
        showToast(`YouTube connection failed: ${params.get("youtube_error")}`, "error");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    checkChannelStatus();
  }, [sessionToken]);

  // Initiate Google OAuth 2.0 flow
  const handleInitiateOAuth = async () => {
    setIsConnectingOAuth(true);
    try {
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers["Authorization"] = `Bearer ${sessionToken}`;
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

  // Disconnect user's YouTube channel
  const handleDisconnectChannel = async () => {
    try {
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers["Authorization"] = `Bearer ${sessionToken}`;
      }

      const res = await fetch(`${backendUrl}/auth/youtube/disconnect`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        setChannelConnected(false);
        setConnectedChannelData(null);
        setChannelVideos([]);
        setSelectedSource(null);
        showToast("YouTube channel disconnected.", "info");
      }
    } catch (err: any) {
      showToast("Failed to disconnect YouTube channel.", "error");
    }
  };

  // Local File Upload state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<{
    filePath: string;
    fileName: string;
    duration: number;
    durationFormatted: string;
    sizeMb: number;
    title: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Direct URL state
  const [directUrl, setDirectUrl] = useState<string>("");
  const [isProbingUrl, setIsProbingUrl] = useState<boolean>(false);
  const [probedVideo, setProbedVideo] = useState<{
    title: string;
    duration: number;
    durationFormatted: string;
    thumbnail: string;
    uploader?: string;
  } | null>(null);

  // Selected Video Source for Pre-Flight Dock
  const [selectedSource, setSelectedSource] = useState<SelectedVideoSource | null>(null);

  // Discover & Curate Shorts Workflow States
  const [viewMode, setViewMode] = useState<"source_select" | "discovering" | "moments_review">("source_select");
  const [discoveredMoments, setDiscoveredMoments] = useState<ViralMomentCandidate[]>([]);
  const [selectedMomentIds, setSelectedMomentIds] = useState<string[]>([]);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);

  // Pre-flight generation settings
  const [targetDuration, setTargetDuration] = useState<number>(45);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [captionPreset, setCaptionPreset] = useState<string>("hormozi");
  const [clipsCount, setClipsCount] = useState<number>(3);
  const [clippingMode, setClippingMode] = useState<"heuristic" | "ai_enhanced">("ai_enhanced");
  const [quality, setQuality] = useState<string>("1080p");

  // Handle Local File Upload
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
      if (sessionToken) {
        headers["Authorization"] = `Bearer ${sessionToken}`;
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
        title: uploadedMeta.title,
        localFilePath: uploadedMeta.filePath,
        duration: uploadedMeta.duration,
        durationFormatted: uploadedMeta.durationFormatted,
        fileSizeMb: uploadedMeta.sizeMb,
        thumbnail: "",
      });
      showToast(`"${uploadedMeta.fileName}" uploaded and verified!`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to upload video from laptop.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Probe Direct URL
  const handleProbeUrl = async (urlToProbe: string) => {
    const trimmed = urlToProbe.trim();
    if (!trimmed) return;

    setIsProbingUrl(true);
    setProbedVideo(null);
    try {
      const res = await fetch(`${backendUrl}/stream/probe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_url: trimmed }),
      });

      if (!res.ok) throw new Error("Could not inspect URL");

      const data = await res.json();
      setProbedVideo({
        title: data.title || "YouTube Video",
        duration: data.duration || 0,
        durationFormatted: data.duration_formatted || "Video",
        thumbnail: data.thumbnail || "",
        uploader: data.uploader || "",
      });

      setSelectedSource({
        sourceType: "url",
        title: data.title || "YouTube Video",
        url: trimmed,
        duration: data.duration,
        durationFormatted: data.duration_formatted,
        thumbnail: data.thumbnail,
        uploader: data.uploader,
      });
    } catch (err) {
      setSelectedSource({
        sourceType: "url",
        title: "YouTube Video",
        url: trimmed,
      });
    } finally {
      setIsProbingUrl(false);
    }
  };

  // Clipboard Paste for URL
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setDirectUrl(text);
        handleProbeUrl(text);
        showToast("Pasted link from clipboard", "info");
      }
    } catch (err) {
      showToast("Unable to read clipboard", "error");
    }
  };

  // Discover Viral Moments using Gemini 2.5 Flash
  const handleDiscoverMoments = async () => {
    if (!selectedSource) {
      showToast("Please select or upload a video first.", "error");
      return;
    }

    setIsDiscovering(true);
    setViewMode("discovering");

    try {
      const payload: Record<string, any> = {
        target_duration: targetDuration,
        max_moments: 6,
        video_title: selectedSource.title,
        duration: selectedSource.duration,
      };

      if (selectedSource.localFilePath) {
        payload.local_file_path = selectedSource.localFilePath;
      } else if (selectedSource.url) {
        payload.video_url = selectedSource.url;
      } else {
        throw new Error("No valid video source provided.");
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionToken) {
        headers["Authorization"] = `Bearer ${sessionToken}`;
      }

      const res = await fetch(`${backendUrl}/moments/discover`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Moment discovery failed.");
      }

      const data = await res.json();
      const moments: ViralMomentCandidate[] = data.moments || [];
      if (moments.length === 0) {
        throw new Error("No viral moments could be identified for this video.");
      }

      setDiscoveredMoments(moments);
      // Pre-select only top 1 moment by default so user gets exactly what they see
      setSelectedMomentIds(moments.length > 0 ? [moments[0].id] : []);
      setViewMode("moments_review");
      showToast(`Found ${moments.length} viral hook moments! Pick which ones to render.`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to discover moments.", "error");
      setViewMode("source_select");
    } finally {
      setIsDiscovering(false);
    }
  };

  const toggleMomentSelection = (id: string) => {
    setSelectedMomentIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleSelectAllMoments = () => {
    setSelectedMomentIds(discoveredMoments.map((m) => m.id));
  };

  const handleDeselectAllMoments = () => {
    setSelectedMomentIds([]);
  };

  const handleRenderSelectedMoments = () => {
    if (!selectedSource) return;
    const chosen = discoveredMoments.filter((m) => selectedMomentIds.includes(m.id));
    if (chosen.length === 0) {
      showToast("Please select at least 1 moment to render into Shorts.", "error");
      return;
    }

    if (clippingMode === "ai_enhanced" && creditsRemaining <= 0) {
      showToast("Daily AI credit limit reached. Switch to Fast Free mode!", "error");
      return;
    }

    onStartGeneration(selectedSource, {
      targetDuration,
      aspectRatio,
      captionPreset,
      clipsCount: chosen.length,
      mode: clippingMode,
      quality,
      selectedMoments: chosen,
    });
  };

  // Trigger Direct Generation (Skip Discovery)
  const handleLaunchGeneration = () => {
    if (!selectedSource) {
      showToast("Please select or upload a video first.", "error");
      return;
    }

    if (clippingMode === "ai_enhanced" && creditsRemaining <= 0) {
      showToast("Daily AI credit limit reached. Switch to Fast Mode (Free) for unlimited clips!", "error");
      return;
    }

    onStartGeneration(selectedSource, {
      targetDuration,
      aspectRatio,
      captionPreset,
      clipsCount,
      mode: clippingMode,
      quality,
    });
  };

  // Filtered channel videos based on search
  const filteredVideos = channelVideos.filter((v) =>
    v.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col gap-8 pb-32 transition-all duration-300">
      
      {/* 1. STUDIO HERO HEADER */}
      <div
        className={`flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6 transition-colors ${
          isLight ? "border-slate-200" : "border-white/[0.06]"
        }`}
      >
        <div>
          <h1
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight transition-colors ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            Import Your Video
          </h1>
          <p
            className={`text-sm mt-1 max-w-2xl leading-relaxed transition-colors ${
              isLight ? "text-slate-600" : "text-slate-400"
            }`}
          >
            Select a video to generate viral shorts.
          </p>
        </div>

        {/* Status Pill on Right */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`px-4 py-2 rounded-xl flex items-center gap-3 shadow-xs transition-colors ${
              isLight
                ? "bg-white border border-slate-200 text-slate-800"
                : "bg-white/[0.03] border border-white/[0.08] text-white"
            }`}
          >
            <div className="flex flex-col text-right">
              <span className={`text-[10px] font-medium tracking-wider uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                AI Credits
              </span>
              <span className={`text-xs font-bold flex items-center justify-end gap-1 ${isLight ? "text-slate-900" : "text-white"}`}>
                <Flame className="w-3.5 h-3.5 text-[#ff7427]" />
                {creditsRemaining} / 3 Daily Free
              </span>
            </div>
            <div className={`h-6 w-px ${isLight ? "bg-slate-200" : "bg-white/10"}`} />
            <div className="flex flex-col text-right">
              <span className={`text-[10px] font-medium tracking-wider uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Target Format
              </span>
              <span className="text-xs font-bold text-[#ff7427]">9:16 Vertical</span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: VAKIOGIRI CREATIVE DIRECTOR RADAR */}
      {viewMode === "discovering" && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-300">
          {/* Animated Concentric Waves */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute w-32 h-32 rounded-full border border-[#ff7427]/20 animate-ping opacity-30 pointer-events-none" />
            <div className="absolute w-24 h-24 rounded-full bg-[#ff7427]/10 animate-pulse pointer-events-none" />
            <div className="w-20 h-20 rounded-2xl bg-[#ff7427]/15 border border-[#ff7427]/40 flex items-center justify-center shadow-lg shadow-[#ff7427]/10 z-10">
              <Sparkles className="w-8 h-8 text-[#ff7427] animate-pulse" />
            </div>
          </div>

          {/* Vakiogiri Creative Director Brand Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff7427]/15 border border-[#ff7427]/30 text-[#ff7427] text-xs font-bold mb-3 shadow-xs">
            <Zap className="w-3.5 h-3.5 fill-[#ff7427]" />
            <span>Vakiogiri Creative Director</span>
          </div>

          <h3 className={`text-xl sm:text-2xl font-black tracking-tight mb-2 ${isLight ? "text-slate-900" : "text-white"}`}>
            Discovering Viral Moments...
          </h3>
          <p className={`text-xs sm:text-sm max-w-md mb-6 leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            Scanning retention heatmaps, chapters, and emotional climaxes in{" "}
            <span className="font-semibold text-[#ff7427]">"{selectedSource?.title}"</span>.
          </p>

          {/* Animated Telemetry Checklist */}
          <div className={`w-full max-w-md p-4 rounded-2xl border mb-6 text-left flex flex-col gap-2.5 ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10"
          }`}>
            <div className="flex items-center justify-between text-xs pb-1 border-b border-white/5">
              <span className={`font-semibold ${isLight ? "text-slate-800" : "text-slate-200"}`}>Telemetry Checklist</span>
              <span className="text-[#ff7427] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#ff7427] animate-ping" />
                Live Scan
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Audience heatmap replay peaks ingested</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#ff7427]">
              <Sparkles className="w-3.5 h-3.5 shrink-0 animate-spin" />
              <span>Vakiogiri Creative Director evaluating hook potency...</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Calculating 9:16 boundaries & punchline endings</span>
            </div>

            {/* Simulated Live Audio Bar */}
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
              <div className="h-full bg-gradient-to-r from-[#ff7427] to-amber-400 rounded-full w-3/4 animate-pulse" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsDiscovering(false);
              setViewMode("source_select");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isLight
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-white/15 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            Cancel & Return
          </button>
        </div>
      )}

      {/* VIEW 2: MOMENTS REVIEW & CURATION CANVAS */}
      {viewMode === "moments_review" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* Navigation & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode("source_select")}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isLight
                    ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-xs"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border-white/10"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Videos</span>
              </button>

              <div>
                <h3 className={`text-lg sm:text-xl font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                  Found {discoveredMoments.length} Viral Moments
                </h3>
                <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  Pick the moments you want FFmpeg to slice into 9:16 Shorts.
                </p>
              </div>
            </div>

            {/* Select / Deselect All Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSelectAllMoments}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/10"
                }`}
              >
                Select All ({discoveredMoments.length})
              </button>
              <button
                type="button"
                onClick={handleDeselectAllMoments}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border-white/10"
                }`}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Video Summary Card */}
          {selectedSource && (
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/[0.06]"
              }`}
            >
              {selectedSource.thumbnail ? (
                <img
                  src={selectedSource.thumbnail}
                  alt={selectedSource.title}
                  className="w-16 h-10 object-cover rounded-lg shrink-0 border border-white/10"
                />
              ) : (
                <div className="w-16 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <FileVideo className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className={`text-xs sm:text-sm font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                  {selectedSource.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-semibold text-[#ff7427] uppercase tracking-wider">
                    {selectedSource.sourceType === "channel" ? "Channel Video" : selectedSource.sourceType === "upload" ? "Uploaded Video" : "Direct Link"}
                  </span>
                  {selectedSource.durationFormatted && (
                    <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      • Total {selectedSource.durationFormatted}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Vakiogiri Creative Director
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Candidate Moments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-36">
            {discoveredMoments.map((moment, idx) => {
              const isSelected = selectedMomentIds.includes(moment.id);
              const totalDur = selectedSource?.duration && selectedSource.duration > 0 ? selectedSource.duration : 300;
              const leftPercent = Math.max(0, Math.min(94, (moment.start / totalDur) * 100));
              const widthPercent = Math.max(6, Math.min(100 - leftPercent, ((moment.end - moment.start) / totalDur) * 100));

              return (
                <div
                  key={moment.id}
                  onClick={() => toggleMomentSelection(moment.id)}
                  className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? isLight
                        ? "bg-orange-50/90 border-[#ff7427] ring-1 ring-[#ff7427]/40 shadow-sm"
                        : "bg-[#ff7427]/[0.08] border-[#ff7427]/70 ring-1 ring-[#ff7427]/40 shadow-md"
                      : isLight
                      ? "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-xs"
                      : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  <div>
                    {/* Header: Checkbox + Simple Refined Badges (No Heavy Glass) */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-[#ff7427] border-[#ff7427] text-white"
                              : isLight
                              ? "border-slate-300 bg-white"
                              : "border-white/20 bg-white/[0.04]"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Simple Solid Virality Badge */}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#ff7427]/15 text-[#ff7427] border border-[#ff7427]/30 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-[#ff7427]" />
                          {moment.virality_score}% Viral
                        </span>

                        {/* Simple Duration Tag */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border flex items-center gap-1 ${
                          isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-white/[0.05] text-slate-300 border-white/10"
                        }`}>
                          <Clock className="w-3 h-3 text-slate-400" />
                          {moment.duration_formatted || `${moment.duration}s`}
                        </span>
                      </div>
                    </div>

                    {/* Hook Title */}
                    <h4 className={`text-sm font-bold leading-snug mb-2 group-hover:text-[#ff7427] transition-colors ${
                      isLight ? "text-slate-900" : "text-white"
                    }`}>
                      {moment.title}
                    </h4>

                    {/* Pull-Quote with Left Accent Line */}
                    {moment.hook_quote && (
                      <div className={`p-2.5 rounded-xl border border-l-2 border-l-[#ff7427] text-xs mb-3 italic leading-relaxed ${
                        isLight
                          ? "bg-slate-100/80 border-slate-200 text-slate-800"
                          : "bg-black/30 border-white/[0.06] text-slate-200"
                      }`}>
                        “{moment.hook_quote}”
                      </div>
                    )}

                    {/* Virality Reason */}
                    {moment.virality_reason && (
                      <p className={`text-[11px] leading-relaxed mb-3 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                        <span className="font-semibold text-amber-500/90">Why it works:</span> {moment.virality_reason}
                      </p>
                    )}
                  </div>

                  {/* Mini-Timeline Scrubber Bar (Shows Slice Position in Full Video) */}
                  <div className="mt-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>Timeline Position</span>
                      <span className="font-mono">{moment.start_formatted} ➔ {moment.end_formatted}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.08] relative overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isSelected ? "bg-[#ff7427]" : "bg-slate-500"
                        }`}
                        style={{
                          marginLeft: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-medium mt-2">
                      <span className={`text-[10px] ${isSelected ? "text-[#ff7427] font-bold" : "text-slate-400"}`}>
                        {isSelected ? "Selected for Short" : "Click to select"}
                      </span>
                      <span className={`text-[10px] font-bold ${isSelected ? "text-[#ff7427]" : "text-slate-400"}`}>
                        {moment.duration_formatted}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fixed Bottom Dock for Moments Review */}
          <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-5xl p-3.5 sm:p-4 rounded-2xl border backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 ${
              isLight
                ? "bg-white/95 border-slate-200 shadow-slate-900/10 text-slate-900"
                : "bg-[#0e0e14]/95 border-white/10 shadow-black/80 text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#ff7427]/10 text-[#ff7427] flex items-center justify-center font-bold text-sm">
                {selectedMomentIds.length}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold">
                  {selectedMomentIds.length} of {discoveredMoments.length} Moments Selected
                </h4>
                <p className="text-[11px] text-slate-400">
                  {selectedMomentIds.length === 0 ? "Select at least 1 moment to render" : "Only your selected moments will be converted into Shorts"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Caption Style Dropdown */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${isLight ? "bg-slate-100 border-slate-200" : "bg-white/[0.04] border-white/10"}`}>
                <span className="text-xs font-bold text-amber-500">CC</span>
                <select
                  value={captionPreset}
                  onChange={(e) => setCaptionPreset(e.target.value)}
                  className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${isLight ? "text-slate-800" : "text-white"}`}
                >
                  <option value="hormozi" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>Hormozi Punch</option>
                  <option value="beast" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>MrBeast Pop</option>
                  <option value="karaoke" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>Karaoke Glow</option>
                  <option value="minimal" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>Minimal Clean</option>
                </select>
              </div>

              {/* Quality Selector */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${isLight ? "bg-slate-100 border-slate-200" : "bg-white/[0.04] border-white/10"}`}>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${isLight ? "text-slate-800" : "text-white"}`}
                >
                  <option value="1080p" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>1080p Full HD</option>
                  <option value="720p" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>720p HD</option>
                </select>
              </div>

              {/* Render Button */}
              <button
                type="button"
                onClick={handleRenderSelectedMoments}
                disabled={selectedMomentIds.length === 0 || isProcessing}
                className="px-6 py-2.5 rounded-xl bg-[#ff7427] hover:bg-[#ff7427]/90 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-40 transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>{isProcessing ? "Processing..." : `Render ${selectedMomentIds.length} Selected Shorts`}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: SOURCE SELECT TABS */}
      {viewMode === "source_select" && (
      <div className="flex flex-col gap-6">
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
            <span>Paste Video Link</span>
          </button>
        </div>

        {/* TAB 1 CONTENT: YOUTUBE CHANNEL UPLOADS GRID */}
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
                    Authenticate with Google to securely view and import your uploaded videos. We only request read-only permissions and will never post or modify anything.
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

                <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 pt-3 border-t border-white/[0.06] w-full max-w-lg">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    100% Read-Only Access
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Instant 1-Click Import
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    1080p / 4K Ready
                  </span>
                </div>
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
                        {connectedChannelData?.subscriber_count ? `${connectedChannelData.subscriber_count} subscribers • ` : ""}Showing your long-form videos
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
                        placeholder="Search your long videos..."
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
                      title="Refresh videos"
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

            {/* Video Cards Grid */}
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
            ) : filteredVideos.length === 0 ? (
              <div
                className={`p-12 text-center rounded-2xl border flex flex-col items-center gap-3 ${
                  isLight
                    ? "bg-white border-slate-200 text-slate-800"
                    : "bg-white/[0.02] border border-white/[0.06] text-white"
                }`}
              >
                <AlertCircle className="w-8 h-8 text-slate-400" />
                <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  No videos found
                </h3>
                <p className={`text-xs max-w-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  {searchFilter
                    ? "No video titles match your search query."
                    : "Could not find recent public videos for this handle. Try switching channels or paste a direct video link."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                {filteredVideos.map((video) => {
                  const isSelected = selectedSource?.url === video.url;
                  return (
                    <div
                      key={video.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSource(null);
                        } else {
                          setSelectedSource({
                            sourceType: "channel",
                            title: video.title,
                            url: video.url,
                            duration: video.duration,
                            durationFormatted: video.duration_formatted,
                            thumbnail: video.thumbnail,
                            uploader: video.uploader,
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
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#09090c] text-slate-500">
                            <FileVideo className="w-10 h-10" />
                          </div>
                        )}

                        {/* Duration Pill */}
                        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1 border border-white/10">
                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                          <span>{video.duration_formatted}</span>
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
                              Select for Shorts
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Video Info Card Body */}
                      <div className="p-4 flex flex-col gap-1.5">
                        <h4
                          className={`text-xs font-bold line-clamp-2 leading-snug transition-colors ${
                            isSelected
                              ? isLight
                                ? "text-slate-950 font-extrabold"
                                : "text-white font-extrabold"
                              : isLight
                              ? "text-slate-800 group-hover:text-slate-950 font-bold"
                              : "text-slate-200 group-hover:text-white font-bold"
                          }`}
                          title={video.title}
                        >
                          {video.title}
                        </h4>
                        <div
                          className={`flex items-center justify-between text-[11px] mt-1 ${
                            isLight ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          <span>{video.uploader || connectedChannelData?.channel_title || "My Channel"}</span>
                          {video.view_count ? (
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3 text-slate-400" />
                              {(video.view_count / 1000).toFixed(0)}k views
                            </span>
                          ) : null}
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

        {/* TAB 2 CONTENT: LAPTOP FILE UPLOAD */}
        {activeTab === "upload" && (
          <div className="flex flex-col gap-6">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
              className="hidden"
            />

            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-12 sm:p-16 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden ${
                isDragging
                  ? "border-[#ff7427] bg-[#ff7427]/5 shadow-[0_0_24px_rgba(255,116,39,0.15)]"
                  : isLight
                  ? "border-slate-300 hover:border-slate-400 bg-white shadow-xs"
                  : "border-white/15 hover:border-white/30 bg-white/[0.02]"
              }`}
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-[#ff7427] mb-4 ${
                  isLight ? "bg-slate-100 border border-slate-200" : "bg-white/[0.05] border border-white/10"
                }`}
              >
                <Upload className="w-8 h-8" />
              </div>

              <h3 className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                Drag and drop your video file here
              </h3>
              <p className={`text-xs mt-1 max-w-md leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Supports MP4, MOV, MKV, or WEBM files directly from your laptop. Maximum size up to 2GB.
              </p>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className={`mt-6 px-5 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                  isLight
                    ? "bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                    : "bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10"
                }`}
              >
                Browse Files from Laptop
              </button>

              {/* Uploading progress indicator */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-[#ff7427] animate-spin" />
                  <span className="text-xs font-bold text-white">Uploading & inspecting video from laptop...</span>
                </div>
              )}
            </div>

            {/* Uploaded File Confirmation Card */}
            {uploadedFile && (
              <div
                className={`p-5 rounded-2xl border flex items-center justify-between gap-4 transition-colors ${
                  isLight
                    ? "bg-emerald-50/80 border-emerald-300 text-slate-900 shadow-xs"
                    : "bg-white/[0.03] border-emerald-500/30 text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      {uploadedFile.fileName}
                    </h4>
                    <p className={`text-xs mt-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      {uploadedFile.sizeMb} MB • Duration: {uploadedFile.durationFormatted} • Ready for clipping
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`text-xs underline cursor-pointer ${
                    isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Replace file
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3 CONTENT: PASTE VIDEO URL */}
        {activeTab === "url" && (
          <div className="flex flex-col gap-6">
            <div
              className={`p-8 rounded-3xl border flex flex-col gap-5 transition-colors ${
                isLight ? "bg-white border-slate-200/90 shadow-xs" : "bg-white/[0.02] border-white/[0.08]"
              }`}
            >
              <div>
                <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  Paste Video Link
                </h3>
                <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  Extract shorts from any YouTube video, podcast episode, or stream recording.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={directUrl}
                    onChange={(e) => {
                      setDirectUrl(e.target.value);
                      if (e.target.value.includes("youtube.com") || e.target.value.includes("youtu.be")) {
                        handleProbeUrl(e.target.value);
                      }
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={`w-full pl-11 pr-24 py-3 rounded-2xl text-sm focus:outline-none focus:border-[#ff7427] transition-colors ${
                      isLight
                        ? "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400"
                        : "bg-black/60 border border-white/[0.12] text-white placeholder-slate-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer ${
                      isLight
                        ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                        : "bg-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.12]"
                    }`}
                  >
                    Paste
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleProbeUrl(directUrl)}
                  disabled={!directUrl || isProbingUrl}
                  className={`px-6 py-3 rounded-2xl font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer shrink-0 ${
                    isLight
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-white text-black hover:bg-white/90"
                  }`}
                >
                  {isProbingUrl ? "Inspecting..." : "Inspect Link"}
                </button>
              </div>

              {/* Probed Video Preview */}
              {probedVideo && (
                <div
                  className={`p-4 rounded-2xl border flex items-center gap-4 transition-colors ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/[0.08]"
                  }`}
                >
                  {probedVideo.thumbnail && (
                    <img
                      src={probedVideo.thumbnail}
                      alt={probedVideo.title}
                      className="w-24 aspect-video object-cover rounded-lg shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className={`text-xs font-bold line-clamp-1 ${isLight ? "text-slate-900" : "text-white"}`}>
                      {probedVideo.title}
                    </h4>
                    <p className={`text-[11px] mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      Duration: {probedVideo.durationFormatted} • {probedVideo.uploader || "YouTube"}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      isLight
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    Ready
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* 3. PRE-FLIGHT GENERATION DOCK */}
      {viewMode === "source_select" && selectedSource && (
        <div
          className={`sticky bottom-6 z-30 w-full p-4 sm:p-5 rounded-3xl backdrop-blur-2xl transition-all shadow-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 border animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            isLight
              ? "bg-white/95 border-slate-200 text-slate-800"
              : "bg-[#0d0d12]/95 border-white/[0.12] text-white"
          }`}
        >
          {/* Selected Video Summary */}
          <div className="flex items-center gap-3.5 min-w-0">
            {selectedSource.thumbnail ? (
              <img
                src={selectedSource.thumbnail}
                alt={selectedSource.title}
                className="w-16 h-10 object-cover rounded-lg shrink-0 border border-white/10"
              />
            ) : (
              <div
                className={`w-16 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isLight ? "bg-slate-100 text-slate-500" : "bg-white/[0.06] text-slate-400"
                }`}
              >
                <FileVideo className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff7427]">
                  {selectedSource.sourceType === "channel"
                    ? "Channel Video"
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

          {/* Configuration Controls Strip */}
          <div className="flex flex-wrap items-center gap-3 lg:gap-4">
            
            {/* Target Duration Selector */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-white/[0.03] border-white/[0.08]"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={targetDuration}
                onChange={(e) => setTargetDuration(Number(e.target.value))}
                className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${
                  isLight ? "text-slate-800" : "text-white"
                }`}
              >
                <option value={30} className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                  Under 30s
                </option>
                <option value={45} className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                  30s - 60s (Auto)
                </option>
                <option value={60} className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                  60s - 90s
                </option>
              </select>
            </div>

            {/* Captions Preset Selector */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-white/[0.03] border-white/[0.08]"
              }`}
            >
              <span className="text-xs font-bold text-amber-500">CC</span>
              <select
                value={captionPreset}
                onChange={(e) => setCaptionPreset(e.target.value)}
                className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${
                  isLight ? "text-slate-800" : "text-white"
                }`}
              >
                <option value="hormozi" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                  Hormozi Punch
                </option>
                <option value="beast" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                  MrBeast Pop
                </option>
                <option value="karaoke" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                  Karaoke Glow
                </option>
                <option value="minimal" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                  Minimal Clean
                </option>
              </select>
            </div>

            {/* AI Engine Mode Toggle */}
            <button
              type="button"
              onClick={() =>
                setClippingMode((prev) => (prev === "ai_enhanced" ? "heuristic" : "ai_enhanced"))
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                clippingMode === "ai_enhanced"
                  ? "bg-[#ff7427]/10 border-[#ff7427]/40 text-[#ff7427]"
                  : isLight
                  ? "bg-slate-100 border-slate-200 text-slate-700"
                  : "bg-white/[0.03] border-white/[0.08] text-slate-300"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{clippingMode === "ai_enhanced" ? "AI Storytelling (1 Credit)" : "Fast Free Mode"}</span>
            </button>

            {/* Primary Action: Discover Viral Moments */}
            <button
              type="button"
              onClick={handleDiscoverMoments}
              disabled={isDiscovering || isProcessing}
              className="px-6 py-2.5 rounded-xl bg-[#ff7427] hover:bg-[#ff7427]/90 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>{isDiscovering ? "Discovering..." : "Find Viral Moments"}</span>
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
              title="Close dock (Deselect video)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
