"use client";

import React from "react";
import { Smartphone, Monitor, Clock, SlidersHorizontal, ChevronDown, Sparkles } from "lucide-react";

interface QuickPresetBarProps {
  aspectRatio: "9:16" | "16:9";
  onAspectRatioChange: (ratio: "9:16" | "16:9") => void;
  segmentDuration: number;
  onSegmentDurationChange: (duration: number) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  disabled?: boolean;
}

const DURATION_OPTIONS = [
  { value: 30, label: "30s", sub: "Quick Hook" },
  { value: 45, label: "45s", sub: "Optimal" },
  { value: 60, label: "60s", sub: "Story" },
  { value: 90, label: "90s", sub: "Deep Cut" },
];

export default function QuickPresetBar({
  aspectRatio,
  onAspectRatioChange,
  segmentDuration,
  onSegmentDurationChange,
  showAdvanced,
  onToggleAdvanced,
  disabled = false,
}: QuickPresetBarProps) {
  return (
    <div className="w-full max-w-3xl flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#101018]/60 backdrop-blur-xl border border-white/8 text-sm">
      
      {/* Aspect Ratio Selector */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/5">
        <button
          type="button"
          onClick={() => onAspectRatioChange("9:16")}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
            aspectRatio === "9:16"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>9:16 Shorts / Reels</span>
        </button>

        <button
          type="button"
          onClick={() => onAspectRatioChange("16:9")}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
            aspectRatio === "16:9"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>16:9 Cinema</span>
        </button>
      </div>

      {/* Target Clip Duration Pills */}
      <div className="flex items-center gap-1.5">
        <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>Target:</span>
        </span>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/5">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSegmentDurationChange(opt.value)}
              disabled={disabled}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                segmentDuration === opt.value
                  ? "bg-white/15 text-white shadow-xs border border-white/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === 45 && (
                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-indigo-500/30 text-indigo-300">
                  AI
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Drawer Toggle */}
      <button
        type="button"
        onClick={onToggleAdvanced}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
          showAdvanced
            ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
            : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Settings</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${
            showAdvanced ? "rotate-180" : ""
          }`}
        />
      </button>

    </div>
  );
}
