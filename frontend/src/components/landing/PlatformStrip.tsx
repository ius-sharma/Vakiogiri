"use client";

import React from "react";

interface PlatformBrand {
  id: string;
  name: string;
  render: React.ReactNode;
}

export default function PlatformStrip() {
  const platforms: PlatformBrand[] = [
    {
      id: "instagram",
      name: "Instagram",
      render: (
        <span
          style={{ fontFamily: "'Grand Hotel', cursive, sans-serif" }}
          className="text-3xl sm:text-4xl text-white tracking-normal font-normal select-none"
        >
          Instagram
        </span>
      ),
    },
    {
      id: "youtube-shorts",
      name: "YouTube Shorts",
      render: (
        <span
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          className="text-xl sm:text-2xl font-black text-white tracking-tighter select-none"
        >
          YouTube <span className="text-[#ff7427] font-bold text-base sm:text-lg tracking-tight uppercase ml-0.5">Shorts</span>
        </span>
      ),
    },
    {
      id: "tiktok",
      name: "TikTok",
      render: (
        <span
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          className="text-xl sm:text-2xl font-black text-white tracking-tight select-none"
        >
          TikTok
        </span>
      ),
    },
    {
      id: "facebook-reels",
      name: "Facebook Reels",
      render: (
        <span
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-xl sm:text-2xl font-bold text-white tracking-tight lowercase select-none"
        >
          facebook <span className="capitalize font-semibold text-slate-400 text-base sm:text-lg ml-0.5">Reels</span>
        </span>
      ),
    },
    {
      id: "twitch",
      name: "Twitch",
      render: (
        <span
          style={{ fontFamily: "'Inter', sans-serif", transform: "skewX(-7deg)" }}
          className="text-lg sm:text-xl font-black uppercase text-white tracking-[0.2em] inline-block select-none"
        >
          TWITCH
        </span>
      ),
    },
  ];

  // Quadruple the 5 brand wordmarks for an ultra-smooth, seamless infinite marquee loop
  const marqueeItems = [...platforms, ...platforms, ...platforms, ...platforms];

  return (
    <section className="w-full py-10 relative overflow-hidden bg-black border-y border-white/5">
      {/* Title */}
      <div className="flex flex-col items-center gap-2 text-center mb-8 px-4">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
          Export & publish seamlessly across all major video platforms
        </p>
      </div>

      {/* Marquee Track Container with Left and Right Fade-out Gradient Masks */}
      <div className="relative w-full overflow-hidden">
        {/* Left Fade-out Mask */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-r from-black via-black/90 to-transparent z-10" />

        {/* Right Fade-out Mask */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-l from-black via-black/90 to-transparent z-10" />

        {/* Scrolling Strip: Pure typographic brand names without any boxes or logos */}
        <div className="animate-marquee flex items-center gap-14 sm:gap-24 py-2">
          {marqueeItems.map((platform, index) => (
            <div
              key={`${platform.id}-${index}`}
              title={platform.name}
              className="shrink-0 opacity-65 hover:opacity-100 hover:scale-105 transition-all duration-300 cursor-default"
            >
              {platform.render}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
