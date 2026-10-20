"use client";

import React from "react";
import { Sparkles, Layers, Type, Film, Sliders } from "lucide-react";

export default function StylesGallerySection() {
  const styles = [
    {
      id: "split-screen",
      title: "Split-Screen Podcast",
      description: "Auto-detects host and guest simultaneously, framing both in a seamless dual 9:16 layout.",
      tag: "Dual Speaker",
      icon: <Layers className="w-4 h-4 text-[#ff7427]" />,
      accent: "from-[#ff7427]/20 to-transparent",
      previewLabel: "Host + Guest Split",
    },
    {
      id: "hormozi-captions",
      title: "Kinetic Hormozi Captions",
      description: "High-energy word-by-word animated highlights with auto-injected emojis and sound cues.",
      tag: "High Engagement",
      icon: <Type className="w-4 h-4 text-amber-400 text-yellow-400" />,
      accent: "from-amber-500/20 to-transparent",
      previewLabel: "Word Highlight + Emoji",
    },
    {
      id: "b-roll-zooms",
      title: "Dynamic B-Roll & Zooms",
      description: "Intelligent cadence-based punch-in zooms and overlay cutaways to maximize viewer retention.",
      tag: "Retention Hook",
      icon: <Film className="w-4 h-4 text-[#ff7427]" />,
      accent: "from-[#ff7427]/20 to-transparent",
      previewLabel: "Punch-in Motion",
    },
    {
      id: "minimal-studio",
      title: "Minimalist Studio Frame",
      description: "Understated, clean typography for tech founders, educational creators, and keynote talks.",
      tag: "Clean & Modern",
      icon: <Sliders className="w-4 h-4 text-white" />,
      accent: "from-white/10 to-transparent",
      previewLabel: "Luxury Minimal Subtitles",
    },
  ];

  return (
    <section id="styles" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center">
      {/* Badge & Title */}
      <div className="flex flex-col items-center text-center gap-3 max-w-3xl mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff7427]/10 border border-[#ff7427]/25 text-[#ff7427] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Style Versatility</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Created in{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7427] to-[#ff9254]">
            Multiple Styles
          </span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          From fast-paced viral TikTok hooks to elegant podcast interviews, customize your output to match your brand identity in seconds.
        </p>
      </div>

      {/* 4-Card Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {styles.map((style) => (
          <div
            key={style.id}
            className="group relative rounded-2xl bg-[#09090c] border border-white/10 hover:border-[#ff7427]/50 p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-[#ff7427]/10"
          >
            {/* Top Mockup Placeholder Container (Clean Pitch-Black Frame ready for future videos) */}
            <div className="w-full aspect-[9/14] rounded-xl bg-[#040406] border border-white/5 relative overflow-hidden flex flex-col justify-between p-3 group-hover:border-[#ff7427]/30 transition-colors">
              {/* Badge inside mockup */}
              <div className="flex items-center justify-between z-10">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 border border-white/10 text-slate-300">
                  {style.tag}
                </span>
                <span className="w-2 h-2 rounded-full bg-[#ff7427]" />
              </div>

              {/* Center visual indicator */}
              <div className="flex flex-col items-center justify-center text-center z-10 my-auto">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  {style.icon}
                </div>
                <span className="text-xs font-semibold text-slate-300">
                  {style.previewLabel}
                </span>
                <span className="text-[10px] text-slate-500 mt-1">
                  Ready for Video
                </span>
              </div>

              {/* Bottom bar indicator */}
              <div className="z-10 w-full py-1 rounded bg-black/60 border border-white/5 text-center text-[10px] font-mono text-slate-400">
                9:16 Ultra HD
              </div>

              {/* Ambient radial glow inside mockup */}
              <div
                className={`absolute inset-0 bg-gradient-to-t ${style.accent} opacity-40 group-hover:opacity-75 transition-opacity pointer-events-none`}
              />
            </div>

            {/* Bottom Content Description */}
            <div className="mt-4 flex flex-col">
              <h3 className="text-base font-bold text-white group-hover:text-[#ff7427] transition-colors">
                {style.title}
              </h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed font-normal">
                {style.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
