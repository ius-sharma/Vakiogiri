"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  // Target spherical coordinates
  targetRadius: number;
  theta: number; // Azimuth angle around Y axis
  phi: number;   // Polar angle from Y axis
  baseSpeed: number;

  // Current physics state
  radius: number;
  currentX: number;
  currentY: number;
  currentZ: number;

  // Explosion physics
  vx: number;
  vy: number;
  vz: number;

  // Appearance
  color: "orange" | "white";
  size: number;
  alpha: number;
}

interface ParticleOrbCanvasProps {
  isExploding?: boolean;
  onExplodeComplete?: () => void;
}

export default function ParticleOrbCanvas({
  isExploding = false,
  onExplodeComplete,
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

    // Create 750 Golden Orange & Pure White particles on a 3D sphere
    const count = 750;
    const particles: Particle[] = [];
    const baseOrbRadius = Math.min(width, height) * 0.28; // balanced visible sphere

    for (let i = 0; i < count; i++) {
      // Golden Spiral distribution on sphere surface
      const y = 1 - (i / (count - 1)) * 2; // -1 to 1
      const radiusAtY = Math.sqrt(1 - y * y);
      const phi = Math.acos(y);
      const theta = i * 2.399963229728653; // Golden angle in radians

      // Start particles dispersed from deep space (Reverse-Explosion Inward Assembly)
      const initialDispersal = baseOrbRadius * (2.8 + Math.random() * 2.5);

      const isOrange = Math.random() < 0.65; // 65% Golden Orange, 35% Pure White

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
        size: isOrange ? 1.4 + Math.random() * 1.4 : 1.2 + Math.random() * 1.2,
        alpha: 0.2 + Math.random() * 0.7,
      });
    }

    let rotY = 0;
    let rotX = 0.25; // slight tilt for 3D depth
    let hasTriggeredExplodeComplete = false;
    let explodeTimer = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Slow majestic rotation
      rotY += 0.0025;
      rotX += 0.0006;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const fov = 400; // 3D Camera distance

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
          // REVERSE EXPLOSION: Inward fluid lerp towards the target sphere shell
          p.radius += (p.targetRadius - p.radius) * 0.045;

          // Spherical to 3D Cartesian coordinates
          const x0 = p.radius * Math.sin(p.phi) * Math.cos(p.theta);
          const y0 = p.radius * Math.cos(p.phi);
          const z0 = p.radius * Math.sin(p.phi) * Math.sin(p.theta);

          // Apply 3D Rotation (Y and X axes)
          // Rotate around Y
          const x1 = x0 * cosY + z0 * sinY;
          const z1 = -x0 * sinY + z0 * cosY;
          // Rotate around X
          const y1 = y0 * cosX - z1 * sinX;
          const z2 = y0 * sinX + z1 * cosX;

          p.currentX = x1;
          p.currentY = y1;
          p.currentZ = z2;
        } else {
          // EXPLOSION STATE: Smoothly explode outward radially with momentum
          if (p.vx === 0 && p.vy === 0 && p.vz === 0) {
            // Calculate outward velocity unit vector
            const mag = Math.sqrt(p.currentX * p.currentX + p.currentY * p.currentY + p.currentZ * p.currentZ) || 1;
            const speed = 12 + Math.random() * 26; // High velocity burst
            p.vx = (p.currentX / mag) * speed;
            p.vy = (p.currentY / mag) * speed;
            p.vz = (p.currentZ / mag) * speed;
          }

          p.currentX += p.vx;
          p.currentY += p.vy;
          p.currentZ += p.vz;
          p.alpha = Math.max(0, p.alpha - 0.022); // Fade out smoothly during burst
        }

        // 3D Perspective Projection
        const distance = fov + p.currentZ;
        if (distance <= 0) continue;

        const scale = fov / distance;
        const screenX = centerX + p.currentX * scale;
        const screenY = centerY + p.currentY * scale;

        // Depth cueing
        const depthAlpha = Math.max(0.1, Math.min(1, ((p.currentZ + baseOrbRadius) / (baseOrbRadius * 2)))) * p.alpha;
        const dotRadius = Math.max(0.5, p.size * scale);

        ctx.beginPath();
        ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);

        if (p.color === "orange") {
          ctx.fillStyle = `rgba(255, 116, 39, ${depthAlpha})`;
          ctx.shadowColor = `rgba(255, 116, 39, ${depthAlpha * 0.6})`;
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${depthAlpha})`;
          ctx.shadowColor = `rgba(255, 255, 255, ${depthAlpha * 0.4})`;
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
  }, [onExplodeComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ display: "block" }}
    />
  );
}
