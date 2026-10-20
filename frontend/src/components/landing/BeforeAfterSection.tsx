"use client";

import React from "react";
import { Sparkles, Heart, Flame, Volume2, UserCheck, CheckCircle2 } from "lucide-react";

export default function BeforeAfterSection() {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center">
      {/* Badge & Title */}
      <div className="flex flex-col items-center text-center gap-3 max-w-3xl mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff7427]/10 border border-[#ff7427]/25 text-[#ff7427] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Intelligent Auto-Reframe 2.0</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          From Raw Horizontal Footage to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7427] to-[#ff9254]">
            Viral Vertical Shorts
          </span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Our computer vision engine tracks multiple speakers, detects active vocal energy, and crops to 9:16 with zero manual keyframing.
        </p>
      </div>

      {/* The Stage: Before vs After Showcase */}
      <div className="w-full relative flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
        {/* Left Card: 16:9 BEFORE */}
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="w-full aspect-video rounded-2xl bg-[#09090c] border border-white/10 p-3 shadow-2xl relative overflow-hidden group flex flex-col justify-between">
            {/* Top Bar inside mockup */}
            <div className="flex items-center justify-between z-10">
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-slate-300">
                16:9 Raw Podcast (42:15)
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Raw Source
              </div>
            </div>

            {/* Visual Speaker Area with Golden Orange Face Tracking Bounding Boxes */}
            <div className="absolute inset-0 flex items-center justify-around px-4 pointer-events-none">
              {/* Speaker 1 Face Track Box */}
              <div className="relative w-28 h-28 rounded-xl border-2 border-dashed border-[#ff7427] bg-[#ff7427]/5 flex flex-col justify-between p-1.5 animate-pulse">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold px-1 rounded bg-[#ff7427] text-white">
                    ✨ AI Track
                  </span>
                  <span className="text-[9px] text-[#ff7427] font-mono">99%</span>
                </div>
                <div className="text-center text-[10px] font-semibold text-slate-300">
                  Speaker 1 (Active)
                </div>
              </div>

              {/* Speaker 2 Face Track Box */}
              <div className="relative w-28 h-28 rounded-xl border border-dashed border-white/20 bg-white/[0.02] flex flex-col justify-between p-1.5 opacity-60">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold px-1 rounded bg-white/20 text-slate-300">
                    Listening
                  </span>
                </div>
                <div className="text-center text-[10px] font-semibold text-slate-400">
                  Speaker 2
                </div>
              </div>
            </div>

            {/* Bottom info strip */}
            <div className="z-10 bg-black/60 backdrop-blur-md rounded-lg p-2 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                  🎙️
                </div>
                <span className="text-xs font-semibold text-white">Full Episode Interview</span>
              </div>
              <span className="text-[11px] text-slate-400">1080p 60fps</span>
            </div>
          </div>

          {/* Label below */}
          <span className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            Before: Manual Cutting Required
          </span>
        </div>

        {/* Center Connector: Animated Arrow + "Edited with love" */}
        <div className="flex flex-col items-center justify-center shrink-0 my-2 lg:my-0">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff7427]/10 border border-[#ff7427]/30 text-white text-xs font-bold shadow-lg">
            <span>edited with love by Vakio</span>
            <Heart className="w-3.5 h-3.5 text-[#ff7427] fill-[#ff7427] animate-pulse" />
          </div>
          <div className="hidden lg:block w-16 h-0.5 bg-gradient-to-r from-white/10 via-[#ff7427] to-white/10 my-2" />
        </div>

        {/* Right Card: 9:16 AFTER (Vertical Clip Showcase) */}
        <div className="w-full max-w-[280px] flex flex-col items-center">
          <div className="w-full aspect-[9/16] rounded-3xl bg-[#09090c] border-2 border-[#ff7427]/40 p-3 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {/* Top Virality Score Pill */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ff7427] text-white text-[11px] font-bold shadow-md">
                <Flame className="w-3.5 h-3.5 fill-white" />
                <span>Virality Score: 98/100</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-mono text-white/90">
                00:45
              </span>
            </div>

            {/* Center Area: Auto-Reframed Speaker Frame + Animated Captions */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-2 z-10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff7427]/20 to-white/5 border border-[#ff7427]/30 flex items-center justify-center mb-6 shadow-inner">
                <UserCheck className="w-9 h-9 text-[#ff7427]" />
              </div>

              {/* Kinetic Captions Preview */}
              <div className="bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 space-y-1">
                <p className="text-sm font-black text-white uppercase tracking-tight">
                  AND THAT’S HOW WE{" "}
                  <span className="text-[#ff7427] underline decoration-2 underline-offset-2">
                    HIT 1 MILLION
                  </span>{" "}
                  VIEWS
                </p>
                <div className="flex items-center justify-center gap-1 text-[11px] text-amber-300 font-bold">
                  <span>🔥</span>
                  <span>Auto-Synced Subtitles</span>
                </div>
              </div>
            </div>

            {/* Bottom 1-Click Export Info */}
            <div className="z-10 bg-black/80 backdrop-blur-md rounded-xl p-2.5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready to Post</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ff7427]/20 text-[#ff7427]">
                9:16 HD
              </span>
            </div>

            {/* Background ambient glow inside card */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#ff7427]/10 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Label below */}
          <span className="mt-3 text-xs font-bold uppercase tracking-wider text-[#ff7427] px-3 py-1 rounded-full bg-[#ff7427]/10 border border-[#ff7427]/20">
            After: 1-Click Viral Short
          </span>
        </div>
      </div>
    </section>
  );
}
