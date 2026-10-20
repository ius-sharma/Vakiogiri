"use client";

import React from "react";
import { Zap, DollarSign, Clock, Check } from "lucide-react";

export default function SpotlightClippingSection() {
  const shortsCards = [
    { id: 1, pos: "top-left", title: "Key Insight #1", time: "00:32", platform: "TikTok" },
    { id: 2, pos: "top", title: "Top Viral Hook", time: "00:45", platform: "Shorts" },
    { id: 3, pos: "top-right", title: "Story Climax", time: "00:58", platform: "Reels" },
    { id: 4, pos: "bottom-left", title: "Audience Question", time: "00:29", platform: "TikTok" },
    { id: 5, pos: "bottom", title: "Actionable Tip", time: "00:41", platform: "Shorts" },
    { id: 6, pos: "bottom-right", title: "Funny Reaction", time: "00:24", platform: "Reels" },
  ];

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left Side: Typography & Value Proposition */}
        <div className="flex flex-col items-start text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff7427]/10 border border-[#ff7427]/25 text-[#ff7427] text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>High-Speed AI Processing</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
            Never spend time and money on{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7427] to-[#ff9254]">
              video clipping
            </span>{" "}
            again
          </h2>

          <p className="text-slate-400 text-base leading-relaxed">
            Vakio will turn all your long-form videos into dozens of viral vertical clips. Our AI-powered tool automatically discovers the highest-energy hooks and generates polished, ready-to-publish shorts in just a few clicks.
          </p>

          <div className="space-y-3 pt-2 w-full">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#ff7427]/20 text-[#ff7427] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium text-slate-300">
                Turn a 1-hour podcast into 10+ high-retention clips in under 60 seconds
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#ff7427]/20 text-[#ff7427] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium text-slate-300">
                Cut monthly editing costs by up to 90% while posting 5x more content
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Radial Visual Matrix (Replicating User Screenshot 1 in Dark Aesthetic) */}
        <div className="w-full relative rounded-3xl bg-[#09090c] border border-white/10 p-6 sm:p-10 shadow-2xl overflow-hidden flex items-center justify-center min-h-[380px]">
          {/* Subtle background grid pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          {/* Central Radial Core Badge */}
          <div className="z-10 flex flex-col items-center justify-center w-28 h-28 rounded-full bg-[#0c0c0f] border-2 border-[#ff7427] shadow-[0_0_35px_rgba(255,116,39,0.3)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Output
            </span>
            <span className="text-sm font-black text-white">
              viral <span className="text-[#ff7427]">shorts</span>
            </span>
          </div>

          {/* Radial Floating Mini 9:16 Shorts Cards */}
          <div className="absolute inset-0 p-4 flex flex-wrap items-center justify-between pointer-events-none">
            {/* Top Row Cards */}
            <div className="w-full flex justify-between px-4 sm:px-8">
              <div className="w-20 sm:w-24 aspect-[9/13] rounded-xl bg-black/80 border border-white/10 p-1.5 flex flex-col justify-between shadow-lg transform -rotate-6">
                <span className="text-[8px] font-bold text-[#ff7427]">TikTok</span>
                <div className="w-full h-8 rounded bg-white/5 my-auto" />
                <span className="text-[7px] text-slate-400 font-mono">00:32</span>
              </div>
              <div className="w-20 sm:w-24 aspect-[9/13] rounded-xl bg-black/80 border border-[#ff7427]/40 p-1.5 flex flex-col justify-between shadow-lg transform translate-y-[-8px]">
                <span className="text-[8px] font-bold text-white">YouTube</span>
                <div className="w-full h-8 rounded bg-[#ff7427]/10 my-auto" />
                <span className="text-[7px] text-amber-300 font-mono">00:45</span>
              </div>
              <div className="w-20 sm:w-24 aspect-[9/13] rounded-xl bg-black/80 border border-white/10 p-1.5 flex flex-col justify-between shadow-lg transform rotate-6">
                <span className="text-[8px] font-bold text-pink-400">Reels</span>
                <div className="w-full h-8 rounded bg-white/5 my-auto" />
                <span className="text-[7px] text-slate-400 font-mono">00:58</span>
              </div>
            </div>

            {/* Bottom Row Cards */}
            <div className="w-full flex justify-between px-4 sm:px-8 mt-auto">
              <div className="w-20 sm:w-24 aspect-[9/13] rounded-xl bg-black/80 border border-white/10 p-1.5 flex flex-col justify-between shadow-lg transform rotate-3">
                <span className="text-[8px] font-bold text-white">Clip #4</span>
                <div className="w-full h-8 rounded bg-white/5 my-auto" />
                <span className="text-[7px] text-slate-400 font-mono">00:29</span>
              </div>
              <div className="w-20 sm:w-24 aspect-[9/13] rounded-xl bg-black/80 border border-white/10 p-1.5 flex flex-col justify-between shadow-lg transform translate-y-[8px]">
                <span className="text-[8px] font-bold text-[#ff7427]">Viral #5</span>
                <div className="w-full h-8 rounded bg-[#ff7427]/10 my-auto" />
                <span className="text-[7px] text-[#ff7427] font-mono">00:41</span>
              </div>
              <div className="w-20 sm:w-24 aspect-[9/13] rounded-xl bg-black/80 border border-white/10 p-1.5 flex flex-col justify-between shadow-lg transform -rotate-3">
                <span className="text-[8px] font-bold text-white">Clip #6</span>
                <div className="w-full h-8 rounded bg-white/5 my-auto" />
                <span className="text-[7px] text-slate-400 font-mono">00:24</span>
              </div>
            </div>
          </div>

          {/* Golden Orange Radial Glow Behind Core */}
          <div className="absolute w-48 h-48 bg-[#ff7427]/15 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
