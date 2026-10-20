"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Upload, Link2 } from "lucide-react";

interface HeroSectionProps {
  onGenerate: (url: string) => void;
  onOpenAuth: () => void;
}

export default function HeroSection({ onGenerate, onOpenAuth }: HeroSectionProps) {
  const [inputUrl, setInputUrl] = useState("");

  const platforms = [
    "YouTube",
    "Twitch",
    "Loom",
    "Google Drive",
    "Vimeo",
  ];

  const [platformIndex, setPlatformIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = platforms[platformIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      if (displayText.length < currentWord.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentWord.slice(0, displayText.length + 1));
        }, 85);
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 1800);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(currentWord.slice(0, displayText.length - 1));
        }, 45);
      } else {
        setIsDeleting(false);
        setPlatformIndex((prev) => (prev + 1) % platforms.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, platformIndex]);

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

      {/* Main H1 Headline - Balanced, Sleek & Compact */}
      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-3xl leading-[1.14]">
        1 Long Video to <br className="hidden sm:inline" />
        10 Viral Shorts,{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7427] via-[#ff9254] to-[#ff7427]">
          Instantly
        </span>
      </h1>

      {/* Subtitle - Compact & Crisp */}
      <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed font-normal">
        Make TikToks, Reels, and Shorts from any long video in one click.
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

        {/* Text Input with Typewriter Animated Overlay */}
        <div className="flex-1 relative flex items-center h-10 overflow-hidden px-2">
          {/* Animated Typewriter Overlay when input is empty */}
          {!inputUrl && (
            <div className="pointer-events-none absolute inset-y-0 left-2 right-2 flex items-center text-xs sm:text-sm text-slate-500 select-none">
              <span className="truncate">Drop a file or paste a link from&nbsp;</span>
              <span className="font-normal text-slate-400 shrink-0">
                {displayText}
              </span>
              <span className="inline-block w-[1.5px] h-4 bg-[#ff7427] ml-0.5 animate-pulse shrink-0" />
            </div>
          )}

          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full bg-transparent text-xs sm:text-sm text-white focus:outline-none transition-all relative z-10"
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
