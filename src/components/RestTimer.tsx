import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Maximize2, Pause, Play } from "lucide-react";
import { cancelRestNotification, scheduleRestNotification, signalRestFinished } from "../lib/native";

interface RestTimerProps {
  time: number;
  isActive: boolean;
  restartKey?: number;
  onClose: () => void;
  soundOn?: boolean;
  vibrate?: boolean;
  /** What comes after the rest, e.g. "Série 2 : 67,5 kg × 8–12". */
  nextLabel?: string;
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

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Rest countdown driven by an absolute end time, so it stays correct when the
 * phone is locked and timers are throttled. Offers a full-screen glance mode
 * readable from the bench.
 */
export function RestTimer({ time, isActive, restartKey, onClose, soundOn = true, vibrate = true, nextLabel }: RestTimerProps) {
  const [endAt, setEndAt] = useState(() => Date.now() + time * 1000);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [glance, setGlance] = useState(false);
  const [total, setTotal] = useState(time);
  const buzzedRef = useRef(false);
  // Once the glance view is dismissed by hand, don't reopen it for this rest.
  const autoGlanceRef = useRef(true);

  const timeLeft = pausedLeft ?? Math.max(0, Math.ceil((endAt - now) / 1000));
  const isDone = timeLeft <= 0;

  useEffect(() => {
    if (isActive) {
      setEndAt(Date.now() + time * 1000);
      setNow(Date.now());
      setPausedLeft(null);
      setTotal(time);
      buzzedRef.current = false;
      autoGlanceRef.current = true;
      void scheduleRestNotification(time);
    } else {
      setGlance(false);
      void cancelRestNotification();
    }
    return () => { void cancelRestNotification(); };
  }, [isActive, time, restartKey]);

  useEffect(() => {
    if (!isActive || pausedLeft !== null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    const onVisible = () => setNow(Date.now());
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [isActive, pausedLeft]);

  useEffect(() => {
    if (!isActive || !isDone || pausedLeft !== null) return;
    if (!buzzedRef.current) {
      buzzedRef.current = true;
      void cancelRestNotification();
      void signalRestFinished(vibrate);
      if (soundOn) beep();
    }
    const dismiss = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(dismiss);
  }, [isActive, isDone, pausedLeft, soundOn, vibrate, onClose]);

  // Android/desktop: laying the phone flat on the bench opens the glance view.
  // iOS needs a permission prompt for orientation, so there it's the button only.
  useEffect(() => {
    if (!isActive) return;
    const DOE = (window as any).DeviceOrientationEvent;
    if (!DOE || typeof DOE.requestPermission === "function") return;
    const handler = (e: DeviceOrientationEvent) => {
      if (autoGlanceRef.current && e.beta !== null && Math.abs(e.beta) < 20) setGlance(true);
    };
    window.addEventListener("deviceorientation", handler, true);
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, [isActive]);

  const addTime = useCallback((s: number) => {
    if (pausedLeft !== null) {
      setPausedLeft(Math.max(0, pausedLeft + s));
      return;
    }
    const next = Math.max(Date.now(), endAt + s * 1000);
    setEndAt(next);
    setTotal(t => Math.max(1, t + s));
    setNow(Date.now());
    const left = Math.ceil((next - Date.now()) / 1000);
    if (left > 0) { buzzedRef.current = false; void scheduleRestNotification(left); }
    else void cancelRestNotification();
  }, [endAt, pausedLeft]);

  const togglePause = () => {
    if (pausedLeft === null) {
      setPausedLeft(timeLeft);
      void cancelRestNotification();
    } else {
      setEndAt(Date.now() + pausedLeft * 1000);
      setNow(Date.now());
      if (pausedLeft > 0) void scheduleRestNotification(pausedLeft);
      setPausedLeft(null);
    }
  };

  const progress = Math.max(0, Math.min(1, 1 - timeLeft / Math.max(1, total)));

  return (
    <>
      <AnimatePresence>
        {isActive && (
          <motion.div
            role="timer"
            aria-label={isDone ? "Repos terminé" : `Repos, ${fmt(timeLeft)} restantes`}
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed safe-rest-timer left-3 right-3 max-w-[calc(28rem-1.5rem)] mx-auto z-30"
          >
            <div className={`rounded-2xl border bg-surface shadow-2xl shadow-black/60 overflow-hidden ${isDone ? "border-go/60" : "border-line"}`}>
              <div className="h-1 bg-raised">
                <div className={`h-full transition-[width] duration-300 ${isDone ? "bg-go" : "bg-chalk"}`} style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="p-3 pl-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`type-num text-[44px] ${isDone ? "text-go" : "text-ink"}`}>{isDone ? "Go" : fmt(timeLeft)}</span>
                    {pausedLeft !== null && <span className="text-sm text-pr font-semibold">En pause</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => addTime(-15)} className="h-11 px-2.5 rounded-xl bg-raised text-ink text-[15px] font-semibold tnum active:bg-line" aria-label="Retirer 15 secondes">−15</button>
                  <button onClick={() => addTime(15)} className="h-11 px-2.5 rounded-xl bg-raised text-ink text-[15px] font-semibold tnum active:bg-line" aria-label="Ajouter 15 secondes">+15</button>
                  <button onClick={togglePause} className="w-11 h-11 rounded-xl bg-raised text-ink flex items-center justify-center active:bg-line" aria-label={pausedLeft !== null ? "Reprendre" : "Pause"}>
                    {pausedLeft !== null ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  </button>
                  <button onClick={() => setGlance(true)} className="w-11 h-11 rounded-xl bg-raised text-ink flex items-center justify-center active:bg-line" aria-label="Plein écran">
                    <Maximize2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {nextLabel && <div className="px-4 -mt-1 pb-2.5 text-[15px] text-muted truncate">{nextLabel}</div>}
              <button onClick={onClose} className="w-full h-11 border-t border-line text-[15px] font-semibold text-muted active:bg-raised">
                {isDone ? "Fermer" : "Passer le repos"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glance mode: phone on the bench, readable from two metres. Tap anywhere to close. */}
      <AnimatePresence>
        {isActive && glance && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { autoGlanceRef.current = false; setGlance(false); }}
            aria-label="Fermer le plein écran"
            className="fixed inset-0 z-[80] bg-bg flex flex-col items-center justify-center px-6"
          >
            <span className={`type-num ${isDone ? "text-go" : "text-ink"}`} style={{ fontSize: "clamp(120px, 38vw, 240px)", fontStretch: "62%" }}>
              {isDone ? "Go" : fmt(timeLeft)}
            </span>
            {nextLabel && <span className="mt-8 text-xl text-muted text-center max-w-[20ch]">{nextLabel}</span>}
            <span className="absolute bottom-10 text-sm text-faint">Touche l'écran pour revenir</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
