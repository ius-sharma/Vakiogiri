"use client";

import { useState, useEffect, useRef } from "react";

const BACKEND_URL = "http://localhost:8000";
const SAMPLE_URL = "https://youtu.be/_xZn02Q9yY8";

interface JobStatusResponse {
  job_id: string;
  status: "processing" | "completed" | "failed";
  clips?: string[];
  error?: string;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
  const [clips, setClips] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!youtubeUrl.trim()) {
      setErrorMsg("Please paste a valid YouTube URL first.");
      return;
    }

    setErrorMsg(null);
    setClips([]);
    setStatus("processing");
    stopPolling();

    try {
      const res = await fetch(`${BACKEND_URL}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ youtube_url: youtubeUrl.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error (${res.status})`);
      }

      const data = await res.json();
      const currentJobId = data.job_id;
      setJobId(currentJobId);

      pollIntervalRef.current = setInterval(() => {
        checkStatus(currentJobId);
      }, 3000);

      checkStatus(currentJobId);
    } catch (err: any) {
      setStatus("failed");
      setErrorMsg(err.message || "We couldn't process that link. Please check if the video is public and try again.");
    }
  };

  const checkStatus = async (currentJobId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/status/${currentJobId}`);
      if (!res.ok) {
        throw new Error("Failed to read job status from backend.");
      }

      const data: JobStatusResponse = await res.json();

      if (data.status === "completed") {
        stopPolling();
        setStatus("completed");
        setClips(data.clips || []);
      } else if (data.status === "failed") {
        stopPolling();
        setStatus("failed");
        setErrorMsg(data.error || "We couldn't process that video. Please check if the link is valid.");
      }
    } catch (err: any) {
      stopPolling();
      setStatus("failed");
      setErrorMsg(err.message || "Error polling backend status.");
    }
  };

  const handleReset = () => {
    stopPolling();
    setStatus("idle");
    setJobId(null);
    setClips([]);
    setErrorMsg(null);
    setYoutubeUrl("");
  };

  const handleDownloadAll = () => {
    if (!jobId || clips.length === 0) return;
    clips.forEach((filename) => {
      const clipUrl = `${BACKEND_URL}/clips/${jobId}/${filename}`;
      const link = document.createElement("a");
      link.href = clipUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background text-on-background flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-body-md antialiased relative ${theme === "dark" ? "dark bg-slate-950 text-slate-100" : "bg-background text-on-background"}`}>
      
      {/* Background radial glow */}
      <div className="absolute inset-0 premium-bg pointer-events-none -z-10"></div>

      {/* TopNavBar */}
      <header className="w-full top-0 bg-transparent font-body-md text-body-md border-b border-outline-variant/30 sticky z-50 backdrop-blur-md">
        <div className="flex justify-between items-center h-20 px-gutter max-w-container-max mx-auto">
          
          {/* Brand Logo */}
          <button 
            onClick={handleReset} 
            className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5 tracking-tight hover:opacity-80 transition-opacity cursor-pointer text-left"
          >
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span>Vakiogiri</span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-secondary hover:text-on-surface transition-colors duration-200 cursor-pointer font-label-md" href="#how-it-works">How it works</a>
          </nav>

          {/* Trailing Actions */}
          <div className="flex items-center gap-3">
            {status !== "idle" && (
              <button
                onClick={handleReset}
                className="font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors px-[14px] py-[8px] rounded-lg border border-outline-variant/60 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                <span>Start over</span>
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors px-[14px] py-[8px] rounded-lg border border-outline-variant/60 flex items-center gap-1.5 cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <>
                  <span className="text-amber-400">☀️</span>
                  <span>Light</span>
                </>
              ) : (
                <>
                  <span className="text-primary">🌙</span>
                  <span>Dark</span>
                </>
              )}
            </button>

            <button className="hidden sm:inline-flex font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors px-[18px] py-[10px] rounded-lg">
              Log in
            </button>
            <button className="hidden sm:inline-flex font-label-md text-label-md bg-on-surface text-surface-container-lowest hover:bg-on-surface/90 transition-opacity px-[18px] py-[10px] rounded-lg shadow-sm">
              Sign up
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop py-stack-lg max-w-container-max mx-auto w-full min-h-[75vh]">
        
        {/* ========================================================================= */}
        {/* STATE 1: IDLE / LANDING (Screen 2: Vakiogiri Premium Home Redesign)       */}
        {/* ========================================================================= */}
        {status === "idle" && (
          <div className="max-w-[840px] w-full text-center flex flex-col gap-12 items-center fade-in my-auto py-6">
            
            {/* Hero Typography */}
            <div className="flex flex-col gap-6 items-center">
              <h1 className="text-[44px] leading-[1.1] md:text-[72px] md:leading-[1.05] font-bold text-on-surface tracking-tighter">
                Turn any YouTube video into shorts, <span className="text-primary italic font-medium">instantly.</span>
              </h1>
              <p className="text-[18px] md:text-[20px] leading-[28px] md:leading-[32px] text-secondary max-w-2xl mt-2 font-light">
                Paste a link below to extract viral-ready vertical clips using AI. No editing required.
              </p>
            </div>

            {/* Input Form */}
            <form onSubmit={handleGenerate} className="w-full max-w-[680px] relative mt-4 group">
              <div className="relative flex items-center bg-surface-container-lowest rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline-variant/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-outline-variant transition-all duration-300 p-2 overflow-hidden">
                <div className="pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">link</span>
                </div>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full pl-3 pr-4 py-4 bg-transparent border-none text-[18px] text-on-surface placeholder:text-outline/70 focus:ring-0 focus:outline-none transition-all"
                  required
                />
                <button
                  type="submit"
                  disabled={!youtubeUrl.trim()}
                  className="px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md text-[15px] font-semibold hover:bg-surface-tint transition-all flex items-center gap-2 shadow-sm active:scale-[0.98] shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <span>Generate</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>

              {/* Sample link filler helper */}
              <div className="flex items-center justify-between pt-3 px-2 text-xs">
                <button
                  type="button"
                  onClick={() => setYoutubeUrl(SAMPLE_URL)}
                  className="font-label-md text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  <span>Try Sample YouTube Link</span>
                </button>
                <span className="text-outline font-label-sm">
                  Max 1080p • 45s Cut Segments
                </span>
              </div>
            </form>

            {/* Three-step preview */}
            <div id="how-it-works" className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-3xl mt-16 pt-12 border-t border-outline-variant/30 text-left">
              <div className="flex flex-col gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary font-bold font-label-md mb-1">1</div>
                <h3 className="font-headline-sm text-[18px] text-on-surface">Paste URL</h3>
                <p className="font-body-sm text-secondary leading-relaxed">Drop any YouTube video link into the field above.</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary font-bold font-label-md mb-1">2</div>
                <h3 className="font-headline-sm text-[18px] text-on-surface">AI Analyzes</h3>
                <p className="font-body-sm text-secondary leading-relaxed">Our models find the most engaging moments instantly.</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary font-bold font-label-md mb-1">3</div>
                <h3 className="font-headline-sm text-[18px] text-on-surface">Export Shorts</h3>
                <p className="font-body-sm text-secondary leading-relaxed">Download auto-cropped, captioned vertical videos.</p>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 2: PROCESSING (Screen 3: Vakiogiri Processing)                       */}
        {/* ========================================================================= */}
        {status === "processing" && (
          <div className="w-full max-w-2xl flex flex-col items-center text-center fade-in my-auto py-8">
            
            {/* Minimalist Spinner */}
            <div className="w-16 h-16 mb-8 flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-primary animate-spin" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>sync</span>
            </div>

            <h1 className="font-display-lg text-[40px] md:text-[56px] text-on-surface mb-4 font-bold">Creating your shorts...</h1>
            <p className="font-body-lg text-body-lg text-secondary mb-12 max-w-lg">Downloading video and identifying highlights...</p>

            {/* Disabled Input / Processing State Container */}
            <div className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden text-left">
              <div className="flex items-center gap-3 text-secondary opacity-80 text-sm truncate">
                <span className="material-symbols-outlined">link</span>
                <span className="font-body-md truncate">{youtubeUrl}</span>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-label-sm text-label-sm text-secondary">Analyzing frames</span>
                  <span className="font-label-sm text-label-sm text-primary animate-pulse">Processing</span>
                </div>
                <div className="pulse-bar"></div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="font-body-sm text-body-sm text-outline">This usually takes a minute. Feel free to grab a coffee.</p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 3: ERROR STATE (Screen 4: Vakiogiri Error State)                     */}
        {/* ========================================================================= */}
        {status === "failed" && (
          <div className="max-w-[480px] w-full text-center flex flex-col items-center fade-in my-auto py-8">
            <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mb-stack-lg">
              <span className="material-symbols-outlined text-primary text-[32px]">error</span>
            </div>

            <h1 className="font-display-lg text-[36px] md:text-[48px] text-on-surface mb-stack-sm tracking-tight font-bold">Something went wrong.</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-stack-lg max-w-[400px]">
              {errorMsg || "We couldn't process that link. Please check if the video is public and try again."}
            </p>

            <button
              onClick={() => handleGenerate()}
              className="bg-primary text-on-primary font-label-md text-label-md px-gutter py-3 rounded-full flex items-center gap-2 hover:opacity-90 transition-all duration-300 shadow-md active:opacity-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              <span>Try again</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 4: RESULTS (Screen 5: Vakiogiri Results)                            */}
        {/* ========================================================================= */}
        {status === "completed" && (
          <div className="w-full max-w-container-max flex flex-col gap-stack-lg fade-in my-auto">
            
            {/* Header */}
            <header className="flex flex-col gap-stack-sm md:items-center text-left md:text-center">
              <h1 className="font-display-lg text-[40px] md:text-[56px] text-on-background font-bold">Your Clips are Ready</h1>
              <p className="font-body-lg text-body-lg text-secondary max-w-[600px] mx-auto">
                We've generated high-quality vertical clips perfect for social media. Review and download them below.
              </p>
            </header>

            {/* Clips Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter lg:gap-margin-desktop w-full max-w-[1000px] mx-auto">
              {clips.map((filename, idx) => {
                const clipUrl = `${BACKEND_URL}/clips/${jobId}/${filename}`;
                return (
                  <div
                    key={filename}
                    className="bg-surface-container-lowest border border-outline-variant rounded-lg p-unit flex flex-col soft-shadow hover-elevate overflow-hidden"
                  >
                    <div className="relative w-full aspect-9-16 rounded overflow-hidden bg-black flex items-center justify-center">
                      <video
                        src={clipUrl}
                        controls
                        className="w-full h-full object-contain"
                        preload="metadata"
                      />
                      <div className="absolute top-stack-sm left-stack-sm bg-on-background/80 backdrop-blur-sm text-surface-container-lowest px-2 py-1 rounded font-label-sm text-label-sm flex items-center gap-1 z-10 pointer-events-none">
                        <span className="material-symbols-outlined text-[14px]">play_circle</span>
                        <span>Clip {idx + 1}</span>
                      </div>
                    </div>

                    <div className="p-stack-sm pt-stack-md mt-auto">
                      <a
                        href={clipUrl}
                        download={filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex justify-center items-center gap-unit px-[18px] py-[10px] bg-surface-container-lowest border border-outline-variant rounded-DEFAULT text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-low transition-colors duration-200"
                      >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Area */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-stack-md">
              <button
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-[24px] py-[12px] bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity duration-200 soft-shadow cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">download_for_offline</span>
                <span>Download All Clips</span>
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-[24px] py-[12px] bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors duration-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                <span>Clip Another Video</span>
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full py-12 bg-transparent text-secondary font-label-sm text-label-sm border-t border-outline-variant/30 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-gutter max-w-container-max mx-auto gap-stack-md">
          <div className="font-body-sm text-on-surface/70">
            © 2026 Vakiogiri. All rights reserved.
          </div>
          <div className="flex gap-8">
            <a className="text-secondary hover:text-on-surface transition-all duration-300 cursor-pointer" href="#">Privacy Policy</a>
            <a className="text-secondary hover:text-on-surface transition-all duration-300 cursor-pointer" href="#">Terms of Service</a>
            <a className="text-secondary hover:text-on-surface transition-all duration-300 cursor-pointer" href="#">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
