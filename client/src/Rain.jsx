import { useEffect, useRef } from "react";

export function Atmosphere({ density = 110 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let frame = 0;
    const drops = [];
    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    const spawn = () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      len: 12 + Math.random() * 18,
      speed: 2.4 + Math.random() * 3.6,
      alpha: 0.12 + Math.random() * 0.28,
    });
    resize();
    for (let i = 0; i < density; i += 1) drops.push(spawn());
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      for (const drop of drops) {
        ctx.strokeStyle = `rgba(210, 224, 230, ${drop.alpha})`;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 1.4, drop.y + drop.len);
        ctx.stroke();
        drop.y += drop.speed * 2.4;
        drop.x -= 0.7;
        if (drop.y > height) Object.assign(drop, spawn(), { y: -20 });
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [density]);
  return (
    <>
      <canvas ref={ref} className="rain" />
      <svg className="grain" aria-hidden="true">
        <filter id="grainFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grainFilter)" />
      </svg>
      <div className="vignette" />
    </>
  );
}
