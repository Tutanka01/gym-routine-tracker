import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye } from "lucide-react";

interface BenchModeProps {
  isRestActive: boolean;
  restDuration: number;
  restartKey: number;
  nextExerciseName?: string;
  onDismiss: () => void;
}

function useCountdown(duration: number, isActive: boolean, restartKey: number) {
  const [remaining, setRemaining] = useState(duration);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    setRemaining(duration);
  }, [restartKey, duration]);

  useEffect(() => {
    if (!isActive) {
      if (ref.current) clearInterval(ref.current);
      return;
    }
    ref.current = window.setInterval(() => {
      setRemaining(r => Math.max(0, r - 1));
    }, 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [isActive, restartKey]);

  return remaining;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function BenchMode({ isRestActive, restDuration, restartKey, nextExerciseName, onDismiss }: BenchModeProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [orientationAllowed, setOrientationAllowed] = useState(false);
  const remaining = useCountdown(restDuration, isRestActive && isVisible, restartKey);
  const done = remaining === 0;

  // Request DeviceOrientation permission (iOS 13+) and listen
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      if (!isRestActive) return;
      const beta = e.beta ?? 90;
      const isFlat = Math.abs(beta) < 22;
      setIsVisible(isFlat);
    };

    const setup = async () => {
      // @ts-ignore — iOS 13+ API
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          // @ts-ignore
          const perm = await DeviceOrientationEvent.requestPermission();
          if (perm === 'granted') {
            setOrientationAllowed(true);
            window.addEventListener('deviceorientation', handler, true);
          }
        } catch {
          // Permission denied or not iOS — orientation won't auto-trigger
        }
      } else {
        // Non-iOS: just add the listener
        setOrientationAllowed(true);
        window.addEventListener('deviceorientation', handler, true);
      }
    };

    setup();
    return () => window.removeEventListener('deviceorientation', handler, true);
  }, [isRestActive]);

  // Dismiss when rest ends
  useEffect(() => {
    if (done && isVisible) {
      const t = setTimeout(() => setIsVisible(false), 1500);
      return () => clearTimeout(t);
    }
  }, [done, isVisible]);

  // Hide when rest stops
  useEffect(() => {
    if (!isRestActive) setIsVisible(false);
  }, [isRestActive]);

  return (
    <>
      {/* Manual trigger button (shown during rest when orientation not available or as fallback) */}
      <AnimatePresence>
        {isRestActive && !isVisible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsVisible(true)}
            className="fixed top-16 right-4 z-30 w-9 h-9 rounded-xl bg-[var(--color-void-2)] border border-white/[0.08] flex items-center justify-center text-slate-500 active:scale-95 transition"
            title="Mode salle (Bench Mode)"
          >
            <Eye className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Glance overlay */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-[var(--color-void-0)] flex flex-col items-center justify-center"
            onClick={onDismiss}
          >
            {/* Status pill */}
            <div className="absolute top-8 left-0 right-0 flex justify-center">
              <div className="px-4 py-1.5 rounded-full bg-[var(--color-void-2)] border border-white/[0.08] text-[11px] font-bold uppercase tracking-widest text-slate-500">
                {done ? '🔔 Go !' : 'Repos · tap pour fermer'}
              </div>
            </div>

            {/* Timer */}
            <motion.div
              key={done ? 'done' : 'counting'}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display font-black tnum text-center select-none"
              style={{
                fontSize: 'clamp(120px, 28vw, 220px)',
                lineHeight: 0.85,
                letterSpacing: '-0.02em',
                color: done ? 'var(--color-signal)' : '#C0D0F0',
                textShadow: done ? '0 0 60px rgba(13,223,184,0.4)' : 'none',
              }}
            >
              {done ? 'GO' : fmt(remaining)}
            </motion.div>

            {/* Next exercise */}
            {nextExerciseName && (
              <div className="mt-10 text-center px-8">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">Prochain</div>
                <div
                  className="font-display font-black uppercase text-slate-400 text-center leading-tight"
                  style={{ fontSize: 'clamp(22px, 6vw, 36px)' }}
                >
                  {nextExerciseName}
                </div>
              </div>
            )}

            {/* Bottom hint */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center">
              <span className="text-[11px] text-slate-700 font-mono">
                {orientationAllowed ? 'Redresse le téléphone pour fermer' : 'Tap pour fermer'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
