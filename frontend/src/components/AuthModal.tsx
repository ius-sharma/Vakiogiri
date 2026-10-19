"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Mail, Lock, AlertCircle, CheckCircle2, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, isSupabaseConfigured } from "../lib/supabase";
import SineWaveCanvas from "./auth/SineWaveCanvas";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
  onAuthSuccess?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
  onAuthSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMsg(error.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === "signup") {
        const { data, error } = await signUpWithEmail(email, password);
        if (error) throw error;
        setSuccessMsg("Account created! Check your email to confirm or sign in.");
        if (data.session && onAuthSuccess) {
          onAuthSuccess();
          onClose();
        }
      } else {
        const { data, error } = await signInWithEmail(email, password);
        if (error) throw error;
        if (onAuthSuccess) onAuthSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300 overflow-hidden cursor-pointer"
      onClick={onClose}
    >
      {/* Background Animated Dual Sine Waves (Golden Orange & White) */}
      <SineWaveCanvas />

      {/* Subtle Micro-Grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none -z-10" />

      {/* Center Frosted Glass Auth Card */}
      <div
        className="w-full max-w-[440px] relative z-10 bg-[#0a0a0c]/65 border border-white/[0.12] backdrop-blur-3xl rounded-[28px] p-7 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.9)] flex flex-col gap-6 cursor-default transition-all duration-300 hover:border-white/[0.18]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close dialog"
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer focus:outline-none"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="text-center flex flex-col items-center gap-2.5 pt-1">
          {/* Circular Brand Logo with Golden Orange border, pure solid black bg, zero glow */}
          <div className="w-12 h-12 rounded-full bg-black border-[1.5px] border-[#ff7427] flex items-center justify-center shrink-0 overflow-hidden shadow-none transition-none">
            <Image
              src="/brand_logo.png?v=3"
              alt="Vakiogiri Brand Logo"
              width={28}
              height={28}
              unoptimized={true}
              className="w-6 h-6 object-contain transition-none"
              priority
            />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {mode === "login" ? "Welcome back" : "Create creator account"}
            </h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              {mode === "login"
                ? "Sign in to access your library, presets, and daily free AI clips."
                : "Get 3 free AI video generations every day with cloud sync."}
            </p>
          </div>
        </div>

        {/* Mode Toggle Switcher Pill */}
        <div className="grid grid-cols-2 bg-white/[0.04] p-1 rounded-full border border-white/[0.08] text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-full transition-all duration-200 cursor-pointer ${
              mode === "login"
                ? "bg-white text-black font-bold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-full transition-all duration-200 cursor-pointer ${
              mode === "signup"
                ? "bg-white text-black font-bold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign up
          </button>
        </div>

        {/* Google 1-Tap OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-2xl flex items-center justify-center gap-3 text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-grow h-px bg-white/[0.08]" />
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
            or with email
          </span>
          <div className="flex-grow h-px bg-white/[0.08]" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-300">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff7427] transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-10 pr-3.5 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff7427] transition-colors"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action CTA Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 py-3 px-4 bg-[#ff7427] hover:bg-[#e65c00] text-white font-bold text-xs rounded-xl transition-all duration-200 shadow-md shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? "Please wait..." : mode === "login" ? "Sign in to Studio" : "Create Free Account"}</span>
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        {!isSupabaseConfigured() && (
          <p className="text-[10px] text-center text-slate-500">
            Running in preview mode. Configure Supabase keys in <code className="font-mono text-slate-400">.env.local</code> for production OAuth.
          </p>
        )}
      </div>
    </div>
  );
}
