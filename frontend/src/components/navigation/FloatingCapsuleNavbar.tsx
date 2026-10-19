"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, Sparkles, Sun, Moon } from "lucide-react";

export interface CapsuleNavItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export interface FloatingCapsuleNavbarProps {
  navItems?: CapsuleNavItem[];
  onOpenAuth?: (mode: "login" | "signup") => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  className?: string;
}

export default function FloatingCapsuleNavbar({
  navItems = [
    { id: "studio", label: "Studio" },
    { id: "features", label: "Features" },
    { id: "pricing", label: "Pricing" },
    { id: "faq", label: "FAQ" },
  ],
  onOpenAuth,
  theme = "dark",
  onToggleTheme,
  className = "",
}: FloatingCapsuleNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`fixed top-5 left-0 right-0 z-50 flex flex-col items-center px-4 pointer-events-none ${className}`}>
      {/* The Floating Pill Capsule */}
      <nav
        aria-label="Main Navigation"
        className="pointer-events-auto h-[54px] max-w-fit px-2 py-1.5 rounded-full bg-[#161616]/95 border border-white/[0.12] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex items-center gap-1 sm:gap-2 transition-all duration-300 hover:border-white/20"
      >
        {/* Left Side: Circular Logo Pill */}
        <Link
          href="/"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black border-[1.5px] border-[#ff7427] shrink-0 overflow-hidden cursor-pointer focus:outline-none transition-none shadow-none"
          title="Vakiogiri AI"
        >
          <Image
            src="/brand_logo.png?v=3"
            alt="Vakiogiri Brand Logo"
            width={24}
            height={24}
            unoptimized={true}
            className="w-5 h-5 object-contain transition-none"
            priority
          />
        </Link>

        {/* Center: Navigation Links */}
        <div className="hidden md:flex items-center gap-1 px-3">
          {navItems.map((item) => {
            if (item.onClick) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium tracking-normal transition-colors cursor-pointer select-none ${
                    item.isActive
                      ? "text-white font-semibold"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            }

            return (
              <a
                key={item.id}
                href={item.href || `#${item.id}`}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium tracking-normal transition-colors cursor-pointer select-none ${
                  item.isActive
                    ? "text-white font-semibold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        {/* Right Side: Log in link + White Inset CTA Capsule */}
        <div className="flex items-center gap-1.5 pl-2">
          {/* Subtle Login Trigger */}
          <button
            type="button"
            onClick={() => onOpenAuth?.("login")}
            className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Log in
          </button>

          {/* White Inset Pill CTA */}
          <button
            type="button"
            onClick={() => onOpenAuth?.("signup")}
            className="h-10 px-5 rounded-full bg-white hover:bg-slate-100 text-black font-bold text-xs tracking-tight transition-all duration-200 cursor-pointer shadow-sm hover:shadow active:scale-95 flex items-center justify-center shrink-0"
          >
            <span>Start Free</span>
          </button>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-full bg-white/[0.06] text-white flex items-center justify-center ml-1 cursor-pointer focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto mt-2 w-full max-w-xs p-3 rounded-2xl bg-[#141414]/98 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 md:hidden">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                item.onClick?.();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 mt-1 border-t border-white/[0.08] flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenAuth?.("login");
                setMobileMenuOpen(false);
              }}
              className="flex-1 py-2 text-center text-xs font-semibold text-slate-300 hover:text-white"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenAuth?.("signup");
                setMobileMenuOpen(false);
              }}
              className="flex-1 py-2 rounded-full bg-white text-black text-xs font-bold text-center"
            >
              Start Free
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
