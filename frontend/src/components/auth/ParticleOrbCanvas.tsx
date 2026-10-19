"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  targetRadius: number;
  theta: number; // Azimuth angle around Y axis
  phi: number;   // Polar angle from Y axis
  baseSpeed: number;

  radius: number;
  currentX: number;
  currentY: number;
  currentZ: number;

  vx: number;
  vy: number;
  vz: number;

  color: "orange" | "white";
  size: number;
  alpha: number;
}

interface ParticleOrbCanvasProps {
  isExploding?: boolean;
  onExplodeComplete?: () => void;
  // Target center position on screen (e.g. left side center)
  targetCenterRatioX?: number; // 0.28 for left column on desktop, 0.5 on mobile
}

export default function ParticleOrbCanvas({
  isExploding = false,
  onExplodeComplete,
  targetCenterRatioX = 0.30,
}: ParticleOrbCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const explodingRef = useRef(isExploding);
  explodingRef.current = isExploding;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // 850 Golden Orange & White particles
    const count = 850;
    const particles: Particle[] = [];
    const baseOrbRadius = Math.min(width, height) * 0.22; // Balanced elegant orb size

    for (let i = 0; i < count; i++) {
      // Golden Spiral distribution on sphere surface
      const y = 1 - (i / (count - 1)) * 2;
      const phi = Math.acos(y);
      const theta = i * 2.399963229728653; // Golden angle

      // FULL SCREEN COSMIC DISPERSAL:
      // Particles start completely outside from the far edges of the entire window
      const maxScreenDimension = Math.max(width, height);
      const initialDispersal = maxScreenDimension * (0.8 + Math.random() * 0.7);

      const isOrange = Math.random() < 0.65;

      particles.push({
        targetRadius: baseOrbRadius + (Math.random() - 0.5) * 16,
        theta,
        phi,
        baseSpeed: 0.003 + Math.random() * 0.002,

        radius: initialDispersal,
        currentX: 0,
        currentY: 0,
        currentZ: 0,

        vx: 0,
        vy: 0,
        vz: 0,

        color: isOrange ? "orange" : "white",
        size: isOrange ? 1.4 + Math.random() * 1.5 : 1.1 + Math.random() * 1.2,
        alpha: 0.2 + Math.random() * 0.8,
      });
    }

    let rotY = 0;
    let rotX = 0.25;
    let hasTriggeredExplodeComplete = false;
    let explodeTimer = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // On desktop, the orb sits smoothly on the left side (e.g. 28% - 30% of screen width)
      // On mobile screens (< 768px), it centers (50% of screen width)
      const isMobile = width < 768;
      const centerX = isMobile ? width / 2 : width * targetCenterRatioX;
      const centerY = isMobile ? height * 0.28 : height / 2;

      // Slow majestic 3D rotation
      rotY += 0.0025;
      rotX += 0.0006;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const fov = 420;
      const isCurrentlyExploding = explodingRef.current;

      if (isCurrentlyExploding) {
        explodeTimer++;
        if (explodeTimer > 50 && !hasTriggeredExplodeComplete) {
          hasTriggeredExplodeComplete = true;
          onExplodeComplete?.();
        }
      }

      for (let i = 0; i < count; i++) {
        const p = particles[i];

        if (!isCurrentlyExploding) {
          // REVERSE EXPLOSION: Inward fluid lerp from entire screen edges into the orb sphere shell
          p.radius += (p.targetRadius - p.radius) * 0.042;

          // Spherical to 3D Cartesian coordinates
          const x0 = p.radius * Math.sin(p.phi) * Math.cos(p.theta);
          const y0 = p.radius * Math.cos(p.phi);
          const z0 = p.radius * Math.sin(p.phi) * Math.sin(p.theta);

          // Rotate around Y and X axes
          const x1 = x0 * cosY + z0 * sinY;
          const z1 = -x0 * sinY + z0 * cosY;
          const y1 = y0 * cosX - z1 * sinX;
          const z2 = y0 * sinX + z1 * cosX;

          p.currentX = x1;
          p.currentY = y1;
          p.currentZ = z2;
        } else {
          // EXPLOSION STATE: Smoothly explode outward radially across the entire screen
          if (p.vx === 0 && p.vy === 0 && p.vz === 0) {
            const mag = Math.sqrt(p.currentX * p.currentX + p.currentY * p.currentY + p.currentZ * p.currentZ) || 1;
            const speed = 16 + Math.random() * 32;
            p.vx = (p.currentX / mag) * speed;
            p.vy = (p.currentY / mag) * speed;
            p.vz = (p.currentZ / mag) * speed;
          }

          p.currentX += p.vx;
          p.currentY += p.vy;
          p.currentZ += p.vz;
          p.alpha = Math.max(0, p.alpha - 0.02);
        }

        // Perspective projection
        const distance = fov + p.currentZ;
        if (distance <= 0) continue;

        const scale = fov / distance;
        const screenX = centerX + p.currentX * scale;
        const screenY = centerY + p.currentY * scale;

        // Depth cueing
        const depthAlpha = Math.max(0.12, Math.min(1, (p.currentZ + baseOrbRadius) / (baseOrbRadius * 2))) * p.alpha;
        const dotRadius = Math.max(0.6, p.size * scale);

        ctx.beginPath();
        ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);

        if (p.color === "orange") {
          ctx.fillStyle = `rgba(255, 116, 39, ${depthAlpha})`;
          ctx.shadowColor = `rgba(255, 116, 39, ${depthAlpha * 0.65})`;
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${depthAlpha})`;
          ctx.shadowColor = `rgba(255, 255, 255, ${depthAlpha * 0.45})`;
          ctx.shadowBlur = 4;
        }

        ctx.fill();
      }

      ctx.shadowBlur = 0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onExplodeComplete, targetCenterRatioX]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ display: "block" }}
    />
  );
}
