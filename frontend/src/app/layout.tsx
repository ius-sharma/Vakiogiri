import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { UIFeedbackProvider } from "@/components/UIFeedback";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vakiogiri AI — Viral Short-Form Video Studio",
  description: "Extract viral, high-retention vertical clips from long YouTube videos and livestreams with audience heatmap and speech energy AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} font-sans min-h-full flex flex-col bg-black text-white`}
      >
        <UIFeedbackProvider>
          {children}
        </UIFeedbackProvider>
      </body>
    </html>
  );
}
