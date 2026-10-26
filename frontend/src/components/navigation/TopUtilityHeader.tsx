"use client";

import React from "react";
import { Sun, Moon, PanelLeft } from "lucide-react";

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
  onToggleTheme?: (e?: React.MouseEvent) => void;
  isSidebarExpanded?: boolean;
  onToggleSidebar?: () => void;
}

export default function TopUtilityHeader({
  title = "Shorts Studio",
  badge,
  theme = "dark",
  onToggleTheme,
  isSidebarExpanded = false,
  onToggleSidebar,
}: TopUtilityHeaderProps) {
  const isLight = theme === "light";

  return (
    <header
      className={`w-full h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 transition-all duration-300 backdrop-blur-2xl ${
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
        </div>
      </div>

      {/* Right: Only Dark/Bright Mode Toggle Button */}
      <div className="flex items-center">
        {onToggleTheme && (
          <button
            type="button"
            onClick={(e) => onToggleTheme(e)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer focus:outline-none group relative overflow-hidden ${
              isLight
                ? "bg-slate-100 hover:bg-slate-200/90 border border-slate-200 text-slate-700 shadow-xs hover:shadow"
                : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20"
            }`}
            title={theme === "dark" ? "Switch to Bright Mode" : "Switch to Dark Mode"}
          >
            <div className="relative w-4 h-4 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-45 group-active:scale-80">
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)] transition-all" />
              ) : (
                <Moon className="w-4 h-4 text-[#ff7427] drop-shadow-[0_0_6px_rgba(255,116,39,0.45)] transition-all" />
              )}
            </div>
          </button>
        )}
      </div>
    </header>
  );
}
