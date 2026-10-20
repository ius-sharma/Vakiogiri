"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Upload, Link2 } from "lucide-react";

interface HeroSectionProps {
  onGenerate: (url: string) => void;
  onOpenAuth: () => void;
}

export default function HeroSection({ onGenerate, onOpenAuth }: HeroSectionProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholders = [
    "Drop a file or paste a link from YouTube...",
    "Drop a file or paste a link from Twitch...",
    "Drop a file or paste a link from Loom...",
    "Drop a file or paste a link from Google Drive...",
    "Drop a file or paste a link from Vimeo...",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [placeholders.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onGenerate(inputUrl.trim());
    } else {
      onOpenAuth();
    }
  };

  return (
    <section className="relative w-full pt-32 pb-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center overflow-hidden">
      {/* Background radial ambient glow in Golden Orange */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#ff7427]/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Top Badge Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ff7427]/10 border border-[#ff7427]/25 text-[#ff7427] text-xs font-semibold tracking-wide mb-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Sparkles className="w-3.5 h-3.5 text-[#ff7427]" />
        <span>Autonomous Video AI Engine</span>
      </div>

      {/* Main H1 Headline - Clean & High Impact (Zero inline thumbnails) */}
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.12]">
        Convert Any Long Video Into{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7427] via-[#ff9254] to-[#ff7427]">
          10 Viral Clips
        </span>{" "}
        Instantly
      </h1>

      {/* Subtitle */}
      <p className="mt-5 text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl leading-relaxed font-normal">
        Turn hours of podcasts, webinars, and YouTube videos into captivating 9:16 shorts with auto-reframe, dynamic subtitles, and virality scoring.
      </p>

      {/* Interactive Floating Input Bar (Klap-style floating pill) */}
      <form
        onSubmit={handleSubmit}
        className="mt-8 w-full max-w-xl mx-auto p-2 bg-[#0c0c0e]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center gap-2 transition-all focus-within:border-[#ff7427]/50 focus-within:ring-2 focus-within:ring-[#ff7427]/20"
      >
        {/* Upload Trigger Button */}
        <button
          type="button"
          onClick={onOpenAuth}
          title="Upload video file (MP4, MOV)"
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
        >
          <Upload className="w-4 h-4" />
        </button>

        {/* Text Input with rolling animated placeholder */}
        <div className="flex-1 relative flex items-center overflow-hidden">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder={placeholders[placeholderIndex]}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none transition-all pr-2"
          />
        </div>

        {/* Golden Orange Generate Pill */}
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-[#ff7427] hover:bg-[#ff853f] active:scale-95 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#ff7427]/25 shrink-0"
        >
          <span>⚡ Generate</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Friction-free subtext */}
      <p className="mt-3 text-xs text-slate-500 font-medium">
        Try for free. No credit card required.
      </p>
    </section>
  );
}
