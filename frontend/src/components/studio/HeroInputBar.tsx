"use client";

import React, { useState, useEffect } from "react";
import { Link2, Sparkles, Clipboard, Check, ArrowRight, Play, Compass } from "lucide-react";

interface HeroInputBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isProcessing: boolean;
  onPasteNotification?: (msg: string) => void;
}

const SAMPLE_VIDEOS = [
  {
    title: "🎙️ Lex Fridman & Sam Altman (AI Future)",
    url: "https://www.youtube.com/watch?v=L_Guz73G6QY",
  },
  {
    title: "⚡ Huberman Lab: Dopamine & Motivation",
    url: "https://www.youtube.com/watch?v=QmOF0crdyRU",
  },
  {
    title: "🚀 MKBHD: The Future of Tech",
    url: "https://www.youtube.com/watch?v=7uU_oP9fL6U",
  },
];

export default function HeroInputBar({
  value,
  onChange,
  onSubmit,
  isProcessing,
  onPasteNotification,
}: HeroInputBarProps) {
  const [pasted, setPasted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [clipboardCandidate, setClipboardCandidate] = useState<string | null>(null);

  // Auto-detect YouTube link on window focus
  useEffect(() => {
    const checkClipboardOnFocus = async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.readText) return;
        const text = await navigator.clipboard.readText();
        if (text && text.trim() !== value.trim()) {
          const isYouTube = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)/i.test(
            text.trim()
          );
          if (isYouTube && !value.trim()) {
            setClipboardCandidate(text.trim());
          }
        }
      } catch {
        // Clipboard read permission might be denied or unprompted; silently handle
      }
    };

    window.addEventListener("focus", checkClipboardOnFocus);
    return () => window.removeEventListener("focus", checkClipboardOnFocus);
  }, [value]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text.trim());
        setPasted(true);
        setClipboardCandidate(null);
        if (onPasteNotification) {
          onPasteNotification("YouTube link pasted from clipboard!");
        }
        setTimeout(() => setPasted(false), 2200);
      }
    } catch (err) {
      console.warn("Clipboard access denied or unavailable", err);
    }
  };

  const handleApplySample = (url: string) => {
    onChange(url);
    setClipboardCandidate(null);
    if (onPasteNotification) {
      onPasteNotification("Sample video link loaded! Ready to generate.");
    }
  };

  return (
    <div className="w-full max-w-3xl flex flex-col gap-3.5">
      
      {/* Floating Clipboard Suggestion Banner */}
      {clipboardCandidate && !value.trim() && (
        <div className="flex items-center justify-between p-2.5 px-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-xs text-white animate-in fade-in slide-in-from-top-2 shadow-lg backdrop-blur-xl">
          <div className="flex items-center gap-2 truncate mr-2">
            <Clipboard className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-300">YouTube link detected in clipboard:</span>
            <span className="font-mono text-cyan-300 truncate max-w-xs">{clipboardCandidate}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(clipboardCandidate);
              setClipboardCandidate(null);
              if (onPasteNotification) onPasteNotification("Pasted from clipboard!");
            }}
            className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-md transition-all active:scale-95"
          >
            Paste Link
          </button>
        </div>
      )}

      {/* Main Magnetic Input Container */}
      <form
        onSubmit={onSubmit}
        className="w-full relative flex flex-col gap-3 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Glow highlight backdrop */}
        <div
          className={`absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/30 via-purple-500/20 to-cyan-500/30 blur-xl transition-opacity duration-500 -z-10 ${
            isHovered || value.trim() ? "opacity-100" : "opacity-40"
          }`}
        />

        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-[#101018]/90 dark:bg-[#101018]/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/10 hover:border-indigo-500/40 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-300 p-2 sm:p-2.5 gap-2 glow-input-container">
          
          {/* Input field */}
          <div className="flex items-center flex-grow pl-3 pr-2 py-1.5 gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400 group-focus-within:text-indigo-300 group-focus-within:bg-indigo-500/20 transition-all">
              <Link2 className="w-5 h-5" />
            </div>

            <input
              type="url"
              placeholder="Paste YouTube video or podcast URL (e.g. youtube.com/watch?v=...)"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                if (clipboardCandidate) setClipboardCandidate(null);
              }}
              disabled={isProcessing}
              required
              className="w-full bg-transparent border-none text-[15px] sm:text-[16px] text-white placeholder:text-slate-500 focus:ring-0 focus:outline-none transition-all font-medium truncate"
            />

            {/* Quick Paste Button */}
            <button
              type="button"
              onClick={handlePaste}
              disabled={isProcessing}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
              title="Paste link from clipboard"
            >
              {pasted ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Pasted!</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Paste</span>
                </>
              )}
            </button>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={!value.trim() || isProcessing}
            className={`shrink-0 px-6 py-3.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-sm tracking-tight transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 ${
              !value.trim() || isProcessing
                ? "bg-white/10 text-slate-500 cursor-not-allowed border border-white/5"
                : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-500/25 border border-indigo-400/30 hover:shadow-indigo-500/40"
            }`}
          >
            {isProcessing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
                <span>Generate Shorts</span>
                <ArrowRight className="w-4 h-4 opacity-75 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Test with Sample Videos (Delight Factor for instant testing) */}
      {!value.trim() && !isProcessing && (
        <div className="flex flex-wrap items-center gap-2 pt-1 px-1">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Compass className="w-3 h-3 text-indigo-400" />
            <span>Try sample:</span>
          </span>
          {SAMPLE_VIDEOS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplySample(sample.url)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/5 transition-all cursor-pointer flex items-center gap-1"
            >
              <Play className="w-2.5 h-2.5 text-cyan-400 fill-current" />
              <span>{sample.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Helpful Hint Row */}
      <div className="flex items-center justify-between text-[12px] text-slate-400 px-3">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>YouTube Podcasts, Interviews, Keynotes & Long Videos</span>
        </span>
        <span className="hidden sm:inline font-mono text-[11px] text-slate-500">
          Lossless 1080p vertical crop
        </span>
      </div>

    </div>
  );
}
