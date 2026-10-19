"use client";

import React, { useEffect, useRef } from "react";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface MorphParticle {
  // Target shape coordinates
  sphere: Vec3;
  videoIcon: Vec3;
  loginIcon: Vec3;

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

    // Mouse tracking for subtle magnetic hover pull
    let mouseX = window.innerWidth * targetCenterRatioX;
    let mouseY = window.innerHeight / 2;
    let currentMagneticX = 0;
    let currentMagneticY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    const count = 800;
    const particles: MorphParticle[] = [];
    const baseRadius = Math.max(140, Math.min(window.innerWidth, window.innerHeight) * 0.22);

    // Helper: sample points on a line segment in 3D
    const sampleLine = (p1: Vec3, p2: Vec3, n: number): Vec3[] => {
      const pts: Vec3[] = [];
      for (let i = 0; i < n; i++) {
        const t = i / n;
        pts.push({
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t,
          z: p1.z + (p2.z - p1.z) * t + (Math.random() - 0.5) * 8,
        });
      }
      return pts;
    };

    // --- Shape 1: Sphere Targets ---
    const sphereTargets: Vec3[] = [];
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = i * 2.399963229728653;
      sphereTargets.push({
        x: baseRadius * radiusAtY * Math.cos(theta),
        y: baseRadius * y,
        z: baseRadius * radiusAtY * Math.sin(theta),
      });
    }

    // --- Shape 2: Video Editing (Film Slate / Play Frame) ---
    const videoTargets: Vec3[] = [];
    const frameW = baseRadius * 1.45;
    const frameH = baseRadius * 1.05;

    const ptsTop = sampleLine({ x: -frameW, y: -frameH, z: 0 }, { x: frameW, y: -frameH, z: 0 }, 100);
    const ptsRight = sampleLine({ x: frameW, y: -frameH, z: 0 }, { x: frameW, y: frameH, z: 0 }, 80);
    const ptsBottom = sampleLine({ x: frameW, y: frameH, z: 0 }, { x: -frameW, y: frameH, z: 0 }, 100);
    const ptsLeft = sampleLine({ x: -frameW, y: frameH, z: 0 }, { x: -frameW, y: -frameH, z: 0 }, 80);
    videoTargets.push(...ptsTop, ...ptsRight, ...ptsBottom, ...ptsLeft);

    const triX1 = -baseRadius * 0.45, triY1 = -baseRadius * 0.55;
    const triX2 = -baseRadius * 0.45, triY2 = baseRadius * 0.55;
    const triX3 = baseRadius * 0.65, triY3 = 0;
    const triSide1 = sampleLine({ x: triX1, y: triY1, z: 0 }, { x: triX2, y: triY2, z: 0 }, 80);
    const triSide2 = sampleLine({ x: triX2, y: triY2, z: 0 }, { x: triX3, y: triY3, z: 0 }, 70);
    const triSide3 = sampleLine({ x: triX3, y: triY3, z: 0 }, { x: triX1, y: triY1, z: 0 }, 70);
    videoTargets.push(...triSide1, ...triSide2, ...triSide3);

    while (videoTargets.length < count) {
      const side = Math.random() < 0.5 ? -1 : 1;
      videoTargets.push({
        x: (Math.random() - 0.5) * frameW * 1.5,
        y: side * (frameH + 16),
        z: (Math.random() - 0.5) * 16,
      });
    }

    // --- Shape 3: Login Icon (Profile Avatar Head & Shoulder Arc + Keyhole) ---
    const loginTargets: Vec3[] = [];
    const headRadius = baseRadius * 0.52;
    const headY = -baseRadius * 0.45;
    for (let i = 0; i < 280; i++) {
      const angle = (i / 280) * Math.PI * 2;
      loginTargets.push({
        x: headRadius * Math.cos(angle),
        y: headY + headRadius * Math.sin(angle),
        z: (Math.random() - 0.5) * 16,
      });
    }

    const shoulderRadius = baseRadius * 1.3;
    const shoulderCenterY = baseRadius * 1.0;
    for (let i = 0; i < 320; i++) {
      const t = i / 320;
      const angle = Math.PI * 1.15 + t * (Math.PI * 0.7);
      loginTargets.push({
        x: shoulderRadius * Math.cos(angle),
        y: shoulderCenterY + shoulderRadius * Math.sin(angle),
        z: (Math.random() - 0.5) * 18,
      });
    }

    const ringRadius = baseRadius * 1.5;
    while (loginTargets.length < count) {
      const angle = Math.random() * Math.PI * 2;
      loginTargets.push({
        x: ringRadius * Math.cos(angle),
        y: ringRadius * Math.sin(angle) * 0.9,
        z: (Math.random() - 0.5) * 18,
      });
    }

    // --- Initialize particles with cosmic dispersal ---
    const maxDimension = Math.max(window.innerWidth, window.innerHeight);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const randomTheta = u * 2 * Math.PI;
      const randomPhi = Math.acos(2 * v - 1);

      const dirX = Math.sin(randomPhi) * Math.cos(randomTheta);
      const dirY = Math.cos(randomPhi);
      const dirZ = Math.sin(randomPhi) * Math.sin(randomTheta);
      const dispersalDist = maxDimension * (0.6 + Math.random() * 0.4);

      const isOrange = Math.random() < 0.65;

      particles.push({
        sphere: sphereTargets[i],
        videoIcon: videoTargets[i],
        loginIcon: loginTargets[i],

        dirX,
        dirY,
        dirZ,
        dispersalDist,

        vx: 0,
        vy: 0,
        vz: 0,

        color: isOrange ? "orange" : "white",
        size: isOrange ? 1.6 + Math.random() * 1.6 : 1.3 + Math.random() * 1.3,
        baseAlpha: 0.65 + Math.random() * 0.35,
      });
    }

    let rotY = 0;
    let rotX = 0.15;
    let morphTime = 0;
    const morphCycleDuration = 600;
    let entranceProgress = 0;
    let explodeTimer = 0;
    let hasTriggeredExplodeComplete = false;

    const currentPositions: Vec3[] = particles.map(() => ({ x: 0, y: 0, z: 0 }));

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      const isMobile = width < 768;
      const baseCenterX = isMobile ? width / 2 : width * targetCenterRatioX;
      const baseCenterY = isMobile ? height * 0.28 : height / 2;

      // Subtle Minimal Magnetic Hover
      const dx = mouseX - baseCenterX;
      const dy = mouseY - baseCenterY;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);
      let targetMagX = 0;
      let targetMagY = 0;
      if (distFromCenter < 400 && !isMobile) {
        const pull = Math.min(18, distFromCenter * 0.04);
        targetMagX = (dx / distFromCenter) * pull;
        targetMagY = (dy / distFromCenter) * pull;
      }
      currentMagneticX += (targetMagX - currentMagneticX) * 0.05;
      currentMagneticY += (targetMagY - currentMagneticY) * 0.05;

      const centerX = baseCenterX + currentMagneticX;
      const centerY = baseCenterY + currentMagneticY;

      rotY += 0.0022;
      rotX += 0.0005;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const fov = 450;
      const isCurrentlyExploding = explodingRef.current;

      // Inward assembly lerp from 0 to 1
      if (entranceProgress < 1) {
        entranceProgress += (1 - entranceProgress) * 0.045;
      }

      // Morphing time progression
      morphTime = (morphTime + 1) % morphCycleDuration;
      const cycleStage = (morphTime / morphCycleDuration) * 3;
      const stageIndex = Math.floor(cycleStage);
      const rawT = cycleStage - stageIndex;
      const smoothT = rawT * rawT * (3 - 2 * rawT);

      if (isCurrentlyExploding) {
        explodeTimer++;
        if (explodeTimer > 50 && !hasTriggeredExplodeComplete) {
          hasTriggeredExplodeComplete = true;
          onExplodeComplete?.();
        }
      }

      for (let i = 0; i < count; i++) {
        const p = particles[i];
        const pos = currentPositions[i];

        if (!isCurrentlyExploding) {
          let target: Vec3;
          if (stageIndex === 0) {
            target = {
              x: p.sphere.x + (p.videoIcon.x - p.sphere.x) * smoothT,
              y: p.sphere.y + (p.videoIcon.y - p.sphere.y) * smoothT,
              z: p.sphere.z + (p.videoIcon.z - p.sphere.z) * smoothT,
            };
          } else if (stageIndex === 1) {
            target = {
              x: p.videoIcon.x + (p.loginIcon.x - p.videoIcon.x) * smoothT,
              y: p.videoIcon.y + (p.loginIcon.y - p.videoIcon.y) * smoothT,
              z: p.videoIcon.z + (p.loginIcon.z - p.videoIcon.z) * smoothT,
            };
          } else {
            target = {
              x: p.loginIcon.x + (p.sphere.x - p.loginIcon.x) * smoothT,
              y: p.loginIcon.y + (p.sphere.y - p.loginIcon.y) * smoothT,
              z: p.loginIcon.z + (p.sphere.z - p.loginIcon.z) * smoothT,
            };
          }

          // Cosmic Dispersal -> Target Lerp:
          const currentDist = p.dispersalDist * (1 - entranceProgress);
          const currentBaseX = target.x + p.dirX * currentDist;
          const currentBaseY = target.y + p.dirY * currentDist;
          const currentBaseZ = target.z + p.dirZ * currentDist;

          const x1 = currentBaseX * cosY + currentBaseZ * sinY;
          const z1 = -currentBaseX * sinY + currentBaseZ * cosY;
          const y1 = currentBaseY * cosX - z1 * sinX;
          const z2 = currentBaseY * sinX + z1 * cosX;

          pos.x = x1;
          pos.y = y1;
          pos.z = z2;
        } else {
          // Outward explosion
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

        const scale = fov / (fov + Math.max(-300, Math.min(300, pos.z)));
        const screenX = centerX + pos.x * scale;
        const screenY = centerY + pos.y * scale;

        const depthAlpha = Math.max(0.45, Math.min(1, (pos.z + baseRadius) / (baseRadius * 2))) * p.baseAlpha;
        const dotRadius = Math.max(1.0, p.size * scale);

        ctx.beginPath();
        ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);

        if (p.color === "orange") {
          ctx.fillStyle = `rgba(255, 116, 39, ${depthAlpha})`;
          ctx.shadowColor = `rgba(255, 116, 39, ${depthAlpha * 0.8})`;
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${depthAlpha})`;
          ctx.shadowColor = `rgba(255, 255, 255, ${depthAlpha * 0.6})`;
          ctx.shadowBlur = 6;
        }

        ctx.fill();
      }

      ctx.shadowBlur = 0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onExplodeComplete, targetCenterRatioX]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-20"
      style={{ display: "block" }}
    />
  );
}
