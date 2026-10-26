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
  const isLight = theme === "light";
  const creditsRemaining = userProfile?.credits_remaining ?? 3;
  const maxCredits = userProfile?.max_daily_credits || 3;

  return (
    <header
      className={`w-full h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 transition-all duration-300 backdrop-blur-2xl ${
        isLight
          ? "bg-white/90 border-b border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          : "bg-[#09090c]/90 border-b border-white/[0.08]"
      }`}
    >
      {/* Left: Sidebar Toggle + View Title / Context Breadcrumb */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none ${
              isLight
                ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
            }`}
            title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <h2
            className={`text-base sm:text-lg font-bold tracking-tight ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            {title}
          </h2>
          {badge && (
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full tracking-wide ${
                isLight
                  ? "bg-[#ff7427]/10 text-[#ff7427] border border-[#ff7427]/25"
                  : "bg-[#ff7427]/15 text-[#ff7427] border border-[#ff7427]/30"
              }`}
            >
              {badge}
            </span>
          )}
        </div>
      </div>

      {/* Right: Credits Meter, Theme, User / Auth */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Credits Gauge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono shadow-xs transition-colors ${
            isLight
              ? "bg-slate-100/90 border border-slate-200/80 text-slate-800"
              : "bg-white/[0.04] border border-white/[0.08] text-slate-300"
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-[#ff7427] fill-[#ff7427]/20" />
          <span className={`font-bold ${isLight ? "text-slate-900" : "text-slate-300"}`}>
            {creditsRemaining}/{maxCredits}
          </span>
          <span className={`hidden sm:inline text-[11px] font-sans ${isLight ? "text-slate-500" : "text-slate-500"}`}>
            Daily Clips
          </span>
        </div>

        {/* Theme Toggle */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer focus:outline-none ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700"
                : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white"
            }`}
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[#ff7427]" />
            )}
          </button>
        )}

        {/* User Auth Controls */}
        {session ? (
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs shadow-xs transition-colors ${
                isLight
                  ? "bg-slate-100/90 border border-slate-200/80 text-slate-800"
                  : "bg-white/[0.04] border border-white/[0.08] text-slate-300"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-[#ff7427]/20 border border-[#ff7427]/40 flex items-center justify-center text-[#ff7427] text-[10px] font-bold">
                {session.user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <span className={`hidden md:inline truncate max-w-[120px] font-medium ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                {session.user?.email}
              </span>
            </div>

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className={`p-2 rounded-xl transition-colors cursor-pointer focus:outline-none ${
                  isLight
                    ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    : "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                }`}
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
              className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-300 hover:text-white"
              }`}
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
