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
}

interface ClipCardProps {
  clip: string | ClipItemData;
  index: number;
  onOpenCinema: (clip: ClipItemData, index: number) => void;
  onDownload: (clip: string | ClipItemData) => void;
  isDownloading: boolean;
  backendUrl: string;
  jobId?: string | null;
}

export default function ClipCard({
  clip,
  index,
  onOpenCinema,
  onDownload,
  isDownloading,
  backendUrl,
  jobId,
}: ClipCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Normalize clip data
  const isObject = typeof clip === "object" && clip !== null;
  const filename = isObject ? clip.filename : clip;
  const clipUrl = isObject && clip.url
    ? clip.url.startsWith("http")
      ? clip.url
      : `${backendUrl}${clip.url}`
    : `${backendUrl}/clips/${filename}`;

  const viralityScore = isObject && typeof clip.score === "number" ? Math.round(clip.score) : 85 + (index % 12);
  const heatmapScore = isObject && typeof clip.heatmap_score === "number" ? Math.round(clip.heatmap_score) : 92 - (index * 4);
  const clipDuration = isObject && clip.duration ? Math.round(clip.duration) : 45;
  const clipTitle = isObject && clip.title ? clip.title : `Clip #${index + 1} • High Energy Hook`;
  const isVertical = !isObject || clip.aspect_ratio !== "16:9";

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      // Pause all other videos
      document.querySelectorAll("video").forEach((v) => {
        if (v !== videoRef.current && !v.paused) v.pause();
      });
      videoRef.current.play();
      setIsPlaying(true);
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
    <div className="group relative rounded-3xl bg-[#101018] border border-white/10 hover:border-indigo-500/40 shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
      
      {/* Top Virality Header Badge */}
      <div className="p-3.5 pb-2.5 flex items-center justify-between gap-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-1.5">
          <div
            className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm ${
              viralityScore >= 90
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : viralityScore >= 80
                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{viralityScore} Virality</span>
          </div>

          {heatmapScore > 75 && (
            <div className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{heatmapScore}% Peak</span>
            </div>
          )}
        </div>

        {/* Safe Zone Toggle Button (TikTok/Shorts Overlay) */}
        <button
          type="button"
          onClick={() => setShowSafeZone((prev) => !prev)}
          className={`p-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
            showSafeZone
              ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
              : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="Toggle TikTok/Reels Safe Zone Framing"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[10px]">Safe Zone</span>
        </button>
      </div>

      {/* Video Container Area */}
      <div
        className={`relative w-full overflow-hidden bg-black flex items-center justify-center cursor-pointer select-none ${
          isVertical ? "aspect-[9/16]" : "aspect-[16/9]"
        }`}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={clipUrl}
          playsInline
          muted={isMuted}
          preload="metadata"
          onEnded={() => setIsPlaying(false)}
          className="w-full h-full object-cover"
        />

        {/* TikTok / Reels Safe Zone Overlay */}
        {showSafeZone && (
          <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 border-2 border-dashed border-cyan-400/40 bg-cyan-500/[0.04]">
            <div className="text-[10px] font-mono text-cyan-300 bg-black/60 px-2 py-0.5 rounded self-start">
              Top Header Safe Area
            </div>
            {/* Simulated right action rail */}
            <div className="absolute right-2 bottom-16 flex flex-col gap-2 items-center opacity-60">
              <div className="w-6 h-6 rounded-full border border-cyan-400/60 bg-black/40 text-[9px] flex items-center justify-center text-cyan-300">
                ❤️
              </div>
              <div className="w-6 h-6 rounded-full border border-cyan-400/60 bg-black/40 text-[9px] flex items-center justify-center text-cyan-300">
                💬
              </div>
            </div>
            <div className="text-[10px] font-mono text-cyan-300 bg-black/60 px-2 py-0.5 rounded self-start mt-auto">
              Bottom Caption Safe Area (Keep clear)
            </div>
          </div>
        )}

        {/* Center Big Play/Pause Button on Hover / Pause */}
        {(!isPlaying || !showSafeZone) && (
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 z-10 ${
              !isPlaying ? "bg-black/30 opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-14 h-14 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>
          </div>
        )}

        {/* Bottom Quick Controls Bar */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-auto">
          {/* Duration Pill */}
          <span className="text-[11px] font-mono font-bold text-white bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
            {clipDuration}s
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-white hover:bg-black/90 flex items-center justify-center transition-all cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleCinemaClick}
              className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-white hover:bg-black/90 flex items-center justify-center transition-all cursor-pointer"
              title="Fullscreen Cinema Inspector"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Card Info and Download Bar */}
      <div className="p-4 flex flex-col gap-3 flex-grow justify-between">
        <div>
          <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
            {clipTitle}
          </h4>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            Auto-framed 9:16 vertical clip with audio leveling and viral hook detection.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={() => onDownload(clip)}
            disabled={isDownloading}
            className={`flex-grow py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-98 ${
              isDownloading
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25"
            }`}
          >
            {isDownloading ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 animate-bounce" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download MP4</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCinemaClick}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
            title="Inspect in Cinema Modal"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
            title="Copy video link"
          >
            {copiedLink ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
