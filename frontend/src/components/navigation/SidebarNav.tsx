"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  IconsaxHome,
  IconsaxProjects,
  IconsaxMessages,
  IconsaxCalendar,
  IconsaxArchive,
  IconsaxAnalytics,
  IconsaxAccount,
  IconsaxSettings,
} from "./IconsaxIcons";

interface SidebarNavProps {
  activeView: string;
  onSelectView: (id: string) => void;
  historyCount?: number;
  onOpenAuth?: () => void;
  session?: any;
  userProfile?: {
    email?: string;
    credits_remaining?: number;
  };
  onSignOut?: () => void;
}

export default function SidebarNav({
  activeView,
  onSelectView,
  historyCount = 3,
  onOpenAuth,
  session,
  userProfile,
  onSignOut,
}: SidebarNavProps) {
  // Mode: compact rail (as shown on left of reference) vs expanded panel (as shown on right)
  const [isExpanded, setIsExpanded] = useState(false);

  // Top navigation items matching the Iconsax reference design
  const topItems = [
    {
      id: "studio",
      label: "Home",
      icon: <IconsaxHome size={22} />,
      onClick: () => onSelectView("studio"),
    },
    {
      id: "projects",
      label: "Projects",
      icon: <IconsaxProjects size={22} />,
      onClick: () => onSelectView("history"),
    },
    {
      id: "history",
      label: "Messages",
      icon: <IconsaxMessages size={22} />,
      badge: historyCount > 0 ? historyCount : 3,
      onClick: () => onSelectView("history"),
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: <IconsaxCalendar size={22} />,
      onClick: () => onSelectView("studio"),
    },
    {
      id: "archive",
      label: "Archive",
      icon: <IconsaxArchive size={22} />,
      onClick: () => onSelectView("studio"),
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: <IconsaxAnalytics size={22} />,
      onClick: () => onSelectView("studio"),
    },
  ];

  // Bottom navigation items matching the Iconsax reference design
  const bottomItems = [
    {
      id: "account",
      label: "Account",
      icon: <IconsaxAccount size={22} />,
      onClick: () => {
        if (!session && onOpenAuth) {
          onOpenAuth();
        }
      },
    },
    {
      id: "settings",
      label: "Settings",
      icon: <IconsaxSettings size={22} />,
      onClick: () => onSelectView("studio"),
    },
  ];

  return (
    <>
      {/* ============================================================ */}
      {/* 1. COLLAPSED FLOATING RAIL (Exact Left Component in Image 1) */}
      {/* ============================================================ */}
      {!isExpanded && (
        <aside
          className="fixed left-5 top-8 bottom-8 z-50 w-[70px] flex flex-col items-center justify-between py-6 rounded-[38px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none shadow-[0_30px_70px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.18)] border border-white/[0.12]"
          style={{
            background: "linear-gradient(180deg, rgba(28, 28, 34, 0.82) 0%, rgba(16, 16, 20, 0.90) 50%, rgba(10, 10, 13, 0.95) 100%)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
          }}
        >
          {/* Top Logo in Golden Orange Circle with Pure Solid Black BG & Zero Glow */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="cursor-pointer focus:outline-none"
              title="Click to expand panel"
            >
              <div className="w-9 h-9 rounded-full bg-black border-[1.5px] border-[#ff7427] flex items-center justify-center relative">
                <Image
                  src="/brand_logo.png?v=3"
                  alt="Logo"
                  width={22}
                  height={22}
                  priority
                  unoptimized
                  className="w-5 h-5 object-contain"
                />
              </div>
            </button>
          </div>

          {/* Center Navigation Icons Stack */}
          <nav className="flex flex-col items-center gap-3 w-full px-2">
            {topItems.map((item) => {
              const isActive =
                activeView === item.id ||
                (item.id === "projects" && activeView === "history") ||
                (item.id === "history" && activeView === "history");

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="relative group w-12 h-12 flex items-center justify-center cursor-pointer focus:outline-none"
                >
                  {/* Glowing Neon Notch on the Outer Left Rim */}
                  {isActive && (
                    <span
                      className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-[4px] h-[22px] rounded-r-full bg-[#ff7427] pointer-events-none"
                      style={{
                        boxShadow: "0 0 14px #ff7427, 0 0 28px rgba(255, 116, 39, 0.8)",
                      }}
                    />
                  )}

                  {/* Icon Container Pill */}
                  <div
                    className={`w-12 h-12 rounded-[20px] flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? "text-white"
                        : "text-[#8e8e96] hover:text-white hover:bg-white/[0.05]"
                    }`}
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(135deg, rgba(255, 116, 39, 0.28) 0%, rgba(255, 116, 39, 0.08) 60%, rgba(255, 116, 39, 0.0) 100%)",
                            border: "1px solid rgba(255, 116, 39, 0.45)",
                            boxShadow:
                              "0 0 22px rgba(255, 116, 39, 0.28), inset 0 0 12px rgba(255, 116, 39, 0.15)",
                          }
                        : undefined
                    }
                  >
                    {item.icon}
                  </div>

                  {/* Tooltip on Hover */}
                  <span className="absolute left-[62px] px-2.5 py-1 rounded-lg bg-[#141416]/95 text-white text-xs font-medium whitespace-nowrap border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-2xl z-50">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Utility Icons Stack */}
          <div className="flex flex-col items-center gap-3 w-full px-2 pt-3 border-t border-white/[0.06]">
            {bottomItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="relative group w-12 h-12 flex items-center justify-center cursor-pointer focus:outline-none"
                >
                  {isActive && (
                    <span
                      className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-[4px] h-[22px] rounded-r-full bg-[#ff7427] pointer-events-none"
                      style={{
                        boxShadow: "0 0 14px #ff7427, 0 0 28px rgba(255, 116, 39, 0.8)",
                      }}
                    />
                  )}

                  <div
                    className={`w-12 h-12 rounded-[20px] flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? "text-white"
                        : "text-[#8e8e96] hover:text-white hover:bg-white/[0.05]"
                    }`}
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(135deg, rgba(255, 116, 39, 0.28) 0%, rgba(255, 116, 39, 0.08) 60%, rgba(255, 116, 39, 0.0) 100%)",
                            border: "1px solid rgba(255, 116, 39, 0.45)",
                            boxShadow:
                              "0 0 22px rgba(255, 116, 39, 0.28), inset 0 0 12px rgba(255, 116, 39, 0.15)",
                          }
                        : undefined
                    }
                  >
                    {item.icon}
                  </div>

                  <span className="absolute left-[62px] px-2.5 py-1 rounded-lg bg-[#141416]/95 text-white text-xs font-medium whitespace-nowrap border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-2xl z-50">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* ============================================================ */}
      {/* 2. EXPANDED FLOATING PANEL (Exact Right Component in Image 1) */}
      {/* ============================================================ */}
      {isExpanded && (
        <aside
          className="fixed left-5 top-8 bottom-8 z-50 w-[270px] flex flex-col justify-between py-6 px-4 rounded-[38px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none shadow-[0_30px_70px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.18)] border border-white/[0.12]"
          style={{
            background: "linear-gradient(180deg, rgba(28, 28, 34, 0.85) 0%, rgba(16, 16, 20, 0.92) 50%, rgba(10, 10, 13, 0.96) 100%)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
          }}
        >
          {/* Top Logo + Brand Header (Exact `Rabbits` header layout in Image 1) */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-2 pt-1">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-3 focus:outline-none cursor-pointer"
                title="Click to collapse rail"
              >
                <div className="w-9 h-9 rounded-full bg-black border-[1.5px] border-[#ff7427] flex items-center justify-center relative">
                  <Image
                    src="/brand_logo.png?v=3"
                    alt="Logo"
                    width={22}
                    height={22}
                    priority
                    unoptimized
                    className="w-5 h-5 object-contain"
                  />
                </div>
                <span className="font-bold text-lg tracking-tight text-white transition-colors">
                  Vakiogiri
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="w-7 h-7 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Collapse to rail"
              >
                <span className="text-xs font-mono">◀</span>
              </button>
            </div>

            {/* Navigation List Stack */}
            <nav className="flex flex-col gap-1.5 w-full">
              {topItems.map((item) => {
                const isActive =
                  activeView === item.id ||
                  (item.id === "projects" && activeView === "history") ||
                  (item.id === "history" && activeView === "history");

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="relative w-full text-left group focus:outline-none cursor-pointer"
                  >
                    {/* Glowing Neon Notch on the Outer Left Rim */}
                    {isActive && (
                      <span
                        className="absolute -left-[20px] top-1/2 -translate-y-1/2 w-[4.5px] h-[24px] rounded-r-full bg-[#ff7427] pointer-events-none"
                        style={{
                          boxShadow: "0 0 14px #ff7427, 0 0 30px rgba(255, 116, 39, 0.85)",
                        }}
                      />
                    )}

                    {/* Active Pill Container with Exact Gradient and Glow */}
                    <div
                      className={`h-12 w-full rounded-[22px] px-4 flex items-center justify-between transition-all duration-200 ${
                        isActive
                          ? "text-white font-medium"
                          : "text-[#8e8e96] hover:text-white hover:bg-white/[0.04]"
                      }`}
                      style={
                        isActive
                          ? {
                              background:
                                "linear-gradient(90deg, rgba(255, 116, 39, 0.24) 0%, rgba(255, 116, 39, 0.07) 50%, rgba(255, 116, 39, 0.0) 100%)",
                              border: "1px solid rgba(255, 116, 39, 0.42)",
                              boxShadow:
                                "0 0 24px rgba(255, 116, 39, 0.22), inset 0 1px 1px rgba(255, 255, 255, 0.12)",
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={isActive ? "text-white" : "text-[#8e8e96] group-hover:text-white transition-colors"}>
                          {item.icon}
                        </div>
                        <span className="text-sm tracking-normal">
                          {item.label}
                        </span>
                      </div>

                      {/* Badge (e.g., Messages 3) */}
                      {item.badge !== undefined && (
                        <span className="w-5 h-5 rounded-full bg-[#18181e] border border-white/[0.08] text-[11px] font-mono font-medium text-[#8e8e96] flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Utility Items Stack */}
          <div className="flex flex-col gap-1.5 w-full pt-4 border-t border-white/[0.06]">
            {bottomItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="relative w-full text-left group focus:outline-none cursor-pointer"
                >
                  {isActive && (
                    <span
                      className="absolute -left-[20px] top-1/2 -translate-y-1/2 w-[4.5px] h-[24px] rounded-r-full bg-[#ff7427] pointer-events-none"
                      style={{
                        boxShadow: "0 0 14px #ff7427, 0 0 30px rgba(255, 116, 39, 0.85)",
                      }}
                    />
                  )}

                  <div
                    className={`h-12 w-full rounded-[22px] px-4 flex items-center gap-3.5 transition-all duration-200 ${
                      isActive
                        ? "text-white font-medium"
                        : "text-[#8e8e96] hover:text-white hover:bg-white/[0.04]"
                    }`}
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(90deg, rgba(255, 116, 39, 0.24) 0%, rgba(255, 116, 39, 0.07) 50%, rgba(255, 116, 39, 0.0) 100%)",
                            border: "1px solid rgba(255, 116, 39, 0.42)",
                            boxShadow:
                              "0 0 24px rgba(255, 116, 39, 0.22), inset 0 1px 1px rgba(255, 255, 255, 0.12)",
                          }
                        : undefined
                    }
                  >
                    <div className={isActive ? "text-white" : "text-[#8e8e96] group-hover:text-white transition-colors"}>
                      {item.icon}
                    </div>
                    <span className="text-sm tracking-normal">
                      {item.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}
    </>
  );
}
