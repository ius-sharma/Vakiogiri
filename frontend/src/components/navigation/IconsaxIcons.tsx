import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

// 1. Home / Studio Icon (Exact Iconsax squircle with smile curve)
export function IconsaxHome({ className = "w-5 h-5", size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4.5 10.5C4.5 7.8 6.8 5.5 9.5 5.2L11.2 5.05C11.73 5.01 12.27 5.01 12.8 5.05L14.5 5.2C17.2 5.5 19.5 7.8 19.5 10.5V15.5C19.5 18.5 17 21 14 21H10C7 21 4.5 18.5 4.5 15.5V10.5Z" />
      <path d="M9.5 13.5C10.3 14.5 11.1 15 12 15C12.9 15 13.7 14.5 14.5 13.5" />
    </svg>
  );
}

// 2. Projects / Briefcase Icon (Exact Iconsax briefcase with clasp)
export function IconsaxProjects({ className = "w-5 h-5", size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3.5" y="7" width="17" height="13.5" rx="5" />
      <path d="M8.5 7V5.5C8.5 4.12 9.62 3 11 3H13C14.38 3 15.5 4.12 15.5 5.5V7" />
      <path d="M10.5 12.5H13.5" />
      <path d="M3.5 11H20.5" strokeOpacity="0.4" />
    </svg>
  );
}

// 3. Messages / Chat Icon (Exact Iconsax speech bubble with dot)
export function IconsaxMessages({ className = "w-5 h-5", size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 3.5C18.76 3.5 21 5.74 21 8.5C21 10.15 20.2 11.61 18.96 12.51C18.66 12.73 18.5 13.08 18.55 13.44L18.95 16.27C19.06 17.06 18.23 17.65 17.53 17.27L14.28 15.52C13.98 15.36 13.63 15.34 13.31 15.42C12.56 15.61 11.78 15.71 11 15.71C5.48 15.71 3 13.23 3 7.71C3 4.5 5.5 3.5 11 3.5H16Z" />
      <circle cx="16" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

// 4. Calendar Icon (Exact Iconsax rounded calendar with 4 date dots)
export function IconsaxCalendar({ className = "w-5 h-5", size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3.5" y="4.5" width="17" height="16.5" rx="5" />
      <path d="M3.5 9.5H20.5" strokeOpacity="0.4" />
      <path d="M8 2.5V5.5" />
      <path d="M16 2.5V5.5" />
      <circle cx="8.5" cy="13.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="13.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="17" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="17" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

// 5. Analytics Icon (Exact Iconsax circle with 3 vertical bars)
export function IconsaxAnalytics({ className = "w-5 h-5", size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5V12" />
      <path d="M12 14.5V9.5" />
      <path d="M15.5 14.5V11" />
    </svg>
  );
}

// 6. Archive / Folder Icon (Exact Iconsax rounded folder)
export function IconsaxArchive({ className = "w-5 h-5", size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3.5 8.5C3.5 6.5 5 5 7 5H9.5C10.5 5 11.2 5.5 11.8 6.2L12.7 7.3C13.2 7.8 13.7 8.2 14.5 8.2H17C19 8.2 20.5 9.7 20.5 11.7V15.5C20.5 18 18.5 20 16 20H8C5.5 20 3.5 18 3.5 15.5V8.5Z" />
    </svg>
  );
}

// 7. Account / Profile Icon (Exact Iconsax circle with user outline)
export function IconsaxAccount({ className = "w-5 h-5", size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="9.5" r="2.8" />
      <path d="M6.8 17.5C7.8 15.4 9.8 14.2 12 14.2C14.2 14.2 16.2 15.4 17.2 17.5" />
    </svg>
  );
}

// 8. Settings Icon (Exact Iconsax 8-lobed flower gear)
export function IconsaxSettings({ className = "w-5 h-5", size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" />
      <path d="M18.8 9.5C18.4 8.7 18.6 7.7 19.3 7.1C19.9 6.6 20 5.7 19.6 5.1L18.9 4.4C18.3 3.8 17.4 3.9 16.9 4.5C16.3 5.2 15.3 5.4 14.5 5C13.7 4.6 13.2 3.8 13.3 2.9C13.4 2.1 12.8 1.5 12 1.5H11C10.2 1.5 9.6 2.1 9.7 2.9C9.8 3.8 9.3 4.6 8.5 5C7.7 5.4 6.7 5.2 6.1 4.5C5.6 3.9 4.7 3.8 4.1 4.4L3.4 5.1C3 5.7 3.1 6.6 3.7 7.1C4.4 7.7 4.6 8.7 4.2 9.5C3.8 10.3 3 10.8 2.1 10.7C1.3 10.6 0.7 11.2 0.7 12V13C0.7 13.8 1.3 14.4 2.1 14.3C3 14.2 3.8 14.7 4.2 15.5C4.6 16.3 4.4 17.3 3.7 17.9C3.1 18.4 3 19.3 3.4 19.9L4.1 20.6C4.7 21.2 5.6 21.1 6.1 20.5C6.7 19.8 7.7 19.6 8.5 20C9.3 20.4 9.8 21.2 9.7 22.1C9.6 22.9 10.2 23.5 11 23.5H12C12.8 23.5 13.4 22.9 13.3 22.1C13.2 21.2 13.7 20.4 14.5 20C15.3 19.6 16.3 19.8 16.9 20.5C17.4 21.1 18.3 21.2 18.9 20.6L19.6 19.9C20 19.3 19.9 18.4 19.3 17.9C18.6 17.3 18.4 16.3 18.8 15.5C19.2 14.7 20 14.2 20.9 14.3C21.7 14.4 22.3 13.8 22.3 13V12C22.3 11.2 21.7 10.6 20.9 10.7C20 10.8 19.2 10.3 18.8 9.5Z" />
    </svg>
  );
}
