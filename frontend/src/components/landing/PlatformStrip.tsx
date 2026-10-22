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
        <div className="flex items-center gap-3 select-none">
          {/* Instagram Camera Glyph */}
          <svg className="w-6 h-6 fill-none stroke-current stroke-2 text-pink-500" viewBox="0 0 24 24">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          {/* Authentic Instagram Signature Cursive Script */}
          <span
            style={{ fontFamily: "'Grand Hotel', cursive, sans-serif" }}
            className="text-2xl sm:text-3xl text-white tracking-normal font-normal leading-none pt-1"
          >
            Instagram
          </span>
        </div>
      ),
    },
    {
      id: "youtube-shorts",
      name: "YouTube Shorts",
      render: (
        <div className="flex items-center gap-2.5 select-none">
          {/* YouTube Iconic Red Play Badge */}
          <div className="w-7 h-5 rounded-md bg-[#ff0000] flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-3.5 h-3.5 fill-white ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          {/* YouTube Brand Sans + Shorts Pill */}
          <div className="flex items-baseline gap-1.5">
            <span
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-lg sm:text-xl font-black text-white tracking-tighter"
            >
              YouTube
            </span>
            <span
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-xs sm:text-sm font-bold text-[#ff7427] tracking-tight uppercase"
            >
              Shorts
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "tiktok",
      name: "TikTok",
      render: (
        <div className="flex items-center gap-2.5 select-none">
          {/* TikTok Music Note Glyph with Dual-tone 3D drop effect */}
          <div className="relative shrink-0">
            <svg className="w-6 h-6 fill-current text-white relative z-10" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            </svg>
            <span className="absolute -left-0.5 top-0 w-6 h-6 text-[#00f2fe] opacity-70 blur-[0.5px]">
              <svg className="w-full h-full fill-current" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
            </span>
          </div>
          {/* TikTok Heavy Grotesque Wordmark */}
          <span
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-lg sm:text-xl font-black text-white tracking-tight"
          >
            TikTok
          </span>
        </div>
      ),
    },
    {
      id: "facebook-reels",
      name: "Facebook Reels",
      render: (
        <div className="flex items-center gap-2.5 select-none">
          {/* Facebook 'f' Circle Glyph */}
          <div className="w-6 h-6 rounded-full bg-[#1877f2] flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 fill-white mt-0.5" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          {/* Facebook Klavika Style + Reels */}
          <div className="flex items-baseline gap-1.5">
            <span
              style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-lg sm:text-xl font-bold text-white tracking-tight lowercase"
            >
              facebook
            </span>
            <span
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-xs sm:text-sm font-semibold text-slate-400"
            >
              Reels
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "twitch",
      name: "Twitch",
      render: (
        <div className="flex items-center gap-2.5 select-none">
          {/* Twitch Glitch Bubble Glyph */}
          <svg className="w-5 h-5 fill-current text-[#9146ff]" viewBox="0 0 24 24">
            <path d="M2.149 0L.537 4.119v16.836h5.731V24h3.224l3.045-3.045h4.657l6.269-6.269V0H2.149zm19.164 13.612l-3.582 3.582H12l-3.045 3.045v-3.045H4.119V2.149h17.194v11.463zM16.478 5.015h-2.149v6.448h2.149V5.015zm-5.731 0H8.597v6.448h2.149V5.015z" />
          </svg>
          {/* Twitch Angled Block Wordmark */}
          <span
            style={{ fontFamily: "'Inter', sans-serif", transform: "skewX(-6deg)" }}
            className="text-base sm:text-lg font-black uppercase text-white tracking-widest"
          >
            TWITCH
          </span>
        </div>
      ),
    },
  ];

  // Quadruple the 5 brand wordmarks for a continuous, stutter-free infinite loop
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

        {/* Scrolling Strip: Zero boxes, free-floating brand logotypes */}
        <div className="animate-marquee flex items-center gap-14 sm:gap-20 py-2">
          {marqueeItems.map((platform, index) => (
            <div
              key={`${platform.id}-${index}`}
              title={platform.name}
              className="shrink-0 opacity-70 hover:opacity-100 hover:scale-105 transition-all duration-300 cursor-default"
            >
              {platform.render}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
