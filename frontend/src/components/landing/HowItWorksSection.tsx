"use client";

import React from "react";
import { Link2, Cpu, Share2, Sparkles } from "lucide-react";

export default function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      title: "Paste Link or Upload",
      description: "Drop your video file (MP4, MOV) or paste any YouTube, Twitch, or Loom URL into the input bar.",
      icon: <Link2 className="w-5 h-5 text-[#ff7427]" />,
      detail: "Supports up to 4K & multi-speaker formats",
    },
    {
      num: "02",
      title: "AI Detects Viral Hooks",
      description: "Our neural engine scans speech, vocal peaks, and facial focus to automatically extract the highest retention moments.",
      icon: <Cpu className="w-5 h-5 text-[#ff7427]" />,
      detail: "Auto-reframe (9:16) + animated captions",
    },
    {
      num: "03",
      title: "Export & Go Viral",
      description: "Review your clips with virality scores, fine-tune any captions, and export in crisp 1080p directly to social platforms.",
      icon: <Share2 className="w-5 h-5 text-[#ff7427]" />,
      detail: "1-click publish to TikTok, Reels & Shorts",
    },
  ];

  return (
    <section id="how-it-works" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center">
      {/* Badge & Title */}
      <div className="flex flex-col items-center text-center gap-3 max-w-3xl mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff7427]/10 border border-[#ff7427]/25 text-[#ff7427] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Effortless Workflow</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          How Vakio Works in{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7427] to-[#ff9254]">
            3 Simple Steps
          </span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Zero complex editing timelines. Zero keyframing. Just raw footage in, viral shorts out.
        </p>
      </div>

      {/* 3 Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {steps.map((step) => (
          <div
            key={step.num}
            className="group relative rounded-2xl bg-[#09090c] border border-white/10 hover:border-[#ff7427]/40 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-[#ff7427]/10"
          >
            {/* Top row: Number + Icon */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-3xl font-black font-mono text-white/20 group-hover:text-[#ff7427] transition-colors">
                {step.num}
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#ff7427]/10 border border-[#ff7427]/20 flex items-center justify-center">
                {step.icon}
              </div>
            </div>

            {/* Middle: Title & Description */}
            <div className="space-y-2 mb-6">
              <h3 className="text-lg font-bold text-white group-hover:text-[#ff7427] transition-colors">
                {step.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                {step.description}
              </p>
            </div>

            {/* Bottom detail pill */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500">
                {step.detail}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff7427]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
