"use client";

import React from "react";
import { Flame, Sparkles, TrendingUp, FileText, CheckCircle } from "lucide-react";

export default function SpotlightViralitySection() {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left Visual: Product UI (Replicating User Screenshot 2 in Dark Pitch-Black Glass) */}
        <div className="order-2 lg:order-1 w-full rounded-3xl bg-[#09090c] border border-white/10 p-5 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col gap-5">
          {/* Mock Dashboard Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono font-semibold text-slate-300">
                Studio &gt; Viral Candidate #1
              </span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/5 text-slate-400">
              AI Analysis Ready
            </span>
          </div>

          {/* Main Content: Split Mockup (Clip Preview on Left, Virality Score Card + Transcript on Right) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
            {/* 9:16 Short Preview Thumbnail */}
            <div className="sm:col-span-5 aspect-[9/15] rounded-2xl bg-black border border-white/10 p-2.5 flex flex-col justify-between relative overflow-hidden shadow-inner">
              <div className="flex items-center justify-between z-10">
                <span className="px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono text-white">
                  01:14
                </span>
                <span className="text-[10px]">🔥</span>
              </div>

              {/* Kinetic Captions Visual */}
              <div className="my-auto text-center z-10 px-2 py-1.5 rounded-lg bg-black/70 border border-white/5">
                <p className="text-[11px] font-black text-white leading-tight uppercase">
                  THIS SINGLE HABIT{" "}
                  <span className="text-[#ff7427]">DOUBLED MY REACH</span>
                </p>
              </div>

              {/* Action Buttons Mock */}
              <div className="flex items-center gap-1.5 z-10">
                <button
                  type="button"
                  className="flex-1 py-1 rounded-md bg-[#ff7427] text-white text-[10px] font-bold text-center"
                >
                  Export
                </button>
                <button
                  type="button"
                  className="flex-1 py-1 rounded-md bg-white/10 text-slate-300 text-[10px] font-medium text-center"
                >
                  Edit
                </button>
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Virality Score Card & AI Breakdown */}
            <div className="sm:col-span-7 flex flex-col gap-4">
              {/* Virality Score Pill */}
              <div className="rounded-xl bg-[#0f0f13] border border-[#ff7427]/30 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Flame className="w-4 h-4 text-[#ff7427] fill-[#ff7427]" />
                    <span>#1 Virality Score (94/100)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400">
                    High Probability
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Strong hook retention detected in first 3 seconds. High emotional contrast with clear actionable takeaway for creator audience.
                </p>
              </div>

              {/* Transcript Snippet Mock */}
              <div className="rounded-xl bg-black/40 border border-white/5 p-3 space-y-1.5">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Auto Transcript (Editable)</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed font-sans">
                  &ldquo;I realized the secret wasn’t posting ten times a day—it was finding the single moment where the insight clicks, and trimming every second of dead silence around it...&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Typography & Copy */}
        <div className="order-1 lg:order-2 flex flex-col items-start text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff7427]/10 border border-[#ff7427]/25 text-[#ff7427] text-xs font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Algorithmic Intelligence</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
            Automatically create{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7427] to-[#ff9254]">
              viral worthy
            </span>{" "}
            content
          </h2>

          <p className="text-slate-400 text-base leading-relaxed">
            Don’t trust guesswork, trust the algorithm. Vakio analyzes audio inflection, hook strength, and sentiment to detect the moments most likely to explode on social feeds.
          </p>

          <p className="text-slate-400 text-sm leading-relaxed">
            Every clip comes pre-ranked with a predictive virality score and an editable transcript, making it effortless to pick winners and publish with total confidence.
          </p>
        </div>
      </div>
    </section>
  );
}
