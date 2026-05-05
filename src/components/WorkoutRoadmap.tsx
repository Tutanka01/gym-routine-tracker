import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Flame, Flag, Timer, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Workout } from "../data";
import { ExerciseLog } from "../lib/storage";
import { estimateRemainingSec } from "../lib/stats";

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function StatusIcon({ done, current }: { done: boolean; current: boolean }) {
  if (done) return <CheckCircle2 className="w-5 h-5 text-[var(--color-signal)] fill-[var(--color-signal)]/15" />;
  if (current) return <Circle className="w-5 h-5 text-[var(--color-signal)] fill-[var(--color-signal)]/25 animate-pulse" />;
  return <Circle className="w-5 h-5 text-slate-700" />;
}

export function WorkoutRoadmap({
  workout,
  sessionLogs,
  currentStep,
  startedAt,
  defaultRest,
  displayNameFor,
  onJump,
  onClose,
  onFinish,
  onAbandon,
}: {
  workout: Workout;
  sessionLogs: Record<string, ExerciseLog>;
  currentStep: number;
  startedAt: string;
  defaultRest: number;
  displayNameFor: (exerciseId: string) => string;
  onJump: (step: number) => void;
  onClose: () => void;
  onFinish: () => void;
  onAbandon: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const finishStep = workout.exercises.length + (workout.cooldown ? 1 : 0);
  const remainingSec = estimateRemainingSec(workout, sessionLogs, currentStep, defaultRest);
  const elapsedSec = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const requiredDone = workout.exercises.every(ex =>
    (sessionLogs[ex.id]?.sets || []).filter(s => s.isComplete).length >= ex.sets,
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const jump = (target: number) => {
    onJump(target);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 400, damping: 36 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-h-[88vh] overflow-hidden bg-[var(--color-void-1)] border-t border-white/[0.07] rounded-t-3xl px-5 pb-8 pt-5 flex flex-col"
        >
          <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />
          <div className="flex items-start gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-signal)] mb-1">
                Roadmap
              </div>
              <h2 className="font-display font-black text-[#C0D0F0] uppercase leading-none" style={{ fontSize: "30px" }}>
                {workout.name.split("—").pop()?.trim() || workout.name}
              </h2>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[var(--color-void-2)] text-slate-500 flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            <div className="rounded-xl bg-[var(--color-void-2)] border border-white/[0.05] px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-600 font-bold mb-1">
                <Timer className="w-3 h-3" /> Ecoule
              </div>
              <div className="font-mono tnum font-bold text-[#C0D0F0]">{formatDuration(elapsedSec)}</div>
            </div>
            <div className="rounded-xl bg-[var(--color-void-2)] border border-white/[0.05] px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-600 font-bold mb-1">
                <Flag className="w-3 h-3" /> Restant
              </div>
              <div className="font-mono tnum font-bold text-[#C0D0F0]">{formatDuration(remainingSec)}</div>
            </div>
          </div>

          <div className="overflow-y-auto view-no-scrollbar -mx-1 px-1 pb-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 mb-2">Echauffement</div>
            <button
              onClick={() => jump(-1)}
              className="w-full flex items-center gap-3 rounded-xl bg-[var(--color-void-2)] border border-white/[0.05] px-3 py-3 mb-4 text-left"
            >
              <StatusIcon done={currentStep > -1} current={currentStep === -1} />
              <Flame className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-[#C0D0F0]">Echauffement</span>
            </button>

            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 mb-2">Exercices</div>
            <div className="space-y-2 mb-4">
              {workout.exercises.map((ex, i) => {
                const sets = sessionLogs[ex.id]?.sets || [];
                const done = sets.filter(s => s.isComplete).length;
                const complete = done >= ex.sets;
                return (
                  <button
                    key={ex.id}
                    onClick={() => jump(i)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      currentStep === i
                        ? "bg-signal-soft border-signal-soft"
                        : "bg-[var(--color-void-2)] border-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon done={complete} current={currentStep === i} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[#C0D0F0] truncate">{displayNameFor(ex.id)}</div>
                        <div className="flex gap-1 mt-2">
                          {Array.from({ length: ex.sets }).map((_, idx) => (
                            <span
                              key={idx}
                              className={`h-1 flex-1 rounded-full ${idx < done ? "bg-[var(--color-signal)]" : "bg-white/[0.07]"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-lg bg-white/[0.05] border border-white/[0.06] px-2 py-1 text-[11px] font-mono tnum text-slate-400">
                        {done}/{ex.sets}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {workout.cooldown && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 mb-2">Cooldown</div>
                <button
                  onClick={() => jump(workout.exercises.length)}
                  className="w-full flex items-center gap-3 rounded-xl bg-[var(--color-void-2)] border border-white/[0.05] px-3 py-3 mb-4 text-left"
                >
                  <StatusIcon done={currentStep > workout.exercises.length} current={currentStep === workout.exercises.length} />
                  <span className="text-sm font-semibold text-[#C0D0F0]">Retour au calme</span>
                </button>
              </>
            )}

            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 mb-2">Finish</div>
            <button
              onClick={() => jump(finishStep)}
              className="w-full flex items-center gap-3 rounded-xl bg-[var(--color-void-2)] border border-white/[0.05] px-3 py-3 text-left"
            >
              <StatusIcon done={currentStep === finishStep} current={currentStep === finishStep} />
              <span className="text-sm font-semibold text-[#C0D0F0]">Recap final</span>
            </button>
          </div>

          <div className="flex gap-3 pt-3 border-t border-white/[0.06]">
            <button
              onClick={onAbandon}
              className="w-28 bg-red-500/10 text-red-400 font-bold py-3 rounded-xl border border-red-500/15 active:scale-[0.98] transition"
            >
              Abandonner
            </button>
            {requiredDone && (
              <button
                onClick={() => { onFinish(); onClose(); }}
                className="flex-1 text-black font-bold py-3 rounded-xl active:scale-[0.98] transition"
                style={{ background: "var(--color-signal)" }}
              >
                Terminer maintenant
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

