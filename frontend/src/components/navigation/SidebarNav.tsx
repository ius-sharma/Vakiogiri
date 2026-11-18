"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Scissors,
  MonitorPlay,
  Film,
  Radio,
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
import { useUIFeedback } from "@/components/UIFeedback";

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
  theme?: "light" | "dark";
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
  theme = "dark",
}: SidebarNavProps) {
  const isLight = theme === "light";
  const { showToast } = useUIFeedback();
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
      id: "live_radar",
      label: "Live Radar",
      icon: Radio,
      badge: "LIVE",
      onClick: () => onSelectView("live_radar"),
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
      onClick: () => showToast("Connected Accounts is coming soon!", "info"),
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      badge: "Soon",
      onClick: () => showToast("Analytics is coming soon!", "info"),
    },
    {
      id: "calendar",
      label: "Schedule",
      icon: Calendar,
      badge: "Soon",
      onClick: () => showToast("Schedule is coming soon!", "info"),
    },
    {
      id: "archive",
      label: "Archive",
      icon: Archive,
      badge: "Soon",
      onClick: () => showToast("Archive is coming soon!", "info"),
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
      className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none backdrop-blur-2xl ${
        isLight
          ? "border-r border-slate-200/80 bg-white/95 text-slate-800 shadow-[1px_0_3px_rgba(0,0,0,0.02)]"
          : "border-r border-white/[0.08] bg-[#09090c]/90 text-white"
      } ${isExpanded ? "w-[240px]" : "w-[72px]"}`}
    >
      {/* 1. TOP HEADER - Exact h-16 height & border-b matching TopUtilityHeader */}
      <div
        className={`h-16 flex items-center px-3.5 shrink-0 transition-all duration-300 ${
          isLight ? "border-b border-slate-200/80" : "border-b border-white/[0.08]"
        }`}
      >
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
                <span
                  className={`text-base font-bold tracking-tight ${
                    isLight ? "text-slate-900" : "text-white"
                  }`}
                >
                  Vakiogiri
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={toggleExpand}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer focus:outline-none ${
                isLight
                  ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
              }`}
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
                    : isLight
                    ? "h-0 bg-slate-300 opacity-0 group-hover:h-2 group-hover:opacity-60"
                    : "h-0 bg-white/40 opacity-0 group-hover:h-2 group-hover:opacity-40"
                }`}
              />

              {/* Boxless Item Container */}
              <div
                className={`flex items-center transition-all duration-200 ease-out ${
                  isExpanded
                    ? "w-full h-10 px-3 rounded-lg justify-between group-hover:translate-x-1"
                    : "w-10 h-10 rounded-lg justify-center"
                } ${
                  isActive
                    ? isLight
                      ? "text-[#ff7427] bg-[#ff7427]/[0.08]"
                      : "text-[#ff7427] bg-[#ff7427]/[0.08]"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center transition-colors duration-200 ${
                      isActive
                        ? "text-[#ff7427] drop-shadow-[0_0_4px_rgba(255,116,39,0.35)]"
                        : isLight
                        ? "text-slate-500 group-hover:text-slate-900"
                        : "text-slate-400 group-hover:text-white"
                    }`}
                  >
                    <IconComponent className="w-4.5 h-4.5" />
                  </div>

                  {isExpanded && (
                    <span
                      className={`text-xs tracking-tight truncate transition-colors duration-200 ${
                        isActive
                          ? isLight
                            ? "text-[#ff7427] font-bold"
                            : "text-white font-bold"
                          : isLight
                          ? "text-slate-600 group-hover:text-slate-900 font-medium"
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
                      item.badge === "LIVE"
                        ? "bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse font-extrabold"
                        : typeof item.badge === "number"
                        ? "bg-[#ff7427]/15 text-[#ff7427]"
                        : isLight
                        ? "bg-slate-100 text-slate-500 border border-slate-200"
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
                  <div
                    className={`relative px-2.5 py-1.5 rounded-lg text-xs font-medium tracking-wide whitespace-nowrap flex items-center gap-2 ${
                      isLight
                        ? "bg-white border border-slate-200 text-slate-900 shadow-xl"
                        : "bg-[#141418] border border-white/[0.1] text-white shadow-lg"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                        item.badge === "LIVE"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                          : "bg-[#ff7427]/20 text-[#ff7427]"
                      }`}>
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
      <div
        className={`flex flex-col gap-1 p-2 shrink-0 ${
          isLight ? "border-t border-slate-200/80" : "border-t border-white/[0.08]"
        }`}
      >
        {/* Credits Pill (Expanded View) */}
        {isExpanded && (
          <div
            className={`mx-1 mb-1 px-3 py-2 rounded-xl flex items-center justify-between text-xs font-mono transition-colors ${
              isLight
                ? "bg-slate-100/90 border border-slate-200/80 text-slate-800"
                : "bg-white/[0.03] border border-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#ff7427] fill-[#ff7427]/20" />
              <span className={`font-bold ${isLight ? "text-slate-900" : "text-slate-300"}`}>
                {creditsRemaining}/{maxCredits}
              </span>
              <span className={`text-[10px] font-sans ${isLight ? "text-slate-500" : "text-slate-500"}`}>
                Clips
              </span>
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
                } ${
                  isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`transition-colors duration-200 ${
                    isLight ? "group-hover:text-slate-900" : "group-hover:text-white"
                  }`}
                >
                  <IconComponent className="w-4.5 h-4.5" />
                </div>
                {isExpanded && (
                  <span
                    className={`text-xs font-medium tracking-tight transition-colors duration-200 ${
                      isLight
                        ? "text-slate-600 group-hover:text-slate-900"
                        : "text-slate-400 group-hover:text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </div>

              {!isExpanded && (
                <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 flex items-center opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 ease-out pointer-events-none z-50">
                  <div
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg ${
                      isLight
                        ? "bg-white border border-slate-200 text-slate-900"
                        : "bg-[#141418] border border-white/[0.1] text-white"
                    }`}
                  >
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
              <div
                className={`px-2 py-1.5 rounded-xl flex items-center justify-between transition-colors ${
                  isLight
                    ? "bg-slate-100/90 border border-slate-200/80"
                    : "bg-white/[0.03] border border-white/[0.06]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#ff7427]/20 border border-[#ff7427]/40 flex items-center justify-center text-[#ff7427] text-xs font-bold shrink-0">
                    {session.user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-[11px] font-semibold truncate ${
                        isLight ? "text-slate-900" : "text-white"
                      }`}
                    >
                      {session.user?.email?.split("@")[0]}
                    </span>
                    <span
                      className={`text-[9px] truncate ${
                        isLight ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      {session.user?.email}
                    </span>
                  </div>
                </div>

                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer focus:outline-none ${
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
              <div className="flex justify-center">
                {onSignOut ? (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className={`group relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer focus:outline-none ${
                      isLight
                        ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        : "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                    }`}
                  >
                    <LogOut className="w-4 h-4 transition-colors duration-200" />
                    <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 flex items-center opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 ease-out pointer-events-none z-50">
                      <div
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg ${
                          isLight
                            ? "bg-white border border-slate-200 text-rose-600"
                            : "bg-[#141418] border border-white/[0.1] text-rose-300"
                        }`}
                      >
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
