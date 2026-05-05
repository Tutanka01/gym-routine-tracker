import { useEffect, useState } from "react";

function formatElapsed(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SessionTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)),
  );

  useEffect(() => {
    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  return (
    <div className="flex items-center justify-end gap-1.5 min-w-16 font-mono tnum text-xs font-bold text-slate-400">
      <span>{formatElapsed(elapsed)}</span>
      <span className="w-2 h-2 rounded-full bg-[var(--color-signal)] animate-pulse shadow-[0_0_12px_rgba(13,223,184,0.55)]" />
    </div>
  );
}

