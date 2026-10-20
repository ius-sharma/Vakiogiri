"use client";

import React from "react";
import { Calendar, Share2, Check, ArrowUpRight } from "lucide-react";

export default function SpotlightSchedulerSection() {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left Side: Typography & Value Proposition */}
        <div className="flex flex-col items-start text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff7427]/10 border border-[#ff7427]/25 text-[#ff7427] text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5" />
            <span>Multi-Channel Automation</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
            Posting everyday has{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7427] to-[#ff9254]">
              never been easier
            </span>
          </h2>

          <p className="text-slate-400 text-base leading-relaxed">
            Automate your entire distribution pipeline. Once Vakio turns your long-form videos into engaging clips, schedule and broadcast them across your social accounts from a single unified control room.
          </p>

          <div className="space-y-3 pt-2 w-full">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#ff7427]/20 text-[#ff7427] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium text-slate-300">
                Direct native publishing to YouTube Shorts, TikTok, and Instagram Reels
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#ff7427]/20 text-[#ff7427] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium text-slate-300">
                AI auto-generates optimized titles, descriptions, and high-ranking hashtags
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Product UI Scheduler Mockup (Replicating User Screenshot 3 in Dark Pitch-Black Glass) */}
        <div className="w-full rounded-3xl bg-[#09090c] border border-white/10 p-5 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs font-mono font-semibold text-slate-300">
              One-Click Social Distribution
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auto-Sync Ready
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* Left Thumbnail */}
            <div className="sm:col-span-5 aspect-[9/14] rounded-2xl bg-black border border-white/10 p-2 flex flex-col justify-between relative shadow-md">
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 rounded bg-[#ff7427] text-white text-[9px] font-bold">
                  Ready
                </span>
                <span className="text-[9px] font-mono text-slate-400">00:48</span>
              </div>
              <div className="my-auto text-center px-1">
                <p className="text-[10px] font-bold text-white uppercase">
                  HOW TO 10X REACH IN 2026
                </p>
              </div>
              <div className="w-full py-1 text-center bg-white/5 rounded text-[9px] text-slate-400 font-mono">
                1080x1920 HD
              </div>
            </div>

            {/* Right Publishing Controls */}
            <div className="sm:col-span-7 flex flex-col gap-3">
              {/* Title input mock */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Post Caption & Title
                </label>
                <div className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-slate-200">
                  How to 10x your organic reach in 2026 without spending on ads 🚀 #creators #growth
                </div>
              </div>

              {/* Connected channels */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🔴</span>
                    <span className="text-xs font-semibold text-white">YouTube Shorts</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">Connected</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🎵</span>
                    <span className="text-xs font-semibold text-white">TikTok</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">Connected</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">📸</span>
                    <span className="text-xs font-semibold text-white">Instagram Reels</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">Connected</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  className="flex-1 py-2 rounded-xl bg-[#ff7427] hover:bg-[#ff853f] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#ff7427]/25"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Post to 3 Accounts</span>
                </button>
                <button
                  type="button"
                  className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
