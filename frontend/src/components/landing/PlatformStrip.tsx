"use client";

import React from "react";

export default function PlatformStrip() {
  const platforms = [
    { name: "YouTube Shorts", icon: "🔴", badge: "9:16" },
    { name: "TikTok", icon: "🎵", badge: "Viral" },
    { name: "Instagram Reels", icon: "📸", badge: "9:16" },
    { name: "Facebook Reels", icon: "📘", badge: "Meta" },
    { name: "LinkedIn Video", icon: "💼", badge: "HD" },
    { name: "X (Twitter)", icon: "⚡", badge: "Clips" },
  ];

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-y border-white/5 bg-[#050507]/60 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
          Export & publish seamlessly across all major video platforms
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-1">
          {platforms.map((p) => (
            <div
              key={p.name}
              className="group flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-[#ff7427]/40 transition-all cursor-default"
            >
              <span className="text-base">{p.icon}</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                {p.name}
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-white/5 group-hover:bg-[#ff7427]/10 text-slate-400 group-hover:text-[#ff7427] transition-colors">
                {p.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
