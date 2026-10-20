"use client";

import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";

interface FinalCtaSectionProps {
  onOpenAuth: () => void;
}

export default function FinalCtaSection({ onOpenAuth }: FinalCtaSectionProps) {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="relative rounded-3xl bg-gradient-to-b from-[#0e0e13] to-[#07070a] border border-[#ff7427]/30 p-8 sm:p-14 text-center overflow-hidden shadow-2xl flex flex-col items-center">
        {/* Ambient Golden Orange Glow behind CTA */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#ff7427]/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="z-10 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff7427]/15 border border-[#ff7427]/30 text-[#ff7427] text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch Your Growth Engine</span>
        </div>

        <h2 className="z-10 text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-3xl leading-[1.12]">
          Ready to Turn Your Videos Into{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7427] via-[#ff9254] to-[#ff7427]">
            Viral Shorts?
          </span>
        </h2>

        <p className="z-10 mt-5 text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
          Stop spending 5 hours manually chopping podcasts. Generate, customize, and publish high-retention shorts in under 60 seconds.
        </p>

        <button
          type="button"
          onClick={onOpenAuth}
          className="z-10 mt-8 px-8 py-4 rounded-2xl bg-[#ff7427] hover:bg-[#ff853f] active:scale-95 text-white font-bold text-sm sm:text-base flex items-center gap-2.5 transition-all cursor-pointer shadow-xl shadow-[#ff7427]/30"
        >
          <span>⚡ Start Creating Free</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="z-10 mt-3 text-xs text-slate-500 font-medium">
          No credit card required. Free credits available immediately.
        </p>
      </div>
    </section>
  );
}
