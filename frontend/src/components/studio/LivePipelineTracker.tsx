"use client";

import React from "react";
import { motion } from "framer-motion";
import { Scissors, Smartphone, Type, CheckCircle2, Loader2, Radio, Sparkles } from "lucide-react";

interface LivePipelineTrackerProps {
  progress: number;
  step: string;
  progressMessage: string;
  title?: string;
}

const STAGES = [
  {
    id: "stage1",
    label: "1. Precision Slice",
    sub: "Range stream ingest",
    icon: Scissors,
    triggerProgress: 25,
  },
  {
    id: "stage2",
    label: "2. 9:16 Framing",
    sub: "Lanczos smart crop",
    icon: Smartphone,
    triggerProgress: 55,
  },
  {
    id: "stage3",
    label: "3. Kinetic Captions",
    sub: "Auto subtitle burn",
    icon: Type,
    triggerProgress: 85,
  },
  {
    id: "stage4",
    label: "4. Finalizing MP4",
    sub: "1080p faststart sync",
    icon: CheckCircle2,
    triggerProgress: 98,
  },
];

export default function LivePipelineTracker({
  progress,
  step,
  progressMessage,
  title,
}: LivePipelineTrackerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12 }}
      className="w-full max-w-3xl p-6 sm:p-7 rounded-3xl bg-[#0f0f15] border border-white/10 shadow-2xl flex flex-col gap-5 relative overflow-hidden"
    >
      {/* Background subtle warm ambient glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#ff7427]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header status row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#ff7427]/15 border border-[#ff7427]/30 flex items-center justify-center text-[#ff7427] shrink-0">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>{title || "Rendering Curated Shorts"}</span>
              {/* Requested Brand Name: Live Vakiogiri Engine */}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ff7427]/15 text-[#ff7427] font-semibold border border-[#ff7427]/30 flex items-center gap-1">
                <Radio className="w-3 h-3 text-[#ff7427] animate-pulse" />
                <span>Live Vakiogiri Engine</span>
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{progressMessage || "Processing video..."}</p>
          </div>
        </div>

        {/* Dynamic Simulated Audio Waveform Bar */}
        <div className="flex items-center gap-4 self-stretch sm:self-center justify-between sm:justify-end">
          <div className="flex items-end gap-1 h-6 px-3 py-1 rounded-xl bg-black/40 border border-white/5">
            {[40, 70, 90, 60, 100, 45, 80, 65, 95, 50, 75, 85].map((h, i) => (
              <motion.span
                key={i}
                className="w-1 bg-gradient-to-t from-[#ff7427] to-amber-400 rounded-full"
                animate={{
                  height: [`${Math.max(15, h * 0.2)}%`, `${h}%`, `${Math.max(20, h * 0.5)}%`],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8 + (i % 5) * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <div className="text-right flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-black text-[#ff7427]">{Math.round(progress)}</span>
            <span className="text-xs text-slate-500">%</span>
          </div>
        </div>
      </div>

      {/* Progress Bar with #ff7427 gradient */}
      <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#ff7427] to-amber-500 shadow-sm"
          initial={{ width: "5%" }}
          animate={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* 4-Stage Multi-Engine Radar Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
        {STAGES.map((s, index) => {
          const isDone = progress >= s.triggerProgress;
          const isCurrent =
            progress < s.triggerProgress &&
            (index === 0 || progress >= STAGES[index - 1].triggerProgress);
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
    </motion.div>
  );
}
