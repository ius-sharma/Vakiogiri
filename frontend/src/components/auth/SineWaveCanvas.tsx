"use client";

import React, { useEffect, useRef } from "react";

export default function SineWaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      time += 0.012;

      // Draw Wave 1: Golden Orange (#ff7427) from top-left to bottom-right
      ctx.beginPath();
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = "rgba(255, 116, 39, 0.75)";
      ctx.shadowColor = "rgba(255, 116, 39, 0.65)";
      ctx.shadowBlur = 12;

      const steps = 140;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Base diagonal path from (0, 0) to (width, height)
        const baseX = t * width;
        const baseY = t * height;

        // Normal perpendicular vector (-dy, dx)
        const angle = Math.atan2(height, width);
        const normalX = -Math.sin(angle);
        const normalY = Math.cos(angle);

        // Sinusoidal oscillation with frequency and phase shift
        const envelope = Math.sin(t * Math.PI); // tapering at the extreme corners
        const amplitude = (55 + 25 * Math.sin(time * 0.7)) * envelope;
        const wave = Math.sin(t * 10 - time * 2.2) * amplitude;

        const x = baseX + normalX * wave;
        const y = baseY + normalY * wave;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw Wave 2: Intertwining Amber-White hairline wave from bottom-left to top-right
      ctx.beginPath();
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
      ctx.shadowColor = "rgba(255, 180, 100, 0.5)";
      ctx.shadowBlur = 10;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Diagonal from (0, height) to (width, 0)
        const baseX = t * width;
        const baseY = (1 - t) * height;

        const angle = Math.atan2(-height, width);
        const normalX = -Math.sin(angle);
        const normalY = Math.cos(angle);

        const envelope = Math.sin(t * Math.PI);
        const amplitude = (50 + 20 * Math.cos(time * 0.9)) * envelope;
        const wave = Math.sin(t * 11 + time * 2.5) * amplitude;

        const x = baseX + normalX * wave;
        const y = baseY + normalY * wave;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Reset shadows
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ display: "block" }}
    />
  );
}
