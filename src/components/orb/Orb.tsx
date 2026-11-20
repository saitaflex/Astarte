"use client";

import { useEffect, useRef } from "react";

export type OrbState = "idle" | "typing" | "thinking" | "results" | "error";

const ENERGY: Record<OrbState, number> = { idle: 0.28, typing: 0.55, thinking: 1, results: 0.65, error: 0.12 };

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  phase: number;
  lift: number;
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    angle: (i / count) * Math.PI * 2 + Math.random() * 0.6,
    radius: 0.42 + Math.random() * 0.5,
    speed: 0.02 + Math.random() * 0.05,
    size: 0.6 + Math.random() * 1.6,
    phase: Math.random() * Math.PI * 2,
    lift: 0.02 + Math.random() * 0.05,
  }));
}

/**
 * The Astarte discovery orb: a warm, breathing presence drawn on a 2D canvas.
 * Decorative only (aria-hidden); state changes are announced as text elsewhere.
 */
export function Orb({ state, className }: { state: OrbState; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<OrbState>(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 640px)").matches;
    const particles = makeParticles(small ? 28 : 54);
    let energy = ENERGY[stateRef.current];
    let pulse = 0; // outward pulse while thinking
    let lastState = stateRef.current;
    let visible = true;
    let raf = 0;
    let t = Math.random() * 100;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    if (fallbackRef.current) fallbackRef.current.style.opacity = "0";
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (dt: number) => {
      const { width: w, height: h } = canvas.getBoundingClientRect();
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.22; // core radius

      const target = ENERGY[stateRef.current];
      energy += (target - energy) * Math.min(1, dt * 2.2);
      if (stateRef.current !== lastState) {
        if (stateRef.current === "results") pulse = 1;
        lastState = stateRef.current;
      }
      if (stateRef.current === "thinking" && pulse <= 0.02) pulse = 1;
      pulse = Math.max(0, pulse - dt * 0.7);

      const breathe = 1 + Math.sin(t * 0.8) * 0.025 * (0.6 + energy);
      ctx.clearRect(0, 0, w, h);

      // 1. Aura
      // Keep the aura inside the canvas so it fades out instead of clipping into a square
      const auraR = Math.min(R * (1.9 + energy * 0.35) * breathe, Math.min(w, h) * 0.49);
      const aura = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, auraR);
      aura.addColorStop(0, `rgba(255,180,92,${0.34 + energy * 0.16})`);
      aura.addColorStop(0.45, `rgba(242,140,40,${0.12 + energy * 0.08})`);
      aura.addColorStop(1, "rgba(242,140,40,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
      ctx.fill();

      // 2. Outward pulse ring
      if (pulse > 0) {
        const pr = R * (1.1 + (1 - pulse) * 1.9);
        ctx.strokeStyle = `rgba(242,140,40,${pulse * 0.35})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, pr, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Rings (thin tilted ellipses)
      const rings = [
        { rx: 1.75, ry: 0.42, speed: 0.12, tilt: -0.35, alpha: 0.32 },
        { rx: 1.55, ry: 0.62, speed: -0.08, tilt: 0.55, alpha: 0.22 },
        { rx: 2.05, ry: 0.3, speed: 0.05, tilt: 0.12, alpha: 0.16 },
      ];
      for (const ring of rings) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ring.tilt + t * ring.speed * (0.5 + energy));
        ctx.strokeStyle = `rgba(214,110,20,${ring.alpha * (0.6 + energy * 0.6)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, R * ring.rx * breathe, R * ring.ry * breathe, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Core: an organic, slowly morphing blob
      const steps = 72;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const wobble =
          Math.sin(a * 3 + t * 0.9) * 0.012 +
          Math.sin(a * 5 - t * 0.6) * 0.008 * (0.5 + energy) +
          Math.sin(a * 2 + t * 0.35) * 0.01;
        const r = R * breathe * (1 + wobble);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const core = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R * 1.05);
      core.addColorStop(0, "#FFF4E3");
      core.addColorStop(0.28, "#FFB45C");
      core.addColorStop(0.72, "#F28C28");
      core.addColorStop(1, "#D9711A");
      ctx.fillStyle = core;
      ctx.shadowColor = "rgba(242,140,40,0.55)";
      ctx.shadowBlur = R * (0.5 + energy * 0.5);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner light that drifts slowly
      const lx = cx + Math.cos(t * 0.4) * R * 0.25;
      const ly = cy + Math.sin(t * 0.33) * R * 0.2;
      const inner = ctx.createRadialGradient(lx, ly, 0, lx, ly, R * 0.7);
      inner.addColorStop(0, `rgba(255,248,236,${0.28 + energy * 0.12})`);
      inner.addColorStop(1, "rgba(255,248,236,0)");
      ctx.fillStyle = inner;
      ctx.fill();

      // 5. Particles
      for (const p of particles) {
        p.angle += p.speed * dt * (0.4 + energy * 1.6);
        const pr = Math.min(R * (1.2 + p.radius * 1.4) + Math.sin(t * 0.7 + p.phase) * R * p.lift * 4, Math.min(w, h) * 0.47);
        const x = cx + Math.cos(p.angle) * pr;
        const y = cy + Math.sin(p.angle) * pr * 0.82;
        const alpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.3 + p.phase));
        ctx.fillStyle = `rgba(226,120,24,${alpha * (0.5 + energy * 0.5)})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      draw(dt);
      if (visible) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    if (reduced) {
      draw(0);
      const onState = window.setInterval(() => draw(1), 400); // static orb, state shown via brightness only
      return () => {
        window.clearInterval(onState);
        ro.disconnect();
      };
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && document.visibilityState === "visible";
      if (visible) start();
    });
    io.observe(canvas);
    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className={`relative aspect-square ${className ?? ""}`} aria-hidden="true">
      {/* Static fallback visible before hydration and without canvas */}
      <div
        ref={fallbackRef}
        className="absolute inset-[30%] rounded-full transition-opacity duration-500"
        style={{ background: "radial-gradient(circle at 35% 30%, #FFF4E3, #FFB45C 30%, #F28C28 72%, #D9711A)", boxShadow: "0 0 120px 40px rgba(255,180,92,.35)" }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" data-orb-state={state} />
    </div>
  );
}
