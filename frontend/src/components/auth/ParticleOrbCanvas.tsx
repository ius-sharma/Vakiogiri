"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  // Target position on 3D sphere
  targetX: number;
  targetY: number;
  targetZ: number;

  // Initial random position from 3D spherical cloud
  startX: number;
  startY: number;
  startZ: number;

  // Current position
  x: number;
  y: number;
  z: number;

  // Explosion velocity
  vx: number;
  vy: number;
  vz: number;

  color: "orange" | "white";
  size: number;
  alpha: number;
  delay: number; // staggered entrance for smooth spherical wave
}

interface ParticleOrbCanvasProps {
  isExploding?: boolean;
  onExplodeComplete?: () => void;
  className?: string;
}

export default function ParticleOrbCanvas({
  isExploding = false,
  onExplodeComplete,
  className = "",
}: ParticleOrbCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const explodingRef = useRef(isExploding);
  explodingRef.current = isExploding;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = container.clientWidth || 500;
    let height = container.clientHeight || 500;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = container.clientWidth || 500;
      height = container.clientHeight || 500;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // 800 Golden Orange & White particles
    const count = 800;
    const particles: Particle[] = [];
    const sphereRadius = Math.min(width, height) * 0.32;

    for (let i = 0; i < count; i++) {
      // 1. Target on Sphere using Fibonacci/Golden Lattice (pure smooth sphere distribution)
      const y = 1 - (i / (count - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = i * 2.399963229728653; // Golden angle

      const targetX = sphereRadius * radiusAtY * Math.cos(theta);
      const targetY = sphereRadius * y;
      const targetZ = sphereRadius * radiusAtY * Math.sin(theta);

      // 2. Initial Dispersal from a True 3D Spherical Halo (NOT a box or square)
      // We pick random unit vector * dispersed spherical distance
      const u = Math.random();
      const v = Math.random();
      const randomTheta = u * 2 * Math.PI;
      const randomPhi = Math.acos(2 * v - 1);
      const randomDist = sphereRadius * (2.2 + Math.random() * 1.8);

      const startX = randomDist * Math.sin(randomPhi) * Math.cos(randomTheta);
      const startY = randomDist * Math.cos(randomPhi);
      const startZ = randomDist * Math.sin(randomPhi) * Math.sin(randomTheta);

      const isOrange = Math.random() < 0.65;

      particles.push({
        targetX,
        targetY,
        targetZ,

        startX,
        startY,
        startZ,

        x: startX,
        y: startY,
        z: startZ,

        vx: 0,
        vy: 0,
        vz: 0,

        color: isOrange ? "orange" : "white",
        size: isOrange ? 1.4 + Math.random() * 1.5 : 1.1 + Math.random() * 1.2,
        alpha: 0.2 + Math.random() * 0.8,
        delay: Math.random() * 0.2, // subtle organic variation
      });
    }

    let rotY = 0;
    let rotX = 0.2;
    let explodeTimer = 0;
    let hasTriggeredExplodeComplete = false;
    let progress = 0; // Inward assembly progress 0 -> 1

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Smooth slow 3D rotation
      rotY += 0.0022;
      rotX += 0.0007;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const fov = 420;
      const isCurrentlyExploding = explodingRef.current;

      // Advance assembly progress smoothly with ease-out
      if (progress < 1) {
        progress += (1 - progress) * 0.038;
      }

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
          // Smooth spherical lerp from outer sphere halo towards target orb surface
          const currentProgress = Math.min(1, Math.max(0, (progress - p.delay) / (1 - p.delay)));
          const ease = 1 - Math.pow(1 - currentProgress, 3); // Cubic ease out

          const currentBaseX = p.startX + (p.targetX - p.startX) * ease;
          const currentBaseY = p.startY + (p.targetY - p.startY) * ease;
          const currentBaseZ = p.startZ + (p.targetZ - p.startZ) * ease;

          // 3D Rotation
          // Y axis
          const x1 = currentBaseX * cosY + currentBaseZ * sinY;
          const z1 = -currentBaseX * sinY + currentBaseZ * cosY;
          // X axis
          const y1 = currentBaseY * cosX - z1 * sinX;
          const z2 = currentBaseY * sinX + z1 * cosX;

          p.x = x1;
          p.y = y1;
          p.z = z2;
        } else {
          // EXPLOSION STATE: Smooth radial burst
          if (p.vx === 0 && p.vy === 0 && p.vz === 0) {
            const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1;
            const speed = 14 + Math.random() * 26;
            p.vx = (p.x / dist) * speed;
            p.vy = (p.y / dist) * speed;
            p.vz = (p.z / dist) * speed;
          }

          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;
          p.alpha = Math.max(0, p.alpha - 0.022);
        }

        // Perspective projection
        const distance = fov + p.z;
        if (distance <= 0) continue;

        const scale = fov / distance;
        const screenX = centerX + p.x * scale;
        const screenY = centerY + p.y * scale;

        // Depth cueing
        const depthAlpha = Math.max(0.12, Math.min(1, (p.z + sphereRadius) / (sphereRadius * 2))) * p.alpha;
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
  }, [onExplodeComplete]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-visible ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full pointer-events-none overflow-visible"
        style={{ display: "block" }}
      />
    </div>
  );
}
