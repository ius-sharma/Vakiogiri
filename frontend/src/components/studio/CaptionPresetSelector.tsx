"use client";

import React from "react";
import { Type, Sparkles, Flame, Zap, Eye } from "lucide-react";

export type CaptionStyleId = "hormozi" | "beast" | "karaoke" | "minimal" | "none";

interface CaptionPreset {
  id: CaptionStyleId;
  name: string;
  badge: string;
  previewText: string;
  previewBg: string;
  previewTextColor: string;
  desc: string;
}

const PRESETS: CaptionPreset[] = [
  {
    id: "hormozi",
    name: "Hormozi Viral",
    badge: "🔥 Most Viral",
    previewText: "MAKE AN OFFER THEY CAN'T REFUSE",
    previewBg: "from-amber-500/20 to-yellow-500/20",
    previewTextColor: "text-yellow-400 font-black",
    desc: "Bold uppercase, punchy yellow & green keywords.",
  },
  {
    id: "beast",
    name: "Beast Kinetic",
    badge: "⚡ High Energy",
    previewText: "I SPENT 50 HOURS IN A BUNKER!",
    previewBg: "from-cyan-500/20 to-blue-500/20",
    previewTextColor: "text-cyan-300 font-extrabold",
    desc: "Kinetic pop scale, vibrant blue/cyan glow.",
  },
  {
    id: "karaoke",
    name: "Word Flow",
    badge: "✨ Karaoke",
    previewText: "This is how AI changes everything",
    previewBg: "from-purple-500/20 to-indigo-500/20",
    previewTextColor: "text-indigo-300 font-bold",
    desc: "Active word-by-word dynamic illumination.",
  },
  {
    id: "minimal",
    name: "Clean Studio",
    badge: "🎬 Cinema",
    previewText: "The subtle art of visual storytelling",
    previewBg: "from-white/10 to-white/5",
    previewTextColor: "text-white font-medium",
    desc: "Minimalist white text with soft dark backing.",
  },
  {
    id: "none",
    name: "No Captions",
    badge: "Raw",
    previewText: "[Original Video Audio]",
    previewBg: "from-slate-800/40 to-slate-900/40",
    previewTextColor: "text-slate-500 font-mono",
    desc: "Clean video without burned-in captions.",
  },
];

interface CaptionPresetSelectorProps {
  selected: CaptionStyleId;
  onSelect: (id: CaptionStyleId) => void;
  disabled?: boolean;
}

export default function CaptionPresetSelector({
  selected,
  onSelect,
  disabled = false,
}: CaptionPresetSelectorProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-indigo-400" />
          <span>Animated Subtitle Style Preset</span>
        </label>
        <span className="text-[11px] text-slate-500 font-mono">
          Burned-in Whisper AI Captions
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {PRESETS.map((preset) => {
          const isSelected = selected === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              disabled={disabled}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? "bg-indigo-600/15 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md shadow-indigo-600/15"
                  : "bg-white/[0.03] border-white/8 hover:border-white/20 hover:bg-white/[0.06]"
              }`}
            >
              {/* Top Row: Name & Badge */}
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-xs font-bold text-white truncate">
                  {preset.name}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300 shrink-0">
                  {preset.badge}
                </span>
              </div>

              {/* Sample Subtitle Preview Card */}
              <div
                className={`w-full py-2.5 px-2 rounded-xl bg-gradient-to-r ${preset.previewBg} border border-white/5 flex items-center justify-center text-center`}
              >
                <span className={`text-[10px] leading-tight ${preset.previewTextColor} line-clamp-1`}>
                  {preset.previewText}
                </span>
              </div>

              <p className="text-[10px] text-slate-400 line-clamp-1 leading-snug">
                {preset.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
