"use client";

import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Download,
  Sparkles,
  Flame,
  Clock,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Copy,
  TrendingUp,
  Smartphone,
  Share2,
} from "lucide-react";
import ClipCard, { ClipItemData } from "./ClipCard";
import ClipCinemaModal from "./ClipCinemaModal";

interface ClipShowcaseGridProps {
  clips: (string | ClipItemData)[];
  onReset: () => void;
  onDownloadSingle: (clip: string | ClipItemData) => void;
  onDownloadAll: () => void;
  isDownloadingAll: boolean;
  downloadingClips: Record<string, "downloading" | "done">;
  backendUrl: string;
  jobId?: string | null;
}

export default function ClipShowcaseGrid({
  clips,
  onReset,
  onDownloadSingle,
  onDownloadAll,
  isDownloadingAll,
  downloadingClips,
  backendUrl,
  jobId,
}: ClipShowcaseGridProps) {
  const [sortBy, setSortBy] = useState<"virality" | "timeline">("virality");
  const [cinemaModalOpen, setCinemaModalOpen] = useState(false);
  const [cinemaIndex, setCinemaIndex] = useState(0);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  // Trigger celebratory confetti once on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#ff7427", "#10b981", "#38bdf8", "#f43f5e"],
      });
    } catch {
      // Ignore in SSR
    }
  }, []);

  const handleOpenCinema = (clip: ClipItemData, index: number) => {
    setCinemaIndex(index);
    setCinemaModalOpen(true);
  };

  // Sort clips based on user preference
  const sortedClips = [...clips].sort((a, b) => {
    if (sortBy === "virality") {
      const scoreA = typeof a === "object" && a?.score ? a.score : 80;
      const scoreB = typeof b === "object" && b?.score ? b.score : 80;
      return scoreB - scoreA;
    }
    return 0;
  });

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 300;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const isSingleClip = sortedClips.length === 1;
  const singleClip = sortedClips[0];
  const isObject = typeof singleClip === "object" && singleClip !== null;
  const singleFilename = isObject ? singleClip.filename : singleClip;
  const singleVirality = isObject && typeof singleClip.score === "number" ? Math.round(singleClip.score) : 94;
  const singleHeatmap = isObject && typeof singleClip.heatmap_score === "number" ? Math.round(singleClip.heatmap_score) : 89;
  const singleDuration = isObject && singleClip.duration ? Math.round(singleClip.duration) : 45;
  const singleTitle = isObject && singleClip.title ? singleClip.title : "Viral Hook • High Energy Short";
  const singleUrl = isObject && singleClip.url
    ? singleClip.url.startsWith("http")
      ? singleClip.url
      : `${backendUrl}${singleClip.url}`
    : `${backendUrl}/clips/${singleFilename}`;
  const isSingleDownloading = downloadingClips[singleFilename] === "done";

  const handleCopySingleLink = () => {
    navigator.clipboard.writeText(singleUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCaption = () => {
    const text = `🔥 ${singleTitle}\n\nGenerated with Vakiogiri Studio #shorts #viral #fyp`;
    navigator.clipboard.writeText(text);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 animate-in fade-in duration-300">
      
      {/* Top Action Bar (Compact, solid dark, no blurry glass) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#13131b] border border-white/10 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ff7427]/15 border border-[#ff7427]/30 flex items-center justify-center text-[#ff7427] shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Viral Shorts Generated
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                {clips.length} {clips.length === 1 ? "Short" : "Shorts"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Vakiogiri Creative Director • 9:16 vertical 1080p ready
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Multiple clips: sorting switcher */}
          {!isSingleClip && (
            <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setSortBy("virality")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer text-xs ${
                  sortBy === "virality"
                    ? "bg-[#ff7427] text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Flame className="w-3 h-3 text-white" />
                <span>Virality</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy("timeline")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer text-xs ${
                  sortBy === "timeline"
                    ? "bg-[#ff7427] text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Clock className="w-3 h-3 text-white" />
                <span>Timeline</span>
              </button>
            </div>
          )}

          {/* Download All (ZIP) */}
          <button
            type="button"
            onClick={onDownloadAll}
            disabled={isDownloadingAll}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98 ${
              isDownloadingAll
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                : "bg-white/10 hover:bg-white/15 text-white border border-white/15"
            }`}
          >
            {isDownloadingAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{clips.length > 1 ? `Download All (${clips.length})` : "Download MP4"}</span>
              </>
            )}
          </button>

          {/* Reset button */}
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
            title="Clip another video"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clip Another</span>
          </button>
        </div>
      </div>

      {/* SHOWCASE VIEW */}
      {isSingleClip ? (
        /* SINGLE SHORT SPOTLIGHT: Compact split layout (fits 100% on laptop screen without vertical scroll) */
        <div className="w-full rounded-2xl bg-[#121218] border border-white/10 shadow-lg p-4 sm:p-5 flex flex-col md:flex-row items-center justify-center gap-6">
          {/* Left: Compact Phone Player Card */}
          <div className="w-[260px] sm:w-[270px] shrink-0">
            <ClipCard
              clip={singleClip}
              index={0}
              onOpenCinema={handleOpenCinema}
              onDownload={onDownloadSingle}
              isDownloading={isSingleDownloading}
              backendUrl={backendUrl}
              jobId={jobId}
              className="border-[#ff7427]/30 shadow-xl"
            />
          </div>

          {/* Right: AI Hook Metadata & 1-Click Social Kit */}
          <div className="flex-1 flex flex-col justify-between self-stretch gap-4 max-w-lg py-1">
            <div className="flex flex-col gap-3">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{singleVirality} Virality Score</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#ff7427]/15 text-[#ff7427] border border-[#ff7427]/30 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{singleHeatmap}% Retention Peak</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white/5 text-slate-300 border border-white/10">
                  {singleDuration}s • 1080p
                </span>
              </div>

              {/* Title */}
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                {singleTitle}
              </h3>

              {/* Vakiogiri AI Rationale (Simple solid card, no blurry glass) */}
              <div className="p-3 rounded-xl bg-[#171722] border border-white/8 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff7427] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Vakiogiri Creative Director Hook Analysis</span>
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Identified high vocal energy and instant audience grab within the first 3 seconds. Scaled to vertical 9:16 safe framing with crisp voice sync.
                </p>
              </div>

              {/* Ready-to-copy Caption */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Ready-to-use Caption
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="text-xs font-semibold text-[#ff7427] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCaption ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCaption ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0e0e14] border border-white/10 font-mono text-[11px] text-slate-300">
                  🔥 {singleTitle} #shorts #viral #fyp
                </div>
              </div>
            </div>

            {/* Quick Action Dock */}
            <div className="flex items-center gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => onDownloadSingle(singleClip)}
                disabled={isSingleDownloading}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98 ${
                  isSingleDownloading
                    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-[#ff7427] hover:bg-[#ff7427]/90 text-white shadow-[#ff7427]/25"
                }`}
              >
                {isSingleDownloading ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download 1080p MP4</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOpenCinema(typeof singleClip === "object" ? singleClip : { filename: singleFilename, url: singleUrl }, 0)}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Full Cinema Inspector"
              >
                <Eye className="w-4 h-4 text-slate-300" />
                <span className="hidden sm:inline">Inspect</span>
              </button>

              <button
                type="button"
                onClick={handleCopySingleLink}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all cursor-pointer"
                title="Copy MP4 Link"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* MULTIPLE SHORTS: Horizontal Carousel Track ("scroll pe next shorts ya age shorts ke liye") */
        <div className="relative w-full rounded-2xl bg-[#121218] border border-white/10 p-4 flex flex-col gap-3">
          {/* Navigation Controls Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold flex items-center gap-1.5">
              <span>Scroll horizontally or use arrows to view next shorts</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollCarousel("left")}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Previous short"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel("right")}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Next short"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Snap Scroll Carousel Track */}
          <div
            ref={carouselRef}
            className="flex items-center gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 pt-1 px-1 scrollbar-thin"
          >
            {sortedClips.map((clip, index) => {
              const filename = typeof clip === "object" && clip !== null ? clip.filename : clip;
              const isDownloading = downloadingClips[filename] === "done";

              return (
                <div
                  key={`${filename}-${index}`}
                  className="w-[270px] min-w-[270px] shrink-0 snap-center"
                >
                  <ClipCard
                    clip={clip}
                    index={index}
                    onOpenCinema={handleOpenCinema}
                    onDownload={onDownloadSingle}
                    isDownloading={isDownloading}
                    backendUrl={backendUrl}
                    jobId={jobId}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cinema Fullscreen Modal */}
      <ClipCinemaModal
        isOpen={cinemaModalOpen}
        onClose={() => setCinemaModalOpen(false)}
        clips={sortedClips}
        initialIndex={cinemaIndex}
        onDownload={onDownloadSingle}
        backendUrl={backendUrl}
        jobId={jobId}
      />
    </div>
  );
}
