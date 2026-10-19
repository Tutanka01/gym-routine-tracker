import { Trophy } from "lucide-react";
import { motion } from "motion/react";
import type { Workout } from "../data";
import type { ExerciseLog, WorkoutSession } from "../lib/storage";
import { fmtKg, fmtTonnage, sessionPRs, setVolume, workoutTitle } from "../lib/stats";
import { btn } from "./ui";

export function FinishSummary({
  workout, sessionLogs, startedAt, pastSessions, completedSets, liveVolume, displayNameFor, onFinish, onBack,
}: {
  workout: Workout;
  sessionLogs: Record<string, ExerciseLog>;
  startedAt: string;
  pastSessions: WorkoutSession[];
  completedSets: number;
  liveVolume: number;
  displayNameFor: (exerciseId: string) => string;
  onFinish: () => void;
  onBack: () => void;
}) {
  const durationMin = Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
  const plannedSets = workout.exercises.reduce((a, e) => a + Math.max(e.sets, sessionLogs[e.id]?.sets.length ?? 0), 0);
  const skipped = Math.max(0, plannedSets - completedSets);

  // One line per exercise: keep the best PR type, weight beats volume.
  const prs = Object.values(
    sessionPRs(sessionLogs, pastSessions).reduce<Record<string, ReturnType<typeof sessionPRs>[number]>>((acc, pr) => {
      if (!acc[pr.exerciseId] || pr.type === "weight") acc[pr.exerciseId] = pr;
      return acc;
    }, {}),
  );

  const previousSame = [...pastSessions]
    .filter(s => s.workoutId === workout.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const previousVolume = previousSame?.totalVolume
    ?? (previousSame ? Object.values(previousSame.logs).flatMap(l => l.sets).reduce((a, s) => a + setVolume(s), 0) : 0);
  const volumeDeltaPct = previousVolume > 0 ? Math.round(((liveVolume - previousVolume) / previousVolume) * 100) : null;

  return (
    <motion.div
      key="finish"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="pt-6 pb-10"
    >
      <p className="text-[15px] text-muted">{workoutTitle(workout.name)}</p>
      <h1 className="type-display text-[60px] text-ink mb-6">Séance terminée</h1>

      <dl className="grid grid-cols-3 rounded-2xl bg-surface border border-line divide-x divide-line mb-3">
        <div className="p-3.5">
          <dt className="text-sm text-muted">Séries</dt>
          <dd className="type-num text-[30px] text-ink mt-1">{completedSets}</dd>
        </div>
        <div className="p-3.5">
          <dt className="text-sm text-muted">Volume</dt>
          <dd className="type-num text-[30px] text-ink mt-1">{fmtTonnage(liveVolume)}</dd>
        </div>
        <div className="p-3.5">
          <dt className="text-sm text-muted">Durée</dt>
          <dd className="type-num text-[30px] text-ink mt-1">{durationMin} min</dd>
        </div>
      </dl>

      {volumeDeltaPct !== null && (
        <p className="text-[15px] text-muted mb-5">
          Volume <span className={`font-semibold tnum ${volumeDeltaPct >= 0 ? "text-go" : "text-warn"}`}>{volumeDeltaPct >= 0 ? "+" : "−"}{Math.abs(volumeDeltaPct)} %</span> par rapport à la dernière {workoutTitle(workout.name)}.
        </p>
      )}

      {prs.length > 0 && (
        <section className="rounded-2xl bg-pr/10 border border-pr/40 p-4 mb-5">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold text-ink mb-3">
            <Trophy className="w-5 h-5 text-pr" aria-hidden /> {prs.length} record{prs.length > 1 ? "s" : ""} battu{prs.length > 1 ? "s" : ""}
          </h2>
          <ul className="space-y-2">
            {prs.map(pr => (
              <li key={pr.exerciseId} className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] text-ink truncate">{displayNameFor(pr.exerciseId)}</span>
                <span className="type-num text-xl text-ink shrink-0">{fmtKg(pr.weight)} × {pr.reps}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {skipped > 0 && (
        <p className="text-[15px] text-muted rounded-2xl border border-line p-4 mb-5">
          {skipped} série{skipped > 1 ? "s" : ""} non validée{skipped > 1 ? "s" : ""}. Elles ne seront pas comptées.
        </p>
      )}

      <button onClick={onFinish} className={`${btn.primary} w-full`}>Enregistrer la séance</button>
      <button onClick={onBack} className={`${btn.quiet} w-full mt-2`}>Revenir aux exercices</button>
    </motion.div>
  );
}
