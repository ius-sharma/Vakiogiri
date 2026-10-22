"use client";

import React from "react";

interface PlatformIcon {
  id: string;
  name: string;
  svg: React.ReactNode;
}

export default function PlatformStrip() {
  const platforms: PlatformIcon[] = [
    {
      id: "youtube",
      name: "YouTube Shorts",
      svg: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    {
      id: "tiktok",
      name: "TikTok",
      svg: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      ),
    },
    {
      id: "instagram",
      name: "Instagram",
      svg: (
        <svg className="w-6 h-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "x",
      name: "X (Twitter)",
      svg: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      svg: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
    },
    {
      id: "facebook",
      name: "Facebook",
      svg: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      id: "threads",
      name: "Threads",
      svg: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M12.186 24C5.467 24 0 18.533 0 11.814 0 5.094 5.467 0 12.186 0c6.602 0 11.898 5.176 11.898 11.666 0 .548-.036 1.096-.108 1.638-.13.987-.98 1.696-1.97 1.696-.98 0-1.815-.705-1.95-1.688a8.318 8.318 0 0 0 .085-1.646c0-4.523-3.642-8.165-8.165-8.165-4.523 0-8.165 3.642-8.165 8.165 0 4.523 3.642 8.165 8.165 8.165 2.378 0 4.605-1.037 6.136-2.859.69-.82 1.916-.918 2.736-.228.82.69.918 1.916.228 2.736C18.91 22.457 15.65 24 12.186 24zM12.08 7.37c-2.61 0-4.73 2.12-4.73 4.73 0 2.61 2.12 4.73 4.73 4.73 1.95 0 3.68-1.2 4.38-2.98.34-.87 1.33-1.3 2.2-.96.87.34 1.3 1.33.96 2.2-1.18 3-4.08 5.03-7.54 5.03-4.43 0-8.02-3.59-8.02-8.02s3.59-8.02 8.02-8.02c4.43 0 8.02 3.59 8.02 8.02 0 .58-.06 1.15-.17 1.71-.19.98-1.12 1.62-2.1 1.43-.98-.19-1.62-1.12-1.43-2.1.06-.34.1-.69.1-1.04 0-2.61-2.12-4.73-4.42-4.73z" />
        </svg>
      ),
    },
    {
      id: "twitch",
      name: "Twitch",
      svg: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M2.149 0L.537 4.119v16.836h5.731V24h3.224l3.045-3.045h4.657l6.269-6.269V0H2.149zm19.164 13.612l-3.582 3.582H12l-3.045 3.045v-3.045H4.119V2.149h17.194v11.463zM16.478 5.015h-2.149v6.448h2.149V5.015zm-5.731 0H8.597v6.448h2.149V5.015z" />
        </svg>
      ),
    },
  ];

  // Quadruple the array for an ultra-smooth, seamless infinite marquee loop
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
        <div className="animate-marquee flex items-center gap-6 sm:gap-10 py-2">
          {marqueeItems.map((platform, index) => (
            <div
              key={`${platform.id}-${index}`}
              title={platform.name}
              className="group shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#09090c] border border-white/10 hover:border-[#ff7427]/60 flex items-center justify-center text-slate-400 hover:text-[#ff7427] hover:scale-110 hover:shadow-lg hover:shadow-[#ff7427]/20 transition-all duration-300 cursor-pointer"
            >
              <div className="transition-transform duration-300 group-hover:scale-105">
                {platform.svg}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
