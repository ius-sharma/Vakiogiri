"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "What kind of videos work best with Vakio AI?",
      a: "Vakio works best with conversational, speech-heavy long-form videos like podcasts, interviews, video essays, keynote talks, educational tutorials, product reviews, and gaming streams with voice commentary.",
    },
    {
      q: "Which languages and subtitle accents are supported?",
      a: "Vakio supports over 50+ languages natively including English, Spanish, Hindi, French, German, Portuguese, Japanese, and Mandarin, with 99.4% speech-to-text accuracy and auto-punctuation.",
    },
    {
      q: "Can I customize the caption colors, fonts, and brand styling?",
      a: "Yes, completely! You have 100% creative control. You can upload custom brand fonts, pick custom colors (like our signature Golden Orange or Neon Yellow), add your channel watermark, and choose between word-by-word karaoke bounce or minimal subtitles.",
    },
    {
      q: "How does the AI Virality Score work?",
      a: "Our machine learning model analyzes narrative hook strength in the first 3-5 seconds, speech energy velocity, audio sentiment shifts, and audience retention metrics to predict which moments are most likely to trigger social media algorithms.",
    },
    {
      q: "Can I try Vakio AI for free without entering a credit card?",
      a: "Yes! You can get started immediately with free generation credits. Simply paste a YouTube link or upload a video file—no credit card required.",
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center">
      {/* Badge & Title */}
      <div className="flex flex-col items-center text-center gap-3 mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff7427]/10 border border-[#ff7427]/25 text-[#ff7427] text-xs font-semibold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Got Questions?{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7427] to-[#ff9254]">
            We’ve Got Answers
          </span>
        </h2>
      </div>

      {/* Accordion Container */}
      <div className="w-full space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-[#09090c] border border-white/10 overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
              >
                <span className="text-sm sm:text-base font-bold text-white">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isOpen ? "rotate-180 text-[#ff7427]" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
