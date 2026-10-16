"use client";

import React from "react";
import { Sparkles, Zap, Flame, Cpu, Video, CheckCircle2 } from "lucide-react";
import CaptionPresetSelector, { CaptionStyleId } from "./CaptionPresetSelector";

interface AdvancedDrawerProps {
  isOpen: boolean;
  quality: "1080p" | "720p" | "480p";
  onQualityChange: (q: "1080p" | "720p" | "480p") => void;
  clippingMode: "heuristic" | "ai_enhanced";
  onClippingModeChange: (m: "heuristic" | "ai_enhanced") => void;
  captionStyle?: CaptionStyleId;
  onCaptionStyleChange?: (style: CaptionStyleId) => void;
  disabled?: boolean;
}

export default function AdvancedDrawer({
  isOpen,
  quality,
  onQualityChange,
  clippingMode,
  onClippingModeChange,
  captionStyle = "hormozi",
  onCaptionStyleChange,
  disabled = false,
}: AdvancedDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="w-full max-w-3xl p-5 sm:p-6 rounded-3xl bg-[#101018]/95 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Advanced AI Studio & Caption Settings
          </h4>
        </div>
        <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
          Hardware Accelerated CUDA / Whisper
        </span>
      </div>

      {/* Slicing Engine & Quality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Slicing Engine Mode */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Moment Discovery Algorithm</span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onClippingModeChange("ai_enhanced")}
              disabled={disabled}
              className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                clippingMode === "ai_enhanced"
                  ? "bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500/30"
                  : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>3-Stage AI</span>
                </span>
                {clippingMode === "ai_enhanced" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Vocal RMS energy + YouTube replay curves + viral hook ranking.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onClippingModeChange("heuristic")}
              disabled={disabled}
              className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                clippingMode === "heuristic"
                  ? "bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500/30"
                  : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fast Heuristic</span>
                </span>
                {clippingMode === "heuristic" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Quick speech cadence slice. 2x faster local rendering.
              </p>
            </button>
          </div>
        </div>

        {/* Video Output Resolution */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-cyan-400" />
            <span>Output Resolution & Bitrate</span>
          </label>

          <div className="grid grid-cols-3 gap-2">
            {(["1080p", "720p", "480p"] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onQualityChange(q)}
                disabled={disabled}
                className={`py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  quality === q
                    ? "bg-indigo-600/20 border-indigo-500 text-white shadow-xs font-bold"
                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/5 font-medium"
                }`}
              >
                <span className="text-xs">{q}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {q === "1080p" ? "Full HD" : q === "720p" ? "Standard" : "Draft"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Caption & Subtitle Style Preset Selector */}
      {onCaptionStyleChange && (
        <div className="pt-2 border-t border-white/8">
          <CaptionPresetSelector
            selected={captionStyle}
            onSelect={onCaptionStyleChange}
            disabled={disabled}
          />
        </div>
      )}

    </div>
  );
}
