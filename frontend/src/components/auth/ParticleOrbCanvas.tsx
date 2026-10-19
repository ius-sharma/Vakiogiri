"use client";

import React, { useEffect, useRef } from "react";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface MorphParticle {
  // Target shape targets
  sphere: Vec3;
  videoIcon: Vec3;
  loginIcon: Vec3;

  // Initial random entry coordinates from whole screen boundaries
  startX: number;
  startY: number;
  startZ: number;

  // Current interpolated state
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
}

interface ParticleOrbCanvasProps {
  isExploding?: boolean;
  onExplodeComplete?: () => void;
  targetCenterRatioX?: number; // 0.28 for left column on desktop
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

    // Mouse tracking for minimal magnetic hover effect
    let mouseX = width * targetCenterRatioX;
    let mouseY = height / 2;
    let targetMagneticX = 0;
    let targetMagneticY = 0;
    let currentMagneticX = 0;
    let currentMagneticY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // 850 particles for crisp shape recognition and smooth morphing
    const count = 850;
    const particles: MorphParticle[] = [];
    const baseRadius = Math.min(width, height) * 0.22;

    // ==============================================================
    // 1. GENERATE SHAPE TARGETS (Sphere, Video Editing, Login Icon)
    // ==============================================================

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

    // Helper: sample points on a 3D circle
    const sampleCircle = (radius: number, centerY: number, n: number): Vec3[] => {
      const pts: Vec3[] = [];
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        pts.push({
          x: radius * Math.cos(angle),
          y: centerY,
          z: radius * Math.sin(angle) * 0.4, // subtle 3D tilt
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

    // --- Shape 2: Video Editing (Scissors & Film Slate / Play Frame) ---
    // Outer video frame (rounded rectangle) + Play triangle in center + Cutter timeline
    const videoTargets: Vec3[] = [];
    const frameW = baseRadius * 1.5;
    const frameH = baseRadius * 1.1;

    // 4 edges of the video frame (400 points)
    const ptsTop = sampleLine({ x: -frameW, y: -frameH, z: 0 }, { x: frameW, y: -frameH, z: 0 }, 100);
    const ptsRight = sampleLine({ x: frameW, y: -frameH, z: 0 }, { x: frameW, y: frameH, z: 0 }, 80);
    const ptsBottom = sampleLine({ x: frameW, y: frameH, z: 0 }, { x: -frameW, y: frameH, z: 0 }, 100);
    const ptsLeft = sampleLine({ x: -frameW, y: frameH, z: 0 }, { x: -frameW, y: -frameH, z: 0 }, 80);
    videoTargets.push(...ptsTop, ...ptsRight, ...ptsBottom, ...ptsLeft);

    // Center Play Triangle (Scissors/Cut Symbol) (220 points)
    const triX1 = -baseRadius * 0.45, triY1 = -baseRadius * 0.55;
    const triX2 = -baseRadius * 0.45, triY2 = baseRadius * 0.55;
    const triX3 = baseRadius * 0.65, triY3 = 0;
    const triSide1 = sampleLine({ x: triX1, y: triY1, z: 0 }, { x: triX2, y: triY2, z: 0 }, 80);
    const triSide2 = sampleLine({ x: triX2, y: triY2, z: 0 }, { x: triX3, y: triY3, z: 0 }, 70);
    const triSide3 = sampleLine({ x: triX3, y: triY3, z: 0 }, { x: triX1, y: triY1, z: 0 }, 70);
    videoTargets.push(...triSide1, ...triSide2, ...triSide3);

    // Film perforations dots (remaining points)
    while (videoTargets.length < count) {
      const side = Math.random() < 0.5 ? -1 : 1;
      videoTargets.push({
        x: (Math.random() - 0.5) * frameW * 1.6,
        y: side * (frameH + 18),
        z: (Math.random() - 0.5) * 16,
      });
    }

    // --- Shape 3: Login Icon (Profile Avatar Head & Shoulder Arc + Keyhole/Arrow) ---
    const loginTargets: Vec3[] = [];
    // User Head: Circle at top (280 points)
    const headRadius = baseRadius * 0.55;
    const headY = -baseRadius * 0.45;
    for (let i = 0; i < 280; i++) {
      const angle = (i / 280) * Math.PI * 2;
      loginTargets.push({
        x: headRadius * Math.cos(angle),
        y: headY + headRadius * Math.sin(angle),
        z: (Math.random() - 0.5) * 18,
      });
    }

    // User Shoulders: Arc at bottom (320 points)
    const shoulderRadius = baseRadius * 1.35;
    const shoulderCenterY = baseRadius * 1.05;
    for (let i = 0; i < 320; i++) {
      // Arc from PI*1.2 to PI*1.8 (upper hemisphere of lower body)
      const t = i / 320;
      const angle = Math.PI * 1.15 + t * (Math.PI * 0.7);
      loginTargets.push({
        x: shoulderRadius * Math.cos(angle),
        y: shoulderCenterY + shoulderRadius * Math.sin(angle),
        z: (Math.random() - 0.5) * 20,
      });
    }

    // Surrounding Portal/Key Ring (remaining points to reach count)
    const ringRadius = baseRadius * 1.55;
    while (loginTargets.length < count) {
      const angle = Math.random() * Math.PI * 2;
      loginTargets.push({
        x: ringRadius * Math.cos(angle),
        y: ringRadius * Math.sin(angle) * 0.9,
        z: (Math.random() - 0.5) * 20,
      });
    }

    // ==============================================================
    // 2. INITIALIZE PARTICLES (Dispersed from full screen viewport)
    // ==============================================================
    const maxDimension = Math.max(width, height);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const randomTheta = u * 2 * Math.PI;
      const randomPhi = Math.acos(2 * v - 1);
      const randomDist = maxDimension * (0.8 + Math.random() * 0.6);

      const startX = randomDist * Math.sin(randomPhi) * Math.cos(randomTheta);
      const startY = randomDist * Math.cos(randomPhi);
      const startZ = randomDist * Math.sin(randomPhi) * Math.sin(randomTheta);

      const isOrange = Math.random() < 0.65;

      particles.push({
        sphere: sphereTargets[i],
        videoIcon: videoTargets[i],
        loginIcon: loginTargets[i],

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
        alpha: 0.25 + Math.random() * 0.75,
      });
    }

    // ==============================================================
    // 3. ANIMATION LOOP WITH SHAPE MORPHING & MAGNETIC HOVER
    // ==============================================================
    let rotY = 0;
    let rotX = 0.15;
    let hasTriggeredExplodeComplete = false;
    let explodeTimer = 0;

    // Time cycle for 3-stage morphing:
    // Stage 0: Sphere (0 -> 1)
    // Stage 1: Video Editing (1 -> 2)
    // Stage 2: Login Icon (2 -> 3) -> wraps back to 0
    let morphTime = 0;
    const morphCycleDuration = 600; // ~10 seconds per full 3-icon rotation

    // Entrance assembly lerp factor
    let entranceProgress = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const isMobile = width < 768;
      const baseCenterX = isMobile ? width / 2 : width * targetCenterRatioX;
      const baseCenterY = isMobile ? height * 0.28 : height / 2;

      // Subtle Minimal Magnetic Hover:
      // When mouse moves, calculate gentle offset towards mouse (max 18px pull)
      const dx = mouseX - baseCenterX;
      const dy = mouseY - baseCenterY;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);
      if (distFromCenter < 400) {
        const pull = Math.min(18, distFromCenter * 0.04);
        targetMagneticX = (dx / distFromCenter) * pull;
        targetMagneticY = (dy / distFromCenter) * pull;
      } else {
        targetMagneticX = 0;
        targetMagneticY = 0;
      }

      currentMagneticX += (targetMagneticX - currentMagneticX) * 0.05;
      currentMagneticY += (targetMagneticY - currentMagneticY) * 0.05;

      const centerX = baseCenterX + currentMagneticX;
      const centerY = baseCenterY + currentMagneticY;

      // Slow 3D Rotation
      rotY += 0.0022;
      rotX += 0.0005;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const fov = 420;
      const isCurrentlyExploding = explodingRef.current;

      // Entrance assembly lerp
      if (entranceProgress < 1) {
        entranceProgress += (1 - entranceProgress) * 0.042;
      }

      // Morphing time progression
      morphTime = (morphTime + 1) % morphCycleDuration;
      const cycleStage = (morphTime / morphCycleDuration) * 3; // 0 to 3
      const stageIndex = Math.floor(cycleStage); // 0, 1, or 2
      const rawT = cycleStage - stageIndex; // 0 to 1 transition within the stage

      // Smooth S-Curve (Hermite ease) for morphing transition
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

        if (!isCurrentlyExploding) {
          // Calculate current morphed target based on stage
          let targetPos: Vec3;
          if (stageIndex === 0) {
            // Morph Sphere -> Video Icon
            targetPos = {
              x: p.sphere.x + (p.videoIcon.x - p.sphere.x) * smoothT,
              y: p.sphere.y + (p.videoIcon.y - p.sphere.y) * smoothT,
              z: p.sphere.z + (p.videoIcon.z - p.sphere.z) * smoothT,
            };
          } else if (stageIndex === 1) {
            // Morph Video Icon -> Login Icon
            targetPos = {
              x: p.videoIcon.x + (p.loginIcon.x - p.videoIcon.x) * smoothT,
              y: p.videoIcon.y + (p.loginIcon.y - p.videoIcon.y) * smoothT,
              z: p.videoIcon.z + (p.loginIcon.z - p.videoIcon.z) * smoothT,
            };
          } else {
            // Morph Login Icon -> Sphere (Loop)
            targetPos = {
              x: p.loginIcon.x + (p.sphere.x - p.loginIcon.x) * smoothT,
              y: p.loginIcon.y + (p.sphere.y - p.loginIcon.y) * smoothT,
              z: p.loginIcon.z + (p.sphere.z - p.loginIcon.z) * smoothT,
            };
          }

          // Initial fluid assembly from screen viewport
          const currentBaseX = p.startX + (targetPos.x - p.startX) * entranceProgress;
          const currentBaseY = p.startY + (targetPos.y - p.startY) * entranceProgress;
          const currentBaseZ = p.startZ + (targetPos.z - p.startZ) * entranceProgress;

          // 3D Rotation
          const x1 = currentBaseX * cosY + currentBaseZ * sinY;
          const z1 = -currentBaseX * sinY + currentBaseZ * cosY;
          const y1 = currentBaseY * cosX - z1 * sinX;
          const z2 = currentBaseY * sinX + z1 * cosX;

          p.x = x1;
          p.y = y1;
          p.z = z2;
        } else {
          // EXPLOSION BURST on success
          if (p.vx === 0 && p.vy === 0 && p.vz === 0) {
            const mag = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1;
            const speed = 16 + Math.random() * 32;
            p.vx = (p.x / mag) * speed;
            p.vy = (p.y / mag) * speed;
            p.vz = (p.z / mag) * speed;
          }

          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;
          p.alpha = Math.max(0, p.alpha - 0.02);
        }

        // Perspective Projection
        const distance = fov + p.z;
        if (distance <= 0) continue;

        const scale = fov / distance;
        const screenX = centerX + p.x * scale;
        const screenY = centerY + p.y * scale;

        const depthAlpha = Math.max(0.12, Math.min(1, (p.z + baseRadius) / (baseRadius * 2))) * p.alpha;
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
      window.removeEventListener("mousemove", handleMouseMove);
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
