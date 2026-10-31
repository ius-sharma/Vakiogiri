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
  Square,
  Radio,
  Scissors,
  Play,
  Globe
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
  isStream?: boolean;
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
  subtitleLanguage?: "hinglish" | "english" | "auto";
  layoutMode?: "gaming_split" | "face_top_game_bottom";
  clipsCount: number;
  mode: "heuristic" | "ai_enhanced";
  quality: string;
  selectedMoments?: ViralMomentCandidate[];
  streamStartMin?: number;
  streamEndMin?: number;
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

  // Stream custom slice trimming state (Point A to Point B in minutes)
  const [streamSliceStartMin, setStreamSliceStartMin] = useState<number>(0);
  const [streamSliceEndMin, setStreamSliceEndMin] = useState<number>(60);

  const formatMinutes = (totalMin: number): string => {
    const h = Math.floor(totalMin / 60);
    const m = Math.floor(totalMin % 60);
    if (h > 0) {
      return `${h}h ${m.toString().padStart(2, "0")}m`;
    }
    return `${m}m 00s`;
  };

  // Discover & Curate Shorts Workflow States
  const [viewMode, setViewMode] = useState<"source_select" | "discovering" | "moments_review">("source_select");
  const [discoveredMoments, setDiscoveredMoments] = useState<ViralMomentCandidate[]>([]);
  const [selectedMomentIds, setSelectedMomentIds] = useState<string[]>([]);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [discoveryDropStage, setDiscoveryDropStage] = useState<number>(1);

  // Live Moment Drop Progression Simulation while Gemini 2.5 Flash analyzes stream
  useEffect(() => {
    if (viewMode !== "discovering") {
      setDiscoveryDropStage(1);
      return;
    }

    const t1 = setTimeout(() => setDiscoveryDropStage(2), 1500);
    const t2 = setTimeout(() => setDiscoveryDropStage(3), 3200);
    const t3 = setTimeout(() => setDiscoveryDropStage(4), 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [viewMode]);

  // Pre-flight generation settings
  const [targetDuration, setTargetDuration] = useState<number>(45);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [captionPreset, setCaptionPreset] = useState<string>("hormozi");
  const [subtitleLanguage, setSubtitleLanguage] = useState<"hinglish" | "english" | "auto">("hinglish");
  const [layoutMode, setLayoutMode] = useState<"gaming_split" | "face_top_game_bottom">("gaming_split");
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

  // Probe Direct URL (Supports regular videos and livestreams up to 5 hours)
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

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Could not inspect YouTube URL.");
      }

      const data = await res.json();
      const durSec = Number(data.duration || 0);
      const isStream = Boolean(data.is_stream || durSec >= 900);
      const totalMin = Math.max(1, Math.floor(durSec / 60));

      setStreamSliceStartMin(0);
      setStreamSliceEndMin(totalMin);

      setProbedVideo({
        title: data.title || (isStream ? "YouTube Stream" : "YouTube Video"),
        duration: data.duration || 0,
        durationFormatted: data.duration_formatted || "Video",
        thumbnail: data.thumbnail || "",
        uploader: data.uploader || "",
      });

      setSelectedSource({
        sourceType: "url",
        title: data.title || (isStream ? "YouTube Stream" : "YouTube Video"),
        url: trimmed,
        duration: data.duration,
        durationFormatted: data.duration_formatted,
        thumbnail: data.thumbnail,
        uploader: data.uploader,
        isStream,
      });
    } catch (err: any) {
      showToast(err.message || "Failed to inspect video link", "error");
      setSelectedSource(null);
      setProbedVideo(null);
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

      if (selectedSource.isStream) {
        payload.start_sec = streamSliceStartMin * 60;
        payload.end_sec = streamSliceEndMin * 60;
      }

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
      subtitleLanguage,
      layoutMode,
      clipsCount: chosen.length,
      mode: clippingMode,
      quality,
      selectedMoments: chosen,
      streamStartMin: selectedSource.isStream ? streamSliceStartMin : undefined,
      streamEndMin: selectedSource.isStream ? streamSliceEndMin : undefined,
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
      subtitleLanguage,
      layoutMode,
      clipsCount,
      mode: clippingMode,
      quality,
      streamStartMin: selectedSource.isStream ? streamSliceStartMin : undefined,
      streamEndMin: selectedSource.isStream ? streamSliceEndMin : undefined,
    });
  };

  // Filtered channel videos based on search
  const filteredVideos = channelVideos.filter((v) =>
    v.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // ==========================================
  // MORPHING STUDIO COCKPIT (INLINE EXPANDED CARD)
  // Replaces the disconnected floating dock with an all-in-one studio workspace.
  // ==========================================
  const renderStudioCockpit = () => {
    if (!selectedSource) return null;

    return (
      <div
        className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200 ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-[#101015] border-white/[0.08] shadow-sm"
        }`}
      >
        {/* 1. Header Row: Video Meta & Change Video Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative aspect-video w-32 sm:w-36 rounded-2xl overflow-hidden shrink-0 border border-white/10 bg-black/90 shadow-md">
              {selectedSource.thumbnail ? (
                <img
                  src={selectedSource.thumbnail}
                  alt={selectedSource.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <FileVideo className="w-7 h-7" />
                </div>
              )}
              {selectedSource.durationFormatted && (
                <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/85 text-white backdrop-blur-xs">
                  {selectedSource.durationFormatted}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {selectedSource.isStream ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/25">
                    <Radio className="w-2.5 h-2.5 animate-pulse text-rose-500" />
                    Stream Detected (Max 5h)
                  </span>
                ) : selectedSource.sourceType === "channel" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#ff7427]/10 text-[#ff7427] border border-[#ff7427]/25">
                    <Youtube className="w-2.5 h-2.5 text-[#ff7427]" />
                    Channel Video
                  </span>
                ) : selectedSource.sourceType === "upload" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/25">
                    <Laptop className="w-2.5 h-2.5 text-purple-400" />
                    Laptop Video
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/25">
                    <Youtube className="w-2.5 h-2.5 text-red-500" />
                    Direct Video Link
                  </span>
                )}

                <span className={`text-xs truncate ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  • {selectedSource.uploader || "YouTube"}
                </span>
              </div>

              <h3
                className={`text-base sm:text-lg font-bold truncate max-w-xl ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
                title={selectedSource.title}
              >
                {selectedSource.title}
              </h3>

              {selectedSource.url && (
                <p className={`text-xs font-mono truncate max-w-lg mt-0.5 ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                  {selectedSource.url}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedSource(null);
              setProbedVideo(null);
              setUploadedFile(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/[0.08]"
            }`}
            title="Deselect and change video"
          >
            <X className="w-3.5 h-3.5" />
            <span>Change Video</span>
          </button>
        </div>

        {/* 2. Stream Trimmer Studio Canvas (Active for Streams) */}
        {selectedSource.isStream && (
          <div
            className={`p-5 rounded-2xl border transition-all ${
              isLight ? "bg-slate-50/80 border-slate-200" : "bg-[#121218] border-white/[0.08]"
            }`}
          >
            {/* Section Header with Quick Presets */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[#ff7427]" />
                  <h4 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                    Point A ➔ Point B Stream Trimmer
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff7427]/10 text-[#ff7427] border border-[#ff7427]/20">
                    Max 5h
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  Vakiogiri Creative Director will discover viral moments strictly inside this selected window.
                </p>
              </div>

              {/* Gradient Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const maxM = Math.max(1, Math.floor((selectedSource.duration || 3600) / 60));
                    setStreamSliceStartMin(0);
                    setStreamSliceEndMin(maxM);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    streamSliceStartMin === 0 && streamSliceEndMin === Math.max(1, Math.floor((selectedSource.duration || 3600) / 60))
                      ? "bg-gradient-to-r from-[#ff7427] to-[#e65100] text-white border-transparent shadow-xs"
                      : isLight
                      ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10"
                  }`}
                >
                  Full Stream
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const maxM = Math.max(1, Math.floor((selectedSource.duration || 3600) / 60));
                    setStreamSliceStartMin(Math.min(15, maxM));
                    setStreamSliceEndMin(maxM);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    streamSliceStartMin === 15
                      ? "bg-gradient-to-r from-[#ff7427] to-[#e65100] text-white border-transparent shadow-xs"
                      : isLight
                      ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10"
                  }`}
                >
                  Skip 15m Intro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const maxM = Math.max(1, Math.floor((selectedSource.duration || 3600) / 60));
                    setStreamSliceStartMin(0);
                    setStreamSliceEndMin(Math.min(60, maxM));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    streamSliceStartMin === 0 && streamSliceEndMin === 60
                      ? "bg-gradient-to-r from-[#ff7427] to-[#e65100] text-white border-transparent shadow-xs"
                      : isLight
                      ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10"
                  }`}
                >
                  1st Hour
                </button>
                {selectedSource.duration && selectedSource.duration > 3600 && (
                  <button
                    type="button"
                    onClick={() => {
                      const maxM = Math.max(1, Math.floor((selectedSource.duration || 3600) / 60));
                      setStreamSliceStartMin(Math.max(0, maxM - 45));
                      setStreamSliceEndMin(maxM);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      streamSliceStartMin === Math.max(0, Math.floor((selectedSource.duration || 3600) / 60) - 45)
                        ? "bg-gradient-to-r from-[#ff7427] to-[#e65100] text-white border-transparent shadow-xs"
                        : isLight
                        ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10"
                    }`}
                  >
                    Finale (Last 45m)
                  </button>
                )}
              </div>
            </div>

            {/* Visual Timeline Track Bar with Waveform notches and highlighted slice */}
            <div className="space-y-2 mb-5">
              <div className="relative w-full h-11 flex items-center select-none">
                {/* Background Base Track */}
                <div
                  className={`absolute inset-x-0 h-4 rounded-xl overflow-hidden ${
                    isLight ? "bg-slate-200" : "bg-black/60 border border-white/10"
                  }`}
                >
                  <div className="w-full h-full flex justify-between items-center px-2 opacity-30">
                    {Array.from({ length: 32 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-0.5 ${i % 4 === 0 ? "h-3" : "h-1.5"} ${
                          isLight ? "bg-slate-600" : "bg-white"
                        } rounded-full`}
                      />
                    ))}
                  </div>
                </div>

                {/* Highlighted Active Slice */}
                {(() => {
                  const maxM = Math.max(1, Math.floor((selectedSource.duration || 3600) / 60));
                  const startPct = Math.min(100, Math.max(0, (streamSliceStartMin / maxM) * 100));
                  const endPct = Math.min(100, Math.max(0, (streamSliceEndMin / maxM) * 100));
                  const widthPct = Math.max(1, endPct - startPct);
                  return (
                    <div
                      className="absolute h-5 rounded-xl bg-gradient-to-r from-[#ff7427] to-[#e65100] border border-white/20 flex items-center justify-between px-2.5 transition-all z-10"
                      style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                    >
                      <span className="text-[10px] font-mono font-bold text-white">
                        A: {formatMinutes(streamSliceStartMin)}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-white">
                        B: {formatMinutes(streamSliceEndMin)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Time Tick Legend */}
              {(() => {
                const maxM = Math.max(1, Math.floor((selectedSource.duration || 3600) / 60));
                return (
                  <div
                    className={`flex items-center justify-between text-[10px] font-mono font-semibold ${
                      isLight ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    <span>00m 00s</span>
                    <span>{formatMinutes(Math.round(maxM * 0.25))}</span>
                    <span>{formatMinutes(Math.round(maxM * 0.5))}</span>
                    <span>{formatMinutes(Math.round(maxM * 0.75))}</span>
                    <span>{formatMinutes(maxM)}</span>
                  </div>
                );
              })()}
            </div>

            {/* Dual Precise Time Pickers with Steppers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Point A Picker */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isLight ? "bg-white border-slate-200" : "bg-black/30 border-white/[0.08]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#ff7427] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ff7427]" />
                    Point A (Start Time)
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {formatMinutes(streamSliceStartMin)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStreamSliceStartMin((prev) => Math.max(0, prev - 15))}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                    }`}
                  >
                    -15m
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamSliceStartMin((prev) => Math.max(0, prev - 5))}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                    }`}
                  >
                    -5m
                  </button>

                  {/* Slider for Point A */}
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, Math.floor((selectedSource.duration || 3600) / 60))}
                    value={streamSliceStartMin}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val < streamSliceEndMin) setStreamSliceStartMin(val);
                    }}
                    className="w-full accent-[#ff7427] cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={() => setStreamSliceStartMin((prev) => Math.min(streamSliceEndMin - 1, prev + 5))}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                    }`}
                  >
                    +5m
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamSliceStartMin((prev) => Math.min(streamSliceEndMin - 1, prev + 15))}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                    }`}
                  >
                    +15m
                  </button>
                </div>
              </div>

              {/* Point B Picker */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isLight ? "bg-white border-slate-200" : "bg-black/30 border-white/[0.08]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#ff7427] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ff7427]" />
                    Point B (End Time)
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {formatMinutes(streamSliceEndMin)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStreamSliceEndMin((prev) => Math.max(streamSliceStartMin + 1, prev - 15))}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                    }`}
                  >
                    -15m
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamSliceEndMin((prev) => Math.max(streamSliceStartMin + 1, prev - 5))}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                    }`}
                  >
                    -5m
                  </button>

                  {/* Slider for Point B */}
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, Math.floor((selectedSource.duration || 3600) / 60))}
                    value={streamSliceEndMin}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val > streamSliceStartMin) setStreamSliceEndMin(val);
                    }}
                    className="w-full accent-[#ff7427] cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const maxM = Math.max(1, Math.floor((selectedSource.duration || 3600) / 60));
                      setStreamSliceEndMin((prev) => Math.min(maxM, prev + 5));
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                    }`}
                  >
                    +5m
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const maxM = Math.max(1, Math.floor((selectedSource.duration || 3600) / 60));
                      setStreamSliceEndMin((prev) => Math.min(maxM, prev + 15));
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                    }`}
                  >
                    +15m
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Window Summary Footer */}
            <div
              className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
                isLight ? "border-slate-200 text-slate-600" : "border-white/10 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Selected Target Slice:</span>
                <span className="font-mono font-bold text-[#ff7427] bg-[#ff7427]/10 px-2 py-0.5 rounded-md border border-[#ff7427]/20">
                  {formatMinutes(streamSliceStartMin)} ➔ {formatMinutes(streamSliceEndMin)}
                </span>
                <span>({formatMinutes(Math.max(0, streamSliceEndMin - streamSliceStartMin))} duration)</span>
              </div>

              <span className="text-[11px] text-emerald-400 font-medium">
                ⚡ Ultra-fast segmented extraction active
              </span>
            </div>
          </div>
        )}

        {/* 3. Bottom Controls Strip: Duration, Captions, AI Mode, and Gradient Find Viral Moments CTA */}
        <div className="pt-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Target Duration Selector */}
            <div
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/[0.08]"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#ff7427]" />
              <span className={`text-xs font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>Duration:</span>
              <select
                value={targetDuration}
                onChange={(e) => setTargetDuration(Number(e.target.value))}
                className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer ${
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

            {/* Caption Preset Selector */}
            <div
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/[0.08]"
              }`}
            >
              <span className="text-xs font-black text-amber-400">CC</span>
              <span className={`text-xs font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>Style:</span>
              <select
                value={captionPreset}
                onChange={(e) => setCaptionPreset(e.target.value)}
                className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer ${
                  isLight ? "text-slate-800" : "text-white"
                }`}
              >
                <option value="hormozi" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                  Vakiogiri Signature (Hormozi)
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
                <option value="none" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                  No Captions
                </option>
              </select>
            </div>

            {/* Layout Mode Selector */}
            <div
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/[0.08]"
              }`}
            >
              <Scissors className="w-3.5 h-3.5 text-indigo-400" />
              <span className={`text-xs font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>Layout:</span>
              <select
                value={layoutMode}
                onChange={(e) => setLayoutMode(e.target.value as "gaming_split" | "face_top_game_bottom")}
                className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer ${
                  isLight ? "text-slate-800" : "text-white"
                }`}
              >
                <option value="gaming_split" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                  🎮 Gaming Split (50/50)
                </option>
                <option value="face_top_game_bottom" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>
                  ⚡ Face Top / Big Game (38/62)
                </option>
              </select>
            </div>

            {/* AI Mode Toggle with Gradient border/glow */}
            <button
              type="button"
              onClick={() => setClippingMode((prev) => (prev === "ai_enhanced" ? "heuristic" : "ai_enhanced"))}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                clippingMode === "ai_enhanced"
                  ? "bg-[#ff7427]/10 border-[#ff7427]/30 text-[#ff7427]"
                  : isLight
                  ? "bg-slate-50 border-slate-200 text-slate-600"
                  : "bg-white/[0.03] border-white/[0.08] text-slate-400"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-[#ff7427]" />
              <span>{clippingMode === "ai_enhanced" ? "AI Storytelling (1 Credit)" : "Fast Free Mode"}</span>
            </button>
          </div>

          {/* Primary CTA: Find Viral Moments Button with Vibrant Gradient */}
          <button
            type="button"
            onClick={handleDiscoverMoments}
            disabled={isDiscovering || isProcessing}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#ff7427] to-[#e65100] hover:from-[#ff8138] hover:to-[#f05c0a] text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>{isDiscovering ? "Discovering Moments..." : "Find Viral Moments"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

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
            {viewMode === "discovering"
              ? "Discovering Viral Shorts"
              : viewMode === "moments_review"
              ? "Curate Viral Shorts"
              : "Import Your Video"}
          </h1>
          <p
            className={`text-sm mt-1 max-w-2xl leading-relaxed transition-colors ${
              isLight ? "text-slate-600" : "text-slate-400"
            }`}
          >
            {viewMode === "discovering"
              ? "Vakiogiri Creative Director is analyzing engagement hooks & retention spikes."
              : viewMode === "moments_review"
              ? "Review candidate moments scored by Gemini 2.5 Flash and pick clips to render."
              : "Select a video to generate viral shorts."}
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

      {/* VIEW 1: VAKIOGIRI CREATIVE DIRECTOR - LIVE MOMENT DROP STREAM */}
      {viewMode === "discovering" && (
        <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
          
          {/* Header Banner: Video Meta + Live Engine Status */}
          <div className={`p-6 sm:p-7 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#101015] border-white/[0.08] shadow-sm"
          }`}>
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative aspect-video w-24 sm:w-28 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black">
                {selectedSource?.thumbnail ? (
                  <img src={selectedSource.thumbnail} alt={selectedSource.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <FileVideo className="w-6 h-6" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#ff7427] animate-spin" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#ff7427]/10 text-[#ff7427] border border-[#ff7427]/25">
                    <Zap className="w-3 h-3 fill-[#ff7427]" />
                    Vakiogiri Creative Director
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    Live Scan
                  </span>
                </div>
                <h3 className={`text-base sm:text-lg font-bold truncate max-w-xl ${isLight ? "text-slate-900" : "text-white"}`}>
                  {selectedSource?.title || "Video Stream"}
                </h3>
                <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  {selectedSource?.isStream
                    ? `Scoped Slice: ${formatMinutes(streamSliceStartMin)} ➔ ${formatMinutes(streamSliceEndMin)} • Target: ${targetDuration}s Shorts`
                    : `Duration: ${selectedSource?.durationFormatted || "Full Video"} • Target: ${targetDuration}s Shorts`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsDiscovering(false);
                setViewMode("source_select");
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer self-start md:self-center shrink-0 ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/[0.08]"
              }`}
            >
              Cancel & Return
            </button>
          </div>

          {/* Live Progress Stage Bar */}
          <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${
            isLight ? "bg-slate-50/70 border-slate-200" : "bg-[#121217] border-white/[0.08]"
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className={`font-semibold flex items-center gap-2 ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                <Sparkles className="w-4 h-4 text-[#ff7427]" />
                {discoveryDropStage === 1 && "Step 1/4: Analyzing audio cadence & speech density peaks..."}
                {discoveryDropStage === 2 && "Step 2/4: Identified high-retention opening hooks!"}
                {discoveryDropStage === 3 && "Step 3/4: Calculating emotional spikes & punchlines..."}
                {discoveryDropStage >= 4 && "Step 4/4: Scoring virality & framing 9:16 vertical crops..."}
              </span>
              <span className="text-[#ff7427] font-mono font-bold">
                {discoveryDropStage === 1 && "25% Complete"}
                {discoveryDropStage === 2 && "50% Complete"}
                {discoveryDropStage === 3 && "75% Complete"}
                {discoveryDropStage >= 4 && "95% Synthesizing..."}
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#ff7427] to-[#e65100] rounded-full transition-all duration-700 ease-out"
                style={{
                  width:
                    discoveryDropStage === 1
                      ? "25%"
                      : discoveryDropStage === 2
                      ? "50%"
                      : discoveryDropStage === 3
                      ? "75%"
                      : "95%",
                }}
              />
            </div>
          </div>

          {/* The Star: Live Moment Drops Grid */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#ff7427]" />
                <h4 className={`text-sm font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                  Incoming Viral Moments Stream
                </h4>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#ff7427]/10 text-[#ff7427] border border-[#ff7427]/25">
                  {Math.min(discoveryDropStage - 1, 3)} / 4+ Found
                </span>
              </div>
              <span className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Gemini 2.5 Flash evaluating retention curve
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Card 1: Dropped at stage >= 2 */}
              {discoveryDropStage >= 2 ? (
                <div className={`p-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-bottom-3 duration-400 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121218] border-white/[0.08]"
                }`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Moment #1 Found
                    </span>
                    <span className="text-xs font-mono font-bold text-[#ff7427] bg-[#ff7427]/10 px-2 py-0.5 rounded-md border border-[#ff7427]/20">
                      98% Viral
                    </span>
                  </div>
                  <h5 className={`text-sm font-bold line-clamp-1 mb-1 ${isLight ? "text-slate-900" : "text-white"}`}>
                    High-Energy Opening Hook Spike
                  </h5>
                  <p className={`text-xs line-clamp-2 mb-3 leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    Fast speech pace with immediate narrative question that prevents immediate swipe-away.
                  </p>
                  <div className={`pt-2.5 border-t flex items-center justify-between text-[11px] ${
                    isLight ? "border-slate-100 text-slate-500" : "border-white/5 text-slate-400"
                  }`}>
                    <span className="font-mono font-semibold">Length: ~45s</span>
                    <span className="text-emerald-400 font-bold">#PeakHook</span>
                  </div>
                </div>
              ) : (
                /* Scanning Skeleton for Card 1 */
                <div className={`p-5 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center gap-2.5 min-h-[160px] ${
                  isLight ? "bg-slate-50/50 border-slate-300" : "bg-white/[0.02] border-white/10"
                }`}>
                  <Sparkles className="w-5 h-5 text-[#ff7427] animate-spin" />
                  <span className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Scanning for Moment #1...
                  </span>
                  <span className={`text-[11px] max-w-[200px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    Analyzing opening 3-second retention hook
                  </span>
                </div>
              )}

              {/* Card 2: Dropped at stage >= 3 */}
              {discoveryDropStage >= 3 ? (
                <div className={`p-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-bottom-3 duration-400 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121218] border-white/[0.08]"
                }`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Moment #2 Found
                    </span>
                    <span className="text-xs font-mono font-bold text-[#ff7427] bg-[#ff7427]/10 px-2 py-0.5 rounded-md border border-[#ff7427]/20">
                      95% Viral
                    </span>
                  </div>
                  <h5 className={`text-sm font-bold line-clamp-1 mb-1 ${isLight ? "text-slate-900" : "text-white"}`}>
                    Climax Reaction & Confrontation
                  </h5>
                  <p className={`text-xs line-clamp-2 mb-3 leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    Peak audio loudness and intense visual confrontation ideal for high watch-time completion.
                  </p>
                  <div className={`pt-2.5 border-t flex items-center justify-between text-[11px] ${
                    isLight ? "border-slate-100 text-slate-500" : "border-white/5 text-slate-400"
                  }`}>
                    <span className="font-mono font-semibold">Length: ~45s</span>
                    <span className="text-[#ff7427] font-bold">#EmotionalClimax</span>
                  </div>
                </div>
              ) : (
                /* Scanning Skeleton for Card 2 */
                <div className={`p-5 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center gap-2.5 min-h-[160px] ${
                  isLight ? "bg-slate-50/50 border-slate-300" : "bg-white/[0.02] border-white/10"
                }`}>
                  <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
                  <span className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Evaluating Moment #2...
                  </span>
                  <span className={`text-[11px] max-w-[200px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    Tracking peak emotional shifts & punchline
                  </span>
                </div>
              )}

              {/* Card 3: Dropped at stage >= 4 */}
              {discoveryDropStage >= 4 ? (
                <div className={`p-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-bottom-3 duration-400 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121218] border-white/[0.08]"
                }`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Moment #3 Found
                    </span>
                    <span className="text-xs font-mono font-bold text-[#ff7427] bg-[#ff7427]/10 px-2 py-0.5 rounded-md border border-[#ff7427]/20">
                      92% Viral
                    </span>
                  </div>
                  <h5 className={`text-sm font-bold line-clamp-1 mb-1 ${isLight ? "text-slate-900" : "text-white"}`}>
                    Unexpected Twist & Viewer Payoff
                  </h5>
                  <p className={`text-xs line-clamp-2 mb-3 leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    Strong conclusion hook that invites viewers to replay or comment, driving algorithmic virality.
                  </p>
                  <div className={`pt-2.5 border-t flex items-center justify-between text-[11px] ${
                    isLight ? "border-slate-100 text-slate-500" : "border-white/5 text-slate-400"
                  }`}>
                    <span className="font-mono font-semibold">Length: ~45s</span>
                    <span className="text-purple-400 font-bold">#TwistPayoff</span>
                  </div>
                </div>
              ) : (
                /* Scanning Skeleton for Card 3 */
                <div className={`p-5 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center gap-2.5 min-h-[160px] ${
                  isLight ? "bg-slate-50/50 border-slate-300" : "bg-white/[0.02] border-white/10"
                }`}>
                  <Clock className="w-5 h-5 text-slate-500 animate-pulse" />
                  <span className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Calculating Final Candidates...
                  </span>
                  <span className={`text-[11px] max-w-[200px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    Formatting 9:16 vertical subject framing
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MOMENTS REVIEW & CURATION CANVAS (9:16 STORY-GRID) */}
      {viewMode === "moments_review" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          
          {/* Sticky Top Command Header: Video Meta + Actions + Render Button (No Bottom Dock) */}
          <div
            className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
              isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#101015] border-white/[0.08] shadow-sm"
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <button
                type="button"
                onClick={() => setViewMode("source_select")}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border-white/10"
                }`}
                title="Back to Video Selection"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="relative aspect-video w-20 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black">
                {selectedSource?.thumbnail ? (
                  <img src={selectedSource.thumbnail} alt={selectedSource.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <FileVideo className="w-5 h-5" />
                  </div>
                )}
                {selectedSource?.durationFormatted && (
                  <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-black/80 text-white">
                    {selectedSource.durationFormatted}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-[#ff7427] uppercase tracking-wider">
                    {selectedSource?.sourceType === "channel" ? "Channel Video" : selectedSource?.sourceType === "upload" ? "Uploaded Video" : "YouTube Stream"}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Vakiogiri Creative Director
                  </span>
                </div>
                <h3 className={`text-sm sm:text-base font-bold truncate max-w-md ${isLight ? "text-slate-900" : "text-white"}`} title={selectedSource?.title}>
                  {selectedSource?.title}
                </h3>
              </div>
            </div>

            {/* Actions Strip: Select All / Clear, Style, Quality, and Big Render Button */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllMoments}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isLight
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border-white/10"
                  }`}
                >
                  Select All
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
                  Clear
                </button>
              </div>

              {/* Caption Style Dropdown */}
              <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.04] border-white/10"}`}>
                <span className="text-[11px] font-black text-amber-500">CC</span>
                <select
                  value={captionPreset}
                  onChange={(e) => setCaptionPreset(e.target.value)}
                  className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${isLight ? "text-slate-800" : "text-white"}`}
                  title="Caption Visual Style"
                >
                  <option value="hormozi" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>Vakiogiri Signature (Hormozi)</option>
                  <option value="beast" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>MrBeast Pop</option>
                  <option value="karaoke" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>Karaoke Glow</option>
                  <option value="minimal" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>Minimal Clean</option>
                  <option value="none" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>No Captions</option>
                </select>
              </div>

              {/* Subtitle Language Dropdown (Hinglish vs English) */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.04] border-white/10"}`}>
                <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <select
                  value={subtitleLanguage}
                  onChange={(e) => setSubtitleLanguage(e.target.value as "hinglish" | "english" | "auto")}
                  className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${isLight ? "text-slate-800" : "text-white"}`}
                  title="Subtitle Language Format: Hinglish (Roman Hindi) or English"
                >
                  <option value="hinglish" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>🇮🇳 Hinglish (Desi / Gaming)</option>
                  <option value="english" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>🌐 English (Accurate)</option>
                  <option value="auto" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>✨ Auto Detect</option>
                </select>
              </div>

              {/* Layout Mode Selector */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.04] border-white/10"}`}>
                <Scissors className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <select
                  value={layoutMode}
                  onChange={(e) => setLayoutMode(e.target.value as "gaming_split" | "face_top_game_bottom")}
                  className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${isLight ? "text-slate-800" : "text-white"}`}
                  title="Layout Style: 50/50 Gaming Split or Inverted Reaction Top"
                >
                  <option value="gaming_split" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>🎮 Gaming Split (50/50)</option>
                  <option value="face_top_game_bottom" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>⚡ Face Top / Big Game (38/62)</option>
                </select>
              </div>

              {/* Quality Dropdown */}
              <div className={`flex items-center px-2.5 py-1.5 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.04] border-white/10"}`}>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${isLight ? "text-slate-800" : "text-white"}`}
                >
                  <option value="1080p" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>1080p</option>
                  <option value="720p" className={isLight ? "bg-white text-slate-900" : "bg-black text-white"}>720p</option>
                </select>
              </div>

              {/* Render Shorts CTA */}
              <button
                type="button"
                onClick={handleRenderSelectedMoments}
                disabled={selectedMomentIds.length === 0 || isProcessing}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff7427] to-[#e65100] hover:from-[#ff8138] hover:to-[#f05c0a] text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-40 transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>{isProcessing ? "Processing..." : `Render ${selectedMomentIds.length} Selected Shorts`}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Compact 9:16 Phone Cards Story-Grid (Optimized scale & density) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 pb-16">
            {discoveredMoments.map((moment, idx) => {
              const isSelected = selectedMomentIds.includes(moment.id);
              const thumbnailSrc = selectedSource?.thumbnail || "";

              return (
                <div
                  key={moment.id}
                  onClick={() => toggleMomentSelection(moment.id)}
                  className={`relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer select-none transition-all duration-200 flex flex-col justify-between p-3 group ${
                    isSelected
                      ? "border-2 border-[#ff7427] shadow-md ring-1 ring-[#ff7427]/50"
                      : isLight
                      ? "border border-slate-300 hover:border-[#ff7427]/60 shadow-xs hover:shadow-sm bg-slate-900"
                      : "border border-white/10 hover:border-[#ff7427]/60 shadow-sm bg-[#0c0c10]"
                  }`}
                >
                  {/* Background Image / Video Frame with Smooth Zoom & Dark Gradient Scrim */}
                  <div className="absolute inset-0 overflow-hidden -z-10">
                    {thumbnailSrc ? (
                      <img
                        src={thumbnailSrc}
                        alt={moment.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                        <FileVideo className="w-8 h-8 text-slate-700" />
                      </div>
                    )}

                    {/* Vignette & Gradients for High Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/75 opacity-90 transition-opacity group-hover:opacity-85" />
                    
                    {/* Subtle phone bezel edge line */}
                    <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none" />
                  </div>

                  {/* TOP BAR: Checkbox + Viral Score + Duration Badge */}
                  <div className="flex items-center justify-between gap-1.5 z-10">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] transition-all shadow-xs ${
                        isSelected
                          ? "bg-[#ff7427] text-white border border-white/50"
                          : "bg-black/60 backdrop-blur-md border border-white/30 text-white/70 group-hover:border-white"
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-md border border-[#ff7427]/40 text-[#ff7427] flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5 text-[#ff7427]" />
                        {moment.virality_score}%
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-black/70 backdrop-blur-md border border-white/20 text-white/90">
                        {moment.duration_formatted || `${moment.duration}s`}
                      </span>
                    </div>
                  </div>

                  {/* CENTER: Play Overlay Icon (Reveals on Hover) */}
                  <div className="flex items-center justify-center my-auto z-10 pointer-events-none">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 transform ${
                        isSelected
                          ? "bg-[#ff7427]/90 text-white scale-100 shadow-sm"
                          : "bg-white/20 backdrop-blur-md border border-white/30 text-white scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
                      }`}
                    >
                      <Play className="w-4 h-4 ml-0.5 fill-current" />
                    </div>
                  </div>

                  {/* BOTTOM SECTION: Hook Title, Pull-Quote, Tags & Selection Pill */}
                  <div className="flex flex-col gap-1.5 z-10">
                    {/* Timestamp Pill */}
                    <div className="flex items-center justify-between text-[9px] text-white/70 font-mono">
                      <span className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 font-bold text-amber-300">
                        {moment.start_formatted} ➔ {moment.end_formatted}
                      </span>
                      {moment.virality_reason && (
                        <span className="text-[9px] text-emerald-400 font-bold truncate max-w-[90px]">
                          #Viral
                        </span>
                      )}
                    </div>

                    {/* Hook Headline */}
                    <h4 className="text-xs font-bold text-white leading-tight line-clamp-2 drop-shadow-xs group-hover:text-[#ff924d] transition-colors">
                      {moment.title}
                    </h4>

                    {/* Hook Quote Pill */}
                    {moment.hook_quote && (
                      <div className="p-1.5 rounded-lg bg-black/60 backdrop-blur-xs border border-white/15 text-[10px] text-white/90 italic line-clamp-1 leading-snug">
                        “{moment.hook_quote}”
                      </div>
                    )}

                    {/* Selection Action Button inside Card */}
                    <div
                      className={`w-full py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all mt-0.5 ${
                        isSelected
                          ? "bg-gradient-to-r from-[#ff7427] to-[#e65100] text-white shadow-xs"
                          : "bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white/90 border border-white/20"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <span>Select</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
            {/* Morphing Studio Cockpit when a channel video is active */}
            {selectedSource && selectedSource.sourceType === "channel" && (
              renderStudioCockpit()
            )}
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
                          const isStream = Boolean((video.duration && video.duration >= 900) || (video as any).is_stream);
                          if (isStream) {
                            const totalMin = Math.max(1, Math.floor((video.duration || 3600) / 60));
                            setStreamSliceStartMin(0);
                            setStreamSliceEndMin(totalMin);
                          }
                          setSelectedSource({
                            sourceType: "channel",
                            title: video.title,
                            url: video.url,
                            duration: video.duration,
                            durationFormatted: video.duration_formatted,
                            thumbnail: video.thumbnail,
                            uploader: video.uploader,
                            isStream,
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

            {/* If uploaded video is active, morph into Studio Cockpit */}
            {selectedSource && selectedSource.sourceType === "upload" ? (
              renderStudioCockpit()
            ) : (
              /* Dropzone */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-12 sm:p-16 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden ${
                  isDragging
                    ? "border-[#ff7427] bg-[#ff7427]/[0.03]"
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
                  className="mt-6 px-6 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-[#ff7427] to-[#e65100] hover:from-[#ff8138] hover:to-[#f05c0a] text-white shadow-sm active:scale-[0.98] transition-all cursor-pointer"
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
            )}
          </div>
        )}

        {/* TAB 3 CONTENT: PASTE VIDEO URL */}
        {activeTab === "url" && (
          <div className="flex flex-col gap-6">
            {selectedSource && selectedSource.sourceType === "url" ? (
              renderStudioCockpit()
            ) : (
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
                    Extract shorts from any YouTube video, podcast episode, or stream recording (up to 5 hours).
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
                      placeholder="https://www.youtube.com/watch?v=... or https://www.youtube.com/live/..."
                      className={`w-full pl-11 pr-24 py-3.5 rounded-2xl text-sm focus:outline-none focus:border-[#ff7427] transition-colors ${
                        isLight
                          ? "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400"
                          : "bg-black/60 border border-white/[0.12] text-white placeholder-slate-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                        isLight
                          ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                          : "bg-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.14]"
                      }`}
                    >
                      Paste
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleProbeUrl(directUrl)}
                    disabled={!directUrl || isProbingUrl}
                    className="px-7 py-3.5 rounded-2xl font-bold text-xs bg-gradient-to-r from-[#ff7427] to-[#e65100] hover:from-[#ff8138] hover:to-[#f05c0a] text-white shadow-sm active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer shrink-0"
                  >
                    {isProbingUrl ? "Inspecting..." : "Inspect Link"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
};
