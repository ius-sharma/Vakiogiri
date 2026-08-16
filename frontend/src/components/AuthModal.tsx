"use client";

import { useState } from "react";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, isSupabaseConfigured } from "../lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
  onAuthSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, initialMode = "login", onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
        setSuccessMsg("Account created! Check your email to confirm your account or log in.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-[420px] bg-surface-container-lowest border border-outline-variant rounded-3xl p-8 shadow-2xl relative flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Modal Header */}
        <div className="text-center flex flex-col gap-1.5">
          <h2 className="text-2xl font-bold text-on-surface tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-secondary">
            {mode === "login" 
              ? "Sign in to access your 3 daily free video generations & saved history"
              : "Get 3 free AI video generations every single day"}
          </p>
        </div>

        {/* Mode Toggle Pills */}
        <div className="grid grid-cols-2 bg-surface-container-low p-1 rounded-xl border border-outline-variant/50 text-sm font-semibold">
          <button
            type="button"
            onClick={() => { setMode("login"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === "login"
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-secondary hover:text-on-surface"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-secondary hover:text-on-surface"
            }`}
          >
            Sign up
          </button>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 px-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant rounded-xl flex items-center justify-center gap-3 text-on-surface font-semibold text-sm transition-all shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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
          <div className="flex-grow h-px bg-outline-variant/60"></div>
          <span className="text-xs text-outline font-medium uppercase tracking-wider">or email</span>
          <div className="flex-grow h-px bg-outline-variant/60"></div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-secondary">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-secondary">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 py-3 px-4 bg-primary text-on-primary font-semibold text-sm rounded-xl hover:bg-surface-tint transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create Account"}
          </button>
        </form>

        {!isSupabaseConfigured() && (
          <p className="text-[11px] text-center text-outline">
            Running in local guest preview mode. Add Supabase keys to <code className="font-mono">.env.local</code> to activate live OAuth.
          </p>
        )}
      </div>
    </div>
  );
}
