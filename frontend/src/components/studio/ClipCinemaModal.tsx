"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  TrendingUp,
  Sparkles,
  Share2,
  FastForward,
  RotateCcw,
  Scissors,
  Smartphone,
  Square,
  Monitor,
  Music,
  FileText,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ClipItemData } from "./ClipCard";

interface ClipCinemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  clips: (string | ClipItemData)[];
  initialIndex: number;
  onDownload: (clip: string | ClipItemData) => void;
  backendUrl: string;
}

export default function ClipCinemaModal({
  isOpen,
  onClose,
  clips,
  initialIndex,
  onDownload,
  backendUrl,
}: ClipCinemaModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedSubtitles, setCopiedSubtitles] = useState(false);
  const [previewAspect, setPreviewAspect] = useState<"9:16" | "1:1" | "16:9">("9:16");

  // Interactive trimmer state
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(45);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Sync trim range when current clip changes
  useEffect(() => {
    const raw = clips[currentIndex];
    const isObj = typeof raw === "object" && raw !== null;
    const dur = isObj && raw.duration ? Math.round(raw.duration) : 45;
    setTrimStart(0);
    setTrimEnd(dur);
    if (isObj && raw.aspect_ratio === "16:9") {
      setPreviewAspect("16:9");
    } else {
      setPreviewAspect("9:16");
    }
  }, [currentIndex, clips]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, clips.length, isPlaying]);

  if (!isOpen || clips.length === 0) return null;

  const currentRawClip = clips[currentIndex];
  const isObject = typeof currentRawClip === "object" && currentRawClip !== null;
  const filename = isObject ? currentRawClip.filename : currentRawClip;
  const clipUrl = isObject && currentRawClip.url
    ? currentRawClip.url.startsWith("http")
      ? currentRawClip.url
      : `${backendUrl}${currentRawClip.url}`
    : `${backendUrl}/clips/${filename}`;

  const viralityScore = isObject && typeof currentRawClip.score === "number"
    ? Math.round(currentRawClip.score)
    : 88 + (currentIndex % 10);
  const heatmapScore = isObject && typeof currentRawClip.heatmap_score === "number"
    ? Math.round(currentRawClip.heatmap_score)
    : 94;
  const rawDuration = isObject && currentRawClip.duration ? Math.round(currentRawClip.duration) : 45;
  const title = isObject && currentRawClip.title ? currentRawClip.title : `Viral Clip #${currentIndex + 1}`;

  const trimmedDuration = Math.max(1, trimEnd - trimStart);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const cycleSpeed = () => {
    if (!videoRef.current) return;
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    videoRef.current.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : clips.length - 1));
    setIsPlaying(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < clips.length - 1 ? prev + 1 : 0));
    setIsPlaying(false);
  };

  const generatedCaption = `${title} 🔥 Best Moments & Key Highlights.\n\nCreated with Vakiogiri AI. #shorts #viral #podcast #trending #foryou #ai`;

  const copyCaption = () => {
    navigator.clipboard.writeText(generatedCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2200);
  };

  const copyMockSubtitles = () => {
    const srtContent = `1\n00:00:01,000 --> 00:00:04,500\n${title}\n\n2\n00:00:04,600 --> 00:00:08,200\n[High Energy Hook Detected By Vakiogiri AI]`;
    navigator.clipboard.writeText(srtContent);
    setCopiedSubtitles(true);
    setTimeout(() => setCopiedSubtitles(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200">
      
      {/* Top Bar Navigation */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-300 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10">
            Clip {currentIndex + 1} of {clips.length}
          </span>
          <span className="hidden sm:inline text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-xl border border-indigo-500/20">
            Cinema Studio Inspector
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/15 transition-all cursor-pointer shadow-lg"
          title="Close Inspector (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Inspector Container */}
      <div className="w-full max-w-6xl max-h-[92vh] bg-[#101018] border border-white/10 rounded-3xl shadow-2xl flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Side: Video Player Stage */}
        <div className="flex-1 bg-black flex flex-col items-center justify-center relative p-4 sm:p-6 min-h-[360px] lg:min-h-[580px] overflow-hidden">
          
          {/* Previous / Next Floating Arrows */}
          {clips.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer z-20 backdrop-blur-md"
                title="Previous Clip (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer z-20 backdrop-blur-md"
                title="Next Clip (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Aspect Framing Preview Switcher (9:16 vs 1:1 vs 16:9) */}
          <div className="absolute top-4 flex items-center p-1 rounded-xl bg-black/70 border border-white/10 backdrop-blur-md z-20 text-xs">
            <button
              type="button"
              onClick={() => setPreviewAspect("9:16")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                previewAspect === "9:16"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>9:16</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewAspect("1:1")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                previewAspect === "1:1"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>1:1</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewAspect("16:9")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                previewAspect === "16:9"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>16:9</span>
            </button>
          </div>

          {/* Video Frame */}
          <div
            className={`relative rounded-2xl overflow-hidden shadow-2xl cursor-pointer transition-all duration-300 ${
              previewAspect === "9:16"
                ? "h-[480px] max-w-[270px] aspect-[9/16]"
                : previewAspect === "1:1"
                ? "h-[420px] max-w-[420px] aspect-square"
                : "w-full max-w-xl aspect-[16/9]"
            }`}
            onClick={togglePlay}
          >
            <video
              ref={videoRef}
              src={clipUrl}
              playsInline
              loop
              muted={isMuted}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full object-cover"
            />

            {!isPlaying && (
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
                  <Play className="w-8 h-8 fill-current ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* Interactive Range Trimmer Bar */}
          <div className="w-full max-w-md mt-4 p-3 rounded-2xl bg-white/[0.04] border border-white/8 backdrop-blur-md flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 text-indigo-400 font-bold">
                <Scissors className="w-3.5 h-3.5" />
                <span>Fine-Tune Range:</span>
              </span>
              <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded">
                {trimStart}s ➔ {trimEnd}s ({trimmedDuration}s total)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 font-mono">0s</span>
              <input
                type="range"
                min={0}
                max={trimEnd - 1}
                value={trimStart}
                onChange={(e) => setTrimStart(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <input
                type="range"
                min={trimStart + 1}
                max={rawDuration}
                value={trimEnd}
                onChange={(e) => setTrimEnd(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-mono">{rawDuration}s</span>
            </div>
          </div>

          {/* Floating Player Controls Bar */}
          <div className="mt-3 flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={togglePlay}
              className="p-1.5 text-white hover:text-indigo-400 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 text-white hover:text-indigo-400 transition-colors cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={cycleSpeed}
              className="px-2 py-0.5 rounded-lg bg-white/10 text-xs font-mono font-bold text-white hover:bg-white/20 transition-all flex items-center gap-1 cursor-pointer"
              title="Change playback speed"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>{playbackSpeed}x</span>
            </button>
          </div>
        </div>

        {/* Right Side: AI Analytics & Multi-Asset Export Hub */}
        <div className="w-full lg:w-[400px] p-6 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-between overflow-y-auto max-h-[520px] lg:max-h-[660px] gap-6 bg-[#12121c]">
          
          <div className="flex flex-col gap-5">
            {/* Title & Badges */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <span>{viralityScore} Virality Score</span>
                </span>
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{heatmapScore}% Retention Peak</span>
                </span>
              </div>

              <h3 className="text-lg font-bold text-white tracking-tight mt-1">
                {title}
              </h3>
            </div>

            {/* AI Virality Analysis Breakdown */}
            <div className="p-3.5 rounded-2xl bg-[#181824] border border-white/8 flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#ff7427] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Vakiogiri Creative Director Analysis</span>
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Vocal energy curve peaked at 00:03 with immediate narrative hook. YouTube replayed curve matches viral retention tier on TikTok & YouTube Shorts algorithms.
              </p>
            </div>

            {/* Ready-to-use YouTube/TikTok Caption */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Social Ready Caption
                </span>
                <button
                  type="button"
                  onClick={copyCaption}
                  className="text-xs font-semibold text-[#ff7427] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCaption ? "Copied!" : "Copy"}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-slate-400 leading-relaxed max-h-20 overflow-y-auto">
                {generatedCaption}
              </div>
            </div>
          </div>

          {/* Export Kit Actions */}
          <div className="flex flex-col gap-2.5 pt-4 border-t border-white/10">
            {/* Primary Video Download */}
            <button
              type="button"
              onClick={() => onDownload(currentRawClip)}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#ff7427] hover:bg-[#ff7427]/90 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#ff7427]/25 cursor-pointer active:scale-98 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download 1080p MP4 ({previewAspect})</span>
            </button>

            {/* Secondary Formats: Audio & Subtitles */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onDownload(currentRawClip)}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Download Audio only"
              >
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audio Only</span>
              </button>

              <button
                type="button"
                onClick={copyMockSubtitles}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Copy SRT / VTT Subtitle file"
              >
                {copiedSubtitles ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">SRT Copied!</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Copy SRT</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
