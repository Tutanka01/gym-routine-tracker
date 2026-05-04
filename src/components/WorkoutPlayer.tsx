import { useState, useEffect, useMemo, useRef } from "react";
import { Workout } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Activity, Flame, Trophy, CheckCircle2, Zap, RotateCcw } from "lucide-react";
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

function StepperInput({
  value,
  onChange,
  onBlur,
  step = 1,
  placeholder,
  isComplete,
  inputCls,
  btnCls,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  step?: number;
  placeholder?: string;
  isComplete?: boolean;
  inputCls: string;
  btnCls: string;
}) {
  const num = parseFloat(value) || 0;
  const dec = () => onChange(String(Math.max(0, Math.round((num - step) * 10) / 10)));
  const inc = () => onChange(String(Math.round((num + step) * 10) / 10));

  return (
    <div className={`flex items-center h-11 rounded-xl overflow-hidden shrink-0 transition-colors ${
      isComplete ? "bg-signal-soft" : "bg-[var(--color-void-3)]"
    }`}>
      <button
        type="button"
        onPointerDown={e => { e.preventDefault(); dec(); }}
        className={`${btnCls} h-full flex items-center justify-center text-slate-500 text-sm active:bg-white/[0.06] transition`}
      >−</button>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`${inputCls} h-full text-center font-mono tnum text-sm font-bold bg-transparent outline-none transition placeholder-slate-700 ${
          isComplete ? "text-[var(--color-signal)]" : "text-[#C0D0F0]"
        }`}
      />
      <button
        type="button"
        onPointerDown={e => { e.preventDefault(); inc(); }}
        className={`${btnCls} h-full flex items-center justify-center text-slate-500 text-sm active:bg-white/[0.06] transition`}
      >+</button>
    </div>
  );
}

function formatRest(s: number) {
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return sec > 0 ? `${m} min ${sec}s` : `${m} min`;
  }
  return `${s}s`;
}

export function WorkoutPlayer({ workout, onClose, resumeFromActive }: WorkoutPlayerProps) {
  const hasCooldown = !!workout.cooldown;
  const finishStep = workout.exercises.length + (hasCooldown ? 1 : 0);

  const [step, setStep] = useState(-1);
  const [sessionLogs, setSessionLogs] = useState<Record<string, ExerciseLog>>({});
  const [lastWorkoutLogs, setLastWorkoutLogs] = useState<Record<string, ExerciseLog> | null>(null);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [restDuration, setRestDuration] = useState(90);
  const [prFlashKey, setPrFlashKey] = useState<string | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());
  const [hydrated, setHydrated] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const settings = useMemo(() => storage.getSettings(), []);
  const allSessions = useMemo(() => storage.getSessions(), []);

  const sessionLogsRef = useRef(sessionLogs);
  useEffect(() => { sessionLogsRef.current = sessionLogs; }, [sessionLogs]);

  useEffect(() => {
    const active = storage.getActiveSession();
    if (resumeFromActive && active && active.workoutId === workout.id) {
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

  useEffect(() => {
    if (!hydrated) return;
    storage.saveActiveSession({ workoutId: workout.id, startedAt, step, logs: sessionLogs });
  }, [sessionLogs, step, workout.id, startedAt, hydrated]);

  const liveVolume = useMemo(
    () => (Object.values(sessionLogs) as ExerciseLog[]).flatMap(l => l.sets).reduce((a, s) => a + setVolume(s), 0),
    [sessionLogs],
  );
  const completedSets = useMemo(
    () => (Object.values(sessionLogs) as ExerciseLog[]).flatMap(l => l.sets).filter(s => s.isComplete).length,
    [sessionLogs],
  );
  const totalSets = useMemo(() => workout.exercises.reduce((a, e) => a + e.sets, 0), [workout]);

  const prevStep = () => { setIsRestTimerActive(false); if (step > -1) setStep(step - 1); };
  const nextStep = () => { setIsRestTimerActive(false); if (step < finishStep) setStep(step + 1); };

  const finishWorkout = () => {
    storage.saveSession({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      workoutId: workout.id,
      workoutName: workout.name,
      logs: sessionLogs,
      durationSec: Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)),
      totalVolume: liveVolume,
    });
    storage.clearActiveSession();
    onClose();
  };

  const doAbandon = () => { storage.clearActiveSession(); onClose(); };

  const currentExercise = step >= 0 && step < workout.exercises.length ? workout.exercises[step] : null;

  useEffect(() => {
    if (currentExercise) setRestDuration(currentExercise.rest ?? settings.defaultRest);
  }, [currentExercise, settings.defaultRest]);

  const updateSet = (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: string) => {
    setSessionLogs(prev => {
      const updated = { ...prev, [exerciseId]: { sets: [...prev[exerciseId].sets] } };
      updated[exerciseId].sets[setIndex] = { ...updated[exerciseId].sets[setIndex], [field]: value };
      return updated;
    });
  };

  const handleSetBlur = (exerciseId: string, setIndex: number) => {
    setTimeout(() => {
      const set = sessionLogsRef.current[exerciseId]?.sets[setIndex];
      if (set && !set.isComplete && Number(set.weight) > 0 && Number(set.reps) > 0) {
        toggleSetComplete(exerciseId, setIndex);
      }
    }, 20);
  };

  const toggleSetComplete = (exerciseId: string, setIndex: number) => {
    const currentSet = sessionLogs[exerciseId]?.sets[setIndex];
    if (!currentSet) return;
    const becomingComplete = !currentSet.isComplete;

    if (becomingComplete) {
      setIsRestTimerActive(true);
      setRestartKey(k => k + 1);
    } else {
      setIsRestTimerActive(false);
    }

    let willFlashPR = false;
    let prKey = '';

    setSessionLogs(prev => {
      const updated = { ...prev, [exerciseId]: { sets: [...prev[exerciseId].sets] } };
      const set = { ...updated[exerciseId].sets[setIndex] };
      set.isComplete = becomingComplete;

      if (becomingComplete) {
        set.ts = Date.now();
        const pastHistory = exerciseHistorySets(allSessions, exerciseId);
        const currentSets: SetData[] = prev[exerciseId].sets
          .filter((s, i) => i !== setIndex && s.isComplete && Number(s.weight) > 0)
          .map(s => ({ weight: s.weight, reps: s.reps, isComplete: true as const }));
        const allHistory = [...pastHistory, ...currentSets];
        const candidate: SetData = { weight: set.weight, reps: set.reps, isComplete: true };

        if (isVolumePR(candidate, allHistory) || isWeightPR(candidate, allHistory)) {
          willFlashPR = true;
          prKey = `${exerciseId}-${setIndex}-${Date.now()}`;
        }
      }

      updated[exerciseId].sets[setIndex] = set;
      return updated;
    });

    if (willFlashPR && prKey) {
      setPrFlashKey(prKey);
      if (navigator.vibrate) navigator.vibrate([40, 50, 40, 50, 120]);
      setTimeout(() => setPrFlashKey(k => (k === prKey ? null : k)), 1500);
    }
  };

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

  const workoutTitle = workout.name.split("—").pop()?.trim() || workout.name;

  const renderSets = () => {
    if (!currentExercise || !sessionLogs[currentExercise.id]) return null;
    const logs = sessionLogs[currentExercise.id].sets;
    const pastLogs = lastWorkoutLogs?.[currentExercise.id]?.sets || [];
    const exHistory = exerciseHistorySets(allSessions, currentExercise.id);

    return (
      <div className="space-y-2 mt-5">
        {logs.map((set, idx) => {
          const pastSet = pastLogs[idx];
          const currentSets: SetData[] = logs
            .filter((s, i) => i !== idx && s.isComplete && Number(s.weight) > 0)
            .map(s => ({ weight: s.weight, reps: s.reps, isComplete: true as const }));
          const allHistory = [...exHistory, ...currentSets];
          const candidate: SetData = { weight: set.weight, reps: set.reps, isComplete: true };
          const isPR = set.isComplete && Number(set.weight) > 0 && allHistory.length > 0 &&
            (isVolumePR(candidate, allHistory) || isWeightPR(candidate, allHistory));
          const setKey = `${currentExercise.id}-${idx}`;
          const flashing = prFlashKey?.startsWith(setKey);

          return (
            <motion.div
              key={idx}
              layout
              className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors ${
                set.isComplete
                  ? isPR
                    ? "bg-acid-soft border border-[var(--color-acid)]/25"
                    : "bg-signal-soft border border-signal-soft"
                  : "bg-[var(--color-void-2)] border border-white/[0.05]"
              } ${flashing ? "pr-flash" : ""}`}
            >
              <span className={`w-5 text-center text-xs font-mono font-bold shrink-0 ${
                set.isComplete ? (isPR ? "text-[var(--color-acid)]" : "text-[var(--color-signal)]") : "text-slate-600"
              }`}>
                {idx + 1}
              </span>

              <StepperInput
                value={set.weight}
                onChange={v => updateSet(currentExercise.id, idx, 'weight', v)}
                onBlur={() => handleSetBlur(currentExercise.id, idx)}
                step={2.5}
                placeholder={pastSet?.weight || "0"}
                isComplete={set.isComplete}
                inputCls="w-11"
                btnCls="w-7"
              />

              <span className="text-slate-700 text-xs font-bold shrink-0">×</span>

              <StepperInput
                value={set.reps}
                onChange={v => updateSet(currentExercise.id, idx, 'reps', v)}
                onBlur={() => handleSetBlur(currentExercise.id, idx)}
                step={1}
                placeholder={pastSet?.reps || "0"}
                isComplete={set.isComplete}
                inputCls="w-8"
                btnCls="w-6"
              />

              {pastSet?.weight && (
                <span className="flex-1 text-[10px] font-mono text-slate-700 text-right pr-1 min-w-0 truncate">
                  {pastSet.weight}×{pastSet.reps}
                </span>
              )}
              {!pastSet?.weight && <div className="flex-1" />}

              <button
                onClick={() => toggleSetComplete(currentExercise.id, idx)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                  set.isComplete
                    ? isPR
                      ? "bg-[var(--color-acid)] text-black shadow-md shadow-[var(--color-acid)]/25"
                      : "bg-[var(--color-signal)] text-black shadow-md shadow-[var(--color-signal)]/20"
                    : "bg-[var(--color-void-3)] text-slate-600 active:bg-[var(--color-void-4)]"
                }`}
                aria-label={set.isComplete ? "Rouvrir" : "Valider"}
              >
                {isPR && set.isComplete
                  ? <Trophy className="w-4 h-4" strokeWidth={2.5} />
                  : <Check className="w-5 h-5" strokeWidth={3} />
                }
              </button>
            </motion.div>
          );
        })}

        {pastLogs.length > 0 && (
          <button
            onClick={() => prefillExercise(currentExercise.id)}
            className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-dashed border-white/[0.07] text-slate-600 hover:text-slate-400 text-xs font-medium active:scale-[0.99] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reprendre la dernière séance
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-void-0)] text-[#C0D0F0] overflow-hidden max-w-md mx-auto relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 z-10 bg-[var(--color-void-0)]/90 backdrop-blur-md sticky top-0 border-b border-white/[0.05]">
        <button
          onClick={() => setShowAbandonConfirm(true)}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-300 active:text-white transition-colors"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div className="text-center">
          <div className="font-semibold text-sm text-slate-300 leading-tight">{workoutTitle}</div>
          <div className="text-[11px] font-mono tnum text-slate-600 mt-0.5">
            {completedSets}/{totalSets} sets · {fmtVol(liveVolume)} kg
          </div>
        </div>
        <div className="w-11" />
      </div>

      {/* Progress segments */}
      <div className="px-5 pt-3 pb-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: finishStep + 1 }).map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden bg-white/[0.07]">
              <motion.div
                className="h-full bg-[var(--color-signal)]"
                initial={{ width: 0 }}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pb-32 overflow-y-auto view-no-scrollbar">
        <AnimatePresence mode="wait">
          {/* Warmup */}
          {step === -1 && (
            <motion.div
              key="warmup"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col items-center justify-center text-center space-y-5 pt-12"
            >
              <div className="w-20 h-20 bg-signal-soft rounded-2xl flex items-center justify-center text-[var(--color-signal)]">
                <Flame className="w-10 h-10" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-signal)] mb-2 opacity-75">Étape 1 — Échauffement</div>
                <h2 className="font-display font-black text-[#C0D0F0] uppercase" style={{ fontSize: '42px', lineHeight: 0.9 }}>PRÊT À<br />DÉMARRER</h2>
              </div>
              <p className="text-base text-slate-400 px-4 max-w-xs leading-relaxed">{workout.warmup}</p>
              {workout.notes && (
                <div className="px-4 py-3 rounded-2xl bg-signal-soft border border-signal-soft text-sm text-slate-300 text-left w-full">
                  {workout.notes}
                </div>
              )}
            </motion.div>
          )}

          {/* Exercise */}
          {currentExercise && (
            <motion.div
              key={`ex-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col pb-10"
            >
              <div className="flex items-center justify-between mt-5 mb-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  {step + 1} / {workout.exercises.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] px-2.5 py-1 bg-blue-500/10 text-blue-300/80 rounded-lg border border-blue-500/15 font-medium">
                    {currentExercise.reps} reps
                  </span>
                  <span className="text-[11px] px-2.5 py-1 bg-white/[0.05] text-slate-400 rounded-lg border border-white/[0.07] font-medium">
                    RIR {currentExercise.rir}
                  </span>
                </div>
              </div>

              <h2 className="font-display font-black uppercase text-[#C0D0F0] leading-none mb-3" style={{ fontSize: '44px', letterSpacing: '-0.01em' }}>
                {currentExercise.name}
              </h2>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{currentExercise.sets} séries</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span>Repos {formatRest(restDuration)}</span>
              </div>

              {currentExercise.notes && (
                <div className="bg-signal-soft text-slate-300 p-3.5 rounded-xl text-sm border border-signal-soft font-medium mt-4">
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
              className="flex flex-col items-center justify-center text-center space-y-5 pt-12"
            >
              <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center">
                <Activity className="w-10 h-10" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2 opacity-80">Dernière étape</div>
                <h2 className="font-display font-black uppercase text-[#C0D0F0]" style={{ fontSize: '42px', lineHeight: 0.9 }}>COOL-DOWN</h2>
              </div>
              <p className="text-base text-slate-400 px-4 max-w-xs leading-relaxed">{workout.cooldown}</p>
            </motion.div>
          )}

          {/* Finish */}
          {step === finishStep && (
            <motion.div
              key="finish"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28 }}
              className="flex flex-col items-center justify-center text-center pb-20 pt-10"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 240, damping: 18 }}
                className="w-24 h-24 bg-signal-soft rounded-full flex items-center justify-center mb-7"
                style={{ boxShadow: '0 0 40px rgba(13,223,184,0.2)' }}
              >
                <CheckCircle2 className="w-11 h-11 text-[var(--color-signal)]" strokeWidth={1.6} />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="font-display font-black text-[#C0D0F0] mb-1 uppercase"
                style={{ fontSize: '64px', lineHeight: 0.85 }}
              >
                BRAVO
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.26 }}
                className="text-slate-500 text-sm mb-8"
              >
                Séance enregistrée.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 }}
                className="grid grid-cols-3 gap-3 w-full px-2 max-w-sm"
              >
                <StatCard label="Sets" value={`${completedSets}`} />
                <StatCard label="Volume" value={fmtVol(liveVolume)} unit="kg" />
                <StatCard label="Durée" value={`${Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000))}'`} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RestTimer
        time={restDuration}
        isActive={isRestTimerActive}
        restartKey={restartKey}
        onClose={() => setIsRestTimerActive(false)}
        soundOn={settings.soundOn}
        vibrate={settings.vibrate}
      />

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--color-void-0)] via-[var(--color-void-0)]/90 to-transparent max-w-md mx-auto z-20 pointer-events-none">
        <div className="flex gap-3 pointer-events-auto">
          {step > -1 && step < finishStep && (
            <button
              onClick={prevStep}
              className="w-14 h-14 bg-[var(--color-void-2)] border border-white/[0.06] rounded-xl flex items-center justify-center text-slate-400 active:bg-[var(--color-void-3)] transition-colors shrink-0"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {step < finishStep ? (
            <button
              onClick={nextStep}
              className="flex-1 text-black text-base font-bold py-4 px-6 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              style={{ background: 'var(--color-signal)', boxShadow: '0 6px 20px rgba(13,223,184,0.25)' }}
            >
              {step === -1 ? "Démarrer" : "Exercice suivant"}
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={finishWorkout}
              className="w-full text-black font-bold py-4 rounded-xl text-base active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              style={{ background: 'var(--color-signal)', boxShadow: '0 6px 24px rgba(13,223,184,0.3)' }}
            >
              <Zap className="w-5 h-5" strokeWidth={2.5} />
              Enregistrer la séance
            </button>
          )}
        </div>
      </div>

      {/* Abandon confirmation sheet */}
      <AnimatePresence>
        {showAbandonConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
            onClick={() => setShowAbandonConfirm(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 36 }}
              onClick={e => e.stopPropagation()}
              className="w-full bg-[var(--color-void-1)] border-t border-white/[0.07] rounded-t-3xl px-5 pb-10 pt-5"
            >
              <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />
              <p className="font-display font-black text-[#C0D0F0] mb-1 uppercase" style={{ fontSize: '28px' }}>
                Abandonner ?
              </p>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Ta progression ne sera pas enregistrée.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAbandonConfirm(false)}
                  className="flex-1 bg-[var(--color-void-2)] text-[#C0D0F0] font-bold py-4 rounded-xl border border-white/[0.06] active:scale-[0.98] transition"
                >
                  Continuer
                </button>
                <button
                  onClick={doAbandon}
                  className="flex-1 bg-red-500/10 text-red-400 font-bold py-4 rounded-xl border border-red-500/15 active:scale-[0.98] transition"
                >
                  Abandonner
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-void-2)] border border-white/[0.06] p-4 text-left">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 mb-1.5">{label}</div>
      <div className="font-mono tnum font-bold text-2xl text-[#C0D0F0] leading-none">
        {value}
        {unit && <span className="text-xs text-slate-500 ml-1 font-sans">{unit}</span>}
      </div>
    </div>
  );
}
