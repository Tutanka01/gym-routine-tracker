import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Timer, Plus, Minus, X, Play, Pause } from "lucide-react";

interface RestTimerProps {
  time: number;
  isActive: boolean;
  restartKey?: number;
  onClose: () => void;
  soundOn?: boolean;
  vibrate?: boolean;
}

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 820;
    o.type = "sine";
    g.gain.value = 0.001;
    o.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    o.start(now);
    o.stop(now + 0.55);
    setTimeout(() => ctx.close(), 800);
  } catch {}
}

export function RestTimer({ time, isActive, restartKey, onClose, soundOn = true, vibrate = true }: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(time);
  const [paused, setPaused] = useState(false);
  const buzzedRef = useRef(false);

  // Reset timer whenever it becomes active OR restartKey changes (new set completed)
  useEffect(() => {
    if (isActive) {
      setTimeLeft(time);
      setPaused(false);
      buzzedRef.current = false;
    }
  }, [isActive, time, restartKey]);

  useEffect(() => {
    if (!isActive || paused) return;
    if (timeLeft <= 0) {
      if (!buzzedRef.current) {
        buzzedRef.current = true;
        if (vibrate && navigator.vibrate) navigator.vibrate([180, 80, 180, 80, 280]);
        if (soundOn) beep();
      }
      // Auto-dismiss 4s after reaching zero
      const dismiss = setTimeout(onClose, 4000);
      return () => clearTimeout(dismiss);
    }
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [isActive, timeLeft, paused, soundOn, vibrate, onClose]);

  const addTime = (s: number) => setTimeLeft(t => Math.max(0, t + s));

  const mins = Math.floor(Math.max(0, timeLeft) / 60);
  const secs = Math.max(0, timeLeft) % 60;
  const progress = Math.max(0, Math.min(1, timeLeft / time));
  const isDone = timeLeft <= 0;

  const R = 36;
  const C = 2 * Math.PI * R;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ y: 160, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 160, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="absolute bottom-28 left-4 right-4 z-50"
        >
          <div className={`relative overflow-hidden rounded-[24px] border ${
            isDone
              ? "border-[var(--color-success)]/40 bg-[var(--color-ink-1)]"
              : "border-white/[0.08] bg-[var(--color-ink-1)]/96"
          } backdrop-blur-xl shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)]`}>

            <div className={`absolute inset-0 pointer-events-none ${
              isDone ? "bg-gradient-to-b from-[var(--color-success)]/8 to-transparent" : "bg-gradient-to-b from-[var(--color-success)]/4 to-transparent"
            }`} />

            <div className="relative z-10 p-4 flex items-center gap-4">
              {/* Ring */}
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,240,220,0.07)" strokeWidth="7" />
                  <motion.circle
                    cx="50" cy="50" r={R} fill="none"
                    stroke={isDone ? "var(--color-success)" : "var(--color-success)"}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    animate={{ strokeDashoffset: C * (1 - progress) }}
                    transition={{ duration: 0.7, ease: "linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`font-mono tnum text-lg font-bold leading-none ${isDone ? "text-success" : "text-[#EDE8E0]"}`}>
                    {mins}:{secs.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Timer className={`w-3 h-3 ${isDone ? "text-success" : "text-[var(--color-success)]"}`} />
                  <span className="text-[11px] font-medium text-zinc-500">
                    {isDone ? "Repos terminé" : "Récupération"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => addTime(-15)}
                    className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-xs font-bold text-zinc-300 flex items-center gap-1 active:scale-95 transition"
                  >
                    <Minus className="w-3 h-3" /> 15
                  </button>
                  <button
                    onClick={() => addTime(15)}
                    className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-xs font-bold text-zinc-300 flex items-center gap-1 active:scale-95 transition"
                  >
                    <Plus className="w-3 h-3" /> 15
                  </button>
                  <button
                    onClick={() => setPaused(p => !p)}
                    className="h-8 w-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-zinc-300 flex items-center justify-center active:scale-95 transition"
                    aria-label={paused ? "Reprendre" : "Pause"}
                  >
                    {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={onClose}
                    className="ml-auto h-8 w-8 rounded-lg bg-[var(--color-ink-3)] hover:bg-[var(--color-ink-4)] text-zinc-500 flex items-center justify-center active:scale-95 transition"
                    aria-label="Fermer"
                  >
                    <X className="w-3.5 h-3.5" />
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
