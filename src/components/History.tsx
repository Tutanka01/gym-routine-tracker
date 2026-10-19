import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Search, Trophy, MessageSquare, Trash2 } from "lucide-react";
import { storage, type WorkoutSession, type ExerciseLog, type ProgramData } from "../lib/storage";
import { workouts as defaultWorkouts, trackedExercises, trackingIdFor, type Workout } from "../data";
import { bestSetEver, exerciseProgression, fmtKg, fmtTonnage, sessionVolume, topSet, workoutTitle } from "../lib/stats";
import { e1RMProgression } from "../lib/intelligence";
import { TrendChart } from "./TrendChart";
import { ConfirmSheet, Sheet, btn } from "./ui";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export function ExerciseProgress({ program, sessions }: { program: ProgramData; sessions: WorkoutSession[] }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trackedExercises(program.workouts)
      .filter(ex => ex.name.toLowerCase().includes(q))
      .map(ex => {
        const e1rm = e1RMProgression(sessions, ex.id);
        const inWorkouts = (Object.values(program.workouts) as Workout[])
          .filter(w => w.exercises.some(e => trackingIdFor(e) === trackingIdFor(ex)))
          .map(w => workoutTitle(w.name));
        return { ex, e1rm, best: bestSetEver(sessions, ex.id), inWorkouts };
      })
      .sort((a, b) => b.e1rm.length - a.e1rm.length);
  }, [program.workouts, sessions, query]);

  return (
    <div>
      <label className="flex items-center gap-2 px-3 h-12 bg-surface rounded-xl border border-line mb-4">
        <Search className="w-5 h-5 text-faint" aria-hidden />
        <span className="sr-only">Rechercher un exercice</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un exercice"
          className="flex-1 bg-transparent outline-none text-ink placeholder:text-faint"
        />
      </label>

      {rows.length === 0 && <p className="text-center text-muted py-12">Aucun exercice ne correspond à « {query} ».</p>}

      <ul className="space-y-2">
        {rows.map(({ ex, e1rm, best, inWorkouts }) => {
          const open = openId === ex.id;
          const first = e1rm[0]?.e1rm ?? 0;
          const last = e1rm[e1rm.length - 1]?.e1rm ?? 0;
          const delta = e1rm.length > 1 ? Math.round((last - first) * 10) / 10 : null;
          return (
            <li key={ex.id} className="rounded-2xl bg-surface border border-line overflow-hidden">
              <button
                onClick={() => setOpenId(open ? null : ex.id)}
                aria-expanded={open}
                className="w-full text-left p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[17px] font-semibold text-ink leading-tight">{ex.name}</div>
                  <div className="text-sm text-faint mt-0.5 truncate">
                    {e1rm.length ? `${e1rm.length} séance${e1rm.length > 1 ? "s" : ""}` : "Jamais fait"} — {inWorkouts.join(", ")}
                  </div>
                </div>
                {e1rm.length > 0 && (
                  <div className="text-right shrink-0">
                    <div className="type-num text-2xl text-ink">{fmtKg(Math.round(last))}<span className="text-sm text-muted ml-0.5">kg</span></div>
                    {delta !== null && delta !== 0 && (
                      <div className={`text-xs font-semibold tnum ${delta > 0 ? "text-go" : "text-warn"}`}>
                        {delta > 0 ? "+" : "−"}{fmtKg(Math.abs(delta))} kg
                      </div>
                    )}
                  </div>
                )}
                <ChevronDown className={`w-5 h-5 text-faint shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-line pt-4">
                      <p className="text-sm text-muted mb-3">
                        1RM estimé (formule d'Epley) sur la meilleure série de chaque séance.
                      </p>
                      <TrendChart label={`1RM estimé, ${ex.name}`} unit="kg" points={e1rm.map(p => ({ date: p.date, value: p.e1rm }))} />
                      {best && (
                        <p className="flex items-center gap-2 text-[15px] text-ink mt-4">
                          <Trophy className="w-4 h-4 text-pr" aria-hidden />
                          Record : <span className="type-num text-lg">{fmtKg(best.weight)} × {best.reps}</span>
                          <span className="text-faint text-sm">le {longDate(best.date)}</span>
                        </p>
                      )}
                      <ExerciseTable sessions={sessions} exId={ex.id} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ExerciseTable({ sessions, exId }: { sessions: WorkoutSession[]; exId: string }) {
  const prog = exerciseProgression(sessions, exId).slice().reverse().slice(0, 8);
  if (!prog.length) return null;
  return (
    <table className="w-full mt-4 text-[15px]">
      <caption className="sr-only">Meilleure série par séance</caption>
      <thead>
        <tr className="text-left text-sm text-faint">
          <th className="font-medium pb-1.5">Date</th>
          <th className="font-medium pb-1.5">Meilleure série</th>
          <th className="font-medium pb-1.5 text-right">Volume</th>
        </tr>
      </thead>
      <tbody className="tnum">
        {prog.map(p => (
          <tr key={p.date} className="border-t border-line">
            <td className="py-2 text-muted">{longDate(p.date)}</td>
            <td className="py-2 text-ink font-medium">{fmtKg(p.top!.weight)} kg × {p.top!.reps}</td>
            <td className="py-2 text-muted text-right">{fmtTonnage(p.volume)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SessionLog({ program, sessions, onChanged }: { program: ProgramData; sessions: WorkoutSession[]; onChanged: () => void }) {
  const [open, setOpen] = useState<WorkoutSession | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const nameFor = (s: WorkoutSession) => {
    const w = program.workouts[s.workoutId] ?? defaultWorkouts[s.workoutId];
    return w ? workoutTitle(w.name) : s.workoutName || s.workoutId;
  };

  if (!sessions.length) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-lg font-semibold text-ink mb-1">Aucune séance enregistrée</p>
        <p className="text-muted">Termine ta première séance : elle apparaîtra ici avec chaque série.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="rounded-2xl bg-surface border border-line divide-y divide-line overflow-hidden">
        {sessions.slice().reverse().map(s => {
          const sets = (Object.values(s.logs) as ExerciseLog[]).flatMap(l => l.sets).filter(x => x.isComplete).length;
          return (
            <li key={s.id}>
              <button onClick={() => setOpen(s)} className="w-full text-left px-4 py-3.5 flex items-center gap-3 active:bg-raised transition">
                <div className="w-14 shrink-0 text-sm text-muted leading-tight">{longDate(s.date)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[17px] font-semibold text-ink truncate">{nameFor(s)}</div>
                  <div className="text-sm text-faint tnum">
                    {sets} séries, {fmtTonnage(s.totalVolume ?? sessionVolume(s))}
                    {s.durationSec ? `, ${Math.round(s.durationSec / 60)} min` : ""}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!open} onClose={() => setOpen(null)} label="Détail de la séance" tall>
        {open && (
          <>
            <p className="text-sm text-muted">
              {new Date(open.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h2 className="type-display text-[36px] text-ink mt-1 mb-5">{nameFor(open)}</h2>
            <div className="space-y-4">
              {(Object.entries(open.logs) as [string, ExerciseLog][]).map(([exId, log]) => {
                const ex = log.performedExercise
                  ?? program.workouts[open.workoutId]?.exercises.find(e => e.id === exId)
                  ?? defaultWorkouts[open.workoutId]?.exercises.find(e => e.id === exId);
                if (!ex && !log.displayName) return null;
                const top = topSet(log.sets);
                return (
                  <div key={exId}>
                    <div className="text-[15px] font-semibold text-ink mb-1.5">{log.displayName || ex?.name || exId}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {log.sets.map((set, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-sm tnum ${
                            set === top && Number(set.weight) > 0
                              ? "bg-pr/15 text-ink ring-1 ring-pr/50"
                              : set.isComplete ? "bg-raised text-ink" : "bg-transparent text-faint ring-1 ring-line"
                          }`}
                        >
                          {set.weight ? fmtKg(set.weight) : "–"} × {set.reps || "–"}
                          {set.note && <MessageSquare className="w-3.5 h-3.5 text-muted" aria-label={`Note : ${set.note}`} />}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setConfirmDelete(true)} className={`${btn.danger} w-full mt-6`}>
              <Trash2 className="w-4 h-4" /> Supprimer la séance
            </button>
          </>
        )}
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        title="Supprimer cette séance ?"
        body="Elle disparaîtra de l'historique et des calculs de progression. Action définitive."
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (open) storage.deleteSession(open.id);
          setOpen(null);
          onChanged();
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
