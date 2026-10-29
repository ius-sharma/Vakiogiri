"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Scissors,
  Smartphone,
  Type,
  CheckCircle2,
  Loader2,
  Radio,
  Flame,
  Clock,
  Check,
  X,
  Cpu,
  Layers,
  Sparkles,
  Film,
} from "lucide-react";

export interface LiveMomentItem {
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

export interface LivePipelineTrackerProps {
  progress: number;
  step?: string;
  progressMessage?: string;
  title?: string;
  thumbnail?: string;
  selectedMoments?: LiveMomentItem[];
  clipsCount?: number;
  onCancel?: () => void;
}

const STAGES = [
  {
    id: "stage1",
    label: "1. Precision Slice",
    sub: "Range stream ingest",
    icon: Scissors,
    range: [0, 25],
  },
  {
    id: "stage2",
    label: "2. 9:16 Smart Crop",
    sub: "Lanczos focus tracking",
    icon: Smartphone,
    range: [25, 55],
  },
  {
    id: "stage3",
    label: "3. Kinetic Captions",
    sub: "Auto subtitle burn",
    icon: Type,
    range: [55, 85],
  },
  {
    id: "stage4",
    label: "4. Finalizing MP4",
    sub: "1080p faststart sync",
    icon: CheckCircle2,
    range: [85, 100],
  },
];

export default function LivePipelineTracker({
  progress,
  step,
  progressMessage,
  title,
  thumbnail,
  selectedMoments,
  clipsCount,
  onCancel,
}: LivePipelineTrackerProps) {
  // Determine moments to display in the live production grid
  const displayMoments = useMemo<LiveMomentItem[]>(() => {
    if (selectedMoments && selectedMoments.length > 0) {
      return selectedMoments;
    }
    const count = clipsCount && clipsCount > 0 ? clipsCount : 3;
    return Array.from({ length: count }, (_, idx) => ({
      id: `live-clip-${idx + 1}`,
      title: `Key Highlight #${idx + 1}`,
      start: idx * 45,
      end: (idx + 1) * 45,
      duration: 45,
      duration_formatted: "00:45",
      virality_score: Math.max(76, 95 - idx * 3),
      virality_reason: "High retention hook & dynamic punchline segment",
      hook_quote: `AI selected peak moment from video timeline`,
    }));
  }, [selectedMoments, clipsCount]);

  const totalClips = displayMoments.length;

  // Active clip index computation based on global progress
  const activeClipIdx = useMemo(() => {
    if (progress >= 100) return totalClips - 1;
    const computed = Math.floor((Math.max(0, progress) / 100) * totalClips);
    return Math.min(totalClips - 1, Math.max(0, computed));
  }, [progress, totalClips]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="w-full max-w-6xl mx-auto flex flex-col gap-6"
    >
      {/* ======================================================== */}
      {/* 1. TOP PRODUCTION COCKPIT HEADER                         */}
      {/* ======================================================== */}
      <div className="w-full p-5 sm:p-6 rounded-3xl bg-[#0d0d12]/95 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Subtle non-neon ambient warmth */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#ff7427]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Source info with thumbnail */}
            <div className="flex items-center gap-3.5 min-w-0">
              {thumbnail ? (
                <div className="w-20 h-12 sm:w-24 sm:h-14 rounded-xl border border-white/10 overflow-hidden relative shrink-0 bg-black/60 shadow-inner">
                  <img
                    src={thumbnail}
                    alt="Source thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white/90">
                    SRC
                  </div>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-[#ff7427]/15 border border-[#ff7427]/30 flex items-center justify-center text-[#ff7427] shrink-0">
                  <Film className="w-6 h-6" />
                </div>
              )}

              <div className="min-w-0 flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ff7427]/15 text-[#ff7427] font-semibold border border-[#ff7427]/30 flex items-center gap-1.5 shrink-0">
                    <Radio className="w-3 h-3 text-[#ff7427] animate-pulse" />
                    <span>Live Vakiogiri Engine</span>
                  </span>

                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 font-medium border border-white/10 flex items-center gap-1 shrink-0">
                    <Layers className="w-3 h-3 text-slate-400" />
                    <span>{totalClips} Shorts in Production</span>
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white truncate max-w-xl">
                  {title || "Rendering Curated Shorts"}
                </h3>
              </div>
            </div>

            {/* Live Visualizer + Global Progress Meter */}
            <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 border-t border-white/5 md:border-none pt-3 md:pt-0">
              {/* Simulated Audio/FFmpeg Engine Waveform */}
              <div className="flex items-end gap-1 h-7 px-3 py-1.5 rounded-xl bg-black/50 border border-white/10">
                {[35, 75, 95, 55, 100, 40, 85, 60, 90, 45, 70, 80].map((h, i) => (
                  <motion.span
                    key={i}
                    className="w-1 bg-gradient-to-t from-[#ff7427] to-amber-400 rounded-full"
                    animate={{
                      height: [`${Math.max(15, h * 0.25)}%`, `${h}%`, `${Math.max(20, h * 0.5)}%`],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.75 + (i % 6) * 0.12,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>

              {/* Progress percentage */}
              <div className="text-right flex flex-col items-end">
                <div className="flex items-baseline gap-1 font-mono leading-none">
                  <span className="text-3xl font-black text-[#ff7427]">{Math.round(progress)}</span>
                  <span className="text-xs text-slate-400 font-semibold">%</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium mt-1">
                  {progress >= 100
                    ? "All shorts rendered!"
                    : `Rendering Short ${activeClipIdx + 1} of ${totalClips}`}
                </span>
              </div>
            </div>
          </div>

          {/* Master Progress Bar */}
          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#ff7427] via-amber-500 to-[#ff7427] shadow-xs"
              initial={{ width: "4%" }}
              animate={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>

          {/* Current Global Step Message */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">{progressMessage || "Synthesizing high-retention vertical clips..."}</span>
            </div>

            <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-500 font-mono">
              <span>TARGET: 1080p 9:16</span>
              <span>•</span>
              <span>LANCZOS CROP</span>
              <span>•</span>
              <span>NVENC ACCEL</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MULTI-SHORT LIVE PRODUCTION GRID                      */}
      {/* ======================================================== */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-3.5 px-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase">
              Production Queue
            </h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 font-mono">
              {displayMoments.length} Clips
            </span>
          </div>

          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff7427] animate-ping" />
            Parallel Pipeline Active
          </span>
        </div>

        {/* 9:16 Story-Style Cards Grid */}
        <div
          className={`grid gap-4 sm:gap-5 justify-center ${
            displayMoments.length === 1
              ? "grid-cols-1 max-w-[280px] mx-auto"
              : displayMoments.length === 2
              ? "grid-cols-1 sm:grid-cols-2 max-w-xl mx-auto"
              : displayMoments.length === 3
              ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-4xl mx-auto"
              : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-6xl mx-auto"
          }`}
        >
          {displayMoments.map((moment, idx) => {
            // Calculate slice bounds for this short
            const sliceStart = (idx / totalClips) * 100;
            const sliceEnd = ((idx + 1) / totalClips) * 100;

            const isCompleted = progress >= sliceEnd;
            const isRendering = progress >= sliceStart && progress < sliceEnd;
            const isQueued = progress < sliceStart;

            // Intra-clip progress percentage (0-100)
            const intraProgress = isCompleted
              ? 100
              : isQueued
              ? 0
              : Math.min(99, Math.max(8, ((progress - sliceStart) / (sliceEnd - sliceStart)) * 100));

            // Current mini stage
            const activeStage =
              STAGES.find((s) => intraProgress >= s.range[0] && intraProgress < s.range[1]) ||
              STAGES[STAGES.length - 1];

            return (
              <motion.div
                key={moment.id || idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`relative aspect-[9/16] w-full max-w-[260px] mx-auto rounded-3xl overflow-hidden border flex flex-col justify-between p-3.5 transition-all duration-300 ${
                  isRendering
                    ? "border-[#ff7427]/40 bg-[#0d0d14] ring-1 ring-[#ff7427]/30 shadow-lg"
                    : isCompleted
                    ? "border-emerald-500/30 bg-[#0c120e] shadow-sm"
                    : "border-white/5 bg-[#0a0a0f]/80 opacity-70"
                }`}
              >
                {/* Background Image / Faint Video Still */}
                {thumbnail && (
                  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <img
                      src={thumbnail}
                      alt="Moment Still"
                      className={`w-full h-full object-cover scale-105 transition-all duration-500 ${
                        isCompleted
                          ? "opacity-30 blur-xs filter brightness-90"
                          : isRendering
                          ? "opacity-25 blur-sm"
                          : "opacity-10 blur-md grayscale"
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
                  </div>
                )}

                {/* Laser scan line sweep on rendering card */}
                {isRendering && (
                  <motion.div
                    className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff7427] to-transparent pointer-events-none z-10"
                    animate={{ top: ["12%", "88%", "12%"] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                  />
                )}

                {/* ==================================================== */}
                {/* TOP STORY HEADER BAR (User's Preferred Cohesive Style) */}
                {/* ==================================================== */}
                <div className="relative z-10 flex items-center justify-between gap-1.5 w-full">
                  {/* Left circular index / status badge */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isCompleted
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : isRendering
                        ? "bg-[#ff7427]/25 text-[#ff7427] border border-[#ff7427]/50 shadow-xs ring-1 ring-[#ff7427]/30"
                        : "bg-white/5 text-slate-400 border border-white/10"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <span>#{idx + 1}</span>
                    )}
                  </div>

                  {/* Right badges: Virality pill & Duration badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[10px] font-semibold flex items-center gap-1 backdrop-blur-md">
                      <Flame className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{moment.virality_score}% Viral</span>
                    </span>

                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/10 text-[10px] font-mono flex items-center gap-1 backdrop-blur-md">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{moment.duration_formatted || "00:45"}</span>
                    </span>
                  </div>
                </div>

                {/* ==================================================== */}
                {/* CENTER BODY STATUS                                  */}
                {/* ==================================================== */}
                <div className="relative z-10 flex flex-col items-center justify-center my-auto text-center px-2 py-4">
                  {isCompleted ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-emerald-300 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                        ✓ Rendered & Ready
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">1080p 9:16 MP4</span>
                    </div>
                  ) : isRendering ? (
                    <div className="flex flex-col items-center gap-2.5 w-full">
                      <div className="w-12 h-12 rounded-2xl bg-[#ff7427]/15 border border-[#ff7427]/30 flex items-center justify-center text-[#ff7427] shadow-xs">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-white px-3 py-0.5 rounded-full bg-[#ff7427]/20 border border-[#ff7427]/30 flex items-center gap-1.5">
                          <activeStage.icon className="w-3.5 h-3.5 text-[#ff7427] animate-pulse" />
                          <span>{activeStage.label}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">{activeStage.sub}</span>
                      </div>

                      {/* Mini intra-clip progress bar */}
                      <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden border border-white/5 mt-1">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[#ff7427] to-amber-400"
                          animate={{ width: `${Math.round(intraProgress)}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {Math.round(intraProgress)}% done
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-slate-400 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                        ⏳ In Queue
                      </span>
                      <span className="text-[10px] text-slate-500">Awaiting GPU slot</span>
                    </div>
                  )}
                </div>

                {/* ==================================================== */}
                {/* BOTTOM HOOK & TIMELINE FOOTER                        */}
                {/* ==================================================== */}
                <div className="relative z-10 p-3 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 flex flex-col gap-1.5 text-left">
                  <div className="flex items-center justify-between gap-1">
                    <h5 className="text-xs font-bold text-white truncate">{moment.title}</h5>
                    <span
                      className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                        isCompleted
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isRendering
                          ? "bg-[#ff7427]/20 text-[#ff7427]"
                          : "bg-white/5 text-slate-500"
                      }`}
                    >
                      {isCompleted ? "Done" : isRendering ? "Active" : "Queued"}
                    </span>
                  </div>

                  {moment.hook_quote && (
                    <p className="text-[11px] text-slate-300 italic line-clamp-1">
                      "{moment.hook_quote}"
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-white/10">
                    <span>
                      {moment.start_formatted || "00:00"} ➔ {moment.end_formatted || "00:45"}
                    </span>
                    <span>{moment.duration_formatted || "45s"}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. 4-STAGE MULTI-ENGINE RADAR STRIP                      */}
      {/* ======================================================== */}
      <div className="w-full p-4 sm:p-5 rounded-3xl bg-[#0d0d12]/80 border border-white/10 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#ff7427]" />
            Pipeline Engine Execution Stages
          </span>
          <span className="font-mono text-[11px] text-slate-500">1080x1920 Vertical Crop</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {STAGES.map((s, index) => {
            const isDone = progress >= s.range[1];
            const isCurrent = progress >= s.range[0] && progress < s.range[1];
            const Icon = s.icon;

            return (
              <div
                key={s.id}
                className={`p-3 rounded-2xl border transition-all duration-300 flex flex-col gap-1.5 ${
                  isDone
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : isCurrent
                    ? "bg-[#ff7427]/10 border-[#ff7427]/60 text-white ring-1 ring-[#ff7427]/30 shadow-xs"
                    : "bg-white/[0.02] border-white/5 text-slate-500 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Icon className={`w-3.5 h-3.5 ${isCurrent ? "animate-pulse text-[#ff7427]" : ""}`} />
                    <span>{s.label}</span>
                  </div>
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff7427]" />
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-400">{s.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. BOTTOM TELEMETRY & ACTIONS                            */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pt-1 pb-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>GPU Fast-Pass Active</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Smart Subtitle Auto-Burn</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>FastStart MP4 Streaming</span>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 transition-all duration-200"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel Rendering</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
