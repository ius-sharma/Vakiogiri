"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  KoboyoClapperboard,
  KoboyoFilm,
  KoboyoBarChart,
  KoboyoCalendar,
  KoboyoArchive,
  KoboyoSettings,
  KoboyoUser,
} from "./KoboyoIcons";
import { ChevronLeft, ChevronRight, LogOut, Zap } from "lucide-react";

interface SidebarNavProps {
  activeView: string;
  onSelectView: (id: string) => void;
  historyCount?: number;
  onOpenAuth?: () => void;
  session?: any;
  userProfile?: {
    email?: string;
    credits_remaining?: number;
    max_daily_credits?: number;
  };
  onSignOut?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function SidebarNav({
  activeView,
  onSelectView,
  historyCount = 0,
  onOpenAuth,
  session,
  userProfile,
  onSignOut,
  isExpanded: controlledExpanded,
  onToggleExpand: controlledToggle,
}: SidebarNavProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const toggleExpand = () => {
    if (controlledToggle) {
      controlledToggle();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const topItems = [
    {
      id: "studio",
      label: "Shorts Studio",
      icon: KoboyoClapperboard,
      badge: undefined,
      onClick: () => onSelectView("studio"),
    },
    {
      id: "projects",
      label: "Clips Library",
      icon: KoboyoFilm,
      badge: historyCount > 0 ? historyCount : undefined,
      onClick: () => onSelectView("history"),
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: KoboyoBarChart,
      badge: "Soon",
      onClick: () => onSelectView("studio"),
    },
    {
      id: "calendar",
      label: "Schedule",
      icon: KoboyoCalendar,
      badge: "Soon",
      onClick: () => onSelectView("studio"),
    },
    {
      id: "archive",
      label: "Archive",
      icon: KoboyoArchive,
      badge: undefined,
      onClick: () => onSelectView("studio"),
    },
  ];

  const bottomItems = [
    {
      id: "settings",
      label: "Settings",
      icon: KoboyoSettings,
      onClick: () => onSelectView("studio"),
    },
  ];

  const creditsRemaining = userProfile?.credits_remaining ?? 3;
  const maxCredits = userProfile?.max_daily_credits ?? 3;

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col justify-between border-r border-white/[0.08] bg-[#09090c]/90 backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
        isExpanded ? "w-[240px]" : "w-[72px]"
      }`}
    >
      {/* 1. TOP HEADER - Exact h-16 height & border-b matching TopUtilityHeader */}
      <div className="h-16 flex items-center border-b border-white/[0.08] px-3.5 shrink-0 transition-all duration-300">
        {isExpanded ? (
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={() => onSelectView("studio")}
              className="flex items-center gap-3 cursor-pointer group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-black border-[1.5px] border-[#ff7427] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,116,39,0.25)] group-hover:scale-105 transition-transform duration-300">
                <Image
                  src="/brand_logo.png?v=3"
                  alt="Vakiogiri Logo"
                  width={20}
                  height={20}
                  unoptimized
                  className="w-5 h-5 object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  Vakiogiri
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#ff7427]/20 text-[#ff7427] font-semibold border border-[#ff7427]/30">
                    AI
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Shorts Studio</span>
              </div>
            </button>

            <button
              type="button"
              onClick={toggleExpand}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center">
            <button
              type="button"
              onClick={toggleExpand}
              className="w-10 h-10 rounded-full bg-black border-[1.5px] border-[#ff7427] hover:border-[#ff9254] flex items-center justify-center shrink-0 cursor-pointer transition-all duration-300 ease-out hover:scale-105 shadow-[0_0_14px_rgba(255,116,39,0.2)] group focus:outline-none"
              title="Click to expand sidebar"
            >
              <Image
                src="/brand_logo.png?v=3"
                alt="Vakiogiri Logo"
                width={22}
                height={22}
                unoptimized
                className="w-5 h-5 object-contain group-hover:rotate-6 transition-transform duration-300"
                priority
              />
            </button>
          </div>
        )}
      </div>

      {/* 2. CENTER NAVIGATION ITEMS */}
      <nav className="flex-1 flex flex-col gap-1.5 py-4 px-2 overflow-y-auto overflow-x-hidden scrollbar-none">
        {topItems.map((item) => {
          const isActive =
            activeView === item.id ||
            (item.id === "projects" && activeView === "history") ||
            (item.id === "studio" && activeView === "studio");

          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`group relative w-full flex items-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer select-none focus:outline-none ${
                isExpanded ? "px-2 py-1" : "justify-center py-1"
              }`}
            >
              {/* Sleek Neon Left Notch Indicator */}
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-[#ff7427] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${
                  isActive
                    ? "h-6 opacity-100 shadow-[0_0_12px_#ff7427]"
                    : "h-0 opacity-0 group-hover:h-3 group-hover:opacity-40"
                }`}
              />

              {/* Button Pill Container */}
              <div
                className={`flex items-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isExpanded
                    ? "w-full h-11 px-3.5 rounded-xl justify-between"
                    : "w-11 h-11 rounded-xl justify-center"
                } ${
                  isActive
                    ? "text-white bg-gradient-to-r from-[#ff7427]/20 via-[#ff7427]/10 to-transparent border border-[#ff7427]/30 shadow-[0_0_20px_rgba(255,116,39,0.18)]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.06] hover:shadow-[0_0_16px_rgba(255,255,255,0.03)] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-active:scale-95 ${
                      isActive ? "text-[#ff7427]" : "text-slate-400 group-hover:text-white"
                    }`}
                  >
                    <IconComponent size={21} />
                  </div>

                  {isExpanded && (
                    <span
                      className={`text-xs font-semibold tracking-tight truncate transition-colors duration-200 ${
                        isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {item.label}
                    </span>
                  )}
                </div>

                {isExpanded && item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold transition-all ${
                      typeof item.badge === "number"
                        ? "bg-[#ff7427]/20 text-[#ff7427] border border-[#ff7427]/30"
                        : "bg-white/[0.06] text-slate-400 border border-white/[0.08]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Floating Tooltip in Collapsed Mode */}
              {!isExpanded && (
                <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 flex items-center opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out pointer-events-none z-50">
                  <div className="relative px-3 py-1.5 rounded-xl bg-[#121216]/95 backdrop-blur-xl border border-white/[0.12] text-xs font-semibold text-white tracking-wide shadow-[0_10px_30px_rgba(0,0,0,0.8)] whitespace-nowrap flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#ff7427]/20 text-[#ff7427] font-bold border border-[#ff7427]/30">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. BOTTOM UTILITY & PROFILE SECTION */}
      <div className="flex flex-col gap-2 p-2 border-t border-white/[0.08] shrink-0">
        {/* Credits Pill (Expanded View) */}
        {isExpanded && (
          <div className="mx-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#ff7427] fill-[#ff7427]/20" />
              <span className="text-slate-300 font-bold">
                {creditsRemaining}/{maxCredits}
              </span>
              <span className="text-[10px] text-slate-500 font-sans">Clips</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#ff7427]/10 text-[#ff7427] font-bold">
              Daily
            </span>
          </div>
        )}

        {/* Bottom items (Settings) */}
        {bottomItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`group relative w-full flex items-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer select-none focus:outline-none ${
                isExpanded ? "px-2 py-1" : "justify-center py-1"
              }`}
            >
              <div
                className={`flex items-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isExpanded
                    ? "w-full h-10 px-3.5 rounded-xl gap-3"
                    : "w-11 h-10 rounded-xl justify-center"
                } text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent`}
              >
                <div className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-active:scale-95 group-hover:text-white">
                  <IconComponent size={20} />
                </div>
                {isExpanded && (
                  <span className="text-xs font-semibold tracking-tight text-slate-300 group-hover:text-white">
                    {item.label}
                  </span>
                )}
              </div>

              {!isExpanded && (
                <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 flex items-center opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out pointer-events-none z-50">
                  <div className="px-3 py-1.5 rounded-xl bg-[#121216]/95 backdrop-blur-xl border border-white/[0.12] text-xs font-semibold text-white whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                    {item.label}
                  </div>
                </div>
              )}
            </button>
          );
        })}

        {/* User Account / Sign Out Section */}
        {session && (
          <div className="pt-1">
            {isExpanded ? (
              <div className="px-2 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#ff7427]/20 border border-[#ff7427]/40 flex items-center justify-center text-[#ff7427] text-xs font-bold shrink-0">
                    {session.user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-semibold text-white truncate">
                      {session.user?.email?.split("@")[0]}
                    </span>
                    <span className="text-[9px] text-slate-400 truncate">
                      {session.user?.email}
                    </span>
                  </div>
                </div>

                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex justify-center">
                {onSignOut ? (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="group relative w-11 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer focus:outline-none"
                  >
                    <LogOut className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                    <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 flex items-center opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out pointer-events-none z-50">
                      <div className="px-3 py-1.5 rounded-xl bg-[#121216]/95 backdrop-blur-xl border border-white/[0.12] text-xs font-semibold text-rose-300 whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                        Sign out
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#ff7427]/20 border border-[#ff7427]/40 flex items-center justify-center text-[#ff7427] text-xs font-bold">
                    {session.user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
