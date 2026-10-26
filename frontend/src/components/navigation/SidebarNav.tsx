"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Scissors,
  MonitorPlay,
  Film,
  Share2,
  BarChart3,
  Calendar,
  Archive,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
} from "lucide-react";

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
      icon: Scissors,
      badge: undefined,
      onClick: () => onSelectView("studio"),
    },
    {
      id: "long_studio",
      label: "Long Studio",
      icon: MonitorPlay,
      badge: undefined,
      onClick: () => onSelectView("long_studio"),
    },
    {
      id: "projects",
      label: "Clips Library",
      icon: Film,
      badge: historyCount > 0 ? historyCount : undefined,
      onClick: () => onSelectView("history"),
    },
    {
      id: "connected_accounts",
      label: "Connected Accounts",
      icon: Share2,
      badge: "Soon",
      onClick: () => {},
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      badge: "Soon",
      onClick: () => {},
    },
    {
      id: "calendar",
      label: "Schedule",
      icon: Calendar,
      badge: "Soon",
      onClick: () => {},
    },
    {
      id: "archive",
      label: "Archive",
      icon: Archive,
      badge: undefined,
      onClick: () => {},
    },
  ];

  const bottomItems = [
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
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
              <div className="w-9 h-9 rounded-full bg-black border-[1.5px] border-[#ff7427] flex items-center justify-center shrink-0">
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
                <span className="text-base font-bold text-white tracking-tight">
                  Vakiogiri
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={toggleExpand}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors duration-200 cursor-pointer focus:outline-none"
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
              className="w-9 h-9 rounded-full bg-black border-[1.5px] border-[#ff7427] hover:border-[#ff9254] flex items-center justify-center shrink-0 cursor-pointer transition-colors duration-200 group focus:outline-none"
              title="Click to expand sidebar"
            >
              <Image
                src="/brand_logo.png?v=3"
                alt="Vakiogiri Logo"
                width={20}
                height={20}
                unoptimized
                className="w-4.5 h-4.5 object-contain"
                priority
              />
            </button>
          </div>
        )}
      </div>

      {/* 2. CENTER NAVIGATION ITEMS - Clean, Boxless, Subtle Glow, No Zoom */}
      <nav className="flex-1 flex flex-col gap-1 py-3 px-2 overflow-y-auto overflow-x-hidden scrollbar-none">
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
              className={`group relative w-full flex items-center cursor-pointer select-none focus:outline-none ${
                isExpanded ? "px-2 py-1" : "justify-center py-1.5"
              }`}
            >
              {/* Refined Minimal Left Rim Notch Indicator */}
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] rounded-r-full transition-all duration-200 ease-out pointer-events-none ${
                  isActive
                    ? "h-5 bg-[#ff7427] opacity-100 shadow-[0_0_6px_rgba(255,116,39,0.45)]"
                    : "h-0 bg-white/40 opacity-0 group-hover:h-2 group-hover:opacity-40"
                }`}
              />

              {/* Boxless Item Container: No clunky border, soft luminance hover */}
              <div
                className={`flex items-center transition-all duration-200 ease-out ${
                  isExpanded
                    ? "w-full h-10 px-3 rounded-lg justify-between group-hover:translate-x-1"
                    : "w-10 h-10 rounded-lg justify-center"
                } ${
                  isActive
                    ? "text-[#ff7427] bg-[#ff7427]/[0.08]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center transition-colors duration-200 ${
                      isActive
                        ? "text-[#ff7427] drop-shadow-[0_0_4px_rgba(255,116,39,0.35)]"
                        : "text-slate-400 group-hover:text-white"
                    }`}
                  >
                    <IconComponent className="w-4.5 h-4.5" />
                  </div>

                  {isExpanded && (
                    <span
                      className={`text-xs tracking-tight truncate transition-colors duration-200 ${
                        isActive
                          ? "text-white font-bold"
                          : "text-slate-400 group-hover:text-white font-medium"
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
                        ? "bg-[#ff7427]/15 text-[#ff7427]"
                        : "bg-white/[0.05] text-slate-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Floating Tooltip in Collapsed Mode */}
              {!isExpanded && (
                <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 flex items-center opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 ease-out pointer-events-none z-50">
                  <div className="relative px-2.5 py-1.5 rounded-lg bg-[#141418] border border-white/[0.1] text-xs font-medium text-white tracking-wide shadow-lg whitespace-nowrap flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#ff7427]/20 text-[#ff7427] font-bold">
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
      <div className="flex flex-col gap-1 p-2 border-t border-white/[0.08] shrink-0">
        {/* Credits Pill (Expanded View) */}
        {isExpanded && (
          <div className="mx-1 mb-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs font-mono">
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
              className={`group relative w-full flex items-center cursor-pointer select-none focus:outline-none ${
                isExpanded ? "px-2 py-1" : "justify-center py-1"
              }`}
            >
              <div
                className={`flex items-center transition-all duration-200 ease-out ${
                  isExpanded
                    ? "w-full h-10 px-3 rounded-lg gap-3 group-hover:translate-x-1"
                    : "w-10 h-10 rounded-lg justify-center"
                } text-slate-400 hover:text-white hover:bg-white/[0.04]`}
              >
                <div className="transition-colors duration-200 group-hover:text-white">
                  <IconComponent className="w-4.5 h-4.5" />
                </div>
                {isExpanded && (
                  <span className="text-xs font-medium tracking-tight text-slate-400 group-hover:text-white transition-colors duration-200">
                    {item.label}
                  </span>
                )}
              </div>

              {!isExpanded && (
                <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 flex items-center opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 ease-out pointer-events-none z-50">
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#141418] border border-white/[0.1] text-xs font-medium text-white whitespace-nowrap shadow-lg">
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
                    className="group relative w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors duration-200 cursor-pointer focus:outline-none"
                  >
                    <LogOut className="w-4 h-4 transition-colors duration-200" />
                    <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 flex items-center opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 ease-out pointer-events-none z-50">
                      <div className="px-2.5 py-1.5 rounded-lg bg-[#141418] border border-white/[0.1] text-xs font-medium text-rose-300 whitespace-nowrap shadow-lg">
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
