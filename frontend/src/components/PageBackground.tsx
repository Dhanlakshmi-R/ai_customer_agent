import React, { useEffect, useRef } from 'react';

const orbs = [
  'left-[8%] top-[22%] w-2 h-2 bg-indigo-400/70',
  'left-[30%] bottom-[18%] w-1.5 h-1.5 bg-cyan-300/60',
  'right-[12%] top-[30%] w-2.5 h-2.5 bg-fuchsia-400/60',
  'right-[22%] bottom-[24%] w-1.5 h-1.5 bg-emerald-300/50',
];

// Living particle-constellation canvas — dots drift and wire together,
// and to the cursor, like a neural network over the page.
const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const COUNT = 90;
    const dots: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    const mouse = { x: -9999, y: -9999 };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      dots.length = 0;
      for (let i = 0; i < COUNT; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 1.7 + 0.7,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const isLight = document.documentElement.classList.contains('light');
      const rgb = isLight ? '99,102,241' : '129,140,248';

      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -10 || d.x > w + 10) d.vx *= -1;
        if (d.y < -10 || d.y > h + 10) d.vy *= -1;
      }

      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(${rgb}, ${(1 - dist / 120) * 0.24})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        const mdx = a.x - mouse.x;
        const mdy = a.y - mouse.y;
        const mdist = Math.hypot(mdx, mdy);
        if (mdist < 180) {
          ctx.strokeStyle = `rgba(${rgb}, ${(1 - mdist / 180) * 0.6})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }

        ctx.fillStyle = `rgba(${rgb}, 0.85)`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const onResize = () => {
      resize();
      init();
    };

    resize();
    init();
    draw();
    if (!reduceMotion) {
      const loop = () => {
        draw();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseout', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

// Fixed, site-wide ambient background: particle constellation, gradient
// wash, aurora glows and floating orbs. Rendered behind every page.
export const PageBackground: React.FC = () => {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0">
        <ParticleBackground />
      </div>
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-indigo-700/15 via-transparent to-purple-800/15" />
      <div className="pointer-events-none fixed -top-40 -left-40 w-[34rem] h-[34rem] rounded-full bg-indigo-600/25 blur-[140px] animate-aurora-a" />
      <div className="pointer-events-none fixed -bottom-44 -right-36 w-[34rem] h-[34rem] rounded-full bg-purple-600/20 blur-[150px] animate-aurora-b" />
      {orbs.map((cls, i) => (
        <div
          key={`o${i}`}
          className={`pointer-events-none fixed rounded-full blur-[1px] ${cls} ${i % 2 ? 'animate-float-y-late' : 'animate-float-y'}`}
        />
      ))}
    </>
  );
};