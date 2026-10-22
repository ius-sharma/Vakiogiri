"use client";

import React from "react";

interface PlatformWordmark {
  id: string;
  name: string;
  icon: React.ReactNode;
  label: React.ReactNode;
}

export default function PlatformStrip() {
  const platforms: PlatformWordmark[] = [
    {
      id: "instagram",
      name: "Instagram",
      icon: (
        <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
      label: (
        <span className="text-sm font-semibold tracking-tight">
          Instagram
        </span>
      ),
    },
    {
      id: "youtube-shorts",
      name: "YouTube Shorts",
      icon: (
        <svg className="w-5 h-5 fill-current text-red-500 group-hover:text-[#ff7427] transition-colors" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
      label: (
        <span className="text-sm font-bold tracking-tight">
          YouTube <span className="font-semibold text-slate-400 group-hover:text-[#ff7427] transition-colors">Shorts</span>
        </span>
      ),
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      ),
      label: (
        <span className="text-sm font-black tracking-wide">
          TikTok
        </span>
      ),
    },
    {
      id: "facebook-reels",
      name: "Facebook Reels",
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      label: (
        <span className="text-sm font-semibold tracking-tight">
          Facebook <span className="font-normal text-slate-400 group-hover:text-white transition-colors">Reels</span>
        </span>
      ),
    },
    {
      id: "twitch",
      name: "Twitch",
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M2.149 0L.537 4.119v16.836h5.731V24h3.224l3.045-3.045h4.657l6.269-6.269V0H2.149zm19.164 13.612l-3.582 3.582H12l-3.045 3.045v-3.045H4.119V2.149h17.194v11.463zM16.478 5.015h-2.149v6.448h2.149V5.015zm-5.731 0H8.597v6.448h2.149V5.015z" />
        </svg>
      ),
      label: (
        <span className="text-sm font-black tracking-widest uppercase">
          Twitch
        </span>
      ),
    },
  ];

  // Quadruple the 5 platforms for a completely seamless, stutter-free continuous loop
  const marqueeItems = [...platforms, ...platforms, ...platforms, ...platforms];

  return (
    <section className="w-full py-12 relative overflow-hidden bg-black border-y border-white/5">
      {/* Title */}
      <div className="flex flex-col items-center gap-2 text-center mb-8 px-4">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
          Export & publish seamlessly across all major video platforms
        </p>
      </div>

      {/* Marquee Track Container with Left and Right Fade-out Gradient Masks */}
      <div className="relative w-full overflow-hidden">
        {/* Left Fade-out Mask */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />

        {/* Right Fade-out Mask */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-l from-black via-black/80 to-transparent z-10" />

        {/* Scrolling Strip */}
        <div className="animate-marquee flex items-center gap-6 sm:gap-8 py-2">
          {marqueeItems.map((platform, index) => (
            <div
              key={`${platform.id}-${index}`}
              title={platform.name}
              className="group shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#09090c] border border-white/10 hover:border-[#ff7427]/50 hover:bg-[#0f0f14] transition-all duration-300 cursor-default select-none shadow-md"
            >
              <div className="text-slate-400 group-hover:text-white transition-colors shrink-0">
                {platform.icon}
              </div>
              <div className="text-slate-300 group-hover:text-white transition-colors">
                {platform.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
