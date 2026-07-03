// Animated circular score gauge (0-100).
import { useEffect, useState } from "react";

function colorFor(score) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

export default function ScoreCircle({ score = 0, size = 168, stroke = 12, label = "Overall" }) {
  const [shown, setShown] = useState(0);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = colorFor(score);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const duration = 1100;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(eased * score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const offset = circumference - (shown / 100) * circumference;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#1e293b" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-4xl font-bold" style={{ color }}>
          {shown}
        </span>
        <span className="text-xs uppercase tracking-widest text-slate-400">{label}</span>
      </div>
    </div>
  );
}
