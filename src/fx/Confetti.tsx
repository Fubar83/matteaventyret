import { Application, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";

const COLORS = [0xf97316, 0x0ea5e9, 0xa855f7, 0x22c55e, 0xfacc15, 0xf43f5e];

interface Particle {
  gfx: Graphics;
  vx: number;
  vy: number;
  spin: number;
}

/**
 * A short confetti burst using PixiJS particles (see build brief "Animation":
 * "PixiJS renders particles and effects: confetti, star bursts..."). Mounts,
 * bursts once, and tears itself down - no persistent canvas left behind.
 */
export function Confetti({ durationMs = 1800 }: { durationMs?: number }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reducedMotion = document.documentElement.dataset.reducedMotion === "true";
    if (reducedMotion || !hostRef.current) return;

    let destroyed = false;
    const app = new Application();
    const particles: Particle[] = [];

    app
      .init({ width: window.innerWidth, height: window.innerHeight, backgroundAlpha: 0, antialias: true })
      .then(() => {
        if (destroyed || !hostRef.current) {
          app.destroy(true);
          return;
        }
        hostRef.current.appendChild(app.canvas);
        app.canvas.style.position = "fixed";
        app.canvas.style.inset = "0";
        app.canvas.style.pointerEvents = "none";
        app.canvas.style.zIndex = "50";

        const originX = window.innerWidth / 2;
        for (let i = 0; i < 80; i++) {
          const gfx = new Graphics();
          const color = COLORS[i % COLORS.length];
          gfx.rect(-4, -4, 8, 8).fill(color);
          gfx.x = originX + (Math.random() - 0.5) * 60;
          gfx.y = window.innerHeight * 0.3;
          app.stage.addChild(gfx);
          particles.push({
            gfx,
            vx: (Math.random() - 0.5) * 8,
            vy: -6 - Math.random() * 6,
            spin: (Math.random() - 0.5) * 0.3,
          });
        }

        let gravity = 0.25;
        app.ticker.add(() => {
          for (const p of particles) {
            p.vy += gravity * 0.15;
            p.gfx.x += p.vx;
            p.gfx.y += p.vy;
            p.gfx.rotation += p.spin;
          }
        });
        gravity = 0.25;
      });

    const timeout = setTimeout(() => {
      destroyed = true;
      try {
        app.destroy(true, { children: true });
      } catch {
        /* already destroyed */
      }
    }, durationMs);

    return () => {
      destroyed = true;
      clearTimeout(timeout);
      try {
        app.destroy(true, { children: true });
      } catch {
        /* already destroyed */
      }
    };
  }, [durationMs]);

  return <div ref={hostRef} aria-hidden />;
}
