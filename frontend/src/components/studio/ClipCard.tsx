"use client";

import React, { useState, useRef } from "react";
import {
  Play,
  Pause,
  Download,
  Maximize2,
  Volume2,
  VolumeX,
  Flame,
  TrendingUp,
  Check,
  Smartphone,
  Eye,
  Share2,
} from "lucide-react";

export interface ClipItemData {
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
  chapters?: Array<{ timestamp: string; title: string; duration: number }>;
  chapter_description?: string;
  hook_quote?: string;
  transcript?: string;
}

interface ClipCardProps {
  clip: string | ClipItemData;
  index: number;
  onOpenCinema: (clip: ClipItemData, index: number) => void;
  onDownload: (clip: string | ClipItemData) => void;
  isDownloading: boolean;
  backendUrl: string;
  jobId?: string | null;
  className?: string;
}

export default function ClipCard({
  clip,
  index,
  onOpenCinema,
  onDownload,
  isDownloading,
  backendUrl,
  jobId,
  className = "",
}: ClipCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Normalize clip data
  const isObject = typeof clip === "object" && clip !== null;
  const filename = isObject ? clip.filename : clip;
  const clipUrl = isObject && clip.url
    ? clip.url.startsWith("http")
      ? clip.url
      : `${backendUrl}${clip.url.startsWith("/") ? "" : "/"}${clip.url}`
    : `${backendUrl}/clips/${jobId ? `${jobId}/` : ""}${filename}`;

  const posterUrl = isObject && (clip as any).thumbnail
    ? (clip as any).thumbnail.startsWith("http")
      ? (clip as any).thumbnail
      : `${backendUrl}${(clip as any).thumbnail.startsWith("/") ? "" : "/"}${(clip as any).thumbnail}`
    : undefined;

  const viralityScore = isObject && typeof clip.score === "number" ? Math.round(clip.score) : 85 + (index % 12);
  const heatmapScore = isObject && typeof clip.heatmap_score === "number" ? Math.round(clip.heatmap_score) : 92 - (index * 4);
  const clipDuration = isObject && clip.duration ? Math.round(clip.duration) : 45;
  const clipTitle = isObject && clip.title ? clip.title : `Short #${index + 1} • High Energy Hook`;
  const isVertical = !isObject || clip.aspect_ratio !== "16:9";

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
    } else {
      // Pause all other videos on the page
      document.querySelectorAll("video").forEach((v) => {
        if (v !== video && !v.paused) v.pause();
      });
      video.muted = isMuted;
      try {
        await video.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn("Unmuted autoplay restricted, attempting muted fallback:", err);
        video.muted = true;
        setIsMuted(true);
        try {
          await video.play();
          setIsPlaying(true);
        } catch (e2) {
          console.error("Video play failed:", e2);
          setIsPlaying(false);
        }
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(clipUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCinemaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const clipData: ClipItemData = isObject
      ? clip
      : { filename, url: clipUrl, score: viralityScore, duration: clipDuration, title: clipTitle };
    onOpenCinema(clipData, index);
  };

  return (
    <div
      className={`group relative rounded-2xl bg-[#121218] border border-white/10 hover:border-[#ff7427]/40 shadow-lg overflow-hidden flex flex-col transition-all duration-200 select-none ${className}`}
    >
      {/* Top Virality Header Badge (Simple, solid, no blurry glass) */}
      <div className="px-3 py-2 flex items-center justify-between gap-1.5 border-b border-white/5 bg-[#171720]">
        <div className="flex items-center gap-1.5">
          <div
            className={`px-2 py-0.5 rounded-lg text-[11px] font-black flex items-center gap-1 ${
              viralityScore >= 90
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : viralityScore >= 80
                ? "bg-[#ff7427]/15 text-[#ff7427] border border-[#ff7427]/30"
                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>{viralityScore} Virality</span>
          </div>

          {heatmapScore > 75 && (
            <div className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" />
              <span>{heatmapScore}% Peak</span>
            </div>
          )}
        </div>

        {/* Safe Zone Toggle Button */}
        <button
          type="button"
          onClick={() => setShowSafeZone((prev) => !prev)}
          className={`p-1 rounded-md text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
            showSafeZone
              ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
              : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="Toggle TikTok/Reels Safe Zone Framing"
        >
          <Smartphone className="w-3 h-3" />
          <span className="text-[10px]">Safe Zone</span>
        </button>
      </div>

      {/* Video Container Area (Compact height so entire card fits on screen without scroll) */}
      <div
        className={`relative w-full overflow-hidden bg-black flex items-center justify-center cursor-pointer ${
          isVertical ? "h-[360px] sm:h-[380px]" : "h-[200px]"
        }`}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={clipUrl}
          poster={posterUrl}
          playsInline
          loop
          muted={isMuted}
          crossOrigin="anonymous"
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            console.error("ClipCard video error:", e);
            setIsPlaying(false);
          }}
          className="w-full h-full object-cover"
        />

        {/* Animated Playback Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-[#ff7427] to-[#e65100] transition-all duration-100"
            style={{ width: `${(currentTime / Math.max(1, clipDuration)) * 100}%` }}
          />
        </div>

        {/* TikTok / Reels Safe Zone Overlay */}
        {showSafeZone && (
          <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-2.5 border-2 border-dashed border-cyan-400/50 bg-cyan-500/[0.03]">
            <div className="text-[9px] font-mono text-cyan-300 bg-black/80 px-1.5 py-0.5 rounded self-start border border-cyan-400/30">
              Top Header Safe Area
            </div>
            {/* Simulated right action rail */}
            <div className="absolute right-1.5 bottom-12 flex flex-col gap-1.5 items-center opacity-70">
              <div className="w-5 h-5 rounded-full border border-cyan-400/60 bg-black/70 text-[8px] flex items-center justify-center text-cyan-300">
                ❤️
              </div>
              <div className="w-5 h-5 rounded-full border border-cyan-400/60 bg-black/70 text-[8px] flex items-center justify-center text-cyan-300">
                💬
              </div>
            </div>
            <div className="text-[9px] font-mono text-cyan-300 bg-black/80 px-1.5 py-0.5 rounded self-start mt-auto border border-cyan-400/30">
              Bottom Caption Safe Area
            </div>
          </div>
        )}

        {/* Center Play/Pause Button on Hover / Pause */}
        {(!isPlaying || !showSafeZone) && (
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 z-10 pointer-events-none ${
              !isPlaying ? "bg-black/25 opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-12 h-12 rounded-full bg-[#ff7427] hover:bg-[#ff7427]/90 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer pointer-events-auto"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          </div>
        )}

        {/* Bottom Quick Controls Bar */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-auto">
          {/* Duration Pill */}
          <span className="text-[10px] font-mono font-bold text-white bg-black/85 px-1.5 py-0.5 rounded border border-white/15">
            {isPlaying ? `${Math.floor(currentTime)}s / ${clipDuration}s` : `${clipDuration}s`}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleMute}
              className="w-6 h-6 rounded-md bg-black/85 border border-white/15 text-white hover:bg-black flex items-center justify-center transition-all cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={handleCinemaClick}
              className="w-6 h-6 rounded-md bg-black/85 border border-white/15 text-white hover:bg-black flex items-center justify-center transition-all cursor-pointer"
              title="Fullscreen Cinema Inspector"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Card Info and Download Bar */}
      <div className="p-3 flex flex-col gap-2.5 bg-[#121218]">
        <div>
          <h4 className="text-xs font-bold text-white truncate group-hover:text-[#ff7427] transition-colors" title={clipTitle}>
            {clipTitle}
          </h4>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            Vakiogiri Engine 9:16 vertical • 1080p
          </p>
        </div>

        {/* Primary Actions */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={() => onDownload(clip)}
            disabled={isDownloading}
            className={`flex-grow py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98 ${
              isDownloading
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                : "bg-[#ff7427] hover:bg-[#ff7427]/90 text-white shadow-[#ff7427]/20"
            }`}
          >
            {isDownloading ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download MP4</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCinemaClick}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
            title="Inspect in Cinema Modal"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
            title="Copy video link"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
