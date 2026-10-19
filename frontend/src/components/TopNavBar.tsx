"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Scissors,
  Film,
  Video,
  Gamepad2,
  Library,
  Sun,
  Moon,
  Zap,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
} from "lucide-react";

export interface NavDropdownItem {
  label: string;
  href?: string;
  onClick?: () => void;
  description?: string;
}

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: string;
  badgeCount?: number;
  dropdownItems?: NavDropdownItem[];
  isActive?: boolean;
}

export interface TopNavBarProps {
  logo?: {
    name?: string;
    icon?: string;
    href?: string;
    onClick?: () => void;
  };
  navItems?: NavItem[];
  authActions?: {
    loginLabel?: string;
    onLogin?: () => void;
    signupLabel?: string;
    onSignup?: () => void;
  };
  session?: any;
  userProfile?: {
    email?: string;
    credits_remaining?: number;
    max_daily_credits?: number;
  };
  onSignOut?: () => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  className?: string;
}

export default function TopNavBar({
  logo = {
    name: "Vakiogiri",
    icon: "auto_awesome",
  },
  navItems = [],
  authActions = {
    loginLabel: "Log in",
    signupLabel: "Start for free",
  },
  session,
  userProfile,
  onSignOut,
  theme = "dark",
  onToggleTheme,
  className = "",
}: TopNavBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setActiveDropdown(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getNavIcon = (id: string) => {
    if (id === "studio") return <Scissors className="w-4 h-4" />;
    if (id === "stream") return <Gamepad2 className="w-4 h-4" />;
    if (id === "history") return <Library className="w-4 h-4" />;
    return <Film className="w-4 h-4" />;
  };

  return (
    <header className={`w-full sticky top-0 z-40 studio-glass border-b border-white/8 transition-colors duration-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          {logo.onClick ? (
            <button
              type="button"
              onClick={logo.onClick}
              className="flex items-center gap-2.5 cursor-pointer group focus:outline-none"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/30 group-hover:scale-105 group-hover:ring-blue-400 transition-all flex items-center justify-center bg-black">
                <Image
                  src="/logo.png"
                  alt="Vakiogiri AI Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-blue-400 transition-colors">
                {logo.name || "Vakiogiri"}
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                AI Studio
              </span>
            </button>
          ) : (
            <Link
              href={logo.href || "/"}
              className="flex items-center gap-2.5 group focus:outline-none"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/30 group-hover:scale-105 group-hover:ring-blue-400 transition-all flex items-center justify-center bg-black">
                <Image
                  src="/logo.png"
                  alt="Vakiogiri AI Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-blue-400 transition-colors">
                {logo.name || "Vakiogiri"}
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                AI Studio
              </span>
            </Link>
          )}
        </div>

        {/* Center Pill Navigation */}
        <nav
          ref={dropdownRef}
          className="hidden md:flex items-center p-1 rounded-full bg-white/[0.04] border border-white/8 backdrop-blur-md"
        >
          {navItems.map((item) => {
            const isActive = item.isActive;
            const content = (
              <>
                {getNavIcon(item.id)}
                <span>{item.label}</span>
                {typeof item.badgeCount === "number" && item.badgeCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-300 text-[10px] font-bold flex items-center justify-center">
                    {item.badgeCount}
                  </span>
                )}
              </>
            );

            if (item.onClick) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/40 font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href || "#"}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/40 font-bold"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Right Zone: Credits, Theme, Auth */}
        <div className="flex items-center gap-3">
          
          {/* Credits Counter Pill */}
          {userProfile && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/8 text-xs font-mono font-bold text-slate-300">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              <span>
                {userProfile.credits_remaining ?? 3}/
                {userProfile.max_daily_credits || 3} Clips
              </span>
            </div>
          )}

          {/* Theme Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>
          )}

          {/* Auth Actions */}
          {session ? (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] text-xs font-medium text-slate-300 border border-white/8">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate max-w-[120px]">{session.user?.email || "User"}</span>
              </div>

              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {authActions.onLogin && (
                <button
                  type="button"
                  onClick={authActions.onLogin}
                  className="hidden sm:inline-block px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {authActions.loginLabel || "Log in"}
                </button>
              )}

              {authActions.onSignup && (
                <button
                  type="button"
                  onClick={authActions.onSignup}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all cursor-pointer shadow-md shadow-blue-500/30 active:scale-95"
                >
                  {authActions.signupLabel || "Start for free"}
                </button>
              )}
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-xl bg-white/[0.04] border border-white/8 text-white flex items-center justify-center cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/8 px-4 py-4 flex flex-col gap-2 bg-black/95 backdrop-blur-2xl animate-in slide-in-from-top-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                item.onClick?.();
                setMobileMenuOpen(false);
              }}
              className={`flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition-all ${
                item.isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {getNavIcon(item.id)}
                <span>{item.label}</span>
              </div>
              {typeof item.badgeCount === "number" && item.badgeCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white/20 text-white text-xs flex items-center justify-center">
                  {item.badgeCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
