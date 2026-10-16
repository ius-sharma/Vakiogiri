"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Download, Sparkles, Flame, Clock, RefreshCw, Check } from "lucide-react";
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

  // Trigger celebration confetti once on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#6366f1", "#06b6d4", "#10b981", "#f43f5e"],
      });
    } catch (e) {
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
    return 0; // Default order
  });

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      
      {/* Top Results Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#101018]/80 backdrop-blur-xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Viral Clips Ready</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {clips.length} {clips.length === 1 ? "Clip" : "Clips"}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Ranked by AI vocal energy spikes, retention heatmaps & hook power.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Sort Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setSortBy("virality")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                sortBy === "virality"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Highest Virality</span>
            </button>

            <button
              type="button"
              onClick={() => setSortBy("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                sortBy === "timeline"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Timeline Order</span>
            </button>
          </div>

          {/* Download All Button */}
          <button
            type="button"
            onClick={onDownloadAll}
            disabled={isDownloadingAll}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-98 ${
              isDownloadingAll
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                : "bg-white/10 hover:bg-white/15 text-white border border-white/15"
            }`}
          >
            {isDownloadingAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Downloading All...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download All ({clips.length})</span>
              </>
            )}
          </button>

          {/* Reset button */}
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
            title="Clip another video"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Clip Another</span>
          </button>
        </div>
      </div>

      {/* Responsive Bento Grid of Clips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {sortedClips.map((clip, index) => {
          const filename = typeof clip === "object" && clip !== null ? clip.filename : clip;
          const isDownloading = downloadingClips[filename] === "done";

          return (
            <ClipCard
              key={`${filename}-${index}`}
              clip={clip}
              index={index}
              onOpenCinema={handleOpenCinema}
              onDownload={onDownloadSingle}
              isDownloading={isDownloading}
              backendUrl={backendUrl}
              jobId={jobId}
            />
          );
        })}
      </div>

      {/* Cinema Fullscreen Modal */}
      <ClipCinemaModal
        isOpen={cinemaModalOpen}
        onClose={() => setCinemaModalOpen(false)}
        clips={sortedClips}
        initialIndex={cinemaIndex}
        onDownload={onDownloadSingle}
        backendUrl={backendUrl}
      />
    </div>
  );
}
