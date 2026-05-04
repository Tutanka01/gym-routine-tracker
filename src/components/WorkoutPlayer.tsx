import { useState, useEffect, useMemo, useRef } from "react";
import { Workout } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Activity, Flame, Trophy, Sparkles, Zap, RotateCcw } from "lucide-react";
import { storage, ExerciseLog, SetData } from "../lib/storage";
import { RestTimer } from "./RestTimer";
import { setVolume, isVolumePR, isWeightPR, exerciseHistorySets, fmtVol } from "../lib/stats";

interface WorkoutPlayerProps {
  workout: Workout;
  onClose: () => void;
  resumeFromActive?: boolean;
}

const buildEmptyLogs = (workout: Workout): Record<string, ExerciseLog> => {
  const initial: Record<string, ExerciseLog> = {};
  workout.exercises.forEach(ex => {
    initial[ex.id] = {
      sets: Array.from({ length: ex.sets }).map(() => ({ weight: '', reps: '', isComplete: false })),
    };
  });
  return initial;
};

export function WorkoutPlayer({ workout, onClose, resumeFromActive }: WorkoutPlayerProps) {
  const hasCooldown = !!workout.cooldown;
  const finishStep = workout.exercises.length + (hasCooldown ? 1 : 0);

  const [step, setStep] = useState(-1);
  const [sessionLogs, setSessionLogs] = useState<Record<string, ExerciseLog>>({});
  const [lastWorkoutLogs, setLastWorkoutLogs] = useState<Record<string, ExerciseLog> | null>(null);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const [prFlashKey, setPrFlashKey] = useState<string | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());
  const [hydrated, setHydrated] = useState(false);

  const settings = useMemo(() => storage.getSettings(), []);
  const allSessions = useMemo(() => storage.getSessions(), []);

  // Hydrate logs: resume active or build fresh
  useEffect(() => {
    const active = storage.getActiveSession();
    if (resumeFromActive && active && active.workoutId === workout.id) {
      // Make sure the structure matches the current workout shape
      const fresh = buildEmptyLogs(workout);
      const merged: Record<string, ExerciseLog> = {};
      workout.exercises.forEach(ex => {
        const existing = active.logs[ex.id]?.sets || [];
        const baseSets = fresh[ex.id].sets;
        merged[ex.id] = {
          sets: baseSets.map((s, i) => existing[i] || s),
        };
      });
      setSessionLogs(merged);
      setStep(active.step ?? -1);
    } else {
      setSessionLogs(buildEmptyLogs(workout));
      setStep(-1);
    }
    setLastWorkoutLogs(storage.getLastWorkoutLogs(workout.id));
    setHydrated(true);
  }, [workout, resumeFromActive]);

  // Autosave on every change after hydration
  useEffect(() => {
    if (!hydrated) return;
    storage.saveActiveSession({
      workoutId: workout.id,
      startedAt,
      step,
      logs: sessionLogs,
    });
  }, [sessionLogs, step, workout.id, startedAt, hydrated]);

  const liveVolume = useMemo(
    () => (Object.values(sessionLogs) as ExerciseLog[]).flatMap(l => l.sets).reduce((a, s) => a + setVolume(s), 0),
    [sessionLogs],
  );
  const completedSets = useMemo(
    () => (Object.values(sessionLogs) as ExerciseLog[]).flatMap(l => l.sets).filter(s => s.isComplete).length,
    [sessionLogs],
  );
  const totalSets = useMemo(
    () => workout.exercises.reduce((a, e) => a + e.sets, 0),
    [workout],
  );

  const prevStep = () => {
    setIsRestTimerActive(false);
    if (step > -1) setStep(step - 1);
  };
  const nextStep = () => {
    setIsRestTimerActive(false);
    if (step < finishStep) setStep(step + 1);
  };

  const finishWorkout = () => {
    const totalVolume = liveVolume;
    const durationSec = Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    storage.saveSession({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      workoutId: workout.id,
      workoutName: workout.name,
      logs: sessionLogs,
      durationSec,
      totalVolume,
    });
    storage.clearActiveSession();
    onClose();
  };

  const abandonWorkout = () => {
    storage.clearActiveSession();
    onClose();
  };

  const currentExercise = step >= 0 && step < workout.exercises.length ? workout.exercises[step] : null;

  // Sync rest duration when entering an exercise
  useEffect(() => {
    if (currentExercise) {
      setRestDuration(currentExercise.rest ?? settings.defaultRest);
    }
  }, [currentExercise, settings.defaultRest]);

  const updateSet = (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: string) => {
    setSessionLogs(prev => {
      const updated = { ...prev, [exerciseId]: { sets: [...prev[exerciseId].sets] } };
      updated[exerciseId].sets[setIndex] = { ...updated[exerciseId].sets[setIndex], [field]: value };
      return updated;
    });
  };

  const toggleSetComplete = (exerciseId: string, setIndex: number) => {
    let triggeredPR = false;
    setSessionLogs(prev => {
      const updated = { ...prev, [exerciseId]: { sets: [...prev[exerciseId].sets] } };
      const set = { ...updated[exerciseId].sets[setIndex] };
      const becomingComplete = !set.isComplete;
      set.isComplete = becomingComplete;
      if (becomingComplete) set.ts = Date.now();
      updated[exerciseId].sets[setIndex] = set;

      if (becomingComplete) {
        setIsRestTimerActive(true);
        // PR detection
        const history = exerciseHistorySets(allSessions, exerciseId);
        const candidate: SetData = { weight: set.weight, reps: set.reps, isComplete: true };
        if (isVolumePR(candidate, history) || isWeightPR(candidate, history)) {
          triggeredPR = true;
        }
      } else {
        // Uncheck → kill timer
        setIsRestTimerActive(false);
      }
      return updated;
    });
    if (triggeredPR) {
      const key = `${exerciseId}-${setIndex}-${Date.now()}`;
      setPrFlashKey(key);
      if (navigator.vibrate) navigator.vibrate([40, 50, 40, 50, 120]);
      setTimeout(() => setPrFlashKey(k => (k === key ? null : k)), 1500);
    }
  };

  // Quick prefill from last session for the whole exercise
  const prefillExercise = (exerciseId: string) => {
    const last = lastWorkoutLogs?.[exerciseId];
    if (!last) return;
    setSessionLogs(prev => {
      const updated = { ...prev, [exerciseId]: { sets: [...prev[exerciseId].sets] } };
      updated[exerciseId].sets = updated[exerciseId].sets.map((s, i) => {
        if (s.isComplete) return s;
        const prior = last.sets[i];
        if (!prior) return s;
        return { ...s, weight: s.weight || prior.weight, reps: s.reps || prior.reps };
      });
      return updated;
    });
  };

  const renderSets = () => {
    if (!currentExercise || !sessionLogs[currentExercise.id]) return null;
    const logs = sessionLogs[currentExercise.id].sets;
    const pastLogs = lastWorkoutLogs?.[currentExercise.id]?.sets || [];
    const exHistory = exerciseHistorySets(allSessions, currentExercise.id);

    return (
      <div className="space-y-2.5 mt-6">
        {/* Header */}
        <div className="flex gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-2 mb-1 items-center">
          <div className="w-7 text-center">N°</div>
          <div className="flex-1">Précédent</div>
          <div className="w-[140px] text-center">KG × Reps</div>
          <div className="w-11 text-center">OK</div>
        </div>

        {logs.map((set, idx) => {
          const pastSet = pastLogs[idx];
          const pastStr = pastSet && pastSet.weight ? `${pastSet.weight}×${pastSet.reps}` : '—';
          const candidate: SetData = { weight: set.weight, reps: set.reps, isComplete: true };
          const isPR = set.isComplete && Number(set.weight) > 0 && (isVolumePR(candidate, exHistory) || isWeightPR(candidate, exHistory));
          const setKey = `${currentExercise.id}-${idx}`;
          const flashing = prFlashKey?.startsWith(setKey);

          return (
            <motion.div
              key={idx}
              layout
              className={`relative flex items-center gap-2 p-2 rounded-2xl transition-all ${
                set.isComplete
                  ? isPR
                    ? "bg-gradient-to-br from-[var(--color-acid)]/15 to-[var(--color-flame)]/10 border border-[var(--color-acid)]/40"
                    : "bg-emerald-500/5 border border-emerald-500/25"
                  : "bg-[var(--color-ink-2)] border border-white/5"
              } ${flashing ? "pr-flash" : ""}`}
            >
              <div className={`w-7 font-mono tnum font-bold text-center text-sm ${set.isComplete ? "text-emerald-400" : "text-zinc-500"}`}>
                {(idx + 1).toString().padStart(2, "0")}
              </div>
              <div className="flex-1 text-xs font-mono tnum text-zinc-500 truncate">{pastStr}</div>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  value={set.weight}
                  onChange={e => updateSet(currentExercise.id, idx, 'weight', e.target.value)}
                  onFocus={() => { if (set.isComplete) toggleSetComplete(currentExercise.id, idx); }}
                  className={`w-[60px] h-12 rounded-xl text-center font-mono tnum text-base font-bold outline-none transition-all placeholder-zinc-700 ${
                    set.isComplete
                      ? "bg-transparent text-emerald-200"
                      : "bg-[var(--color-ink-3)] text-white focus:ring-2 ring-emerald-400/60"
                  }`}
                  placeholder={pastSet?.weight || "0"}
                />
                <span className="text-zinc-600 font-bold text-xs">×</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={set.reps}
                  onChange={e => updateSet(currentExercise.id, idx, 'reps', e.target.value)}
                  onFocus={() => { if (set.isComplete) toggleSetComplete(currentExercise.id, idx); }}
                  className={`w-[60px] h-12 rounded-xl text-center font-mono tnum text-base font-bold outline-none transition-all placeholder-zinc-700 ${
                    set.isComplete
                      ? "bg-transparent text-emerald-200"
                      : "bg-[var(--color-ink-3)] text-white focus:ring-2 ring-emerald-400/60"
                  }`}
                  placeholder={pastSet?.reps || "0"}
                />
              </div>

              <button
                onClick={() => toggleSetComplete(currentExercise.id, idx)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ml-1 active:scale-95 ${
                  set.isComplete
                    ? isPR
                      ? "bg-[var(--color-acid)] text-black shadow-lg shadow-[var(--color-acid)]/30"
                      : "bg-emerald-400 text-black shadow-lg shadow-emerald-400/30"
                    : "bg-zinc-800 text-zinc-500 active:bg-zinc-700"
                }`}
                aria-label={set.isComplete ? "Rouvrir le set" : "Valider le set"}
              >
                {set.isComplete ? (isPR ? <Trophy className="w-5 h-5" strokeWidth={2.6} /> : <Check className="w-6 h-6" strokeWidth={3} />) : <Check className="w-6 h-6" strokeWidth={3} />}
              </button>
            </motion.div>
          );
        })}

        {pastLogs.length > 0 && (
          <button
            onClick={() => prefillExercise(currentExercise.id)}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-dashed border-white/10 text-zinc-400 text-xs font-bold tracking-wider uppercase active:scale-[0.99] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reprendre la dernière séance
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-ink-0)] text-white overflow-hidden max-w-md mx-auto relative shadow-2xl">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 z-10 bg-[var(--color-ink-0)]/80 backdrop-blur-md sticky top-0 border-b border-white/5">
        <button onClick={abandonWorkout} className="p-2 -ml-2 text-zinc-400 active:text-white">
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div className="text-center">
          <div className="font-display font-bold text-xs tracking-[0.3em] text-zinc-500 uppercase">
            {workout.name.split("—")[1]?.trim() || workout.name}
          </div>
          <div className="text-[10px] font-mono tnum text-zinc-600 mt-0.5">
            {completedSets}/{totalSets} sets · {fmtVol(liveVolume)} kg
          </div>
        </div>
        <div className="w-11" />
      </div>

      {/* Progress Bar */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: finishStep + 1 }).map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 h-1 rounded-full overflow-hidden bg-white/[0.06]"
            >
              <motion.div
                className="h-full bg-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pb-32 overflow-y-auto view-no-scrollbar relative">
        <AnimatePresence mode="wait">
          {/* Warmup */}
          {step === -1 && (
            <motion.div
              key="warmup"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col h-full items-center justify-center text-center space-y-6 pt-10"
            >
              <div className="relative">
                <div className="absolute inset-0 blur-3xl bg-orange-500/30 rounded-full" />
                <div className="relative w-28 h-28 bg-orange-500/10 text-orange-400 rounded-full flex items-center justify-center border border-orange-500/30">
                  <Flame className="w-14 h-14" />
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.4em] font-bold text-orange-400 uppercase mb-2">Étape 01</div>
                <h2 className="font-display text-5xl font-bold leading-[0.9]">Échauffement</h2>
              </div>
              <p className="text-lg text-zinc-400 font-medium px-6 max-w-xs">{workout.warmup}</p>
              {workout.notes && (
                <div className="mx-4 px-4 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-sm text-orange-200 text-left">
                  {workout.notes}
                </div>
              )}
            </motion.div>
          )}

          {/* Exercise step */}
          {currentExercise && (
            <motion.div
              key={`ex-${step}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col justify-start pb-10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono tnum text-[10px] font-bold tracking-[0.3em] uppercase text-emerald-400 px-2.5 py-1 bg-emerald-400/10 rounded-full border border-emerald-400/20">
                  EX {(step + 1).toString().padStart(2, "0")} / {workout.exercises.length.toString().padStart(2, "0")}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-300 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-blue-500/20">
                    <Activity className="w-3 h-3" />
                    <span className="font-mono">RIR {currentExercise.rir}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 text-zinc-400 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-white/10">
                    <span className="font-mono">{currentExercise.reps}</span>
                  </div>
                </div>
              </div>

              <h2 className="font-display text-3xl font-bold tracking-tight mb-3 leading-[1.05]">
                {currentExercise.name}
              </h2>

              <div className="flex items-center gap-3 text-xs text-zinc-500 mb-1">
                <span className="font-mono tnum">{currentExercise.sets} sets</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="font-mono tnum">Repos {restDuration}s</span>
              </div>

              {currentExercise.notes && (
                <div className="bg-orange-500/10 text-orange-200 p-3.5 rounded-2xl text-sm border border-orange-500/20 font-medium mt-3">
                  {currentExercise.notes}
                </div>
              )}

              {renderSets()}
            </motion.div>
          )}

          {/* Cooldown */}
          {hasCooldown && step === workout.exercises.length && (
            <motion.div
              key="cooldown"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col h-full items-center justify-center text-center space-y-6 pt-10"
            >
              <div className="relative">
                <div className="absolute inset-0 blur-3xl bg-blue-500/30 rounded-full" />
                <div className="relative w-28 h-28 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center border border-blue-500/30">
                  <Activity className="w-14 h-14" />
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.4em] font-bold text-blue-400 uppercase mb-2">Dernière étape</div>
                <h2 className="font-display text-5xl font-bold leading-[0.9]">Cool-down</h2>
              </div>
              <p className="text-lg text-zinc-400 font-medium px-6 max-w-xs">{workout.cooldown}</p>
            </motion.div>
          )}

          {/* Finish Screen */}
          {step === finishStep && (
            <motion.div
              key="finish"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col h-full items-center justify-center text-center pb-20 pt-6"
            >
              {/* Marquee */}
              <div className="absolute top-12 left-0 right-0 overflow-hidden pointer-events-none opacity-30">
                <div className="marquee-track flex whitespace-nowrap font-display text-7xl font-bold text-[var(--color-acid)]/40">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className="px-6">TERMINÉ ★ TERMINÉ ★ TERMINÉ ★ </span>
                  ))}
                </div>
              </div>

              <div className="relative mb-8">
                <div className="absolute inset-0 blur-3xl bg-[var(--color-acid)]/40 rounded-full" />
                <div className="relative w-32 h-32 bg-[var(--color-acid)] text-black rounded-full flex items-center justify-center">
                  <Sparkles className="w-16 h-16" strokeWidth={2.4} />
                </div>
              </div>

              <h2 className="font-display text-6xl font-bold tracking-tight mb-2 leading-none">
                <span className="shimmer-text">Bravo</span>
              </h2>
              <p className="text-zinc-400 text-base mb-8 max-w-[280px]">
                Séance enregistrée. Tes stats sont à jour.
              </p>

              {/* Stats summary */}
              <div className="grid grid-cols-3 gap-3 w-full px-6 max-w-sm">
                <StatCard label="Sets" value={`${completedSets}`} />
                <StatCard label="Volume" value={`${fmtVol(liveVolume)}`} unit="kg" />
                <StatCard label="Durée" value={`${Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000))}'`} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RestTimer
        time={restDuration}
        isActive={isRestTimerActive}
        onClose={() => setIsRestTimerActive(false)}
        soundOn={settings.soundOn}
        vibrate={settings.vibrate}
      />

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--color-ink-0)] via-[var(--color-ink-0)] to-transparent max-w-md mx-auto z-20 pointer-events-none">
        <div className="flex gap-3 pointer-events-auto">
          {step > -1 && step < finishStep && (
            <button
              onClick={prevStep}
              className="w-16 h-16 bg-[var(--color-ink-2)] border border-white/5 rounded-2xl flex items-center justify-center text-zinc-300 active:bg-[var(--color-ink-3)] transition-colors shrink-0"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          {step < finishStep ? (
            <button
              onClick={nextStep}
              className="flex-1 bg-white text-black text-lg font-bold py-4 px-6 rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center shadow-xl shadow-white/5 font-display tracking-tight"
            >
              <span className="mr-2">{step === -1 ? "Démarrer" : "Suivant"}</span>
              <ChevronRight className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={finishWorkout}
              className="w-full bg-[var(--color-acid)] text-black font-bold py-5 rounded-2xl text-xl shadow-xl shadow-[var(--color-acid)]/30 active:scale-[0.98] transition-transform font-display tracking-tight flex items-center justify-center gap-2"
            >
              <Zap className="w-6 h-6" strokeWidth={2.6} />
              Enregistrer la séance
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-left">
      <div className="text-[10px] tracking-[0.25em] font-bold uppercase text-zinc-500 mb-1">{label}</div>
      <div className="font-mono tnum font-bold text-2xl text-white leading-none">
        {value}
        {unit && <span className="text-xs text-zinc-500 ml-1 font-sans">{unit}</span>}
      </div>
    </div>
  );
}
