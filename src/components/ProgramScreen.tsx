import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { Exercise, MuscleGroup, WeekDay, Workout } from "../data";
import { storage, type ProgramData } from "../lib/storage";
import { workoutTitle } from "../lib/stats";
import { ConfirmSheet, PageTitle, Segmented, btn } from "./ui";

const MUSCLE_GROUPS: Array<{ key: MuscleGroup; label: string }> = [
  { key: "chest", label: "Pecs" },
  { key: "back-vert", label: "Dos vertical" },
  { key: "back-horiz", label: "Dos horizontal" },
  { key: "quads", label: "Quadriceps" },
  { key: "hamstrings", label: "Ischios" },
  { key: "glutes", label: "Fessiers" },
  { key: "shoulders-side", label: "Delts latéraux" },
  { key: "shoulders-rear", label: "Delts postérieurs" },
  { key: "triceps", label: "Triceps" },
  { key: "biceps", label: "Biceps" },
  { key: "calves", label: "Mollets" },
  { key: "core", label: "Abdos" },
];

type View = "week" | "workouts" | "library";

const slug = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 42);

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function ensureWorkoutExercise(base: Exercise, existingIds: string[]): Exercise {
  const idBase = slug(base.name) || "exercice";
  let id = base.id || idBase;
  let i = 2;
  while (existingIds.includes(id)) { id = `${idBase}-${i}`; i += 1; }
  return {
    ...base,
    id,
    // Keep the library entry's tracking id so history follows the movement across sessions.
    trackingId: base.trackingId ?? base.id ?? idBase,
    sets: base.sets || 3,
    reps: base.reps || "8-12",
    rir: base.rir || "2",
    rest: base.rest ?? 90,
  };
}

function emptyExercise(): Exercise {
  const id = `custom-${Date.now()}`;
  return { id, trackingId: id, name: "Nouvel exercice", sets: 3, reps: "8-12", rir: "2", rest: 90, muscleGroups: [], alternatives: [] };
}

const fieldCls = "w-full h-11 rounded-xl bg-raised border border-line px-3 text-[16px] text-ink outline-none focus:border-muted";

export function ProgramScreen({ onChanged }: { onChanged?: () => void }) {
  const [draft, setDraft] = useState<ProgramData>(() => clone(storage.getProgram()));
  const [view, setView] = useState<View>("week");
  const [activeWorkoutId, setActiveWorkoutId] = useState(() => Object.keys(draft.workouts)[0] ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: "reset" } | { kind: "workout"; id: string } | { kind: "library"; id: string }>(null);
  // Last persisted snapshot: only real edits trigger a save (robust to StrictMode double effects).
  const savedJson = useRef(JSON.stringify(draft));

  // Autosave: edits are persisted shortly after typing stops, so switching tab never loses work.
  useEffect(() => {
    const json = JSON.stringify(draft);
    if (json === savedJson.current) return;
    const t = window.setTimeout(() => {
      savedJson.current = json;
      storage.saveProgram(draft);
      setSavedAt(Date.now());
      onChanged?.();
    }, 400);
    return () => window.clearTimeout(t);
  }, [draft]);

  const workouts = Object.values(draft.workouts) as Workout[];
  const activeWorkout = draft.workouts[activeWorkoutId] ?? workouts[0];
  const libraryById = useMemo(() => new Map(draft.library.map(ex => [ex.id, ex])), [draft.library]);

  const patchWorkout = (workoutId: string, patch: Partial<Workout>) =>
    setDraft(prev => ({ ...prev, workouts: { ...prev.workouts, [workoutId]: { ...prev.workouts[workoutId], ...patch } } }));

  const patchExercise = (workoutId: string, exerciseId: string, patch: Partial<Exercise>) => {
    const w = draft.workouts[workoutId];
    if (w) patchWorkout(workoutId, { exercises: w.exercises.map(ex => (ex.id === exerciseId ? { ...ex, ...patch } : ex)) });
  };

  const moveExercise = (workoutId: string, index: number, dir: -1 | 1) => {
    const w = draft.workouts[workoutId];
    const target = index + dir;
    if (!w || target < 0 || target >= w.exercises.length) return;
    const next = [...w.exercises];
    [next[index], next[target]] = [next[target], next[index]];
    patchWorkout(workoutId, { exercises: next });
  };

  const addWorkout = () => {
    const id = `workout-${Date.now()}`;
    setDraft(prev => ({ ...prev, workouts: { ...prev.workouts, [id]: { id, name: "Nouvelle séance", warmup: "5 à 8 min tranquille.", exercises: [] } } }));
    setActiveWorkoutId(id);
  };

  const removeWorkout = (workoutId: string) => {
    setDraft(prev => {
      const next = clone(prev);
      delete next.workouts[workoutId];
      next.weeklySchedule = next.weeklySchedule.map(day => (day.workoutId === workoutId ? { ...day, type: "rest", workoutId: undefined, description: "Repos" } : day));
      return next;
    });
    setActiveWorkoutId(Object.keys(draft.workouts).find(id => id !== workoutId) ?? "");
  };

  const addExerciseToWorkout = (sourceId: string) => {
    const source = libraryById.get(sourceId);
    if (!source || !activeWorkout) return;
    patchWorkout(activeWorkout.id, { exercises: [...activeWorkout.exercises, ensureWorkoutExercise(source, activeWorkout.exercises.map(ex => ex.id))] });
  };

  const patchLibraryExercise = (id: string, patch: Partial<Exercise>) =>
    setDraft(prev => ({ ...prev, library: prev.library.map(ex => (ex.id === id ? { ...ex, ...patch } : ex)) }));

  const patchDay = (index: number, patch: Partial<WeekDay>) =>
    setDraft(prev => ({ ...prev, weeklySchedule: prev.weeklySchedule.map((day, i) => (i === index ? { ...day, ...patch } : day)) }));

  return (
    <div className="tab-page">
      <PageTitle aside={savedAt ? <span className="text-sm text-faint pb-1.5" role="status">Enregistré</span> : undefined}>Programme</PageTitle>

      <div className="mb-5">
        <Segmented<View>
          label="Partie du programme"
          value={view}
          onChange={setView}
          options={[{ value: "week", label: "Semaine" }, { value: "workouts", label: "Séances" }, { value: "library", label: "Exercices" }]}
        />
      </div>

      {view === "week" && (
        <ul className="rounded-2xl bg-surface border border-line divide-y divide-line">
          {draft.weeklySchedule.map((day, index) => (
            <li key={day.day} className="flex items-center gap-3 px-4 py-2.5">
              <label htmlFor={`day-${index}`} className="w-24 text-[16px] font-semibold text-ink">{day.day}</label>
              <select
                id={`day-${index}`}
                value={day.type === "workout" ? day.workoutId ?? "" : "rest"}
                onChange={e => {
                  if (e.target.value === "rest") patchDay(index, { type: "rest", workoutId: undefined, description: "Repos" });
                  else patchDay(index, { type: "workout", workoutId: e.target.value, description: workoutTitle(draft.workouts[e.target.value]?.name ?? "") });
                }}
                className={`${fieldCls} flex-1`}
              >
                <option value="rest">Repos</option>
                {workouts.map(w => <option key={w.id} value={w.id}>{workoutTitle(w.name)}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}

      {view === "workouts" && (
        <>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-3" role="tablist" aria-label="Séances">
            {workouts.map(w => (
              <button
                key={w.id}
                role="tab"
                aria-selected={activeWorkout?.id === w.id}
                onClick={() => setActiveWorkoutId(w.id)}
                className={`shrink-0 px-4 h-10 rounded-xl text-[15px] font-semibold ${
                  activeWorkout?.id === w.id ? "bg-chalk text-on-chalk" : "bg-surface border border-line text-muted"
                }`}
              >
                {workoutTitle(w.name)}
              </button>
            ))}
            <button onClick={addWorkout} className="shrink-0 px-3 h-10 rounded-xl border border-dashed border-line text-muted text-[15px] font-semibold inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Nouvelle
            </button>
          </div>

          {activeWorkout && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-surface border border-line p-4 space-y-3">
                <Field label="Nom de la séance">
                  <input value={activeWorkout.name} onChange={e => patchWorkout(activeWorkout.id, { name: e.target.value })} className={fieldCls} />
                </Field>
                <Field label="Échauffement">
                  <input value={activeWorkout.warmup} onChange={e => patchWorkout(activeWorkout.id, { warmup: e.target.value })} className={fieldCls} />
                </Field>
                <Field label="Retour au calme (facultatif)">
                  <input value={activeWorkout.cooldown ?? ""} onChange={e => patchWorkout(activeWorkout.id, { cooldown: e.target.value || undefined })} className={fieldCls} />
                </Field>
              </div>

              <ol className="space-y-2">
                {activeWorkout.exercises.map((ex, index) => (
                  <li key={ex.id} className="rounded-2xl bg-surface border border-line p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="type-num text-xl text-faint w-6">{index + 1}</span>
                      <input
                        aria-label={`Nom de l'exercice ${index + 1}`}
                        value={ex.name}
                        onChange={e => patchExercise(activeWorkout.id, ex.id, { name: e.target.value })}
                        className={`${fieldCls} flex-1 font-semibold`}
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <SmallField label="Séries" value={ex.sets} numeric onChange={v => patchExercise(activeWorkout.id, ex.id, { sets: Math.max(1, Number(v) || 1) })} />
                      <SmallField label="Reps" value={ex.reps} onChange={v => patchExercise(activeWorkout.id, ex.id, { reps: v })} />
                      <SmallField label="RIR" value={ex.rir} onChange={v => patchExercise(activeWorkout.id, ex.id, { rir: v })} />
                      <SmallField label="Repos (s)" value={ex.rest ?? 90} numeric onChange={v => patchExercise(activeWorkout.id, ex.id, { rest: Number(v) || 0 })} />
                    </div>
                    <div className="flex items-center gap-1 mt-3 -mb-1">
                      <button onClick={() => moveExercise(activeWorkout.id, index, -1)} disabled={index === 0} aria-label="Monter" className={`${btn.icon} disabled:opacity-30`}><ArrowUp className="w-5 h-5" /></button>
                      <button onClick={() => moveExercise(activeWorkout.id, index, 1)} disabled={index === activeWorkout.exercises.length - 1} aria-label="Descendre" className={`${btn.icon} disabled:opacity-30`}><ArrowDown className="w-5 h-5" /></button>
                      <button
                        onClick={() => patchWorkout(activeWorkout.id, { exercises: activeWorkout.exercises.filter(x => x.id !== ex.id) })}
                        className={`${btn.quiet} ml-auto text-warn`}
                      >
                        <Trash2 className="w-4 h-4" /> Retirer
                      </button>
                    </div>
                  </li>
                ))}
                {activeWorkout.exercises.length === 0 && (
                  <li className="text-center text-muted py-6 rounded-2xl border border-dashed border-line">Ajoute un premier exercice depuis ta bibliothèque.</li>
                )}
              </ol>

              <Field label="Ajouter un exercice">
                <select
                  value=""
                  onChange={e => { if (e.target.value) addExerciseToWorkout(e.target.value); }}
                  className={fieldCls}
                >
                  <option value="">Choisir dans la bibliothèque…</option>
                  {draft.library.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                </select>
              </Field>

              {workouts.length > 1 && (
                <button onClick={() => setConfirm({ kind: "workout", id: activeWorkout.id })} className={`${btn.danger} w-full`}>
                  <Trash2 className="w-4 h-4" /> Supprimer « {workoutTitle(activeWorkout.name)} »
                </button>
              )}
            </div>
          )}
        </>
      )}

      {view === "library" && (
        <div className="space-y-2">
          <p className="text-[15px] text-muted mb-3">
            Les groupes musculaires servent au calcul du volume hebdomadaire et aux remplacements proposés pendant la séance.
          </p>
          <button
            onClick={() => setDraft(prev => ({ ...prev, library: [emptyExercise(), ...prev.library] }))}
            className={`${btn.secondary} w-full`}
          >
            <Plus className="w-5 h-5" /> Nouvel exercice
          </button>
          {draft.library.map(ex => (
            <div key={ex.id} className="rounded-2xl bg-surface border border-line p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  aria-label="Nom de l'exercice"
                  value={ex.name}
                  onChange={e => patchLibraryExercise(ex.id, { name: e.target.value })}
                  className={`${fieldCls} flex-1 font-semibold`}
                />
                <button onClick={() => setConfirm({ kind: "library", id: ex.id })} aria-label={`Supprimer ${ex.name}`} className={`${btn.icon} text-warn`}>
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Groupes musculaires">
                {MUSCLE_GROUPS.map(group => {
                  const active = ex.muscleGroups?.includes(group.key) ?? false;
                  return (
                    <button
                      key={group.key}
                      aria-pressed={active}
                      onClick={() => patchLibraryExercise(ex.id, {
                        muscleGroups: active ? ex.muscleGroups?.filter(mg => mg !== group.key) : [...(ex.muscleGroups ?? []), group.key],
                      })}
                      className={`px-3 h-9 rounded-lg text-sm font-medium ${active ? "bg-chalk text-on-chalk" : "bg-raised text-muted"}`}
                    >
                      {group.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setConfirm({ kind: "reset" })} className={`${btn.quiet} w-full mt-8`}>
        Revenir au programme d'origine
      </button>

      <ConfirmSheet
        open={confirm?.kind === "reset"}
        title="Revenir au programme d'origine ?"
        body="Tes séances, ton planning et ta bibliothèque personnalisés seront remplacés. L'historique d'entraînement est conservé."
        confirmLabel="Réinitialiser"
        onConfirm={() => {
          storage.resetProgram();
          const next = storage.getProgram();
          savedJson.current = JSON.stringify(next);
          setDraft(clone(next));
          setActiveWorkoutId(Object.keys(next.workouts)[0] ?? "");
          onChanged?.();
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmSheet
        open={confirm?.kind === "workout"}
        title="Supprimer cette séance ?"
        body="Les jours où elle était prévue passent en repos. L'historique est conservé."
        confirmLabel="Supprimer"
        onConfirm={() => { if (confirm?.kind === "workout") removeWorkout(confirm.id); }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmSheet
        open={confirm?.kind === "library"}
        title="Retirer de la bibliothèque ?"
        body="Les séances qui l'utilisent déjà la gardent."
        confirmLabel="Retirer"
        onConfirm={() => {
          if (confirm?.kind === "library") setDraft(prev => ({ ...prev, library: prev.library.filter(item => item.id !== confirm.id) }));
        }}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function SmallField({ label, value, onChange, numeric }: { label: string; value: string | number; onChange: (value: string) => void; numeric?: boolean }) {
  return (
    <label className="block">
      <span className="block text-xs text-faint mb-1">{label}</span>
      <input
        value={value}
        inputMode={numeric ? "numeric" : "text"}
        onChange={e => onChange(e.target.value)}
        className="w-full h-11 rounded-xl bg-raised border border-line px-2 text-center text-[16px] text-ink tnum outline-none focus:border-muted"
      />
    </label>
  );
}
