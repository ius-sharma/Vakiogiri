"use client";

import React from "react";
import { Zap, User, LogOut, Sun, Moon, PanelLeft } from "lucide-react";

interface TopUtilityHeaderProps {
  title?: string;
  badge?: string;
  userProfile?: {
    email?: string;
    credits_remaining?: number;
    max_daily_credits?: number;
  };
  session?: any;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  isSidebarExpanded?: boolean;
  onToggleSidebar?: () => void;
}

export default function TopUtilityHeader({
  title = "Shorts Studio",
  badge,
  userProfile,
  session,
  onOpenAuth,
  onSignOut,
  theme = "dark",
  onToggleTheme,
  isSidebarExpanded = false,
  onToggleSidebar,
}: TopUtilityHeaderProps) {
  const creditsRemaining = userProfile?.credits_remaining ?? 3;
  const maxCredits = userProfile?.max_daily_credits || 3;

  return (
    <header className="w-full h-16 flex items-center justify-between px-4 sm:px-6 border-b border-white/[0.08] bg-[#09090c]/90 backdrop-blur-2xl sticky top-0 z-30 transition-all duration-300">
      {/* Left: Sidebar Toggle + View Title / Context Breadcrumb */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none"
            title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {title}
          </h2>
          {badge && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#ff7427]/15 text-[#ff7427] border border-[#ff7427]/30 tracking-wide">
              {badge}
            </span>
          )}
        </div>
      </div>

      {/* Right: Credits Meter, Theme, User / Auth */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Credits Gauge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono shadow-sm">
          <Zap className="w-3.5 h-3.5 text-[#ff7427] fill-[#ff7427]/20" />
          <span className="text-slate-300 font-bold">
            {creditsRemaining}/{maxCredits}
          </span>
          <span className="hidden sm:inline text-slate-500 text-[11px] font-sans">
            Daily Clips
          </span>
        </div>

        {/* Theme Toggle */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-[#ff7427]" />}
          </button>
        )}

        {/* User Auth Controls */}
        {session ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300 shadow-sm">
              <div className="w-5 h-5 rounded-full bg-[#ff7427]/20 border border-[#ff7427]/40 flex items-center justify-center text-[#ff7427] text-[10px] font-bold">
                {session.user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="hidden md:inline truncate max-w-[120px]">
                {session.user?.email}
              </span>
            </div>

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer focus:outline-none"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#ff7427] text-white hover:bg-[#e65c00] transition-all cursor-pointer shadow-sm shadow-orange-500/25 active:scale-95"
            >
              Start free
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
