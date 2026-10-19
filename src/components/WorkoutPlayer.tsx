import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { PointerEvent } from "react";
import type { Exercise, Workout } from "../data";
import { motion, AnimatePresence } from "motion/react";
import {
  Check, ChevronLeft, ChevronRight, ListOrdered, MoreHorizontal, Trophy,
  MessageSquare, Shuffle, Mic, Plus, X, Disc3, AlertTriangle,
} from "lucide-react";
import { storage, type ExerciseLog, type ProgramData, type SetData, type SetType } from "../lib/storage";
import { RestTimer } from "./RestTimer";
import { setVolume, isVolumePR, isWeightPR, exerciseHistorySets, fmtKg, fmtTonnage, lastExerciseLog, sanitizeDecimal, workoutTitle } from "../lib/stats";
import { SessionTimer } from "./SessionTimer";
import { WorkoutRoadmap, formatRest } from "./WorkoutRoadmap";
import { NextExercisePreview } from "./NextExercisePreview";
import { SetOptionsSheet } from "./SetOptionsSheet";
import { ExerciseSwapSheet } from "./ExerciseSwapSheet";
import { FinishSummary } from "./FinishSummary";
import { ReadinessGate } from "./ReadinessGate";
import { ExerciseCue } from "./ExerciseCue";
import { PlateCalculator } from "./PlateCalculator";
import { ExerciseDemoCard, ExerciseTechniqueSheet } from "./ExerciseDemo";
import { Sheet, btn } from "./ui";
import {
  autoProgression,
  detectPlateau,
  getNextSetRepsHint,
  getSessionTarget,
  readinessFactor,
  rirConsistencyWarning,
} from "../lib/intelligence";
import { signalSetComplete } from "../lib/native";

interface WorkoutPlayerProps {
  workout: Workout;
  program: ProgramData;
  onClose: () => void;
  resumeFromActive?: boolean;
}

const emptySet = (): SetData => ({ weight: "", reps: "", isComplete: false });

const buildEmptyLogs = (workout: Workout): Record<string, ExerciseLog> => {
  const initial: Record<string, ExerciseLog> = {};
  workout.exercises.forEach(ex => {
    initial[ex.id] = { sets: Array.from({ length: ex.sets }, emptySet) };
  });
  return initial;
};

const SET_TYPE_SHORT: Record<SetType, string> = { normal: "", drop: "Dégressive", cluster: "Cluster", superset: "Superset" };

const hasSpeechAPI =
  typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

function Stepper({
  id, label, value, placeholder, step, done, onChange, onBlur,
}: {
  id: string; label: string; value: string; placeholder: string; step: number; done: boolean;
  onChange: (v: string) => void; onBlur?: () => void;
}) {
  const base = parseFloat(value) || parseFloat(placeholder) || 0;
  const set = (n: number) => onChange(String(Math.max(0, Math.round(n * 100) / 100)));
  return (
    <div className={`flex items-stretch h-12 rounded-xl overflow-hidden ${done ? "bg-transparent" : "bg-raised"}`}>
      {!done && (
        <button type="button" tabIndex={-1} aria-label={`${label} moins ${fmtKg(step)}`}
          onPointerDown={e => { e.preventDefault(); set(base - step); }}
          className="w-8 shrink-0 text-xl text-muted active:bg-line">−</button>
      )}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        value={value.replace(".", ",")}
        placeholder={placeholder.replace(".", ",")}
        onChange={e => onChange(sanitizeDecimal(e.target.value))}
        onBlur={onBlur}
        className={`type-num text-[26px] w-full min-w-0 text-center bg-transparent outline-none placeholder:text-faint/60 ${done ? "text-ink" : "text-ink"}`}
      />
      {!done && (
        <button type="button" tabIndex={-1} aria-label={`${label} plus ${fmtKg(step)}`}
          onPointerDown={e => { e.preventDefault(); set(base + step); }}
          className="w-8 shrink-0 text-xl text-muted active:bg-line">+</button>
      )}
    </div>
  );
}

export function WorkoutPlayer({ workout, program, onClose, resumeFromActive }: WorkoutPlayerProps) {
  const hasCooldown = !!workout.cooldown;
  const finishStep = workout.exercises.length + (hasCooldown ? 1 : 0);

  const [step, setStep] = useState(-1);
  const [sessionLogs, setSessionLogs] = useState<Record<string, ExerciseLog>>({});
  const [lastWorkoutLogs, setLastWorkoutLogs] = useState<Record<string, ExerciseLog> | null>(null);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [restDuration, setRestDuration] = useState(90);
  const [prFlashKey, setPrFlashKey] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [hydrated, setHydrated] = useState(false);
  const [showQuit, setShowQuit] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [optionsTarget, setOptionsTarget] = useState<{ exerciseId: string; setIndex: number } | null>(null);
  const [showSwapSheet, setShowSwapSheet] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [showTechnique, setShowTechnique] = useState(false);
  const [showReadinessGate, setShowReadinessGate] = useState(!resumeFromActive);
  const [readiness, setReadiness] = useState<{ sleep: number; energy: number } | null>(null);
  const [plateauExId, setPlateauExId] = useState<string | null>(null);
  const [dismissedPlateaus, setDismissedPlateaus] = useState<Set<string>>(new Set());
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "done" | "error">("idle");
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
        const saved = active.logs[ex.id];
        const existing = saved?.sets || [];
        const base = fresh[ex.id].sets;
        // Keep sets added during the session (existing may be longer than the plan).
        const length = Math.max(base.length, existing.length);
        merged[ex.id] = {
          ...saved,
          sets: Array.from({ length }, (_, i) => existing[i] || base[i] || emptySet()),
        };
      });
      setSessionLogs(merged);
      setStep(active.step ?? -1);
      setStartedAt(active.startedAt);
      if (active.readiness) setReadiness(active.readiness);
    } else {
      setSessionLogs(buildEmptyLogs(workout));
      setStep(-1);
      setStartedAt(new Date().toISOString());
    }
    setLastWorkoutLogs(storage.getLastWorkoutLogs(workout.id));
    setHydrated(true);
  }, [workout, resumeFromActive]);

  useEffect(() => {
    if (!hydrated) return;
    storage.saveActiveSession({ workoutId: workout.id, startedAt, step, logs: sessionLogs, readiness: readiness ?? undefined });
  }, [sessionLogs, step, workout.id, startedAt, hydrated, readiness]);

  useEffect(() => {
    const ex = step >= 0 && step < workout.exercises.length ? workout.exercises[step] : null;
    if (!ex || dismissedPlateaus.has(ex.id)) return;
    if (detectPlateau(allSessions, ex.id)) setPlateauExId(ex.id);
  }, [step, workout.exercises, allSessions, dismissedPlateaus]);

  useEffect(() => {
    document.getElementById("workout-scroll-top")?.scrollIntoView({ block: "start" });
  }, [step]);

  const liveVolume = useMemo(
    () => (Object.values(sessionLogs) as ExerciseLog[]).flatMap(l => l.sets).filter(s => s.isComplete).reduce((a, s) => a + setVolume(s), 0),
    [sessionLogs],
  );
  const completedSets = useMemo(
    () => (Object.values(sessionLogs) as ExerciseLog[]).flatMap(l => l.sets).filter(s => s.isComplete).length,
    [sessionLogs],
  );

  const goTo = (target: number) => { setIsRestTimerActive(false); setStep(Math.max(-1, Math.min(finishStep, target))); };
  const prevStep = () => goTo(step - 1);
  const nextStep = () => goTo(step + 1);

  const finishWorkout = () => {
    // Only validated sets count; drafts typed but never ticked are dropped.
    const logs: Record<string, ExerciseLog> = {};
    Object.entries(sessionLogs).forEach(([id, log]) => { logs[id] = { ...log, sets: log.sets.filter(s => s.isComplete) }; });
    storage.saveSession({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      workoutId: workout.id,
      workoutName: workout.name,
      logs,
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
  const sessionTargets = useMemo(
    () => Object.fromEntries(
      workout.exercises.map(ex => [ex.id, getSessionTarget(allSessions, ex.id, ex.reps, ex.isCompound ?? false, readinessFact)]),
    ),
    [workout.exercises, allSessions, readinessFact],
  );
  const currentTarget = currentExercise ? sessionTargets[currentExercise.id] : null;

  useEffect(() => {
    if (currentExercise) setRestDuration(currentExercise.rest ?? settings.defaultRest);
  }, [currentExercise, settings.defaultRest]);

  const pastSetsFor = (exerciseId: string) =>
    (lastExerciseLog(allSessions, exerciseId) ?? lastWorkoutLogs?.[exerciseId])?.sets || [];

  /** What an empty set would be logged as: the target load and the suggested reps. */
  const suggestionFor = (exerciseId: string, idx: number, logs: SetData[]) => {
    const ex = workout.exercises.find(e => e.id === exerciseId);
    const past = pastSetsFor(exerciseId)[idx];
    const target = sessionTargets[exerciseId];
    const prevDone = logs.slice(0, idx).reverse().find(s => s.isComplete && Number(s.weight) > 0);
    const weight = target?.targetWeight ? String(target.targetWeight) : prevDone?.weight || past?.weight || "";
    const hint = ex ? getNextSetRepsHint(logs, idx, ex.reps) : null;
    const reps = hint?.placeholder && /^\d+$/.test(hint.placeholder) ? hint.placeholder : past?.reps || "";
    return { weight, reps };
  };

  const updateSet = (exerciseId: string, setIndex: number, field: keyof SetData, value: string | number | boolean) => {
    setSessionLogs(prev => {
      const updated = { ...prev, [exerciseId]: { ...prev[exerciseId], sets: [...prev[exerciseId].sets] } };
      updated[exerciseId].sets[setIndex] = { ...updated[exerciseId].sets[setIndex], [field]: value };
      return updated;
    });
  };

  const addSet = (exerciseId: string) => {
    setSessionLogs(prev => {
      const sets = prev[exerciseId].sets;
      const last = sets[sets.length - 1];
      return { ...prev, [exerciseId]: { ...prev[exerciseId], sets: [...sets, { ...emptySet(), weight: last?.weight ?? "" }] } };
    });
  };

  const deleteSet = (exerciseId: string, setIndex: number) => {
    setSessionLogs(prev => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], sets: prev[exerciseId].sets.filter((_, i) => i !== setIndex) },
    }));
  };

  const updatePerformedExercise = (exerciseId: string, performed: Exercise) => {
    setSessionLogs(prev => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], displayName: performed.name, performedExerciseId: performed.id, performedExercise: performed },
    }));
  };

  const displayNameFor = (exerciseId: string) =>
    sessionLogs[exerciseId]?.displayName
    || sessionLogs[exerciseId]?.performedExercise?.name
    || workout.exercises.find(ex => ex.id === exerciseId)?.name
    || exerciseId;

  const toggleSetComplete = (exerciseId: string, setIndex: number) => {
    const logs = sessionLogsRef.current[exerciseId]?.sets;
    const current = logs?.[setIndex];
    if (!logs || !current) return;

    if (current.isComplete) {
      setIsRestTimerActive(false);
      updateSet(exerciseId, setIndex, "isComplete", false);
      return;
    }

    const suggestion = suggestionFor(exerciseId, setIndex, logs);
    const weight = current.weight || suggestion.weight;
    const reps = current.reps || suggestion.reps;
    if (!(Number(reps) > 0)) {
      document.getElementById(`reps-${exerciseId}-${setIndex}`)?.focus();
      return;
    }
    if (weight === "" ) {
      document.getElementById(`w-${exerciseId}-${setIndex}`)?.focus();
      return;
    }

    const candidate: SetData = { weight, reps, isComplete: true };
    const history = [
      ...exerciseHistorySets(allSessions, exerciseId),
      ...logs.filter((s, i) => i !== setIndex && s.isComplete && Number(s.weight) > 0),
    ];
    const isPR = Number(weight) > 0 && (isVolumePR(candidate, history) || isWeightPR(candidate, history));

    setSessionLogs(prev => {
      const updated = { ...prev, [exerciseId]: { ...prev[exerciseId], sets: [...prev[exerciseId].sets] } };
      updated[exerciseId].sets[setIndex] = { ...updated[exerciseId].sets[setIndex], weight, reps, isComplete: true, ts: Date.now() };
      return updated;
    });
    setIsRestTimerActive(true);
    setRestartKey(k => k + 1);

    if (isPR) {
      const key = `${exerciseId}-${setIndex}-${Date.now()}`;
      setPrFlashKey(key);
      void signalSetComplete();
      window.setTimeout(() => setPrFlashKey(k => (k === key ? null : k)), 1500);
    }
  };

  const handleSetBlur = (exerciseId: string, setIndex: number) => {
    window.setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      // Moving from the weight field to the reps field of the same set is not "done typing".
      if (active?.id === `reps-${exerciseId}-${setIndex}` || active?.id === `w-${exerciseId}-${setIndex}`) return;
      const set = sessionLogsRef.current[exerciseId]?.sets[setIndex];
      if (set && !set.isComplete && Number(set.weight) > 0 && Number(set.reps) > 0) toggleSetComplete(exerciseId, setIndex);
    }, 30);
  };

  const prefillExercise = (exerciseId: string) => {
    const last = pastSetsFor(exerciseId);
    if (!last.length) return;
    setSessionLogs(prev => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        sets: prev[exerciseId].sets.map((s, i) => {
          const prior = last[i];
          if (s.isComplete || !prior) return s;
          return { ...s, weight: s.weight || prior.weight, reps: s.reps || prior.reps };
        }),
      },
    }));
  };

  const applyDeload = (exerciseId: string) => {
    const t = sessionTargets[exerciseId];
    const ref = t?.lastWeight ?? t?.targetWeight;
    if (!ref) return;
    const w = String(Math.round((ref * 0.9) / 1.25) * 1.25);
    setSessionLogs(prev => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], sets: prev[exerciseId].sets.map(s => (s.isComplete ? s : { ...s, weight: w })) },
    }));
  };

  const startVoiceLogging = useCallback(() => {
    if (!hasSpeechAPI || !currentExercise) return;
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const recognition = new SR() as any;
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setVoiceStatus("listening");
    speechRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase().replace(",", ".");
      const nums = transcript.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
      if (nums.length >= 2) {
        const [a, b] = nums;
        const reps = Math.min(a, b);
        const weight = Math.max(a, b);
        const sets = sessionLogsRef.current[currentExercise.id]?.sets ?? [];
        const firstIncomplete = sets.findIndex(s => !s.isComplete);
        if (firstIncomplete !== -1) {
          updateSet(currentExercise.id, firstIncomplete, "weight", String(weight));
          updateSet(currentExercise.id, firstIncomplete, "reps", String(reps));
        }
        setVoiceStatus("done");
      } else {
        setVoiceStatus("error");
      }
      window.setTimeout(() => setVoiceStatus("idle"), 2200);
    };
    recognition.onerror = () => {
      setVoiceStatus("error");
      window.setTimeout(() => setVoiceStatus("idle"), 2200);
    };
    recognition.start();
  }, [currentExercise]);

  const stopVoice = useCallback(() => { speechRef.current?.stop(); setVoiceStatus("idle"); }, []);

  const startSetLongPress = (event: PointerEvent<HTMLElement>, exerciseId: string, setIndex: number) => {
    if ((event.target as HTMLElement).closest("button,input")) return;
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      setOptionsTarget({ exerciseId, setIndex });
      longPressTimerRef.current = null;
    }, 500);
  };

  const cancelSetLongPress = () => {
    if (!longPressTimerRef.current) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  // Label shown under the rest countdown: the next set of this exercise, or the next exercise.
  const restNextLabel = (() => {
    if (!currentExercise) return undefined;
    const logs = sessionLogs[currentExercise.id]?.sets ?? [];
    const idx = logs.findIndex(s => !s.isComplete);
    if (idx !== -1) {
      const s = logs[idx];
      const sug = suggestionFor(currentExercise.id, idx, logs);
      const w = s.weight || sug.weight;
      const r = s.reps || sug.reps || currentExercise.reps.replace("-", "–");
      return `Série ${idx + 1} : ${w ? `${fmtKg(w)} kg × ` : ""}${r}`;
    }
    return nextExercise ? `Ensuite : ${displayNameFor(nextExercise.id)}` : "Dernier exercice terminé";
  })();

  const currentDone = currentExercise
    ? (sessionLogs[currentExercise.id]?.sets ?? []).every(s => s.isComplete)
    : false;

  const renderSets = () => {
    if (!currentExercise || !sessionLogs[currentExercise.id]) return null;
    const exId = currentExercise.id;
    const logs = sessionLogs[exId].sets;
    const pastLogs = pastSetsFor(exId);
    const exHistory = exerciseHistorySets(allSessions, exId);
    const firstIncompleteIndex = logs.findIndex(s => !s.isComplete);
    const cueSetIndex = firstIncompleteIndex === -1 ? Math.max(0, logs.length - 1) : firstIncompleteIndex;
    const cueRepsHint = getNextSetRepsHint(logs, cueSetIndex, currentExercise.reps);
    const allSetsComplete = logs.length > 0 && logs.every(s => s.isComplete && Number(s.reps) > 0);

    let rirWarning: string | null = null;
    if (currentExercise.rir && currentExercise.rir !== "-") {
      const lastIdx = logs.map(s => s.isComplete).lastIndexOf(true);
      const lastComplete = logs[lastIdx];
      const prevSet = pastLogs[lastIdx];
      if (lastComplete && prevSet && lastComplete.rirActual !== undefined) {
        rirWarning = rirConsistencyWarning(lastComplete.rirActual, Number(lastComplete.reps) || 0, Number(prevSet.reps) || 0, lastComplete.weight === prevSet.weight);
      }
    }

    return (
      <div className="mt-5">
        {currentTarget && (
          <div className="mb-5">
            <ExerciseCue target={currentTarget} repsHint={cueRepsHint} compact={logs.some(s => s.isComplete)} />
          </div>
        )}

        <div className="grid grid-cols-[22px_1.2fr_1fr_52px] gap-1.5 px-2 mb-1.5 text-xs text-faint" aria-hidden>
          <span>#</span><span className="text-center">kg</span><span className="text-center">reps</span><span />
        </div>

        <ol className="space-y-2">
          {logs.map((set, idx) => {
            const pastSet = pastLogs[idx];
            const suggestion = suggestionFor(exId, idx, logs);
            const others = logs.filter((s, i) => i !== idx && s.isComplete && Number(s.weight) > 0);
            const history = [...exHistory, ...others];
            const candidate: SetData = { weight: set.weight || suggestion.weight, reps: set.reps || suggestion.reps, isComplete: true };
            const prCheck = Number(candidate.weight) > 0 && Number(candidate.reps) > 0 && history.length > 0
              && (isVolumePR(candidate, history) || isWeightPR(candidate, history));
            const isPR = set.isComplete && prCheck;
            const wouldBePR = !set.isComplete && !!set.weight && prCheck;
            const flashing = prFlashKey?.startsWith(`${exId}-${idx}-`);
            const setType = set.setType ?? "normal";
            const weightNum = Number(set.weight);
            const pastWeightNum = Number(pastSet?.weight);
            const weightDelta = !set.isComplete && pastWeightNum > 0 && weightNum > 0 ? Math.round((weightNum - pastWeightNum) * 100) / 100 : null;
            const isNext = idx === firstIncompleteIndex;

            return (
              <motion.li
                key={idx}
                layout="position"
                onPointerDown={e => startSetLongPress(e, exId, idx)}
                onPointerUp={cancelSetLongPress}
                onPointerCancel={cancelSetLongPress}
                onPointerLeave={cancelSetLongPress}
                className={`rounded-2xl border p-2 transition-colors ${
                  set.isComplete
                    ? isPR ? "bg-pr/10 border-pr/50" : "bg-go/[0.07] border-go/35"
                    : isNext ? "bg-surface border-muted/40" : "bg-surface border-line"
                } ${flashing ? "pr-flash" : ""}`}
              >
                <div className="grid grid-cols-[22px_1.2fr_1fr_52px] gap-1.5 items-center">
                  <span className={`type-num text-xl text-center ${set.isComplete ? (isPR ? "text-pr" : "text-go") : "text-faint"}`}>{idx + 1}</span>
                  <Stepper
                    id={`w-${exId}-${idx}`} label={`Charge série ${idx + 1}, kg`}
                    value={set.weight} placeholder={suggestion.weight || "0"} step={2.5} done={set.isComplete}
                    onChange={v => updateSet(exId, idx, "weight", v)} onBlur={() => handleSetBlur(exId, idx)}
                  />
                  <Stepper
                    id={`reps-${exId}-${idx}`} label={`Répétitions série ${idx + 1}`}
                    value={set.reps} placeholder={suggestion.reps || "0"} step={1} done={set.isComplete}
                    onChange={v => updateSet(exId, idx, "reps", v)} onBlur={() => handleSetBlur(exId, idx)}
                  />
                  <button
                    onClick={() => toggleSetComplete(exId, idx)}
                    aria-label={set.isComplete ? `Rouvrir la série ${idx + 1}` : `Valider la série ${idx + 1}`}
                    aria-pressed={set.isComplete}
                    className={`h-12 rounded-xl flex items-center justify-center active:scale-95 transition ${
                      set.isComplete
                        ? isPR ? "bg-pr text-on-chalk" : "bg-go text-on-chalk"
                        : isNext ? "bg-chalk text-on-chalk" : "bg-raised text-muted"
                    }`}
                  >
                    {isPR ? <Trophy className="w-5 h-5" strokeWidth={2.5} /> : <Check className="w-6 h-6" strokeWidth={3} />}
                  </button>
                </div>

                <div className="flex items-center gap-2 min-h-8 pl-[30px] pr-0.5 mt-1 text-sm">
                  {pastSet?.weight ? (
                    <span className="text-faint tnum truncate">Dernière fois {fmtKg(pastSet.weight)} × {pastSet.reps}</span>
                  ) : (
                    <span className="text-faint">Première fois</span>
                  )}
                  {weightDelta !== null && weightDelta !== 0 && (
                    <span className={`font-semibold tnum ${weightDelta > 0 ? "text-go" : "text-warn"}`}>
                      {weightDelta > 0 ? "+" : "−"}{fmtKg(Math.abs(weightDelta))}
                    </span>
                  )}
                  {wouldBePR && <span className="font-semibold text-pr">Record possible</span>}
                  {isPR && <span className="font-semibold text-pr">Record</span>}
                  {setType !== "normal" && <span className="text-info font-medium">{SET_TYPE_SHORT[setType]}</span>}
                  {set.note && <MessageSquare className="w-3.5 h-3.5 text-muted shrink-0" aria-label={`Note : ${set.note}`} />}
                  <button
                    onClick={() => setOptionsTarget({ exerciseId: exId, setIndex: idx })}
                    aria-label={`Options de la série ${idx + 1}`}
                    className="ml-auto w-10 h-8 -my-1 rounded-lg flex items-center justify-center text-faint active:bg-raised"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {set.isComplete && currentExercise.rir !== "-" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 pl-[30px] pt-1.5 pb-0.5" role="radiogroup" aria-label={`Reps en réserve, série ${idx + 1}`}>
                        <span className="text-sm text-muted mr-auto">En réserve</span>
                        {[0, 1, 2, 3, 4].map(r => (
                          <button
                            key={r}
                            role="radio"
                            aria-checked={set.rirActual === r}
                            onClick={() => updateSet(exId, idx, "rirActual", r)}
                            className={`w-9 h-10 rounded-lg type-num text-lg ${set.rirActual === r ? "bg-chalk text-on-chalk" : "bg-raised text-muted"}`}
                          >
                            {r === 4 ? "4+" : r}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ol>

        <div className="flex gap-2 mt-2">
          <button onClick={() => addSet(exId)} className={`${btn.quiet} flex-1 border border-dashed border-line h-12`}>
            <Plus className="w-4 h-4" /> Ajouter une série
          </button>
          {pastLogs.length > 0 && logs.some(s => !s.isComplete && !s.weight) && (
            <button onClick={() => prefillExercise(exId)} className={`${btn.quiet} flex-1 border border-dashed border-line h-12`}>
              Charges de la dernière fois
            </button>
          )}
        </div>

        <AnimatePresence>
          {rirWarning && (
            <motion.p
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-pr/10 border border-pr/30 text-sm text-ink"
            >
              <AlertTriangle className="w-4 h-4 text-pr shrink-0 mt-0.5" aria-hidden /> {rirWarning}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {allSetsComplete && currentTarget && (() => {
            const sug = autoProgression(allSessions, exId, currentExercise.reps, currentExercise.isCompound ?? false);
            const action = sug?.action ?? currentTarget.action;
            const nextWeight = sug?.nextWeight ?? currentTarget.targetWeight;
            const tone = action === "increase-weight" ? "text-go" : action === "deload" || action === "plateau" ? "text-warn" : "text-ink";
            return (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 rounded-2xl border border-line p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-muted">La prochaine fois</div>
                  <div className="text-[15px] text-ink">{sug?.reason ?? currentTarget.reason}</div>
                </div>
                {nextWeight ? <span className={`type-num text-2xl shrink-0 ${tone}`}>{fmtKg(nextWeight)} kg</span> : null}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        <NextExercisePreview workout={workout} currentStep={step} defaultRest={settings.defaultRest}
          displayNameFor={displayNameFor} onJump={goTo} />
      </div>
    );
  };

  const repsLabel = currentExercise?.reps.replace("-", " à ");
  const primaryLabel =
    step === -1 ? "C'est parti"
      : step === workout.exercises.length && hasCooldown ? "Voir le récapitulatif"
      : nextExercise ? (currentDone ? `Suivant : ${displayNameFor(nextExercise.id)}` : "Exercice suivant")
      : hasCooldown ? "Retour au calme" : "Terminer";

  return (
    <div className="min-h-screen max-w-md mx-auto relative">
      {showReadinessGate && (
        <ReadinessGate
          onStart={(sleep, energy) => { setReadiness({ sleep, energy }); setShowReadinessGate(false); }}
          onSkip={() => setShowReadinessGate(false)}
        />
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-20 safe-header bg-bg/94 backdrop-blur-md">
        <div className="flex items-center gap-1 px-2 pb-2">
          <button onClick={() => setShowQuit(true)} aria-label="Quitter la séance" className={btn.icon}>
            <X className="w-6 h-6" />
          </button>
          <button type="button" onClick={() => setShowRoadmap(true)} className="flex-1 min-w-0 text-center px-1 py-1 rounded-xl active:bg-surface" aria-label="Voir le plan de la séance">
            <span className="block text-[15px] font-semibold text-ink truncate">{workoutTitle(workout.name)}</span>
            <span className="block text-sm text-faint tnum">
              {completedSets} série{completedSets > 1 ? "s" : ""} · {fmtTonnage(liveVolume)}
              {readiness && readinessFact < 1 && <span className="text-pr"> · forme réduite</span>}
            </span>
          </button>
          <div className="w-[76px] flex items-center justify-end gap-1">
            <SessionTimer startedAt={startedAt} />
            <button onClick={() => setShowRoadmap(true)} aria-label="Plan de la séance" className="w-9 h-11 flex items-center justify-center text-faint">
              <ListOrdered className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* One segment per exercise, filled by validated sets. */}
        <div className="flex gap-1 px-4 pb-2" aria-hidden>
          {workout.exercises.map((ex, i) => {
            const sets = sessionLogs[ex.id]?.sets ?? [];
            const ratio = sets.length ? sets.filter(s => s.isComplete).length / sets.length : 0;
            return (
              <div key={ex.id} className={`flex-1 rounded-full overflow-hidden bg-raised ${i === step ? "h-1.5" : "h-1 mt-[1px]"}`}>
                <div className={`h-full transition-[width] duration-300 ${ratio === 1 ? "bg-go" : "bg-chalk"}`} style={{ width: `${ratio * 100}%` }} />
              </div>
            );
          })}
        </div>
      </header>

      <div id="workout-scroll-top" className="absolute top-0" aria-hidden />

      <div className="px-4 pb-44">
        <AnimatePresence mode="wait">
          {step === -1 && (
            <motion.section key="warmup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="pt-8">
              <p className="text-[15px] text-muted">Échauffement</p>
              <h1 className="type-display text-[56px] text-ink mb-4">On chauffe la machine</h1>
              <p className="text-[17px] text-ink leading-relaxed mb-6">{workout.warmup}</p>
              {readiness && readinessFact < 1 && (
                <p className="rounded-2xl bg-pr/10 border border-pr/30 p-4 text-[15px] text-ink mb-3">
                  Forme réduite aujourd'hui : les charges cibles sont un peu allégées. Si une série se dégrade, coupe-la.
                </p>
              )}
              {workout.notes && <p className="rounded-2xl border border-line p-4 text-[15px] text-muted mb-3">{workout.notes}</p>}
              <h2 className="text-[15px] font-semibold text-muted mt-6 mb-2">Au programme</h2>
              <ol className="rounded-2xl bg-surface border border-line divide-y divide-line">
                {workout.exercises.map((ex, i) => (
                  <li key={ex.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="type-num text-lg text-faint w-5">{i + 1}</span>
                    <span className="flex-1 text-[15px] text-ink">{displayNameFor(ex.id)}</span>
                    <span className="text-sm text-faint tnum">{ex.sets} × {ex.reps.replace("-", "–")}</span>
                  </li>
                ))}
              </ol>
            </motion.section>
          )}

          {currentExercise && (
            <motion.section
              key={`ex-${step}`}
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
              drag="x" dragDirectionLock dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -100 || info.velocity.x < -600) nextStep();
                else if (info.offset.x > 100 || info.velocity.x > 600) prevStep();
              }}
              aria-label={`Exercice ${step + 1} sur ${workout.exercises.length}`}
              className="pt-5"
            >
              <p className="text-sm text-faint tnum">Exercice {step + 1} sur {workout.exercises.length}</p>
              <h1 className="type-display text-[44px] text-ink mt-1 mb-2">{displayNameFor(currentExercise.id)}</h1>
              <p className="text-[15px] text-muted">
                {currentExercise.sets} séries de {repsLabel} reps
                {currentExercise.rir && currentExercise.rir !== "-" && <>, {currentExercise.rir} en réserve</>}
                , repos {formatRest(restDuration)}
              </p>

              <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar -mx-4 px-4">
                <button onClick={() => setShowSwapSheet(true)} className="shrink-0 h-10 px-3.5 rounded-xl bg-surface border border-line text-[15px] font-medium text-ink inline-flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-muted" /> Remplacer
                </button>
                <button onClick={() => setShowPlates(true)} className="shrink-0 h-10 px-3.5 rounded-xl bg-surface border border-line text-[15px] font-medium text-ink inline-flex items-center gap-2">
                  <Disc3 className="w-4 h-4 text-muted" /> Disques
                </button>
                {hasSpeechAPI && (
                  <button
                    onClick={voiceStatus === "listening" ? stopVoice : startVoiceLogging}
                    className={`shrink-0 h-10 px-3.5 rounded-xl border text-[15px] font-medium inline-flex items-center gap-2 ${
                      voiceStatus === "listening" ? "bg-chalk text-on-chalk border-chalk mic-pulse" : "bg-surface border-line text-ink"
                    }`}
                  >
                    <Mic className="w-4 h-4" /> {voiceStatus === "listening" ? "J'écoute…" : "Dicter"}
                  </button>
                )}
              </div>

              <AnimatePresence>
                {voiceStatus !== "idle" && voiceStatus !== "listening" && (
                  <motion.p role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={`mt-2 text-sm font-medium ${voiceStatus === "done" ? "text-go" : "text-warn"}`}>
                    {voiceStatus === "done" ? "Série remplie. Vérifie puis valide." : "Pas compris. Dis par exemple « 10 reps à 80 kilos »."}
                  </motion.p>
                )}
              </AnimatePresence>

              <ExerciseDemoCard name={displayNameFor(currentExercise.id)} onOpen={() => setShowTechnique(true)} />

              {currentExercise.notes && (
                <p className="mt-4 rounded-2xl border border-line p-4 text-[15px] text-muted">{currentExercise.notes}</p>
              )}

              {renderSets()}
            </motion.section>
          )}

          {hasCooldown && step === workout.exercises.length && (
            <motion.section key="cooldown" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="pt-8">
              <p className="text-[15px] text-muted">Dernière étape</p>
              <h1 className="type-display text-[56px] text-ink mb-4">Retour au calme</h1>
              <p className="text-[17px] text-ink leading-relaxed">{workout.cooldown}</p>
            </motion.section>
          )}

          {step === finishStep && (
            <FinishSummary workout={workout} sessionLogs={sessionLogs} startedAt={startedAt}
              pastSessions={allSessions} completedSets={completedSets} liveVolume={liveVolume}
              displayNameFor={displayNameFor} onFinish={finishWorkout} onBack={() => goTo(workout.exercises.length - 1)} />
          )}
        </AnimatePresence>
      </div>

      <RestTimer time={restDuration} isActive={isRestTimerActive} restartKey={restartKey}
        onClose={() => setIsRestTimerActive(false)} soundOn={settings.soundOn} vibrate={settings.vibrate}
        nextLabel={restNextLabel} />

      {step < finishStep && (
        <div className="fixed bottom-0 inset-x-0 z-20 safe-bottom-bar pt-6 bg-gradient-to-t from-bg via-bg to-bg/0 pointer-events-none">
          <div className="max-w-md mx-auto px-4 flex gap-2 pointer-events-auto">
            {step > -1 && (
              <button onClick={prevStep} aria-label="Étape précédente" className="w-14 h-14 shrink-0 rounded-2xl bg-surface border border-line text-ink flex items-center justify-center active:bg-raised">
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <button onClick={nextStep} className={`${currentExercise && !currentDone ? btn.secondary + " h-14 rounded-2xl text-[17px]" : btn.primary} flex-1 min-w-0`}>
              <span className="truncate">{primaryLabel}</span>
              <ChevronRight className="w-5 h-5 shrink-0" />
            </button>
          </div>
        </div>
      )}

      <WorkoutRoadmap open={showRoadmap} workout={workout} sessionLogs={sessionLogs} currentStep={step}
        startedAt={startedAt} defaultRest={settings.defaultRest} displayNameFor={displayNameFor}
        onJump={goTo} onClose={() => setShowRoadmap(false)}
        onFinish={() => goTo(finishStep)} onAbandon={() => setShowQuit(true)} />

      <SetOptionsSheet
        open={!!optionsTarget}
        setLabel={optionsTarget ? `Série ${optionsTarget.setIndex + 1}` : "Série"}
        initialNote={optionsTarget ? sessionLogs[optionsTarget.exerciseId]?.sets[optionsTarget.setIndex]?.note || "" : ""}
        initialType={optionsTarget ? sessionLogs[optionsTarget.exerciseId]?.sets[optionsTarget.setIndex]?.setType ?? "normal" : "normal"}
        canDelete={!!optionsTarget && (sessionLogs[optionsTarget.exerciseId]?.sets.length ?? 0) > 1}
        onClose={() => setOptionsTarget(null)}
        onSave={(note, type) => {
          if (!optionsTarget) return;
          updateSet(optionsTarget.exerciseId, optionsTarget.setIndex, "note", note);
          updateSet(optionsTarget.exerciseId, optionsTarget.setIndex, "setType", type);
        }}
        onDelete={() => optionsTarget && deleteSet(optionsTarget.exerciseId, optionsTarget.setIndex)}
      />

      <ExerciseSwapSheet isOpen={showSwapSheet} exercise={currentExercise}
        library={program.library}
        selectedName={currentExercise ? displayNameFor(currentExercise.id) : ""}
        onClose={() => setShowSwapSheet(false)}
        onSelect={exercise => currentExercise && updatePerformedExercise(currentExercise.id, exercise)} />

      <ExerciseTechniqueSheet
        name={currentExercise ? displayNameFor(currentExercise.id) : null}
        open={showTechnique}
        onClose={() => setShowTechnique(false)}
      />

      <Sheet open={showPlates} onClose={() => setShowPlates(false)} label="Charger la barre" tall>
        <h2 className="text-xl font-bold text-ink mb-4">Charger la barre</h2>
        {showPlates && (
          <PlateCalculator
            inline
            onClose={() => setShowPlates(false)}
            initialWeight={Number(currentTarget?.targetWeight) || Number(currentExercise && sessionLogs[currentExercise.id]?.sets.find(s => s.weight)?.weight) || 60}
          />
        )}
      </Sheet>

      {/* Plateau: actionable, not just informative. */}
      <Sheet
        open={!!plateauExId}
        onClose={() => { if (plateauExId) setDismissedPlateaus(s => new Set([...s, plateauExId])); setPlateauExId(null); }}
        label="Plateau détecté"
      >
        <h2 className="text-xl font-bold text-ink">Plateau sur cet exercice</h2>
        <p className="text-[15px] text-muted mb-5">Ton 1RM estimé n'a pas progressé sur les trois dernières séances. Choisis une piste pour relancer.</p>
        <div className="space-y-2 mb-3">
          <button
            onClick={() => { if (plateauExId) { applyDeload(plateauExId); setDismissedPlateaus(s => new Set([...s, plateauExId])); } setPlateauExId(null); }}
            className="w-full text-left p-4 rounded-xl bg-raised active:bg-line"
          >
            <span className="block text-[16px] font-semibold text-ink">Alléger de 10 % aujourd'hui</span>
            <span className="block text-sm text-faint">Remplit les séries avec une charge réduite, puis on remonte.</span>
          </button>
          <button
            onClick={() => { if (plateauExId) setDismissedPlateaus(s => new Set([...s, plateauExId])); setPlateauExId(null); setShowSwapSheet(true); }}
            className="w-full text-left p-4 rounded-xl bg-raised active:bg-line"
          >
            <span className="block text-[16px] font-semibold text-ink">Remplacer l'exercice</span>
            <span className="block text-sm text-faint">Même muscle, stimulus différent.</span>
          </button>
          <div className="p-4 rounded-xl border border-line">
            <span className="block text-[16px] font-semibold text-ink">Changer de plage de reps</span>
            <span className="block text-sm text-faint">Par exemple 4 à 6 au lieu de 8 à 12 pendant trois semaines, dans l'onglet Programme.</span>
          </div>
        </div>
        <button
          onClick={() => { if (plateauExId) setDismissedPlateaus(s => new Set([...s, plateauExId])); setPlateauExId(null); }}
          className={`${btn.quiet} w-full`}
        >
          Continuer sans changer
        </button>
      </Sheet>

      <Sheet open={showQuit} onClose={() => setShowQuit(false)} label="Quitter la séance">
        <h2 className="text-xl font-bold text-ink mb-1.5">Quitter la séance ?</h2>
        <p className="text-[15px] text-muted mb-5">
          {completedSets > 0
            ? `${completedSets} série${completedSets > 1 ? "s" : ""} validée${completedSets > 1 ? "s" : ""}. Tu peux reprendre plus tard depuis l'accueil.`
            : "Tu peux reprendre plus tard depuis l'accueil."}
        </p>
        <div className="space-y-2">
          <button onClick={onClose} className={`${btn.secondary} w-full`}>Mettre en pause et quitter</button>
          <button onClick={doAbandon} className={`${btn.danger} w-full`}>Abandonner sans enregistrer</button>
          <button onClick={() => setShowQuit(false)} className={`${btn.quiet} w-full`}>Continuer la séance</button>
        </div>
      </Sheet>
    </div>
  );
}
