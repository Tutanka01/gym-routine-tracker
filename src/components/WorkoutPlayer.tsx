import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { PointerEvent } from "react";
import { Workout } from "../data";
import { motion, AnimatePresence } from "motion/react";
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, Activity, Flame,
  Trophy, RotateCcw, MessageSquare, Shuffle, Mic, MicOff,
  TrendingUp, TrendingDown, AlertCircle, ArrowRight, Layers,
} from "lucide-react";
import { storage, ExerciseLog, SetData, SetType } from "../lib/storage";
import { RestTimer } from "./RestTimer";
import { setVolume, isVolumePR, isWeightPR, exerciseHistorySets, fmtVol } from "../lib/stats";
import { SessionTimer } from "./SessionTimer";
import { WorkoutRoadmap } from "./WorkoutRoadmap";
import { NextExercisePreview } from "./NextExercisePreview";
import { SetNoteSheet } from "./SetNoteSheet";
import { ExerciseSwapSheet } from "./ExerciseSwapSheet";
import { FinishSummary } from "./FinishSummary";
import { ReadinessGate } from "./ReadinessGate";
import { BenchMode } from "./BenchMode";
import {
  autoProgression,
  detectPlateau,
  readinessFactor,
  rirConsistencyWarning,
  ProgressionSuggestion,
} from "../lib/intelligence";

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
  value, onChange, onBlur, step = 1, placeholder, isComplete, inputCls, btnCls,
}: {
  value: string; onChange: (v: string) => void; onBlur?: () => void;
  step?: number; placeholder?: string; isComplete?: boolean; inputCls: string; btnCls: string;
}) {
  const num = parseFloat(value) || 0;
  const dec = () => onChange(String(Math.max(0, Math.round((num - step) * 10) / 10)));
  const inc = () => onChange(String(Math.round((num + step) * 10) / 10));
  return (
    <div className={`flex items-center h-11 rounded-xl overflow-hidden shrink-0 transition-colors ${
      isComplete ? "bg-signal-soft" : "bg-[var(--color-void-3)]"
    }`}>
      <button type="button" onPointerDown={e => { e.preventDefault(); dec(); }}
        className={`${btnCls} h-full flex items-center justify-center text-slate-500 text-sm active:bg-white/[0.06] transition`}>−</button>
      <input type="number" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)}
        onBlur={onBlur} placeholder={placeholder}
        className={`${inputCls} h-full text-center font-mono tnum text-sm font-bold bg-transparent outline-none transition placeholder-slate-700 ${
          isComplete ? "text-[var(--color-signal)]" : "text-[#C0D0F0]"
        }`} />
      <button type="button" onPointerDown={e => { e.preventDefault(); inc(); }}
        className={`${btnCls} h-full flex items-center justify-center text-slate-500 text-sm active:bg-white/[0.06] transition`}>+</button>
    </div>
  );
}

function formatRest(s: number) {
  if (s >= 60) { const m = Math.floor(s / 60); const sec = s % 60; return sec > 0 ? `${m} min ${sec}s` : `${m} min`; }
  return `${s}s`;
}

const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: 'Normal', drop: 'Drop set', cluster: 'Cluster', superset: 'Superset',
};

const SET_TYPE_COLORS: Record<SetType, string> = {
  normal: '', drop: '#FF6B35', cluster: '#818CF8', superset: '#F59E0B',
};

const hasSpeechAPI =
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

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
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [noteTarget, setNoteTarget] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [showSwapSheet, setShowSwapSheet] = useState(false);

  // A6 — Readiness gate
  const [showReadinessGate, setShowReadinessGate] = useState(!resumeFromActive);
  const [readiness, setReadiness] = useState<{ sleep: number; energy: number } | null>(null);

  // A5 — Plateau modal
  const [plateauExId, setPlateauExId] = useState<string | null>(null);
  const [dismissedPlateaus, setDismissedPlateaus] = useState<Set<string>>(new Set());

  // A4 — Progression suggestion
  const [progressionSuggestion, setProgressionSuggestion] = useState<ProgressionSuggestion | null>(null);

  // B6 — Set type
  const [setTypeMenu, setSetTypeMenu] = useState<{ exerciseId: string; setIndex: number } | null>(null);

  // B2 — Voice logging
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'done' | 'error'>('idle');
  const speechRef = useRef<any>(null);

  const settings = useMemo(() => storage.getSettings(), []);
  const allSessions = useMemo(() => storage.getSessions(), []);

  const sessionLogsRef = useRef(sessionLogs);
  const longPressTimerRef = useRef<number | null>(null);
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
          displayName: active.logs[ex.id]?.displayName,
          sets: baseSets.map((s, i) => existing[i] || s),
        };
      });
      setSessionLogs(merged);
      setStep(active.step ?? -1);
      if (active.readiness) setReadiness(active.readiness);
    } else {
      setSessionLogs(buildEmptyLogs(workout));
      setStep(-1);
    }
    setLastWorkoutLogs(storage.getLastWorkoutLogs(workout.id));
    setHydrated(true);
  }, [workout, resumeFromActive]);

  useEffect(() => {
    if (!hydrated) return;
    storage.saveActiveSession({ workoutId: workout.id, startedAt, step, logs: sessionLogs, readiness: readiness ?? undefined });
  }, [sessionLogs, step, workout.id, startedAt, hydrated, readiness]);

  // A5 — Plateau check on exercise change
  useEffect(() => {
    const ex = step >= 0 && step < workout.exercises.length ? workout.exercises[step] : null;
    if (!ex || dismissedPlateaus.has(ex.id)) return;
    if (detectPlateau(allSessions, ex.id)) {
      setPlateauExId(ex.id);
    }
    // Compute progression for previous exercise when stepping forward
    if (step > 0) {
      const prevEx = workout.exercises[step - 1];
      if (prevEx) {
        const sug = autoProgression(allSessions, prevEx.id, prevEx.reps, prevEx.isCompound ?? false);
        setProgressionSuggestion(sug && sug.action !== 'maintain' ? sug : null);
      }
    } else {
      setProgressionSuggestion(null);
    }
  }, [step, workout.exercises, allSessions, dismissedPlateaus]);

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
      readiness: readiness ?? undefined,
    });
    storage.clearActiveSession();
    onClose();
  };

  const doAbandon = () => { storage.clearActiveSession(); onClose(); };

  const currentExercise = step >= 0 && step < workout.exercises.length ? workout.exercises[step] : null;
  const nextExercise = step >= 0 && step + 1 < workout.exercises.length ? workout.exercises[step + 1] : null;

  const readinessFact = readiness ? readinessFactor(readiness.sleep, readiness.energy) : 1.0;

  useEffect(() => {
    if (currentExercise) setRestDuration(currentExercise.rest ?? settings.defaultRest);
  }, [currentExercise, settings.defaultRest]);

  const updateSet = (exerciseId: string, setIndex: number, field: keyof SetData, value: string | number | boolean) => {
    setSessionLogs(prev => {
      const updated = { ...prev, [exerciseId]: { ...prev[exerciseId], sets: [...prev[exerciseId].sets] } };
      updated[exerciseId].sets[setIndex] = { ...updated[exerciseId].sets[setIndex], [field]: value };
      return updated;
    });
  };

  const updateExerciseDisplayName = (exerciseId: string, displayName: string) => {
    setSessionLogs(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        displayName: displayName === workout.exercises.find(ex => ex.id === exerciseId)?.name ? undefined : displayName,
      },
    }));
  };

  const displayNameFor = (exerciseId: string) =>
    sessionLogs[exerciseId]?.displayName || workout.exercises.find(ex => ex.id === exerciseId)?.name || exerciseId;

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

    if (becomingComplete) { setIsRestTimerActive(true); setRestartKey(k => k + 1); }
    else { setIsRestTimerActive(false); }

    let willFlashPR = false;
    let prKey = '';

    setSessionLogs(prev => {
      const updated = { ...prev, [exerciseId]: { ...prev[exerciseId], sets: [...prev[exerciseId].sets] } };
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
      const updated = { ...prev, [exerciseId]: { ...prev[exerciseId], sets: [...prev[exerciseId].sets] } };
      updated[exerciseId].sets = updated[exerciseId].sets.map((s, i) => {
        if (s.isComplete) return s;
        const prior = last.sets[i];
        if (!prior) return s;
        return { ...s, weight: s.weight || prior.weight, reps: s.reps || prior.reps };
      });
      return updated;
    });
  };

  // B2 — Voice logging
  const startVoiceLogging = useCallback(() => {
    if (!hasSpeechAPI) return;
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const recognition = new SR() as any;
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setVoiceStatus('listening');
    speechRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      // Extract all numbers (handles "douze" → keep as word for now, just match digits)
      const nums = transcript.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
      if (nums.length >= 2) {
        // First number = reps (smaller), second = weight (larger) — or order in utterance
        const reps = nums[0];
        const weight = nums[1];
        if (currentExercise) {
          const sets = sessionLogsRef.current[currentExercise.id]?.sets ?? [];
          const firstIncomplete = sets.findIndex(s => !s.isComplete);
          if (firstIncomplete !== -1) {
            updateSet(currentExercise.id, firstIncomplete, 'weight', String(weight));
            updateSet(currentExercise.id, firstIncomplete, 'reps', String(reps));
          }
        }
        setVoiceStatus('done');
      } else {
        setVoiceStatus('error');
      }
      setTimeout(() => setVoiceStatus('idle'), 2000);
    };

    recognition.onerror = () => {
      setVoiceStatus('error');
      setTimeout(() => setVoiceStatus('idle'), 2000);
    };

    recognition.start();
  }, [currentExercise]);

  const stopVoice = useCallback(() => {
    speechRef.current?.stop();
    setVoiceStatus('idle');
  }, []);

  const workoutTitle = workout.name.split("—").pop()?.trim() || workout.name;

  const startSetLongPress = (event: PointerEvent<HTMLElement>, exerciseId: string, setIndex: number) => {
    if ((event.target as HTMLElement).closest("button,input")) return;
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      setNoteTarget({ exerciseId, setIndex });
      longPressTimerRef.current = null;
    }, 500);
  };

  const cancelSetLongPress = () => {
    if (!longPressTimerRef.current) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const renderSets = () => {
    if (!currentExercise || !sessionLogs[currentExercise.id]) return null;
    const logs = sessionLogs[currentExercise.id].sets;
    const pastLogs = lastWorkoutLogs?.[currentExercise.id]?.sets || [];
    const exHistory = exerciseHistorySets(allSessions, currentExercise.id);
    const allSetsComplete = logs.every(s => s.isComplete && Number(s.weight) > 0);

    // Compute RIR consistency warning for last completed set
    let rirWarning: string | null = null;
    if (currentExercise.rir && currentExercise.rir !== '-') {
      const targetRir = parseInt(currentExercise.rir, 10) || 2;
      const lastComplete = logs.slice().reverse().find(s => s.isComplete);
      if (lastComplete && pastLogs.length > 0) {
        const prevSet = pastLogs.find((_s, i) => logs.indexOf(lastComplete) === i);
        if (prevSet) {
          rirWarning = rirConsistencyWarning(
            targetRir,
            Number(lastComplete.reps) || 0,
            Number(prevSet.reps) || 0,
            lastComplete.weight === prevSet.weight,
          );
        }
      }
    }

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
          const wouldBePR = !set.isComplete && Number(set.weight) > 0 && Number(set.reps) > 0 &&
            (isVolumePR(candidate, allHistory) || isWeightPR(candidate, allHistory));
          const setKey = `${currentExercise.id}-${idx}`;
          const flashing = prFlashKey?.startsWith(setKey);
          const setType = set.setType ?? 'normal';

          // B5 — Live delta while typing
          const weightNum = Number(set.weight);
          const pastWeightNum = Number(pastSet?.weight);
          const weightDelta = pastWeightNum > 0 && weightNum > 0 ? weightNum - pastWeightNum : null;

          // Adjusted target weight for readiness (A6)
          const adjustedSuggested = pastWeightNum > 0 && readinessFact < 1
            ? Math.round(pastWeightNum * readinessFact / 2.5) * 2.5
            : null;

          return (
            <motion.div key={idx} layout
              onPointerDown={e => startSetLongPress(e, currentExercise.id, idx)}
              onPointerUp={cancelSetLongPress}
              onPointerCancel={cancelSetLongPress}
              onPointerLeave={cancelSetLongPress}
              className={`flex flex-col rounded-xl transition-colors border ${
                set.isComplete
                  ? isPR
                    ? "bg-acid-soft border-[var(--color-acid)]/25"
                    : "bg-signal-soft border-signal-soft"
                  : "bg-[var(--color-void-2)] border-white/[0.05]"
              } ${flashing ? "pr-flash" : ""}`}
            >
              <div className="flex items-center gap-2 px-2 py-1.5">
                {/* Set number + type indicator */}
                <div className="w-5 text-center text-xs font-mono font-bold shrink-0">
                  <span className={`inline-flex items-center justify-center gap-0.5 ${
                    set.isComplete ? (isPR ? "text-[var(--color-acid)]" : "text-[var(--color-signal)]") : "text-slate-600"
                  }`}>
                    {idx + 1}
                    {set.note && <MessageSquare className="w-3 h-3" />}
                  </span>
                  {setType !== 'normal' && (
                    <div
                      className="text-[8px] font-bold leading-none mt-0.5 truncate"
                      style={{ color: SET_TYPE_COLORS[setType] }}
                    >
                      {setType === 'drop' ? 'D' : setType === 'cluster' ? 'C' : 'SS'}
                    </div>
                  )}
                </div>

                <StepperInput value={set.weight}
                  onChange={v => updateSet(currentExercise.id, idx, 'weight', v)}
                  onBlur={() => handleSetBlur(currentExercise.id, idx)}
                  step={2.5} placeholder={adjustedSuggested ? String(adjustedSuggested) : (pastSet?.weight || "0")}
                  isComplete={set.isComplete} inputCls="w-11" btnCls="w-7" />

                <span className="text-slate-700 text-xs font-bold shrink-0">×</span>

                <StepperInput value={set.reps}
                  onChange={v => updateSet(currentExercise.id, idx, 'reps', v)}
                  onBlur={() => handleSetBlur(currentExercise.id, idx)}
                  step={1} placeholder={pastSet?.reps || "0"}
                  isComplete={set.isComplete} inputCls="w-8" btnCls="w-6" />

                <AnimatePresence>
                  {wouldBePR && (
                    <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }}
                      className="shrink-0 rounded-lg bg-[var(--color-signal)]/10 border border-[var(--color-signal)]/20 px-2 py-1 text-[10px] font-bold text-[var(--color-signal)]">
                      + PR
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* B5 — Delta + past performance */}
                <div className="flex-1 text-right min-w-0">
                  {weightDelta !== null && !set.isComplete && (
                    <motion.span
                      key={weightDelta}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-[10px] font-bold font-mono block ${
                        weightDelta > 0 ? 'text-[var(--color-signal)]' : weightDelta < 0 ? 'text-[var(--color-flame)]' : 'text-slate-600'
                      }`}
                    >
                      {weightDelta > 0 ? '+' : ''}{weightDelta} kg
                    </motion.span>
                  )}
                  {pastSet?.weight && (
                    <span className="text-[10px] font-mono text-slate-700 block truncate">
                      {pastSet.weight}×{pastSet.reps}
                    </span>
                  )}
                </div>

                {/* Set type button (B6) */}
                <button
                  type="button"
                  onClick={() => setSetTypeMenu({ exerciseId: currentExercise.id, setIndex: idx })}
                  className={`w-6 h-6 rounded flex items-center justify-center transition shrink-0 ${
                    setType !== 'normal' ? 'opacity-100' : 'opacity-30 hover:opacity-60'
                  }`}
                  style={{ color: setType !== 'normal' ? SET_TYPE_COLORS[setType] : '#64748b' }}
                >
                  <Layers className="w-3 h-3" />
                </button>

                {/* Complete button */}
                <button onClick={() => toggleSetComplete(currentExercise.id, idx)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                    set.isComplete
                      ? isPR ? "bg-[var(--color-acid)] text-black shadow-md shadow-[var(--color-acid)]/25"
                             : "bg-[var(--color-signal)] text-black shadow-md shadow-[var(--color-signal)]/20"
                      : "bg-[var(--color-void-3)] text-slate-600 active:bg-[var(--color-void-4)]"
                  }`} aria-label={set.isComplete ? "Rouvrir" : "Valider"}>
                  {isPR && set.isComplete
                    ? <Trophy className="w-4 h-4" strokeWidth={2.5} />
                    : <Check className="w-5 h-5" strokeWidth={3} />}
                </button>
              </div>

              {/* A3 — RIR actual picker (shows after completing a set) */}
              <AnimatePresence>
                {set.isComplete && !isPR && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-2 pb-2 pt-0.5">
                      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider shrink-0">RIR réel</span>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => updateSet(currentExercise.id, idx, 'rirActual', r)}
                            className={`w-6 h-6 rounded-lg text-[11px] font-bold transition-all ${
                              set.rirActual === r
                                ? 'text-black'
                                : 'text-slate-600 bg-[var(--color-void-3)]'
                            }`}
                            style={set.rirActual === r ? { background: 'var(--color-signal)' } : {}}
                          >
                            {r === 4 ? '4+' : r}
                          </button>
                        ))}
                      </div>
                      {set.rirActual !== undefined && (
                        <span className="text-[10px] text-slate-600 ml-auto">
                          {set.rirActual === 0 ? 'À l\'échec' : `${set.rirActual} reps en réserve`}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* A3 — RIR consistency warning */}
        <AnimatePresence>
          {rirWarning && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[rgba(255,215,64,0.07)] border border-[rgba(255,215,64,0.15)]"
            >
              <AlertCircle className="w-3.5 h-3.5 text-[var(--color-acid)] shrink-0 mt-0.5" />
              <span className="text-[11px] text-slate-400">{rirWarning}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prefill button */}
        {pastLogs.length > 0 && (
          <button onClick={() => prefillExercise(currentExercise.id)}
            className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-dashed border-white/[0.07] text-slate-600 hover:text-slate-400 text-xs font-medium active:scale-[0.99] transition">
            <RotateCcw className="w-3.5 h-3.5" />
            Reprendre la dernière séance
          </button>
        )}

        {/* A4 — Auto-progression card */}
        <AnimatePresence>
          {allSetsComplete && currentExercise && (() => {
            const sug = autoProgression(allSessions, currentExercise.id, currentExercise.reps, currentExercise.isCompound ?? false);
            if (!sug) return null;
            const isGood = sug.action === 'increase-weight';
            const isWarn = sug.action === 'deload' || sug.action === 'plateau';
            return (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`rounded-xl p-3 flex items-center gap-3 ${
                  isGood ? 'bg-signal-soft border border-signal-soft' :
                  isWarn ? 'bg-[rgba(255,107,53,0.08)] border border-[rgba(255,107,53,0.2)]' :
                  'bg-[var(--color-void-2)] border border-white/[0.05]'
                }`}
              >
                {isGood ? <TrendingUp className="w-4 h-4 text-[var(--color-signal)] shrink-0" /> :
                 isWarn ? <TrendingDown className="w-4 h-4 text-[var(--color-flame)] shrink-0" /> :
                 <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-bold ${isGood ? 'text-[var(--color-signal)]' : isWarn ? 'text-[var(--color-flame)]' : 'text-slate-500'}`}>
                    Prochaine fois
                  </div>
                  <div className="text-xs text-slate-400">{sug.reason}</div>
                </div>
                {sug.nextWeight && (
                  <span className={`font-mono font-bold text-sm shrink-0 ${isGood ? 'text-[var(--color-signal)]' : 'text-[var(--color-flame)]'}`}>
                    {sug.nextWeight} kg
                  </span>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        <NextExercisePreview workout={workout} currentStep={step} defaultRest={settings.defaultRest}
          displayNameFor={displayNameFor} onJump={target => { setIsRestTimerActive(false); setStep(target); }} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-void-0)] text-[#C0D0F0] overflow-hidden max-w-md mx-auto relative">

      {/* A6 — Readiness gate */}
      {showReadinessGate && (
        <ReadinessGate
          onStart={(sleep, energy) => {
            setReadiness({ sleep, energy });
            setShowReadinessGate(false);
          }}
        />
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 z-10 bg-[var(--color-void-0)]/90 backdrop-blur-md sticky top-0 border-b border-white/[0.05]">
        <button onClick={() => setShowAbandonConfirm(true)}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-300 active:text-white transition-colors">
          <ChevronLeft className="w-7 h-7" />
        </button>
        <button type="button" onClick={() => setShowRoadmap(true)} className="text-center min-w-0 px-2 active:scale-[0.99] transition">
          <div className="font-semibold text-sm text-slate-300 leading-tight flex items-center justify-center gap-1">
            <span className="truncate">{workoutTitle}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          </div>
          <div className="text-[11px] font-mono tnum text-slate-600 mt-0.5">
            {completedSets}/{totalSets} sets · {fmtVol(liveVolume)} kg
            {readiness && readinessFact < 1 && (
              <span className="ml-1 text-[var(--color-acid)]">· {Math.round(readinessFact * 100)}%</span>
            )}
          </div>
        </button>
        <SessionTimer startedAt={startedAt} />
      </div>

      {/* Progress segments */}
      <div className="px-5 pt-3 pb-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: finishStep + 1 }).map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden bg-white/[0.07]">
              <motion.div className="h-full bg-[var(--color-signal)]"
                initial={{ width: 0 }} animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.35, ease: "easeOut" }} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pb-32 overflow-y-auto view-no-scrollbar">
        <AnimatePresence mode="wait">

          {/* Warmup */}
          {step === -1 && (
            <motion.div key="warmup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col items-center justify-center text-center space-y-5 pt-12">
              <div className="w-20 h-20 bg-signal-soft rounded-2xl flex items-center justify-center text-[var(--color-signal)]">
                <Flame className="w-10 h-10" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-signal)] mb-2 opacity-75">Étape 1 — Échauffement</div>
                <h2 className="font-display font-black text-[#C0D0F0] uppercase" style={{ fontSize: '42px', lineHeight: 0.9 }}>PRÊT À<br />DÉMARRER</h2>
              </div>
              <p className="text-base text-slate-400 px-4 max-w-xs leading-relaxed">{workout.warmup}</p>
              {readiness && readinessFact < 1 && (
                <div className="px-4 py-3 rounded-2xl bg-[rgba(255,215,64,0.07)] border border-[rgba(255,215,64,0.15)] text-sm text-slate-300 text-left w-full">
                  <span className="font-bold text-[var(--color-acid)]">Forme réduite</span> — poids suggérés ajustés à {Math.round(readinessFact * 100)}%.
                </div>
              )}
              {workout.notes && (
                <div className="px-4 py-3 rounded-2xl bg-signal-soft border border-signal-soft text-sm text-slate-300 text-left w-full">
                  {workout.notes}
                </div>
              )}
            </motion.div>
          )}

          {/* Exercise */}
          {currentExercise && (
            <motion.div key={`ex-${step}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80 || info.velocity.x < -500) nextStep();
                else if (info.offset.x > 80 || info.velocity.x > 500) prevStep();
              }}
              className="flex flex-col pb-10">
              <div className="flex items-center justify-between mt-5 mb-2">
                <span className="text-[11px] text-slate-500 font-medium">{step + 1} / {workout.exercises.length}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] px-2.5 py-1 bg-blue-500/10 text-blue-300/80 rounded-lg border border-blue-500/15 font-medium">
                    {currentExercise.reps} reps
                  </span>
                  <span className="text-[11px] px-2.5 py-1 bg-white/[0.05] text-slate-400 rounded-lg border border-white/[0.07] font-medium">
                    RIR {currentExercise.rir}
                  </span>
                  {/* B2 — Voice logging button */}
                  {hasSpeechAPI && (
                    <button type="button"
                      onClick={voiceStatus === 'listening' ? stopVoice : startVoiceLogging}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center active:scale-95 transition ${
                        voiceStatus === 'listening'
                          ? 'bg-[var(--color-signal)] border-transparent text-black'
                          : voiceStatus === 'done'
                          ? 'bg-green-500/20 border-green-500/30 text-green-400'
                          : voiceStatus === 'error'
                          ? 'bg-red-500/15 border-red-500/20 text-red-400'
                          : 'bg-white/[0.05] border-white/[0.07] text-slate-500'
                      }`}
                      title="Logging vocal"
                    >
                      {voiceStatus === 'listening'
                        ? <MicOff className="w-3.5 h-3.5" />
                        : <Mic className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button type="button" onClick={() => setShowSwapSheet(true)}
                    className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.07] text-slate-500 flex items-center justify-center active:scale-95 transition"
                    aria-label="Changer d'exercice">
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h2 className="font-display font-black uppercase text-[#C0D0F0] leading-none mb-3"
                style={{ fontSize: '44px', letterSpacing: '-0.01em' }}>
                {displayNameFor(currentExercise.id)}
              </h2>

              {/* Voice status feedback */}
              <AnimatePresence>
                {voiceStatus !== 'idle' && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`mb-2 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-2 ${
                      voiceStatus === 'listening' ? 'bg-[var(--color-signal)]/10 text-[var(--color-signal)]' :
                      voiceStatus === 'done' ? 'bg-green-500/10 text-green-400' :
                      'bg-red-500/10 text-red-400'
                    }`}
                  >
                    <Mic className="w-3 h-3 shrink-0" />
                    {voiceStatus === 'listening' ? 'Écoute… dites "12 à 80"' :
                     voiceStatus === 'done' ? 'Set rempli !' :
                     'Non compris — réessayez'}
                  </motion.div>
                )}
              </AnimatePresence>

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
            <motion.div key="cooldown" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col items-center justify-center text-center space-y-5 pt-12">
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
            <FinishSummary workout={workout} sessionLogs={sessionLogs} startedAt={startedAt}
              pastSessions={allSessions} completedSets={completedSets} liveVolume={liveVolume}
              displayNameFor={displayNameFor} onFinish={finishWorkout} />
          )}
        </AnimatePresence>
      </div>

      <RestTimer time={restDuration} isActive={isRestTimerActive} restartKey={restartKey}
        onClose={() => setIsRestTimerActive(false)} soundOn={settings.soundOn} vibrate={settings.vibrate} />

      {/* B1 — Bench Mode */}
      <BenchMode
        isRestActive={isRestTimerActive}
        restDuration={restDuration}
        restartKey={restartKey}
        nextExerciseName={nextExercise ? displayNameFor(nextExercise.id) : undefined}
        onDismiss={() => setIsRestTimerActive(false)}
      />

      {/* Bottom bar */}
      {step < finishStep && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--color-void-0)] via-[var(--color-void-0)]/90 to-transparent max-w-md mx-auto z-20 pointer-events-none">
          <div className="flex gap-3 pointer-events-auto">
            {step > -1 && step < finishStep && (
              <button onClick={prevStep}
                className="w-14 h-14 bg-[var(--color-void-2)] border border-white/[0.06] rounded-xl flex items-center justify-center text-slate-400 active:bg-[var(--color-void-3)] transition-colors shrink-0">
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <button onClick={nextStep}
              className="flex-1 text-black text-base font-bold py-4 px-6 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              style={{ background: 'var(--color-signal)', boxShadow: '0 6px 20px rgba(13,223,184,0.25)' }}>
              {step === -1 ? "Démarrer" : "Exercice suivant"}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {showRoadmap && (
        <WorkoutRoadmap workout={workout} sessionLogs={sessionLogs} currentStep={step}
          startedAt={startedAt} defaultRest={settings.defaultRest} displayNameFor={displayNameFor}
          onJump={target => { setIsRestTimerActive(false); setStep(target); }}
          onClose={() => setShowRoadmap(false)}
          onFinish={() => setStep(finishStep)} onAbandon={doAbandon} />
      )}

      <SetNoteSheet isOpen={!!noteTarget}
        initialNote={noteTarget ? sessionLogs[noteTarget.exerciseId]?.sets[noteTarget.setIndex]?.note || "" : ""}
        setLabel={noteTarget ? `Set ${noteTarget.setIndex + 1}` : "Set"}
        onClose={() => setNoteTarget(null)}
        onSave={note => noteTarget && updateSet(noteTarget.exerciseId, noteTarget.setIndex, "note", note)}
        onClear={() => noteTarget && updateSet(noteTarget.exerciseId, noteTarget.setIndex, "note", "")} />

      <ExerciseSwapSheet isOpen={showSwapSheet} exercise={currentExercise}
        selectedName={currentExercise ? displayNameFor(currentExercise.id) : ""}
        onClose={() => setShowSwapSheet(false)}
        onSelect={name => currentExercise && updateExerciseDisplayName(currentExercise.id, name)} />

      {/* A5 — Plateau detection modal */}
      <AnimatePresence>
        {plateauExId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
            onClick={() => { setDismissedPlateaus(s => new Set([...s, plateauExId])); setPlateauExId(null); }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 36 }}
              onClick={e => e.stopPropagation()}
              className="w-full bg-[var(--color-void-1)] border-t border-white/[0.07] rounded-t-3xl px-5 pb-10 pt-5">
              <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-[var(--color-acid)]" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-acid)]">Plateau détecté</div>
              </div>
              <p className="font-display font-black text-[#C0D0F0] mb-1 uppercase" style={{ fontSize: '26px' }}>
                3 séances sans progression
              </p>
              <p className="text-slate-500 text-sm mb-5 leading-relaxed">
                L'e1RM stagne sur cet exercice. Voici 3 interventions.
              </p>
              <div className="space-y-2 mb-5">
                {[
                  { label: 'Deload 10%', desc: 'Réduire le poids, relancer la progression', icon: '↓' },
                  { label: 'Swapper l\'exercice', desc: 'Stimulus différent, même groupe musculaire', icon: '⇄' },
                  { label: 'Changer la plage de reps', desc: 'Ex: passer de 8-12 à 4-6 pendant 3 semaines', icon: '↔' },
                ].map((opt, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-void-2)] border border-white/[0.05]">
                    <span className="text-lg font-mono text-[var(--color-acid)] w-6 text-center shrink-0">{opt.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-[#C0D0F0]">{opt.label}</div>
                      <div className="text-[11px] text-slate-500">{opt.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setDismissedPlateaus(s => new Set([...s, plateauExId])); setPlateauExId(null); }}
                className="w-full bg-[var(--color-void-2)] text-[#C0D0F0] font-bold py-4 rounded-xl border border-white/[0.06] active:scale-[0.98] transition">
                Compris, continuer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* B6 — Set type menu */}
      <AnimatePresence>
        {setTypeMenu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
            onClick={() => setSetTypeMenu(null)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 36 }}
              onClick={e => e.stopPropagation()}
              className="w-full bg-[var(--color-void-1)] border-t border-white/[0.07] rounded-t-3xl px-5 pb-10 pt-5">
              <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
                Type de set — Set {setTypeMenu.setIndex + 1}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['normal', 'drop', 'cluster', 'superset'] as SetType[]).map(t => {
                  const currentType = sessionLogs[setTypeMenu.exerciseId]?.sets[setTypeMenu.setIndex]?.setType ?? 'normal';
                  const isActive = currentType === t;
                  return (
                    <button key={t}
                      onClick={() => {
                        updateSet(setTypeMenu.exerciseId, setTypeMenu.setIndex, 'setType', t);
                        setSetTypeMenu(null);
                      }}
                      className={`py-3.5 px-4 rounded-xl text-sm font-bold border transition-all text-left ${
                        isActive ? 'text-black border-transparent' : 'bg-[var(--color-void-2)] border-white/[0.06] text-slate-400'
                      }`}
                      style={isActive ? {
                        background: SET_TYPE_COLORS[t] || 'var(--color-signal)',
                        boxShadow: `0 4px 14px ${SET_TYPE_COLORS[t] || 'var(--color-signal)'}50`,
                      } : {}}>
                      <div>{SET_TYPE_LABELS[t]}</div>
                      <div className={`text-[10px] font-normal mt-0.5 ${isActive ? 'text-black/70' : 'text-slate-600'}`}>
                        {t === 'drop' ? 'Réduire le poids, 0s de repos' :
                         t === 'cluster' ? '15-20s de repos intra-set' :
                         t === 'superset' ? 'Enchaîner avec un autre exercice' :
                         'Set standard'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Abandon confirmation */}
      <AnimatePresence>
        {showAbandonConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
            onClick={() => setShowAbandonConfirm(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 36 }}
              onClick={e => e.stopPropagation()}
              className="w-full bg-[var(--color-void-1)] border-t border-white/[0.07] rounded-t-3xl px-5 pb-10 pt-5">
              <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />
              <p className="font-display font-black text-[#C0D0F0] mb-1 uppercase" style={{ fontSize: '28px' }}>Abandonner ?</p>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">Ta progression ne sera pas enregistrée.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowAbandonConfirm(false)}
                  className="flex-1 bg-[var(--color-void-2)] text-[#C0D0F0] font-bold py-4 rounded-xl border border-white/[0.06] active:scale-[0.98] transition">
                  Continuer
                </button>
                <button onClick={doAbandon}
                  className="flex-1 bg-red-500/10 text-red-400 font-bold py-4 rounded-xl border border-red-500/15 active:scale-[0.98] transition">
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
