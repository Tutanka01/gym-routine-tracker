import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus, X, Play, Pause } from "lucide-react";

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

  const R = 34;
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
          <div className={`relative overflow-hidden rounded-2xl border ${
            isDone
              ? "border-[var(--color-signal)]/35 bg-[var(--color-void-1)]"
              : "border-white/[0.07] bg-[var(--color-void-1)]/96"
          } backdrop-blur-xl`}
            style={{ boxShadow: isDone
              ? '0 20px 40px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(13,223,184,0.08)'
              : '0 20px 40px -12px rgba(0,0,0,0.6)'
            }}
          >
            {/* Top glow */}
            <div className={`absolute inset-0 pointer-events-none ${
              isDone
                ? "bg-gradient-to-b from-[var(--color-signal)]/8 to-transparent"
                : "bg-gradient-to-b from-[var(--color-signal)]/4 to-transparent"
            }`} />

            <div className="relative z-10 p-4 flex items-center gap-4">
              {/* Ring */}
              <div className="relative w-[76px] h-[76px] shrink-0">
                <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
                  <circle cx="44" cy="44" r={R} fill="none" stroke="rgba(100,150,255,0.08)" strokeWidth="5" />
                  <motion.circle
                    cx="44" cy="44" r={R} fill="none"
                    stroke="var(--color-signal)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    animate={{ strokeDashoffset: C * (1 - progress) }}
                    transition={{ duration: 0.7, ease: "linear" }}
                    style={isDone ? { filter: 'drop-shadow(0 0 6px rgba(13,223,184,0.5))' } : {}}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`font-mono tnum font-bold leading-none ${isDone ? "text-[var(--color-signal)]" : "text-[#C0D0F0]"}`}
                    style={{ fontSize: '16px' }}>
                    {mins}:{secs.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2.5 text-slate-500">
                  {isDone ? "Repos terminé" : "Récupération"}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => addTime(-15)}
                    className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-xs font-bold text-slate-300 flex items-center gap-1 active:scale-95 transition"
                  >
                    <Minus className="w-3 h-3" /> 15
                  </button>
                  <button
                    onClick={() => addTime(15)}
                    className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-xs font-bold text-slate-300 flex items-center gap-1 active:scale-95 transition"
                  >
                    <Plus className="w-3 h-3" /> 15
                  </button>
                  <button
                    onClick={() => setPaused(p => !p)}
                    className="h-8 w-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-slate-300 flex items-center justify-center active:scale-95 transition"
                    aria-label={paused ? "Reprendre" : "Pause"}
                  >
                    {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={onClose}
                    className="ml-auto h-8 w-8 rounded-lg bg-[var(--color-void-3)] hover:bg-[var(--color-void-4)] text-slate-500 flex items-center justify-center active:scale-95 transition"
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
