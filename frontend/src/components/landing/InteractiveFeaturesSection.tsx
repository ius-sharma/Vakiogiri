"use client";

import React, { useState } from "react";
import { Sparkles, Crop, Type, Palette, Flame, Share2, Check } from "lucide-react";

export default function InteractiveFeaturesSection() {
  const [activeTab, setActiveTab] = useState("customizable");

  const tabs = [
    {
      id: "clipping",
      title: "AI Smart Clipping",
      shortDesc: "Extracts key topics & highest retention hooks.",
      icon: <Sparkles className="w-4 h-4" />,
      detailTitle: "Autonomous Hook Detection",
      detailDesc: "Our algorithm listens to speech inflection, energy peaks, and topic transitions to identify the moments that will stop viewers from scrolling.",
      bullets: [
        "Eliminates filler words and long pauses",
        "Scores each clip from 0 to 100 based on virality potential",
        "Generates 5-10 distinct clips from a single long video",
      ],
      mockupLabel: "Smart Hook Extractor",
      mockupStat: "94% Audience Retention",
    },
    {
      id: "reframing",
      title: "Dynamic Auto-Reframe",
      shortDesc: "Keeps the speaker centered in 9:16 automatically.",
      icon: <Crop className="w-4 h-4" />,
      detailTitle: "Multi-Speaker Face Tracking",
      detailDesc: "Computer vision tracks active speakers in real time, switching camera angles smoothly or splitting the screen when two people converse.",
      bullets: [
        "Perfect 9:16 vertical crop without manual keyframes",
        "Dual speaker split-screen mode for podcast guests",
        "Screen-share and reaction video support",
      ],
      mockupLabel: "AI Face Tracking Box",
      mockupStat: "60 FPS Smooth Pan",
    },
    {
      id: "captions",
      title: "Kinetic Captions & Emojis",
      shortDesc: "Hormozi-style word-by-word animated subtitles.",
      icon: <Type className="w-4 h-4" />,
      detailTitle: "99.4% Accurate Speech-to-Text",
      detailDesc: "Add high-energy kinetic subtitles that highlight word-by-word as you speak, with automatic emoji placement and sound effect cues.",
      bullets: [
        "Over 50+ languages supported natively",
        "Karaoke bounce, flash, and fade animation presets",
        "Auto-highlight keywords in Golden Orange or Neon Yellow",
      ],
      mockupLabel: "Kinetic Subtitle Engine",
      mockupStat: "3.2x Watch Time Boost",
    },
    {
      id: "customizable",
      title: "Fully Customizable",
      shortDesc: "Brand colors, custom typography & watermarks.",
      icon: <Palette className="w-4 h-4" />,
      detailTitle: "Total Brand & Aesthetic Control",
      detailDesc: "Tailor every aspect of your output. Apply your creator brand guidelines, upload custom fonts, set custom color schemes, and add your logo watermark.",
      bullets: [
        "Upload custom TTF/WOFF2 fonts & brand color palettes",
        "Custom logo watermark & channel handle placement",
        "Flexible aspect ratios: 9:16 (Shorts), 1:1 (Square), 4:5 (Feeds)",
        "Adjustable caption size, line spacing, and stroke outline",
      ],
      mockupLabel: "Custom Brand Studio",
      mockupStat: "100% Brand Compliant",
    },
    {
      id: "virality",
      title: "Virality Scoring",
      shortDesc: "Predictive ranking of your clips before posting.",
      icon: <Flame className="w-4 h-4" />,
      detailTitle: "Algorithmic Virality Predictor",
      detailDesc: "Don't guess which clip will blow up. Vakio analyzes narrative momentum, sentiment intensity, and hook velocity to rank your clips by probability of viral reach.",
      bullets: [
        "Actionable feedback on why a clip scored high or low",
        "Suggested hook re-phrasing for captions",
        "Retention heatmap prediction curve",
      ],
      mockupLabel: "Virality Score Engine",
      mockupStat: "98/100 Top Tier",
    },
    {
      id: "publisher",
      title: "1-Click Social Scheduler",
      shortDesc: "Direct broadcast to TikTok, Reels, and Shorts.",
      icon: <Share2 className="w-4 h-4" />,
      detailTitle: "Multi-Platform Auto-Publish",
      detailDesc: "Schedule an entire month of short-form video in minutes. Connect your YouTube, TikTok, and Instagram accounts to post directly from one dashboard.",
      bullets: [
        "Unified posting calendar and scheduling queue",
        "AI auto-generates SEO titles, descriptions & hashtags",
        "Zero quality compression during direct upload",
      ],
      mockupLabel: "Auto-Distribution Hub",
      mockupStat: "Multi-Channel Broadcast",
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[3];

  return (
    <section id="features" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center">
      {/* Badge & Title */}
      <div className="flex flex-col items-center text-center gap-3 max-w-3xl mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff7427]/10 border border-[#ff7427]/25 text-[#ff7427] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Complete Feature Suite</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Engineered for{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7427] to-[#ff9254]">
            Total Creative Control
          </span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Everything creators, agencies, and podcasters need to dominate short-form video algorithms.
        </p>
      </div>

      {/* Two Column Layout: Tabs on Left, Interactive Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch">
        {/* Left Side: 6 Selectable Feature Tabs */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                  isActive
                    ? "bg-[#0f0f14] border-[#ff7427] shadow-lg shadow-[#ff7427]/10"
                    : "bg-[#070709] border-white/5 hover:border-white/15 hover:bg-white/[0.02]"
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 transition-colors ${
                    isActive
                      ? "bg-[#ff7427] text-white"
                      : "bg-white/5 text-slate-400 group-hover:text-white"
                  }`}
                >
                  {tab.icon}
                </div>
                <div>
                  <h4
                    className={`text-sm font-bold transition-colors ${
                      isActive ? "text-white" : "text-slate-300"
                    }`}
                  >
                    {tab.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                    {tab.shortDesc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Side: Dynamic Interactive Preview Card */}
        <div className="lg:col-span-7 rounded-3xl bg-[#09090c] border border-white/10 p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          {/* Header of Preview */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff7427] animate-pulse" />
              <span className="text-xs font-mono font-semibold text-slate-300">
                {currentTab.mockupLabel}
              </span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#ff7427]/15 border border-[#ff7427]/30 text-[#ff7427]">
              {currentTab.mockupStat}
            </span>
          </div>

          {/* Core Content */}
          <div className="my-6 space-y-4">
            <h3 className="text-2xl font-black text-white">
              {currentTab.detailTitle}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {currentTab.detailDesc}
            </p>

            {/* Bullets */}
            <div className="space-y-2.5 pt-2">
              {currentTab.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-[#ff7427]/20 text-[#ff7427] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {bullet}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Interactive Mock Frame */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#ff7427]/10 flex items-center justify-center text-[#ff7427]">
                {currentTab.icon}
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {currentTab.title}
                </span>
                <span className="text-[11px] text-slate-400">
                  Ready in your studio dashboard
                </span>
              </div>
            </div>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
            >
              Explore Feature
            </button>
          </div>

          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff7427]/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
