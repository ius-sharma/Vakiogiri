"use client";

import { useState, useRef, useEffect } from "react";

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
  theme,
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdown((prev) => (prev === id ? null : id));
  };

  return (
    <header
      className={`w-full sticky top-0 z-50 transition-colors duration-200 ${className}`}
      style={{
        backgroundColor: "var(--nav-bg)",
      }}
    >
      {/* Outer shelf container with rounded bottom corners */}
      <div className="w-full rounded-b-2xl px-6 md:px-8">
        <div className="max-w-[1280px] mx-auto h-[68px] flex items-center justify-between relative">
          
          {/* ========================================================================= */}
          {/* ZONE 1: LEFT ZONE — LOGO                                                  */}
          {/* ========================================================================= */}
          <div className="flex items-center shrink-0 z-10">
            {logo.onClick ? (
              <button
                type="button"
                onClick={logo.onClick}
                className="flex items-center gap-2 text-left cursor-pointer group focus:outline-none"
              >
                {logo.icon && (
                  <span
                    className="material-symbols-outlined text-[26px] transition-transform group-hover:scale-105"
                    style={{
                      color: "var(--accent)",
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    {logo.icon}
                  </span>
                )}
                <span
                  className="font-bold text-[19px] tracking-tight transition-opacity group-hover:opacity-90"
                  style={{ color: "var(--text-primary)" }}
                >
                  {logo.name}
                </span>
              </button>
            ) : (
              <a
                href={logo.href || "/"}
                className="flex items-center gap-2 group"
              >
                {logo.icon && (
                  <span
                    className="material-symbols-outlined text-[26px] transition-transform group-hover:scale-105"
                    style={{
                      color: "var(--accent)",
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    {logo.icon}
                  </span>
                )}
                <span
                  className="font-bold text-[19px] tracking-tight transition-opacity group-hover:opacity-90"
                  style={{ color: "var(--text-primary)" }}
                >
                  {logo.name}
                </span>
              </a>
            )}
          </div>

          {/* ========================================================================= */}
          {/* ZONE 2: CENTER ZONE — NAV LINKS (PILL-SHAPED CAPSULE)                     */}
          {/* ========================================================================= */}
          <div
            ref={dropdownRef}
            className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2"
          >
            {navItems.length > 0 && (
              <nav
                className="flex items-center p-1 rounded-full border border-black/5 dark:border-white/5 transition-all"
                style={{
                  backgroundColor: "var(--nav-pill-bg)",
                }}
              >
                {navItems.map((item) => {
                  const hasDropdown = item.dropdownItems && item.dropdownItems.length > 0;
                  const isDropdownOpen = activeDropdown === item.id;

                  return (
                    <div key={item.id} className="relative flex items-center">
                      {item.onClick ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            if (hasDropdown) {
                              toggleDropdown(item.id, e);
                            } else {
                              item.onClick?.();
                              setActiveDropdown(null);
                            }
                          }}
                          className={`flex items-center gap-2 px-4 py-1.5 text-[14px] font-medium rounded-full transition-all cursor-pointer select-none ${
                            item.isActive
                              ? "bg-black/8 dark:bg-white/12 text-[var(--text-primary)] font-semibold shadow-2xs"
                              : "text-[var(--text-primary)] hover:bg-[var(--nav-pill-hover)]"
                          }`}
                        >
                          {/* Optional numbered badge inline before label */}
                          {typeof item.badgeCount === "number" && (
                            <span className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/15 text-[11px] font-bold inline-flex items-center justify-center shrink-0">
                              {item.badgeCount}
                            </span>
                          )}

                          {item.icon && (
                            <span className="material-symbols-outlined text-[16px] opacity-75">
                              {item.icon}
                            </span>
                          )}

                          <span>{item.label}</span>

                          {/* Subtle Dropdown Chevron */}
                          {hasDropdown && (
                            <span
                              className={`material-symbols-outlined text-[12px] opacity-70 transition-transform duration-200 ${
                                isDropdownOpen ? "rotate-180" : ""
                              }`}
                            >
                              expand_more
                            </span>
                          )}
                        </button>
                      ) : (
                        <a
                          href={item.href || "#"}
                          onClick={(e) => {
                            if (hasDropdown) {
                              e.preventDefault();
                              toggleDropdown(item.id, e);
                            }
                          }}
                          className={`flex items-center gap-2 px-4 py-1.5 text-[14px] font-medium rounded-full transition-all cursor-pointer select-none ${
                            item.isActive
                              ? "bg-black/8 dark:bg-white/12 text-[var(--text-primary)] font-semibold shadow-2xs"
                              : "text-[var(--text-primary)] hover:bg-[var(--nav-pill-hover)]"
                          }`}
                        >
                          {typeof item.badgeCount === "number" && (
                            <span className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/15 text-[11px] font-bold inline-flex items-center justify-center shrink-0">
                              {item.badgeCount}
                            </span>
                          )}

                          {item.icon && (
                            <span className="material-symbols-outlined text-[16px] opacity-75">
                              {item.icon}
                            </span>
                          )}

                          <span>{item.label}</span>

                          {hasDropdown && (
                            <span
                              className={`material-symbols-outlined text-[12px] opacity-70 transition-transform duration-200 ${
                                isDropdownOpen ? "rotate-180" : ""
                              }`}
                            >
                              expand_more
                            </span>
                          )}
                        </a>
                      )}

                      {/* Dropdown Menu Submenu */}
                      {hasDropdown && isDropdownOpen && (
                        <div
                          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 min-w-[200px] py-2 px-1.5 rounded-2xl border border-black/10 dark:border-white/10 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150"
                          style={{
                            backgroundColor: "var(--nav-bg)",
                          }}
                        >
                          {item.dropdownItems?.map((subItem, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => {
                                subItem.onClick?.();
                                setActiveDropdown(null);
                              }}
                              className="w-full text-left px-3.5 py-2 rounded-xl text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--nav-pill-hover)] transition-colors flex flex-col gap-0.5 cursor-pointer"
                            >
                              <span>{subItem.label}</span>
                              {subItem.description && (
                                <span className="text-[11px] opacity-60">
                                  {subItem.description}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            )}
          </div>

          {/* ========================================================================= */}
          {/* ZONE 3: RIGHT ZONE — AUTH ACTIONS & CONTROLS                              */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 z-10">
            {/* Authenticated user status badge */}
            {session && userProfile && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-black/5 dark:border-white/5"
                style={{
                  backgroundColor: "var(--nav-pill-bg)",
                  color: "var(--text-primary)",
                }}
              >
                <span className="text-amber-500">⚡</span>
                <span>
                  {userProfile.credits_remaining}/
                  {userProfile.max_daily_credits || 3} Left
                </span>
              </div>
            )}

            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-9 h-9 rounded-full flex items-center justify-center border border-black/5 dark:border-white/5 hover:bg-[var(--nav-pill-hover)] transition-colors cursor-pointer"
                style={{
                  backgroundColor: "var(--nav-pill-bg)",
                  color: "var(--text-primary)",
                }}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <span className="text-amber-400 text-sm">☀️</span>
                ) : (
                  <span className="text-[var(--accent)] text-sm">🌙</span>
                )}
              </button>
            )}

            {/* Auth Buttons: Unauthenticated vs Authenticated */}
            {session ? (
              <div className="flex items-center gap-3">
                <span
                  className="hidden xl:inline-block text-xs font-medium truncate max-w-[130px] opacity-75"
                  style={{ color: "var(--text-muted)" }}
                >
                  {session.user?.email || userProfile?.email || "User"}
                </span>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="text-[14px] font-medium hover:opacity-80 transition-opacity cursor-pointer px-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Sign out
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4 sm:gap-5">
                {/* 1. Plain text link ("Log in") — no button styling, no background */}
                {authActions.onLogin && (
                  <button
                    type="button"
                    onClick={authActions.onLogin}
                    className="hidden sm:inline-block text-[14px] font-medium hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {authActions.loginLabel || "Log in"}
                  </button>
                )}

                {/* 2. Solid pill button ("Start for free") — high contrast */}
                {authActions.onSignup && (
                  <button
                    type="button"
                    onClick={authActions.onSignup}
                    className="px-5 py-2 rounded-full font-bold text-[14px] tracking-tight transition-all active:scale-95 cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: "var(--cta-bg)",
                      color: "var(--cta-text)",
                    }}
                  >
                    {authActions.signupLabel || "Start for free"}
                  </button>
                )}
              </div>
            )}

            {/* Mobile Hamburger Toggle (< 1024px) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center border border-black/5 dark:border-white/5 hover:bg-[var(--nav-pill-hover)] transition-colors cursor-pointer"
              style={{
                backgroundColor: "var(--nav-pill-bg)",
                color: "var(--text-primary)",
              }}
              aria-label="Toggle mobile menu"
            >
              <span className="material-symbols-outlined text-[20px]">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE SLIDE-DOWN DRAWER PANEL (< 1024px)                                 */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden border-t border-black/5 dark:border-white/5 px-6 py-4 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: "var(--nav-bg)",
          }}
        >
          {/* Mobile Nav items */}
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const hasDropdown = item.dropdownItems && item.dropdownItems.length > 0;
              const isDropdownOpen = activeDropdown === item.id;

              return (
                <div key={item.id} className="flex flex-col">
                  {item.onClick ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        if (hasDropdown) {
                          toggleDropdown(item.id, e);
                        } else {
                          item.onClick?.();
                          setMobileMenuOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all text-left cursor-pointer ${
                        item.isActive
                          ? "bg-black/10 dark:bg-white/10 font-semibold"
                          : "hover:bg-[var(--nav-pill-hover)]"
                      }`}
                      style={{ color: "var(--text-primary)" }}
                    >
                      <div className="flex items-center gap-2.5">
                        {typeof item.badgeCount === "number" && (
                          <span className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/15 text-[11px] font-bold inline-flex items-center justify-center">
                            {item.badgeCount}
                          </span>
                        )}
                        {item.icon && (
                          <span className="material-symbols-outlined text-[18px] opacity-75">
                            {item.icon}
                          </span>
                        )}
                        <span>{item.label}</span>
                      </div>
                      {hasDropdown && (
                        <span
                          className={`material-symbols-outlined text-[14px] opacity-70 transition-transform ${
                            isDropdownOpen ? "rotate-180" : ""
                          }`}
                        >
                          expand_more
                        </span>
                      )}
                    </button>
                  ) : (
                    <a
                      href={item.href || "#"}
                      onClick={(e) => {
                        if (hasDropdown) {
                          e.preventDefault();
                          toggleDropdown(item.id, e);
                        } else {
                          setMobileMenuOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all text-left cursor-pointer ${
                        item.isActive
                          ? "bg-black/10 dark:bg-white/10 font-semibold"
                          : "hover:bg-[var(--nav-pill-hover)]"
                      }`}
                      style={{ color: "var(--text-primary)" }}
                    >
                      <div className="flex items-center gap-2.5">
                        {typeof item.badgeCount === "number" && (
                          <span className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/15 text-[11px] font-bold inline-flex items-center justify-center">
                            {item.badgeCount}
                          </span>
                        )}
                        {item.icon && (
                          <span className="material-symbols-outlined text-[18px] opacity-75">
                            {item.icon}
                          </span>
                        )}
                        <span>{item.label}</span>
                      </div>
                      {hasDropdown && (
                        <span
                          className={`material-symbols-outlined text-[14px] opacity-70 transition-transform ${
                            isDropdownOpen ? "rotate-180" : ""
                          }`}
                        >
                          expand_more
                        </span>
                      )}
                    </a>
                  )}

                  {/* Mobile Accordion Submenu */}
                  {hasDropdown && isDropdownOpen && (
                    <div className="pl-6 pr-2 py-1 flex flex-col gap-1">
                      {item.dropdownItems?.map((subItem, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => {
                            subItem.onClick?.();
                            setMobileMenuOpen(false);
                            setActiveDropdown(null);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[var(--text-primary)] hover:bg-[var(--nav-pill-hover)] transition-colors cursor-pointer"
                        >
                          {subItem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Auth Actions */}
          <div className="pt-3 border-t border-black/5 dark:border-white/5 flex flex-col gap-2">
            {!session && authActions.onLogin && (
              <button
                type="button"
                onClick={() => {
                  authActions.onLogin?.();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2.5 rounded-xl text-[14px] font-medium hover:bg-[var(--nav-pill-hover)] transition-colors cursor-pointer"
                style={{ color: "var(--text-primary)" }}
              >
                {authActions.loginLabel || "Log in"}
              </button>
            )}

            {session && onSignOut && (
              <button
                type="button"
                onClick={() => {
                  onSignOut();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2.5 rounded-xl text-[14px] font-medium hover:bg-[var(--nav-pill-hover)] transition-colors cursor-pointer"
                style={{ color: "var(--text-primary)" }}
              >
                Sign out ({session.user?.email || "User"})
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
