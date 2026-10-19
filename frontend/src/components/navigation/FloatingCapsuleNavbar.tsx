"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";

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
    { id: "library", label: "Library" },
  ],
  onOpenAuth,
  className = "",
}: FloatingCapsuleNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Detect scroll position to trigger morphing into full-width sticky navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile drawer on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out flex flex-col items-center ${
        isScrolled
          ? "w-full bg-black/95 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.9)] py-0 px-0 pointer-events-auto border-none"
          : "pt-4 sm:pt-6 px-3 sm:px-6 pointer-events-none border-none"
      } ${className}`}
    >
      {/* ============================================================== */}
      {/* DESKTOP & TABLET: Morphing Capsule -> Full Header               */}
      {/* ============================================================== */}
      <nav
        aria-label="Main Navigation"
        className={`pointer-events-auto hidden md:flex items-center justify-between transition-all duration-500 ease-out ${
          isScrolled
            ? "w-full max-w-7xl h-[64px] px-6 lg:px-8 rounded-none bg-transparent border-0 shadow-none"
            : "w-full max-w-4xl lg:max-w-5xl h-[58px] px-3 py-2 rounded-full bg-[#111111]/95 border border-white/[0.12] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] hover:border-white/25"
        }`}
      >
        {/* Left Section: Circular Brand Badge + Brand Title */}
        <Link
          href="/"
          className="flex items-center gap-3 pl-1 pr-3 py-1 group cursor-pointer focus:outline-none"
          title="Vakiogiri AI"
        >
          <div className="w-10 h-10 rounded-full bg-black border-[1.5px] border-[#ff7427] flex items-center justify-center shrink-0 overflow-hidden shadow-none transition-none">
            <Image
              src="/brand_logo.png?v=3"
              alt="Vakiogiri Brand Logo"
              width={26}
              height={26}
              unoptimized={true}
              className="w-5 h-5 object-contain transition-none"
              priority
            />
          </div>
          <span className="font-bold text-base tracking-tight text-white group-hover:text-[#ff7427] transition-colors">
            Vakiogiri
          </span>
        </Link>

        {/* Center Section: Balanced, Generously Spaced Nav Links */}
        <div className="flex items-center gap-1 lg:gap-3 px-4">
          {navItems.map((item) => {
            const isActive = item.isActive;
            if (item.onClick) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`px-4 py-2 rounded-full text-sm font-medium tracking-normal transition-all duration-200 cursor-pointer select-none ${
                    isActive
                      ? "text-white font-semibold bg-white/[0.08]"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.04]"
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
                className={`px-4 py-2 rounded-full text-sm font-medium tracking-normal transition-all duration-200 cursor-pointer select-none ${
                  isActive
                    ? "text-white font-semibold bg-white/[0.08]"
                    : "text-slate-300 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        {/* Right Section: Log In Trigger + Inset Pure White Capsule */}
        <div className="flex items-center gap-3 pl-2 pr-1">
          <button
            type="button"
            onClick={() => onOpenAuth?.("login")}
            className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Log in
          </button>

          {/* Inset White Pill CTA */}
          <button
            type="button"
            onClick={() => onOpenAuth?.("signup")}
            className="h-10 px-5 rounded-full bg-white hover:bg-slate-100 text-black font-bold text-xs tracking-tight transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <span>Start Free</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      </nav>

      {/* ============================================================== */}
      {/* MOBILE: Morphing Floating Island -> Fixed Sticky Top Bar        */}
      {/* ============================================================== */}
      <nav
        aria-label="Mobile Navigation"
        className={`pointer-events-auto md:hidden flex items-center justify-between w-full transition-all duration-500 ease-out ${
          isScrolled
            ? "h-[56px] px-4 rounded-none bg-transparent border-0 shadow-none"
            : "h-[52px] px-3 py-1.5 rounded-full bg-[#111111]/95 border border-white/[0.14] backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.85)]"
        }`}
      >
        {/* Left: Logo & Brand Name */}
        <Link
          href="/"
          className="flex items-center gap-2.5 pl-1 cursor-pointer focus:outline-none"
        >
          <div className="w-9 h-9 rounded-full bg-black border-[1.5px] border-[#ff7427] flex items-center justify-center shrink-0 overflow-hidden shadow-none transition-none">
            <Image
              src="/brand_logo.png?v=3"
              alt="Vakiogiri Brand Logo"
              width={22}
              height={22}
              unoptimized={true}
              className="w-4 h-4 object-contain transition-none"
              priority
            />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            Vakiogiri
          </span>
        </Link>

        {/* Right: Quick Action Pill + Hamburger Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenAuth?.("signup")}
            className="h-8 px-3.5 rounded-full bg-white hover:bg-slate-100 text-black font-bold text-[11px] tracking-tight transition-all active:scale-95 flex items-center justify-center shadow-sm"
          >
            Start Free
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-white flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* ============================================================== */}
      {/* MOBILE EXPANDED DRAWER: Smooth Slide-down Island Sheet         */}
      {/* ============================================================== */}
      {mobileMenuOpen && (
        <div className={`pointer-events-auto md:hidden w-full transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
          isScrolled 
            ? "border-t border-white/[0.08] bg-black/98 px-5 py-4 flex flex-col gap-2" 
            : "mt-2 px-4 py-4 rounded-3xl bg-[#141414]/98 border border-white/12 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.9)] flex flex-col gap-2"
        }`}>
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = item.isActive;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.onClick?.();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? "bg-white/[0.1] text-[#ff7427]"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff7427]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-3 mt-1 border-t border-white/[0.08] flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenAuth?.("login");
                setMobileMenuOpen(false);
              }}
              className="flex-1 py-3 rounded-2xl text-center text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenAuth?.("signup");
                setMobileMenuOpen(false);
              }}
              className="flex-1 py-3 rounded-2xl bg-white hover:bg-slate-100 text-black text-xs font-bold text-center transition-all cursor-pointer shadow-md"
            >
              Start Free
            </button>
          </div>
        </div>
      )}

    </header>
  );
}
