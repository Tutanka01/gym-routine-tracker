import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Timer, Plus, Minus, X, Play, Pause } from "lucide-react";

interface RestTimerProps {
  time: number;
  isActive: boolean;
  onClose: () => void;
  soundOn?: boolean;
  vibrate?: boolean;
}

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    o.type = "sine";
    g.gain.value = 0.001;
    o.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    o.start(now);
    o.stop(now + 0.6);
    setTimeout(() => ctx.close(), 800);
  } catch {}
}

export function RestTimer({ time, isActive, onClose, soundOn = true, vibrate = true }: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(time);
  const [paused, setPaused] = useState(false);
  const buzzedRef = useRef(false);

  useEffect(() => {
    if (isActive) {
      setTimeLeft(time);
      setPaused(false);
      buzzedRef.current = false;
    }
  }, [isActive, time]);

  useEffect(() => {
    if (!isActive || paused) return;
    if (timeLeft <= 0) {
      if (!buzzedRef.current) {
        buzzedRef.current = true;
        if (vibrate && navigator.vibrate) navigator.vibrate([180, 80, 180, 80, 280]);
        if (soundOn) beep();
      }
      return;
    }
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [isActive, timeLeft, paused, soundOn, vibrate]);

  const addTime = (s: number) => setTimeLeft(t => Math.max(0, t + s));

  const mins = Math.floor(Math.max(0, timeLeft) / 60);
  const secs = Math.max(0, timeLeft) % 60;
  const progress = Math.max(0, Math.min(1, timeLeft / time));
  const isDone = timeLeft <= 0;

  // Circular ring
  const R = 38;
  const C = 2 * Math.PI * R;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="absolute bottom-28 left-4 right-4 z-50"
        >
          <div className={`relative overflow-hidden rounded-[28px] border ${isDone ? "border-[var(--color-acid)]/60 bg-[var(--color-ink-1)]" : "border-white/10 bg-[var(--color-ink-1)]/95"} backdrop-blur-xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]`}>
            {/* Atmospheric gradient */}
            <div className={`absolute inset-0 pointer-events-none ${isDone ? "bg-gradient-to-b from-[var(--color-acid)]/15 to-transparent" : "bg-gradient-to-b from-emerald-500/8 to-transparent"}`} />

            <div className="relative z-10 p-4 flex items-center gap-4">
              {/* Ring + countdown */}
              <div className="relative w-[88px] h-[88px] shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
                  <motion.circle
                    cx="50" cy="50" r={R} fill="none"
                    stroke={isDone ? "var(--color-acid)" : "#34d399"}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    animate={{ strokeDashoffset: C * (1 - progress) }}
                    transition={{ duration: 0.6, ease: "linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono tnum text-xl font-bold leading-none">
                  <span className={isDone ? "text-[var(--color-acid)]" : "text-white"}>
                    {mins}:{secs.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] tracking-[0.25em] font-bold uppercase text-zinc-500">
                    {isDone ? "Repos terminé" : "Repos en cours"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addTime(-15)}
                    className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 flex items-center gap-1 active:scale-95 transition"
                  >
                    <Minus className="w-3 h-3" /> 15
                  </button>
                  <button
                    onClick={() => addTime(15)}
                    className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 flex items-center gap-1 active:scale-95 transition"
                  >
                    <Plus className="w-3 h-3" /> 15
                  </button>
                  <button
                    onClick={() => setPaused(p => !p)}
                    className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 flex items-center justify-center active:scale-95 transition"
                    aria-label={paused ? "Reprendre" : "Pause"}
                  >
                    {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={onClose}
                    className="ml-auto h-9 w-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center active:scale-95 transition"
                    aria-label="Fermer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
