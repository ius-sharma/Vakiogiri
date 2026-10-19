"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Home,
  Film,
  Radio,
  Calendar,
  BarChart2,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  onClick?: () => void;
  href?: string;
}

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
  historyCount = 0,
  onOpenAuth,
  session,
  userProfile,
  onSignOut,
}: SidebarNavProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const mainNavItems: NavItemConfig[] = [
    {
      id: "studio",
      label: "Studio",
      icon: <Home className="w-5 h-5" strokeWidth={1.8} />,
      onClick: () => onSelectView("studio"),
    },
    {
      id: "projects",
      label: "My Clips",
      icon: <Film className="w-5 h-5" strokeWidth={1.8} />,
      badge: historyCount > 0 ? historyCount : undefined,
      onClick: () => onSelectView("history"),
    },
    {
      id: "stream",
      label: "Stream Live",
      icon: <Radio className="w-5 h-5" strokeWidth={1.8} />,
      href: "/stream",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: <Calendar className="w-5 h-5" strokeWidth={1.8} />,
      onClick: () => onSelectView("studio"),
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: <BarChart2 className="w-5 h-5" strokeWidth={1.8} />,
      onClick: () => onSelectView("studio"),
    },
  ];

  const bottomNavItems: NavItemConfig[] = [
    {
      id: "account",
      label: session ? (session.user?.email ? session.user.email.split("@")[0] : "Account") : "Account",
      icon: <User className="w-5 h-5" strokeWidth={1.8} />,
      onClick: () => {
        if (!session && onOpenAuth) {
          onOpenAuth();
        }
      },
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-5 h-5" strokeWidth={1.8} />,
      onClick: () => onSelectView("studio"),
    },
  ];

  return (
    <aside
      className={`fixed left-4 top-4 bottom-4 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col justify-between py-6 ${
        isExpanded ? "w-64 px-4" : "w-[72px] px-2.5"
      } bg-[#0a0a0c]/85 backdrop-blur-2xl border border-white/[0.08] rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.85)] select-none`}
    >
      {/* Top Zone: Logo + Expand Toggle */}
      <div className="flex flex-col gap-6">
        <div className={`flex items-center ${isExpanded ? "justify-between px-2" : "justify-center"}`}>
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none"
            title="Vakiogiri AI"
          >
            <div className="relative w-9 h-9 flex items-center justify-center transition-transform group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="Logo"
                width={36}
                height={36}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            {isExpanded && (
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-[#ff7427] transition-colors truncate">
                Vakiogiri
              </span>
            )}
          </Link>

          {isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="w-7 h-7 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Primary Navigation Stack */}
        <nav className="flex flex-col gap-2">
          {mainNavItems.map((item) => {
            const isActive = activeView === item.id || (item.id === "projects" && activeView === "history");

            const content = (
              <div
                className={`relative w-full flex items-center gap-3.5 transition-all duration-200 cursor-pointer ${
                  isExpanded ? "px-3.5 py-3 rounded-2xl" : "justify-center p-3 rounded-2xl"
                } ${
                  isActive
                    ? "bg-gradient-to-r from-[#ff7427]/25 via-[#ff7427]/10 to-transparent border border-[#ff7427]/40 shadow-[0_0_25px_rgba(255,116,39,0.22)] text-white font-medium"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                {/* Active Neon Glowing Notch Bar (Matching Iconsax reference) */}
                {isActive && (
                  <span
                    className={`absolute rounded-r-full bg-[#ff7427] shadow-[0_0_12px_#ff7427] ${
                      isExpanded
                        ? "-left-4 w-1.5 h-6"
                        : "-left-2.5 w-1.5 h-6"
                    }`}
                  />
                )}

                <div className={`transition-transform duration-200 ${isActive ? "text-[#ff7427] scale-105" : ""}`}>
                  {item.icon}
                </div>

                {isExpanded && (
                  <span className="text-sm tracking-tight truncate flex-1">
                    {item.label}
                  </span>
                )}

                {/* Badge Indicator */}
                {item.badge !== undefined && (
                  <span
                    className={`rounded-full font-mono text-[11px] font-bold flex items-center justify-center ${
                      isExpanded
                        ? "px-2 py-0.5 bg-white/[0.08] text-slate-300"
                        : "absolute -top-1 -right-1 w-4 h-4 bg-[#ff7427] text-white text-[9px]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Collapsed Tooltip on Hover */}
                {!isExpanded && (
                  <span className="absolute left-[76px] px-2.5 py-1 rounded-lg bg-[#141416] text-white text-xs font-medium whitespace-nowrap border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl z-50">
                    {item.label}
                  </span>
                )}
              </div>
            );

            if (item.href) {
              return (
                <Link key={item.id} href={item.href} className="group relative block focus:outline-none">
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="group relative block w-full text-left focus:outline-none"
              >
                {content}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Zone: Account, Settings, Expand toggle */}
      <div className="flex flex-col gap-2 pt-4 border-t border-white/[0.06]">
        {bottomNavItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="group relative block w-full text-left focus:outline-none"
            >
              <div
                className={`relative w-full flex items-center gap-3.5 transition-all duration-200 cursor-pointer ${
                  isExpanded ? "px-3.5 py-3 rounded-2xl" : "justify-center p-3 rounded-2xl"
                } ${
                  isActive
                    ? "bg-gradient-to-r from-[#ff7427]/25 via-[#ff7427]/10 to-transparent border border-[#ff7427]/40 shadow-[0_0_25px_rgba(255,116,39,0.22)] text-white font-medium"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                {isActive && (
                  <span
                    className={`absolute rounded-r-full bg-[#ff7427] shadow-[0_0_12px_#ff7427] ${
                      isExpanded ? "-left-4 w-1.5 h-6" : "-left-2.5 w-1.5 h-6"
                    }`}
                  />
                )}

                <div className={`transition-transform duration-200 ${isActive ? "text-[#ff7427] scale-105" : ""}`}>
                  {item.icon}
                </div>

                {isExpanded && (
                  <span className="text-sm tracking-tight truncate flex-1">
                    {item.label}
                  </span>
                )}

                {!isExpanded && (
                  <span className="absolute left-[76px] px-2.5 py-1 rounded-lg bg-[#141416] text-white text-xs font-medium whitespace-nowrap border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl z-50">
                    {item.label}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Collapsed state Expand Button at bottom */}
        {!isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center justify-center p-2.5 rounded-2xl text-slate-500 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer mt-1"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
