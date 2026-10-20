"use client";

import React from "react";
import HeroSection from "./HeroSection";
import PlatformStrip from "./PlatformStrip";
import BeforeAfterSection from "./BeforeAfterSection";
import StylesGallerySection from "./StylesGallerySection";
import SpotlightClippingSection from "./SpotlightClippingSection";
import SpotlightViralitySection from "./SpotlightViralitySection";
import SpotlightSchedulerSection from "./SpotlightSchedulerSection";
import HowItWorksSection from "./HowItWorksSection";
import InteractiveFeaturesSection from "./InteractiveFeaturesSection";
import FaqSection from "./FaqSection";
import FinalCtaSection from "./FinalCtaSection";
import LandingFooter from "./LandingFooter";

interface LandingPageProps {
  onGenerate: (url: string) => void;
  onOpenAuth: (mode?: "login" | "signup") => void;
}

export default function LandingPage({ onGenerate, onOpenAuth }: LandingPageProps) {
  return (
    <div className="w-full flex flex-col items-center bg-black text-white selection:bg-[#ff7427] selection:text-white">
      {/* 1. Hero Stage */}
      <HeroSection
        onGenerate={onGenerate}
        onOpenAuth={() => onOpenAuth("signup")}
      />

      {/* 2. Multi-Platform Upload Strip */}
      <PlatformStrip />

      {/* 3. Before vs After ("Edited with love") */}
      <BeforeAfterSection />

      {/* 4. Created in Multiple Styles Gallery */}
      <StylesGallerySection />

      {/* 5. Spotlight 1: Never spend time and money on video clipping */}
      <SpotlightClippingSection />

      {/* 6. Spotlight 2: Automatically create viral worthy content */}
      <SpotlightViralitySection />

      {/* 7. Spotlight 3: Posting everyday has never been easier */}
      <SpotlightSchedulerSection />

      {/* 8. How It Works (3 Simple Steps) */}
      <HowItWorksSection />

      {/* 9. Interactive Tabbed Feature Showcase (With Fully Customizable) */}
      <InteractiveFeaturesSection />

      {/* 10. FAQ Accordion */}
      <FaqSection />

      {/* 11. Final High-Energy CTA Card */}
      <FinalCtaSection onOpenAuth={() => onOpenAuth("signup")} />

      {/* 12. Minimal Footer */}
      <LandingFooter />
    </div>
  );
}
