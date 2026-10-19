import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronRight, Calculator, ClipboardCheck, Play, AlertTriangle } from "lucide-react";
import { allExercises, getTodayFromSchedule, type Workout } from "../data";
import { storage, type ProgramData } from "../lib/storage";
import {
  computeStreak, estimateRemainingSec, fmtKg, fmtRelativeShort, fmtTonnage,
  sessionVolume, sessionsSince, weekOverview, workoutTitle,
} from "../lib/stats";
import { weeklyMuscleGroupSets, getVolumeStatus, VOLUME_LANDMARKS, getSessionTarget } from "../lib/intelligence";
import { btn, ConfirmSheet, SectionLabel } from "./ui";
import { ExerciseTechniqueSheet, ExerciseThumb } from "./ExerciseDemo";
import type { ProgressTab } from "./Progress";

interface HomeProps {
  program: ProgramData;
  onStartWorkout: (workoutId: string, opts?: { resume?: boolean }) => void;
  onStartCheckin: () => void;
  onOpenPlates: () => void;
  onOpenProgress: (tab: ProgressTab) => void;
}

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const repsLabel = (reps: string) => reps.replace("-", "–");

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Home({ program, onStartWorkout, onStartCheckin, onOpenPlates, onOpenProgress }: HomeProps) {
  const today = getTodayFromSchedule(program.weeklySchedule);
  const todayWorkout = today.workoutId ? program.workouts[today.workoutId] : null;
  const isCheckinDay = today.day === "Dimanche";

  const [active, setActive] = useState(() => storage.getActiveSession());
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const sessions = useMemo(() => storage.getSessions(), []);
  const settings = useMemo(() => storage.getSettings(), []);
  const exercises = useMemo(() => allExercises(program.workouts), [program.workouts]);

  const week = useMemo(() => weekOverview(sessions, program.weeklySchedule), [sessions, program.weeklySchedule]);
  const plannedCount = week.filter(d => d.type === "workout").length;
  const doneCount = week.filter(d => d.status === "done").length;
  const missedCount = week.filter(d => d.status === "missed").length;
  const nextPlanned = week.find(d => d.status === "planned");
  const trainedToday = week.find(d => d.isToday)?.status === "done";

  const volume7d = useMemo(
    () => sessionsSince(sessions, 7).reduce((a, s) => a + (s.totalVolume ?? sessionVolume(s)), 0),
    [sessions],
  );
  const streak = useMemo(() => computeStreak(sessions), [sessions]);

  const volumeAlerts = useMemo(() => {
    const mgSets = weeklyMuscleGroupSets(sessions, exercises);
    return Object.entries(VOLUME_LANDMARKS)
      .map(([key, lm]) => ({ key, label: lm.label, sets: mgSets[key] ?? 0, status: getVolumeStatus(mgSets[key] ?? 0, key) }))
      .filter(r => r.status === "above-mrv");
  }, [sessions, exercises]);

  const activeWorkout = active ? program.workouts[active.workoutId] : null;
  const activeMinutes = active ? Math.max(1, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 60000)) : 0;
  const activeSetsDone = active ? Object.values(active.logs).flatMap(l => l.sets).filter(s => s.isComplete).length : 0;

  const otherWorkouts = (Object.values(program.workouts) as Workout[]).filter(w => w.id !== todayWorkout?.id);
  const dateLabel = capitalize(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));

  return (
    <div className="tab-page">
      <p className="text-[15px] text-muted mb-1">{dateLabel}</p>

      {/* Resume an interrupted session — always the first thing to see. */}
      {active && activeWorkout && (
        <section aria-label="Séance en cours" className="mt-3 mb-6 rounded-2xl bg-surface border border-line p-4">
          <div className="flex items-center gap-2 text-sm text-go font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-go" aria-hidden /> Séance en cours
          </div>
          <div className="type-display text-[32px] text-ink mb-1">{workoutTitle(activeWorkout.name)}</div>
          <p className="text-sm text-muted mb-4">
            Commencée il y a {activeMinutes} min · {activeSetsDone} série{activeSetsDone > 1 ? "s" : ""} validée{activeSetsDone > 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <button onClick={() => onStartWorkout(active.workoutId, { resume: true })} className={`${btn.primary} flex-1`}>
              <Play className="w-5 h-5" fill="currentColor" /> Reprendre
            </button>
            <button onClick={() => setConfirmDiscard(true)} className={`${btn.quiet} h-14`}>Abandonner</button>
          </div>
        </section>
      )}

      {/* Today */}
      {!active && todayWorkout ? (
        <TodayWorkout
          workout={todayWorkout}
          trainedToday={trainedToday}
          lastDone={storage.getSessionsForWorkout(todayWorkout.id).at(-1)?.date}
          estimateMin={Math.max(10, Math.round(estimateRemainingSec(todayWorkout, {}, 0, settings.defaultRest) / 300) * 5)}
          targets={todayWorkout.exercises.map(ex => getSessionTarget(sessions, ex.id, ex.reps, ex.isCompound ?? false))}
          onStart={() => onStartWorkout(todayWorkout.id)}
        />
      ) : !active && (
        <section className="mb-8">
          <h1 className="type-display text-[64px] text-ink mt-1 mb-2">{isCheckinDay ? "Bilan" : "Repos"}</h1>
          <p className="text-[17px] text-muted leading-snug mb-5 max-w-[34ch]">
            {isCheckinDay
              ? "Pesée à jeun, tour de taille et photos. Trois minutes pour suivre la semaine."
              : today.description || "Récupération : marche, mobilité, sommeil."}
          </p>
          {isCheckinDay && (
            <button onClick={onStartCheckin} className={`${btn.primary} w-full`}>
              <ClipboardCheck className="w-5 h-5" /> Faire le check-in
            </button>
          )}
          {nextPlanned?.workoutId && (
            <p className="text-[15px] text-faint mt-4">
              Prochaine séance : <span className="text-ink font-medium">{workoutTitle(program.workouts[nextPlanned.workoutId]?.name ?? "")}</span>, {nextPlanned.day.toLowerCase()}
            </p>
          )}
        </section>
      )}

      {/* This week */}
      <section className="mb-8">
        <SectionLabel aside={`${doneCount} sur ${plannedCount} séances`}>Cette semaine</SectionLabel>
        <ol className="grid grid-cols-7 gap-1.5" aria-label="Semaine en cours">
          {week.map((d, i) => (
            <li key={d.day} className="flex flex-col items-center gap-1.5">
              <span className={`text-xs font-semibold ${d.isToday ? "text-ink" : "text-faint"}`}>{DAY_LETTERS[i]}</span>
              <DayCell status={d.status} isToday={d.isToday} label={`${d.day} : ${statusText(d.status, d.workoutId ? workoutTitle(program.workouts[d.workoutId]?.name ?? "") : undefined)}`} />
            </li>
          ))}
        </ol>
        {missedCount > 0 && (
          <p className="text-sm text-faint mt-3">
            {missedCount} séance{missedCount > 1 ? "s" : ""} manquée{missedCount > 1 ? "s" : ""} cette semaine. Reprends simplement là où tu en es.
          </p>
        )}

        <dl className="grid grid-cols-2 mt-5 rounded-2xl bg-surface border border-line divide-x divide-line">
          <div className="p-4">
            <dt className="text-sm text-muted mb-1">Volume sur 7 jours</dt>
            <dd className="type-num text-[30px] text-ink">{fmtTonnage(volume7d)}</dd>
          </div>
          <div className="p-4">
            <dt className="text-sm text-muted mb-1">Séances d'affilée</dt>
            <dd className="type-num text-[30px] text-ink">{streak}</dd>
          </div>
        </dl>

        {volumeAlerts.length > 0 && (
          <button
            onClick={() => onOpenProgress("volume")}
            className="w-full mt-2 flex items-center gap-3 p-4 rounded-2xl bg-warn/10 border border-warn/25 text-left"
          >
            <AlertTriangle className="w-5 h-5 text-warn shrink-0" />
            <span className="flex-1 text-[15px] text-ink">
              Trop de volume cette semaine : {volumeAlerts.map(a => a.label.toLowerCase()).join(", ")}
            </span>
            <ChevronRight className="w-5 h-5 text-faint" />
          </button>
        )}
      </section>

      {/* Any other session, any day */}
      <section className="mb-8">
        <SectionLabel>{todayWorkout ? "Autres séances" : "Lancer une séance"}</SectionLabel>
        <ul className="rounded-2xl bg-surface border border-line divide-y divide-line overflow-hidden">
          {otherWorkouts.map(w => {
            const last = storage.getSessionsForWorkout(w.id).at(-1);
            return (
              <li key={w.id}>
                <button onClick={() => onStartWorkout(w.id)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-raised transition">
                  <div className="flex-1 min-w-0">
                    <div className="text-[17px] font-semibold text-ink truncate">{workoutTitle(w.name)}</div>
                    <div className="text-sm text-faint">
                      {w.exercises.length} exercices{last ? ` · ${fmtRelativeShort(last.date).toLowerCase()}` : ""}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-faint shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <SectionLabel>Outils</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <ToolButton icon={<Calculator className="w-5 h-5" />} title="Disques" sub="Charger la barre" onClick={onOpenPlates} />
          <ToolButton icon={<ClipboardCheck className="w-5 h-5" />} title="Check-in" sub="Poids et taille" onClick={onStartCheckin} />
        </div>
      </section>

      <ConfirmSheet
        open={confirmDiscard}
        title="Abandonner la séance en cours ?"
        body="Les séries déjà validées ne seront pas enregistrées."
        confirmLabel="Abandonner"
        onConfirm={() => { storage.clearActiveSession(); setActive(null); }}
        onClose={() => setConfirmDiscard(false)}
      />
    </div>
  );
}

function TodayWorkout({
  workout, trainedToday, lastDone, estimateMin, targets, onStart,
}: {
  workout: Workout;
  trainedToday: boolean;
  lastDone?: string;
  estimateMin: number;
  targets: ReturnType<typeof getSessionTarget>[];
  onStart: () => void;
}) {
  const [technique, setTechnique] = useState<string | null>(null);
  return (
    <section className="mb-8" aria-label="Séance du jour">
      <h1 className="type-display text-[64px] text-ink mt-1 mb-3">{workoutTitle(workout.name)}</h1>
      <p className="text-[15px] text-muted mb-5">
        {workout.exercises.length} exercices · environ {estimateMin} min
        {lastDone && <> · dernière fois {fmtRelativeShort(lastDone).toLowerCase()}</>}
      </p>

      <button onClick={onStart} className={`${btn.primary} w-full mb-5`}>
        {trainedToday ? "Refaire la séance" : "Commencer la séance"}
      </button>

      <ol className="rounded-2xl bg-surface border border-line divide-y divide-line overflow-hidden">
        {workout.exercises.map((ex, i) => {
          const t = targets[i];
          const up = t?.deltaKg !== null && (t?.deltaKg ?? 0) > 0;
          return (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => setTechnique(ex.name)}
                className="w-full flex items-center gap-3 pl-2 pr-4 py-2 text-left active:bg-raised transition"
              >
                <ExerciseThumb name={ex.name} className="w-[72px] h-12 shrink-0 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-ink truncate">{ex.name}</div>
                  <div className="text-sm text-faint tnum">{ex.sets} × {repsLabel(ex.reps)}</div>
                </div>
                <div className="text-right shrink-0">
                  {t?.targetWeight ? (
                    <>
                      <div className="type-num text-[22px] text-ink">{fmtKg(t.targetWeight)}<span className="text-sm text-muted ml-0.5">kg</span></div>
                      {up && <div className="text-xs font-semibold text-go tnum">+{fmtKg(t.deltaKg!)} kg</div>}
                    </>
                  ) : (
                    <span className="text-sm text-faint">À calibrer</span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-faint mt-2 px-0.5">Touche un exercice pour voir la technique.</p>

      <ExerciseTechniqueSheet name={technique} open={!!technique} onClose={() => setTechnique(null)} />
    </section>
  );
}

function statusText(status: string, name?: string) {
  switch (status) {
    case "done": return `fait${name ? ` (${name})` : ""}`;
    case "missed": return `manqué${name ? ` (${name})` : ""}`;
    case "today": return `aujourd'hui${name ? ` (${name})` : ""}`;
    case "planned": return `prévu${name ? ` (${name})` : ""}`;
    default: return "repos";
  }
}

function DayCell({ status, isToday, label }: { status: string; isToday: boolean; label: string }) {
  const base = "w-full aspect-square max-w-11 rounded-xl flex items-center justify-center";
  if (status === "done") {
    const ring = isToday ? " ring-2 ring-chalk ring-offset-2 ring-offset-bg" : "";
    return <span className={`${base} bg-go text-on-chalk${ring}`} aria-label={label}><Check className="w-5 h-5" strokeWidth={3} /></span>;
  }
  if (status === "missed") {
    return <span className={`${base} border-2 border-dashed border-warn/60`} aria-label={label} />;
  }
  if (status === "today" || status === "planned") {
    return <span className={`${base} border-2 ${isToday ? "border-chalk" : "border-muted/40"}`} aria-label={label} />;
  }
  return (
    <span className={`${base} ${isToday ? "border-2 border-chalk" : ""}`} aria-label={label}>
      <span className="w-1.5 h-1.5 rounded-full bg-faint/60" />
    </span>
  );
}

function ToolButton({ icon, title, sub, onClick }: { icon: ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-line text-left active:bg-raised transition">
      <span className="text-muted">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-ink">{title}</span>
        <span className="block text-sm text-faint truncate">{sub}</span>
      </span>
    </button>
  );
}
