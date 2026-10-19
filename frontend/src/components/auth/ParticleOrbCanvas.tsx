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
    
    // Base radii:
    // Circle/Sphere: Full majestic original radius
    // Icons: Clean, elegant compact size (0.64x scale)
    const sphereRadius = Math.max(140, Math.min(window.innerWidth, window.innerHeight) * 0.22);
    const compactScale = 0.64;
    const compactRadius = sphereRadius * compactScale;

    // Helper: sample points on a line segment in 3D with clean precision
    const sampleLine = (p1: Vec3, p2: Vec3, n: number): Vec3[] => {
      const pts: Vec3[] = [];
      for (let i = 0; i < n; i++) {
        const t = i / n;
        pts.push({
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t,
          z: p1.z + (p2.z - p1.z) * t + (Math.random() - 0.5) * 3,
        });
      }
      return pts;
    };

    // Helper: sample points on a 3D circle/arc with clean precision
    const sampleArc = (cx: number, cy: number, r: number, startA: number, endA: number, n: number): Vec3[] => {
      const pts: Vec3[] = [];
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const angle = startA + (endA - startA) * t;
        pts.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          z: (Math.random() - 0.5) * 4,
        });
      }
      return pts;
    };

    // ==============================================================
    // 1. SHAPE 1: Sphere Targets (Full Original Size - Fibonacci Lattice)
    // ==============================================================
    const sphereTargets: Vec3[] = [];
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = i * 2.399963229728653;
      sphereTargets.push({
        x: sphereRadius * radiusAtY * Math.cos(theta),
        y: sphereRadius * y,
        z: sphereRadius * radiusAtY * Math.sin(theta),
      });
    }

    // ==============================================================
    // 2. SHAPE 2: Video Film Slate / Clapperboard Icon (Crisp, High-Detail)
    // ==============================================================
    // Composed of:
    // - Outer Film Slate Frame: w = 1.35 * compactRadius, h = 1.05 * compactRadius
    // - Diagonal Clapper Stripe Marks across the top bar
    // - Center Crisp Play Triangle with clean inner vertices
    const videoTargets: Vec3[] = [];
    const slateW = compactRadius * 1.30;
    const slateH = compactRadius * 1.00;
    const clapperH = compactRadius * 0.32;

    // Body bottom rectangle (3 lines: left, bottom, right)
    videoTargets.push(...sampleLine({ x: -slateW, y: -slateH + clapperH, z: 0 }, { x: -slateW, y: slateH, z: 0 }, 75));
    videoTargets.push(...sampleLine({ x: -slateW, y: slateH, z: 0 }, { x: slateW, y: slateH, z: 0 }, 100));
    videoTargets.push(...sampleLine({ x: slateW, y: slateH, z: 0 }, { x: slateW, y: -slateH + clapperH, z: 0 }, 75));

    // Clapper top bar (hinged bar at top)
    videoTargets.push(...sampleLine({ x: -slateW, y: -slateH, z: 0 }, { x: slateW, y: -slateH, z: 0 }, 100));
    videoTargets.push(...sampleLine({ x: -slateW, y: -slateH + clapperH, z: 0 }, { x: slateW, y: -slateH + clapperH, z: 0 }, 90));
    videoTargets.push(...sampleLine({ x: -slateW, y: -slateH, z: 0 }, { x: -slateW, y: -slateH + clapperH, z: 0 }, 25));
    videoTargets.push(...sampleLine({ x: slateW, y: -slateH, z: 0 }, { x: slateW, y: -slateH + clapperH, z: 0 }, 25));

    // 4 Diagonal Clapper Stripes
    const stripeXs = [-slateW * 0.65, -slateW * 0.20, slateW * 0.25, slateW * 0.70];
    for (const sx of stripeXs) {
      videoTargets.push(...sampleLine({ x: sx, y: -slateH + clapperH, z: 0 }, { x: sx + 18, y: -slateH, z: 0 }, 20));
    }

    // Centered Equilateral Play Triangle
    const triR = compactRadius * 0.50;
    const triV1 = { x: -triR * 0.55, y: -triR * 0.75, z: 0 };
    const triV2 = { x: -triR * 0.55, y: triR * 0.75, z: 0 };
    const triV3 = { x: triR * 0.85, y: 0, z: 0 };
    videoTargets.push(...sampleLine(triV1, triV2, 60));
    videoTargets.push(...sampleLine(triV2, triV3, 60));
    videoTargets.push(...sampleLine(triV3, triV1, 60));

    // Fill remaining points with balanced inner film timeline tracks
    while (videoTargets.length < count) {
      const t = Math.random();
      const dotX = -slateW * 0.75 + t * (slateW * 1.5);
      videoTargets.push({
        x: dotX,
        y: slateH * 0.78,
        z: (Math.random() - 0.5) * 4,
      });
    }

    // ==============================================================
    // 3. SHAPE 3: Sleek Modern Login / Security Shield & Keyhole Icon
    // ==============================================================
    // Composed of:
    // - Elegant Security Shield Outer Silhouette
    // - Centered Keyhole / User Avatar Node
    // - Radiating Orbit Arc
    const loginTargets: Vec3[] = [];
    const shieldW = compactRadius * 1.15;
    const shieldTopY = -compactRadius * 1.15;
    const shieldCornerY = -compactRadius * 0.35;
    const shieldBottomY = compactRadius * 1.25;

    // Shield Top edge
    loginTargets.push(...sampleLine({ x: -shieldW, y: shieldTopY, z: 0 }, { x: shieldW, y: shieldTopY, z: 0 }, 90));
    // Shield Upper Sides
    loginTargets.push(...sampleLine({ x: -shieldW, y: shieldTopY, z: 0 }, { x: -shieldW, y: shieldCornerY, z: 0 }, 50));
    loginTargets.push(...sampleLine({ x: shieldW, y: shieldTopY, z: 0 }, { x: shieldW, y: shieldCornerY, z: 0 }, 50));
    // Shield Lower Converging Curves to bottom tip
    loginTargets.push(...sampleLine({ x: -shieldW, y: shieldCornerY, z: 0 }, { x: 0, y: shieldBottomY, z: 0 }, 100));
    loginTargets.push(...sampleLine({ x: shieldW, y: shieldCornerY, z: 0 }, { x: 0, y: shieldBottomY, z: 0 }, 100));

    // Center User Head / Lock Shackle Circle
    const lockHeadR = compactRadius * 0.38;
    const lockHeadY = -compactRadius * 0.25;
    loginTargets.push(...sampleArc(0, lockHeadY, lockHeadR, 0, Math.PI * 2, 130));

    // Keyhole / User Body Trapezoid below head
    const bodyTopW = compactRadius * 0.22;
    const bodyBotW = compactRadius * 0.55;
    const bodyTopY = lockHeadY + lockHeadR + 4;
    const bodyBotY = compactRadius * 0.65;
    loginTargets.push(...sampleLine({ x: -bodyTopW, y: bodyTopY, z: 0 }, { x: bodyTopW, y: bodyTopY, z: 0 }, 30));
    loginTargets.push(...sampleLine({ x: bodyTopW, y: bodyTopY, z: 0 }, { x: bodyBotW, y: bodyBotY, z: 0 }, 50));
    loginTargets.push(...sampleLine({ x: bodyBotW, y: bodyBotY, z: 0 }, { x: -bodyBotW, y: bodyBotY, z: 0 }, 60));
    loginTargets.push(...sampleLine({ x: -bodyBotW, y: bodyBotY, z: 0 }, { x: -bodyTopW, y: bodyTopY, z: 0 }, 50));

    // Fill remaining points with concentric inner verification glow ring
    const innerRingR = compactRadius * 0.75;
    while (loginTargets.length < count) {
      const angle = Math.random() * Math.PI * 2;
      loginTargets.push({
        x: innerRingR * Math.cos(angle),
        y: innerRingR * Math.sin(angle) * 0.85,
        z: (Math.random() - 0.5) * 6,
      });
    }

    // ==============================================================
    // 4. PARTICLES INITIALIZATION: SMALLER, CRISP, ELEGANT DOTS
    // ==============================================================
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

      // NOTICE: Dots are made noticeably smaller, crisper, and refined
      // Orange dots: ~0.95px to 1.35px (reduced from 3.0px)
      // White dots: ~0.80px to 1.15px
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
        size: isOrange ? 0.95 + Math.random() * 0.40 : 0.80 + Math.random() * 0.35,
        baseAlpha: 0.70 + Math.random() * 0.30,
      });
    }

    let rotY = 0;
    let rotX = 0.15;
    
    // Cycle Timing:
    // Full 360 degree rotation per shape before leisurely morphing
    let morphTime = 0;
    const stageDuration = 800; // ~13.3 seconds per shape
    const morphCycleDuration = stageDuration * 3; // 2400 frames total loop

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
      if (distFromCenter > 0.001 && distFromCenter < 400 && !isMobile) {
        const pull = Math.min(18, distFromCenter * 0.04);
        targetMagX = (dx / distFromCenter) * pull;
        targetMagY = (dy / distFromCenter) * pull;
      }
      currentMagneticX += (targetMagX - currentMagneticX) * 0.05;
      currentMagneticY += (targetMagY - currentMagneticY) * 0.05;

      const centerX = baseCenterX + (Number.isNaN(currentMagneticX) ? 0 : currentMagneticX);
      const centerY = baseCenterY + (Number.isNaN(currentMagneticY) ? 0 : currentMagneticY);

      // Slow 3D Rotation
      rotY += 0.0022;
      rotX += 0.0005;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const fov = 450;
      const isCurrentlyExploding = explodingRef.current;

      if (entranceProgress < 1) {
        entranceProgress += (1 - entranceProgress) * 0.045;
      }

      // Morphing time progression
      morphTime = (morphTime + 1) % morphCycleDuration;
      const currentStage = Math.floor(morphTime / stageDuration);
      const timeInStage = morphTime % stageDuration;

      // Hold stabilized for 65% of the stage, then transition over the remaining 35%
      const holdTime = stageDuration * 0.65;
      let morphWeight = 0;
      if (timeInStage > holdTime) {
        const transitionProgress = (timeInStage - holdTime) / (stageDuration - holdTime);
        morphWeight = transitionProgress * transitionProgress * (3 - 2 * transitionProgress);
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
        const pos = currentPositions[i];

        if (!isCurrentlyExploding) {
          let target: Vec3;
          if (currentStage === 0) {
            target = {
              x: p.sphere.x + (p.videoIcon.x - p.sphere.x) * morphWeight,
              y: p.sphere.y + (p.videoIcon.y - p.sphere.y) * morphWeight,
              z: p.sphere.z + (p.videoIcon.z - p.sphere.z) * morphWeight,
            };
          } else if (currentStage === 1) {
            target = {
              x: p.videoIcon.x + (p.loginIcon.x - p.videoIcon.x) * morphWeight,
              y: p.videoIcon.y + (p.loginIcon.y - p.videoIcon.y) * morphWeight,
              z: p.videoIcon.z + (p.loginIcon.z - p.videoIcon.z) * morphWeight,
            };
          } else {
            target = {
              x: p.loginIcon.x + (p.sphere.x - p.loginIcon.x) * morphWeight,
              y: p.loginIcon.y + (p.sphere.y - p.loginIcon.y) * morphWeight,
              z: p.loginIcon.z + (p.sphere.z - p.loginIcon.z) * morphWeight,
            };
          }

          // Cosmic Dispersal -> Target Lerp:
          const currentDist = p.dispersalDist * (1 - entranceProgress);
          const currentBaseX = target.x + p.dirX * currentDist;
          const currentBaseY = target.y + p.dirY * currentDist;
          const currentBaseZ = target.z + p.dirZ * currentDist;

          // Rotate around Y and X
          const x1 = currentBaseX * cosY + currentBaseZ * sinY;
          const z1 = -currentBaseX * sinY + currentBaseZ * cosY;
          const y1 = currentBaseY * cosX - z1 * sinX;
          const z2 = currentBaseY * sinX + z1 * cosX;

          pos.x = x1;
          pos.y = y1;
          pos.z = z2;
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

        const scale = fov / (fov + Math.max(-300, Math.min(300, pos.z)));
        const screenX = centerX + pos.x * scale;
        const screenY = centerY + pos.y * scale;

        const depthAlpha = Math.max(0.40, Math.min(1, (pos.z + sphereRadius) / (sphereRadius * 2))) * p.baseAlpha;
        
        // Smaller, refined dot radius for clean starry aesthetics
        const dotRadius = Math.max(0.65, p.size * scale);

        ctx.beginPath();
        ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);

        if (p.color === "orange") {
          ctx.fillStyle = `rgba(255, 116, 39, ${depthAlpha})`;
          ctx.shadowColor = `rgba(255, 116, 39, ${depthAlpha * 0.75})`;
          ctx.shadowBlur = 5;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${depthAlpha})`;
          ctx.shadowColor = `rgba(255, 255, 255, ${depthAlpha * 0.55})`;
          ctx.shadowBlur = 3;
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
