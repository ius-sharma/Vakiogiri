"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, isSupabaseConfigured } from "@/lib/supabase";
import ParticleOrbCanvas from "./ParticleOrbCanvas";

interface AuthCardProps {
  initialMode: "login" | "signup";
}

export default function AuthCard({ initialMode }: AuthCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Particle Orb explosion state on successful authentication
  const [isExploding, setIsExploding] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in with Google.");
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
        
        setIsExploding(true);
        setTimeout(() => {
          if (data.session) router.push("/");
        }, 900);
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
        
        setIsExploding(true);
        setTimeout(() => {
          router.push("/");
        }, 900);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please check credentials.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-8 bg-black overflow-hidden select-none">
      
      {/* Side-by-Side: Left Orb, Right Login Card */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
        
        {/* LEFT: 3D Particle Orb */}
        <div className="w-full h-[380px] sm:h-[460px] md:h-[520px] flex items-center justify-center">
          <ParticleOrbCanvas
            isExploding={isExploding}
            onExplodeComplete={() => {
              router.push("/");
            }}
          />
        </div>

        {/* RIGHT: Simple Pure Frosted Login/Signup Card */}
        <div className="w-full flex justify-center">
          <div className={`w-full max-w-[420px] bg-[#09090c]/80 border border-white/[0.12] backdrop-blur-2xl rounded-[32px] p-7 sm:p-9 shadow-[0_30px_90px_rgba(0,0,0,0.95)] flex flex-col gap-6 transition-all duration-500 hover:border-white/[0.18] ${
            isExploding ? "scale-105 opacity-90 transition-all duration-700" : ""
          }`}>
            
            {/* Brand Header */}
            <div className="text-center flex flex-col items-center gap-3">
              <Link
                href="/"
                className="w-12 h-12 rounded-full bg-black border-[1.5px] border-[#ff7427] flex items-center justify-center shrink-0 overflow-hidden shadow-none transition-none focus:outline-none"
                title="Return to Home"
              >
                <Image
                  src="/brand_logo.png?v=3"
                  alt="Vakiogiri Brand Logo"
                  width={28}
                  height={28}
                  unoptimized={true}
                  className="w-6 h-6 object-contain transition-none"
                  priority
                />
              </Link>

              <div className="space-y-1">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {mode === "login" ? "Welcome back" : "Create account"}
                </h1>
                <p className="text-xs text-slate-400">
                  {mode === "login"
                    ? "Sign in to access your video studio"
                    : "Get 3 free video clips daily"}
                </p>
              </div>
            </div>

            {/* Mode Toggle Switcher Pill */}
            <div className="grid grid-cols-2 bg-white/[0.04] p-1 rounded-full border border-white/[0.08] text-xs font-semibold">
              <Link
                href="/login"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 text-center rounded-full transition-all duration-200 cursor-pointer ${
                  mode === "login"
                    ? "bg-white text-black font-bold shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => {
                  setMode("signup");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 text-center rounded-full transition-all duration-200 cursor-pointer ${
                  mode === "signup"
                    ? "bg-white text-black font-bold shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sign up
              </Link>
            </div>

            {/* Google 1-Tap OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || isExploding}
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
                    disabled={isExploding}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-black/50 border border-white/[0.1] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff7427] transition-colors"
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
                    disabled={isExploding}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-black/50 border border-white/[0.1] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#ff7427] transition-colors"
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
                disabled={loading || isExploding}
                className="w-full mt-1 py-3 px-4 bg-[#ff7427] hover:bg-[#e65c00] text-white font-bold text-xs rounded-xl transition-all duration-200 shadow-md shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {isExploding
                    ? "Entering Studio..."
                    : loading
                    ? "Please wait..."
                    : mode === "login"
                    ? "Sign in"
                    : "Create Account"}
                </span>
                {!loading && !isExploding && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </form>

            {!isSupabaseConfigured() && (
              <p className="text-[10px] text-center text-slate-500">
                Running in preview mode. Configure Supabase keys in <code className="font-mono text-slate-400">.env.local</code> for production OAuth.
              </p>
            )}

            {/* Back to Home Link */}
            <div className="text-center pt-1 border-t border-white/[0.06]">
              <Link
                href="/"
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                ← Back to Studio Home
              </Link>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
