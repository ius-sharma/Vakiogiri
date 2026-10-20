"use client";

import React from "react";
import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="w-full border-t border-white/5 bg-[#030305] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-black border-[1.5px] border-[#ff7427] flex items-center justify-center shrink-0">
            <svg
              className="w-3.5 h-3.5 text-[#ff7427]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12l4-8 4 16 4-8 4 4" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white tracking-tight">
            Vakio<span className="text-[#ff7427]">AI</span>
          </span>
          <span className="text-xs text-slate-500 ml-2">
            © {new Date().getFullYear()} All rights reserved.
          </span>
        </div>

        {/* Quick Links */}
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#styles" className="hover:text-white transition-colors">
            Styles
          </a>
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
          <Link href="/login" className="hover:text-[#ff7427] transition-colors font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </footer>
  );
}
