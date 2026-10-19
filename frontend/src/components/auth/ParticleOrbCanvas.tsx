"use client";

import React, { useEffect, useRef } from "react";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface MorphParticle {
  // Target 3D continuous mathematical shapes
  sphere: Vec3;
  infinity: Vec3;
  saturn: Vec3;

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

    const count = 800;
    const particles: MorphParticle[] = [];

    // Base radius: Majestic 3D scale
    const baseRadius = Math.max(140, Math.min(window.innerWidth, window.innerHeight) * 0.22);

    // ==============================================================
    // 1. SHAPE 1: 3D Cosmic Sphere Orb (Fibonacci Lattice)
    // ==============================================================
    const sphereTargets: Vec3[] = [];
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = i * 2.399963229728653; // Golden angle
      sphereTargets.push({
        x: baseRadius * radiusAtY * Math.cos(theta),
        y: baseRadius * y,
        z: baseRadius * radiusAtY * Math.sin(theta),
      });
    }

    // ==============================================================
    // 2. SHAPE 2: 3D Infinity Loop / Mobius Ribbon (∞)
    // ==============================================================
    // Continuous 3D Lemniscate ribbon with volumetric tube depth
    const infinityTargets: Vec3[] = [];
    const infW = baseRadius * 1.38;
    const infH = baseRadius * 0.72;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const denom = 1 + Math.sin(t) * Math.sin(t);
      // Lemniscate of Bernoulli base curve
      const baseX = (infW * Math.SQRT2 * Math.cos(t)) / denom;
      const baseY = (infW * Math.SQRT2 * Math.cos(t) * Math.sin(t)) / denom;
      const baseZ = infH * Math.sin(2 * t);

      // Add gentle ribbon thickness so it's a solid 3D ribbon in space
      const crossAngle = 2 * t;
      const tubeRadius = (Math.sin(i * 11.3) * 0.5 + 0.5) * 11;
      const offsetX = tubeRadius * Math.cos(crossAngle);
      const offsetY = tubeRadius * Math.sin(crossAngle) * 0.6;
      const offsetZ = tubeRadius * Math.sin(crossAngle);

      infinityTargets.push({
        x: baseX + offsetX,
        y: baseY + offsetY,
        z: baseZ + offsetZ,
      });
    }

    // ==============================================================
    // 3. SHAPE 3: 3D Saturn Ring / Celestial Orbit
    // ==============================================================
    // Composed of:
    // - Inner Planet Core (300 particles): Fibonacci sphere with compact radius
    // - Outer Planetary Halo Ring (500 particles): Tilted multi-layered particle disc
    const saturnTargets: Vec3[] = [];
    const coreCount = 300;
    const coreRadius = baseRadius * 0.46;

    for (let i = 0; i < coreCount; i++) {
      const y = 1 - (i / (coreCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = i * 2.399963229728653;
      saturnTargets.push({
        x: coreRadius * radiusAtY * Math.cos(theta),
        y: coreRadius * y,
        z: coreRadius * radiusAtY * Math.sin(theta),
      });
    }

    const ringCount = count - coreCount;
    const innerRingR = baseRadius * 0.78;
    const outerRingR = baseRadius * 1.62;
    const ringTilt = 0.42; // ~24 degree permanent tilt for the halo disc
    const cosRingTilt = Math.cos(ringTilt);
    const sinRingTilt = Math.sin(ringTilt);

    for (let i = 0; i < ringCount; i++) {
      const frac = i / ringCount;
      const phi = frac * Math.PI * 2 + (Math.sin(i * 7.1) * 0.05);
      // Density distributed across the ring disc
      const radialT = Math.sqrt((i % 50) / 50);
      const r = innerRingR + radialT * (outerRingR - innerRingR);
      const zJitter = (Math.sin(i * 13.9) * 0.5) * 8;

      const rawX = r * Math.cos(phi);
      const rawY = r * Math.sin(phi);
      const rawZ = zJitter;

      // Apply tilted disc orientation
      saturnTargets.push({
        x: rawX,
        y: rawY * cosRingTilt - rawZ * sinRingTilt,
        z: rawY * sinRingTilt + rawZ * cosRingTilt,
      });
    }

    // ==============================================================
    // 4. PARTICLES INITIALIZATION
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

      // Dots are crisp, refined, and delicate
      particles.push({
        sphere: sphereTargets[i],
        infinity: infinityTargets[i],
        saturn: saturnTargets[i],

        dirX,
        dirY,
        dirZ,
        dispersalDist,

        vx: 0,
        vy: 0,
        vz: 0,

        color: isOrange ? "orange" : "white",
        size: isOrange ? 0.90 + Math.random() * 0.40 : 0.75 + Math.random() * 0.35,
        baseAlpha: 0.70 + Math.random() * 0.30,
      });
    }

    // Steady, rock-solid rotation parameters (no wobbling, no tumbling!)
    let rotY = 0;
    const fixedTiltAngle = 0.22; // ~12.6 degree fixed aesthetic tilt
    const cosTilt = Math.cos(fixedTiltAngle);
    const sinTilt = Math.sin(fixedTiltAngle);

    // Cycle Timing:
    // Each shape rotates smoothly for a full leisurely round before transitioning
    let morphTime = 0;
    const stageDuration = 1000; // ~16.6 seconds per shape at 60fps
    const morphCycleDuration = stageDuration * 3; // 3000 frames total loop (~50s)

    let entranceProgress = 0;
    let explodeTimer = 0;
    let hasTriggeredExplodeComplete = false;

    const currentPositions: Vec3[] = particles.map(() => ({ x: 0, y: 0, z: 0 }));

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      const isMobile = width < 768;
      // Fixed, completely stable center coordinate (ZERO shaking or wobbling)
      const centerX = isMobile ? width / 2 : width * targetCenterRatioX;
      const centerY = isMobile ? height * 0.28 : height / 2;

      // Clean, constant polar rotation around Y-axis (rock solid, steady)
      rotY += 0.0019;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      const fov = 460;
      const isCurrentlyExploding = explodingRef.current;

      if (entranceProgress < 1) {
        entranceProgress += (1 - entranceProgress) * 0.045;
      }

      // Morphing time progression:
      morphTime = (morphTime + 1) % morphCycleDuration;
      const currentStage = Math.floor(morphTime / stageDuration);
      const timeInStage = morphTime % stageDuration;

      // Hold stabilized for 75% of stage, then smoothly morph during the remaining 25%
      const holdTime = stageDuration * 0.75;
      let morphWeight = 0;
      if (timeInStage > holdTime) {
        const transitionProgress = (timeInStage - holdTime) / (stageDuration - holdTime);
        // Hermite smooth cubic easing
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
            // Sphere -> Infinity Loop
            target = {
              x: p.sphere.x + (p.infinity.x - p.sphere.x) * morphWeight,
              y: p.sphere.y + (p.infinity.y - p.sphere.y) * morphWeight,
              z: p.sphere.z + (p.infinity.z - p.sphere.z) * morphWeight,
            };
          } else if (currentStage === 1) {
            // Infinity Loop -> Saturn Celestial Orbit
            target = {
              x: p.infinity.x + (p.saturn.x - p.infinity.x) * morphWeight,
              y: p.infinity.y + (p.saturn.y - p.infinity.y) * morphWeight,
              z: p.infinity.z + (p.saturn.z - p.infinity.z) * morphWeight,
            };
          } else {
            // Saturn Celestial Orbit -> Sphere
            target = {
              x: p.saturn.x + (p.sphere.x - p.saturn.x) * morphWeight,
              y: p.saturn.y + (p.sphere.y - p.saturn.y) * morphWeight,
              z: p.saturn.z + (p.sphere.z - p.saturn.z) * morphWeight,
            };
          }

          // Cosmic Dispersal -> Target Lerp:
          const currentDist = p.dispersalDist * (1 - entranceProgress);
          const currentBaseX = target.x + p.dirX * currentDist;
          const currentBaseY = target.y + p.dirY * currentDist;
          const currentBaseZ = target.z + p.dirZ * currentDist;

          // Pure, rock-solid rotation around Y-axis followed by fixed aesthetic tilt
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
      className="fixed inset-0 w-full h-full pointer-events-none z-20"
      style={{ display: "block" }}
    />
  );
}
