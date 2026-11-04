"use client";

import React, { useEffect, useRef } from "react";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface OrbParticle {
  // Unit vector on sphere (Fibonacci lattice)
  nx: number;
  ny: number;
  nz: number;
  theta: number;

  // Stored random unit direction for cosmic entry
  dirX: number;
  dirY: number;
  dirZ: number;
  dispersalDist: number;

  // Explosion physics
  vx: number;
  vy: number;
  vz: number;

  color: "orange" | "white";
  size: number;
  baseAlpha: number;
  harmonicPhase: number;
}

interface ParticleOrbCanvasProps {
  isExploding?: boolean;
  onExplodeComplete?: () => void;
  targetCenterRatioX?: number;
}

export default function ParticleOrbCanvas({
  isExploding = false,
  onExplodeComplete,
  targetCenterRatioX = 0.28,
}: ParticleOrbCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const explodingRef = useRef(isExploding);
  explodingRef.current = isExploding;

  useEffect(() => {
    // Disable heavy 3D particle canvas on mobile screens (< 768px)
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    // Mouse tracking for subtle, per-dot magnetic hover pull
    let mouseX = -9999;
    let mouseY = -9999;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    const handleMouseLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const count = 850;
    const particles: OrbParticle[] = [];

    // Base radius: Majestic 3D scale
    const baseRadius = Math.max(140, Math.min(window.innerWidth, window.innerHeight) * 0.22);
    const maxDimension = Math.max(window.innerWidth, window.innerHeight);

    // ==============================================================
    // FIBONACCI SPHERE LATTICE INITIALIZATION
    // ==============================================================
    for (let i = 0; i < count; i++) {
      const ny = 1 - (i / (count - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - ny * ny));
      const theta = i * 2.399963229728653; // Golden angle

      const nx = radiusAtY * Math.cos(theta);
      const nz = radiusAtY * Math.sin(theta);

      // Random unit vector for cosmic entry from outer space
      const u = Math.random();
      const v = Math.random();
      const rTheta = u * 2 * Math.PI;
      const rPhi = Math.acos(2 * v - 1);
      const dirX = Math.sin(rPhi) * Math.cos(rTheta);
      const dirY = Math.cos(rPhi);
      const dirZ = Math.sin(rPhi) * Math.sin(rTheta);
      const dispersalDist = maxDimension * (0.6 + Math.random() * 0.4);

      const isOrange = Math.random() < 0.65;

      particles.push({
        nx,
        ny,
        nz,
        theta,

        dirX,
        dirY,
        dirZ,
        dispersalDist,

        vx: 0,
        vy: 0,
        vz: 0,

        color: isOrange ? "orange" : "white",
        size: isOrange ? 0.90 + Math.random() * 0.38 : 0.75 + Math.random() * 0.32,
        baseAlpha: 0.70 + Math.random() * 0.30,
        harmonicPhase: Math.random() * Math.PI * 2,
      });
    }

    // Steady, rock-solid rotation parameters (no wobbling!)
    let rotY = 0;
    const fixedTilt = 0.23; // ~13.2 degree fixed aesthetic polar tilt
    const cosTilt = Math.cos(fixedTilt);
    const sinTilt = Math.sin(fixedTilt);

    let livingTime = 0;
    let entranceProgress = 0;
    let explodeTimer = 0;
    let hasTriggeredExplodeComplete = false;

    const currentPositions: Vec3[] = particles.map(() => ({ x: 0, y: 0, z: 0 }));

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      const isMobile = width < 768;
      // Fixed, stable center coordinate (ZERO shaking or wobbling)
      const centerX = isMobile ? width / 2 : width * targetCenterRatioX;
      const centerY = isMobile ? height * 0.28 : height / 2;

      // Clean, constant polar rotation around Y-axis
      rotY += 0.0020;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      livingTime += 0.018;

      const fov = 460;
      const isCurrentlyExploding = explodingRef.current;

      if (entranceProgress < 1) {
        entranceProgress += (1 - entranceProgress) * 0.045;
      }

      if (isCurrentlyExploding) {
        explodeTimer++;
        if (explodeTimer > 50 && !hasTriggeredExplodeComplete) {
          hasTriggeredExplodeComplete = true;
          onExplodeComplete?.();
        }
      }

      // Arrays to store screen projection for subtle constellation links
      const projectedScreenX: number[] = new Array(count);
      const projectedScreenY: number[] = new Array(count);
      const projectedDepthAlpha: number[] = new Array(count);

      for (let i = 0; i < count; i++) {
        const p = particles[i];
        const pos = currentPositions[i];

        if (!isCurrentlyExploding) {
          // Living harmonic surface pulse (subtle frequency ripples across sphere)
          const harmonic = Math.sin(p.ny * 3.5 + livingTime) * Math.cos(p.theta * 2 + livingTime * 0.7);
          const currentRadius = baseRadius * (1 + harmonic * 0.028);

          const targetX = p.nx * currentRadius;
          const targetY = p.ny * currentRadius;
          const targetZ = p.nz * currentRadius;

          // Cosmic Dispersal -> Target Lerp:
          const currentDist = p.dispersalDist * (1 - entranceProgress);
          const currentBaseX = targetX + p.dirX * currentDist;
          const currentBaseY = targetY + p.dirY * currentDist;
          const currentBaseZ = targetZ + p.dirZ * currentDist;

          // Polar rotation followed by fixed aesthetic tilt
          const xRot = currentBaseX * cosY + currentBaseZ * sinY;
          const zRot = -currentBaseX * sinY + currentBaseZ * cosY;
          const yTilted = currentBaseY * cosTilt - zRot * sinTilt;
          const zTilted = currentBaseY * sinTilt + zRot * cosTilt;

          pos.x = xRot;
          pos.y = yTilted;
          pos.z = zTilted;
        } else {
          if (p.vx === 0 && p.vy === 0 && p.vz === 0) {
            const mag = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) || 1;
            const speed = 16 + Math.random() * 32;
            p.vx = (pos.x / mag) * speed;
            p.vy = (pos.y / mag) * speed;
            p.vz = (pos.z / mag) * speed;
          }
          pos.x += p.vx;
          pos.y += p.vy;
          pos.z += p.vz;
          p.baseAlpha = Math.max(0, p.baseAlpha - 0.02);
        }

        // Perspective projection
        const scale = fov / (fov + Math.max(-300, Math.min(300, pos.z)));
        let screenX = centerX + pos.x * scale;
        let screenY = centerY + pos.y * scale;

        // Subtle, gentle magnetic hover effect directly on individual dots
        let hoverAlphaBoost = 0;
        if (!isMobile && mouseX > -1000 && !isCurrentlyExploding) {
          const mdx = mouseX - screenX;
          const mdy = mouseY - screenY;
          const dotDist = Math.sqrt(mdx * mdx + mdy * mdy);
          const hoverRadius = 85;

          if (dotDist < hoverRadius && dotDist > 0.1) {
            const pullFactor = Math.pow(1 - dotDist / hoverRadius, 2);
            const pullDistance = pullFactor * 13; // Max 13px subtle magnetic attraction
            screenX += (mdx / dotDist) * pullDistance;
            screenY += (mdy / dotDist) * pullDistance;
            hoverAlphaBoost = pullFactor * 0.35;
          }
        }

        const depthAlpha =
          Math.min(1, Math.max(0.38, (pos.z + baseRadius) / (baseRadius * 2))) * p.baseAlpha + hoverAlphaBoost;
        const dotRadius = Math.max(0.65, p.size * scale);

        projectedScreenX[i] = screenX;
        projectedScreenY[i] = screenY;
        projectedDepthAlpha[i] = depthAlpha;

        ctx.beginPath();
        ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);

        if (p.color === "orange") {
          ctx.fillStyle = `rgba(255, 116, 39, ${Math.min(1, depthAlpha)})`;
          ctx.shadowColor = `rgba(255, 116, 39, ${depthAlpha * 0.75})`;
          ctx.shadowBlur = 4;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, depthAlpha)})`;
          ctx.shadowColor = `rgba(255, 255, 255, ${depthAlpha * 0.50})`;
          ctx.shadowBlur = 3;
        }

        ctx.fill();
      }

      ctx.shadowBlur = 0;

      // Draw faint, delicate constellation filament lines between closely neighboring front particles
      if (entranceProgress > 0.85 && !isCurrentlyExploding) {
        ctx.lineWidth = 0.5;
        for (let i = 0; i < count; i += 3) {
          const depthA = projectedDepthAlpha[i];
          if (depthA < 0.65) continue; // Only front-facing hemisphere

          // Check consecutive neighbors in lattice
          for (let step = 1; step <= 2; step++) {
            const j = (i + step) % count;
            const depthB = projectedDepthAlpha[j];
            if (depthB < 0.65) continue;

            const dx = projectedScreenX[i] - projectedScreenX[j];
            const dy = projectedScreenY[i] - projectedScreenY[j];
            const distSq = dx * dx + dy * dy;

            if (distSq < 480) { // ~22px screen proximity
              const lineAlpha = (1 - distSq / 480) * 0.12 * Math.min(depthA, depthB);
              ctx.strokeStyle = `rgba(255, 116, 39, ${lineAlpha})`;
              ctx.beginPath();
              ctx.moveTo(projectedScreenX[i], projectedScreenY[i]);
              ctx.lineTo(projectedScreenX[j], projectedScreenY[j]);
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onExplodeComplete, targetCenterRatioX]);

  return (
    <canvas
      ref={canvasRef}
      className="hidden md:block fixed inset-0 w-full h-full pointer-events-none z-20"
    />
  );
}
