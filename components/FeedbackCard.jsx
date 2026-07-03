// A single category row with an animated score bar.
import { useEffect, useState } from "react";

function barColor(score) {
  if (score >= 80) return "from-green-400 to-green-500";
  if (score >= 60) return "from-ember-400 to-ember-600";
  if (score >= 40) return "from-yellow-400 to-amber-500";
  return "from-red-400 to-red-600";
}

export default function FeedbackCard({ name, score = 0, feedback }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 120);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-semibold text-slate-100">{name}</h4>
        <span className="font-display text-lg font-bold text-slate-200">{score}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor(score)}`}
          style={{ width: `${width}%`, transition: "width 1s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </div>
      {feedback && <p className="mt-3 text-sm leading-relaxed text-slate-400">{feedback}</p>}
    </div>
  );
}
