import { useMemo, useState } from "react";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Exercise, MuscleGroup, WeekDay, Workout } from "../data";
import { ProgramData, storage } from "../lib/storage";

const MUSCLE_GROUPS: Array<{ key: MuscleGroup; label: string }> = [
  { key: "chest", label: "Pecs" },
  { key: "back-vert", label: "Dos vertical" },
  { key: "back-horiz", label: "Dos horizontal" },
  { key: "quads", label: "Quads" },
  { key: "hamstrings", label: "Ischios" },
  { key: "glutes", label: "Fessiers" },
  { key: "shoulders-side", label: "Delts lat." },
  { key: "shoulders-rear", label: "Delts post." },
  { key: "triceps", label: "Triceps" },
  { key: "biceps", label: "Biceps" },
  { key: "calves", label: "Mollets" },
  { key: "core", label: "Core" },
];

const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 42);

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const workoutSubtitle = (name: string) => name.split("—").pop()?.trim() || name;

function ensureWorkoutExercise(base: Exercise, existingIds: string[]): Exercise {
  const idBase = slug(base.name) || "exercice";
  let id = base.id || idBase;
  let i = 2;
  while (existingIds.includes(id)) {
    id = `${idBase}-${i}`;
    i += 1;
  }
  return {
    ...base,
    id,
    trackingId: base.trackingId ?? idBase,
    sets: base.sets || 3,
    reps: base.reps || "8-12",
    rir: base.rir || "2",
    rest: base.rest ?? 90,
  };
}

function emptyExercise(): Exercise {
  const id = `custom-${Date.now()}`;
  return {
    id,
    trackingId: id,
    name: "Nouvel exercice",
    sets: 3,
    reps: "8-12",
    rir: "2",
    rest: 90,
    muscleGroups: [],
    alternatives: [],
  };
}

export function ProgramBuilder({ onChanged }: { onChanged?: () => void }) {
  const [draft, setDraft] = useState<ProgramData>(() => clone(storage.getProgram()));
  const [activeWorkoutId, setActiveWorkoutId] = useState(() => Object.keys(draft.workouts)[0] ?? "");
  const [saved, setSaved] = useState(false);

  const workouts = Object.values(draft.workouts) as Workout[];
  const activeWorkout = draft.workouts[activeWorkoutId] ?? workouts[0];
  const libraryById = useMemo(() => new Map(draft.library.map(ex => [ex.id, ex])), [draft.library]);

  const commit = () => {
    storage.saveProgram(draft);
    setSaved(true);
    onChanged?.();
    setTimeout(() => setSaved(false), 1800);
  };

  const reset = () => {
    if (!confirm("Revenir au programme d'origine ? Les séances et la bibliothèque personnalisées seront remplacées.")) return;
    storage.resetProgram();
    const next = storage.getProgram();
    setDraft(clone(next));
    setActiveWorkoutId(Object.keys(next.workouts)[0] ?? "");
    onChanged?.();
  };

  const patchWorkout = (workoutId: string, patch: Partial<Workout>) => {
    setDraft(prev => ({
      ...prev,
      workouts: {
        ...prev.workouts,
        [workoutId]: { ...prev.workouts[workoutId], ...patch },
      },
    }));
  };

  const patchExercise = (workoutId: string, exerciseId: string, patch: Partial<Exercise>) => {
    const workout = draft.workouts[workoutId];
    if (!workout) return;
    patchWorkout(workoutId, {
      exercises: workout.exercises.map(ex => ex.id === exerciseId ? { ...ex, ...patch } : ex),
    });
  };

  const addWorkout = () => {
    const id = `workout-${Date.now()}`;
    setDraft(prev => ({
      ...prev,
      workouts: {
        ...prev.workouts,
        [id]: { id, name: "NOUVELLE SÉANCE", warmup: "5 à 8 min tranquille.", exercises: [] },
      },
    }));
    setActiveWorkoutId(id);
  };

  const removeWorkout = (workoutId: string) => {
    if (Object.keys(draft.workouts).length <= 1) return;
    if (!confirm("Supprimer cette séance du programme ?")) return;
    setDraft(prev => {
      const next = clone(prev);
      delete next.workouts[workoutId];
      next.weeklySchedule = next.weeklySchedule.map(day => day.workoutId === workoutId
        ? { ...day, type: "rest", workoutId: undefined, description: "Repos" }
        : day);
      return next;
    });
    setActiveWorkoutId(Object.keys(draft.workouts).find(id => id !== workoutId) ?? "");
  };

  const addExerciseToWorkout = (sourceId: string) => {
    const source = libraryById.get(sourceId);
    if (!source || !activeWorkout) return;
    const nextExercise = ensureWorkoutExercise(source, activeWorkout.exercises.map(ex => ex.id));
    patchWorkout(activeWorkout.id, { exercises: [...activeWorkout.exercises, nextExercise] });
  };

  const addLibraryExercise = () => {
    const next = emptyExercise();
    setDraft(prev => ({ ...prev, library: [...prev.library, next] }));
  };

  const patchLibraryExercise = (id: string, patch: Partial<Exercise>) => {
    setDraft(prev => ({
      ...prev,
      library: prev.library.map(ex => ex.id === id ? { ...ex, ...patch } : ex),
    }));
  };

  const patchDay = (index: number, patch: Partial<WeekDay>) => {
    setDraft(prev => ({
      ...prev,
      weeklySchedule: prev.weeklySchedule.map((day, i) => i === index ? { ...day, ...patch } : day),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={commit} className="flex-1 h-11 rounded-xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition">
          <Save className="w-4 h-4" /> {saved ? "Enregistré" : "Enregistrer"}
        </button>
        <button onClick={reset} className="h-11 px-3 rounded-xl bg-[var(--color-void-2)] border border-white/[0.07] text-slate-400 flex items-center gap-2 text-xs font-bold active:scale-[0.99] transition">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      <section>
        <SectionTitle title="Planning" />
        <div className="space-y-2">
          {draft.weeklySchedule.map((day, index) => (
            <div key={day.day} className="grid grid-cols-[62px_1fr] gap-2 rounded-xl bg-[var(--color-void-1)] border border-white/[0.05] p-3">
              <div className="text-xs font-bold text-slate-500 pt-2">{day.day.slice(0, 3)}</div>
              <div className="space-y-2">
                <select
                  value={day.type === "workout" ? day.workoutId ?? "" : "rest"}
                  onChange={e => {
                    if (e.target.value === "rest") patchDay(index, { type: "rest", workoutId: undefined, description: "Repos" });
                    else patchDay(index, { type: "workout", workoutId: e.target.value, description: workoutSubtitle(draft.workouts[e.target.value]?.name ?? "") });
                  }}
                  className="w-full h-10 rounded-lg bg-[var(--color-void-3)] border border-white/[0.07] px-3 text-sm outline-none"
                >
                  <option value="rest">Repos</option>
                  {workouts.map(w => <option key={w.id} value={w.id}>{workoutSubtitle(w.name)}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle title="Séances" />
          <button onClick={addWorkout} className="h-8 px-3 rounded-lg bg-signal-soft border border-signal-soft text-[var(--color-signal)] text-xs font-bold flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Séance
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto view-no-scrollbar pb-2">
          {workouts.map(w => (
            <button
              key={w.id}
              onClick={() => setActiveWorkoutId(w.id)}
              className={`shrink-0 px-3 h-9 rounded-lg text-xs font-bold border ${
                activeWorkout?.id === w.id
                  ? "bg-[var(--color-signal)] text-black border-transparent"
                  : "bg-[var(--color-void-1)] border-white/[0.06] text-slate-500"
              }`}
            >
              {workoutSubtitle(w.name)}
            </button>
          ))}
        </div>

        {activeWorkout && (
          <div className="rounded-2xl bg-[var(--color-void-1)] border border-white/[0.05] p-4 space-y-3">
            <div className="flex gap-2">
              <input
                value={activeWorkout.name}
                onChange={e => patchWorkout(activeWorkout.id, { name: e.target.value })}
                className="flex-1 h-10 rounded-lg bg-[var(--color-void-3)] border border-white/[0.07] px-3 text-sm font-bold outline-none"
              />
              <button onClick={() => removeWorkout(activeWorkout.id)} className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input
              value={activeWorkout.warmup}
              onChange={e => patchWorkout(activeWorkout.id, { warmup: e.target.value })}
              placeholder="Échauffement"
              className="w-full h-10 rounded-lg bg-[var(--color-void-3)] border border-white/[0.07] px-3 text-sm outline-none"
            />
            <select
              value=""
              onChange={e => {
                if (e.target.value) addExerciseToWorkout(e.target.value);
                e.currentTarget.value = "";
              }}
              className="w-full h-10 rounded-lg bg-[var(--color-void-3)] border border-white/[0.07] px-3 text-sm outline-none"
            >
              <option value="">Ajouter un exercice...</option>
              {draft.library.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>

            <div className="space-y-2">
              {activeWorkout.exercises.map((ex, index) => (
                <div key={ex.id} className="rounded-xl bg-[var(--color-void-2)] border border-white/[0.05] p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={ex.name}
                      onChange={e => patchExercise(activeWorkout.id, ex.id, { name: e.target.value, trackingId: slug(e.target.value) })}
                      className="flex-1 h-9 rounded-lg bg-[var(--color-void-3)] border border-white/[0.07] px-3 text-sm font-bold outline-none"
                    />
                    <button
                      onClick={() => patchWorkout(activeWorkout.id, { exercises: activeWorkout.exercises.filter(x => x.id !== ex.id) })}
                      className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <SmallField label="Sets" value={ex.sets} onChange={value => patchExercise(activeWorkout.id, ex.id, { sets: Number(value) || 1 })} />
                    <SmallField label="Reps" value={ex.reps} onChange={value => patchExercise(activeWorkout.id, ex.id, { reps: value })} />
                    <SmallField label="RIR" value={ex.rir} onChange={value => patchExercise(activeWorkout.id, ex.id, { rir: value })} />
                    <SmallField label="Repos" value={ex.rest ?? 90} onChange={value => patchExercise(activeWorkout.id, ex.id, { rest: Number(value) || 0 })} />
                  </div>
                  <div className="text-[10px] text-slate-600">#{index + 1} · {ex.muscleGroups?.join(", ") || "groupe non défini"}</div>
                </div>
              ))}
              {activeWorkout.exercises.length === 0 && (
                <div className="text-center text-sm text-slate-600 py-6">Ajoute des exercices depuis la bibliothèque.</div>
              )}
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle title="Bibliothèque" />
          <button onClick={addLibraryExercise} className="h-8 px-3 rounded-lg bg-signal-soft border border-signal-soft text-[var(--color-signal)] text-xs font-bold flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Exercice
          </button>
        </div>
        <div className="space-y-2">
          {draft.library.map(ex => (
            <div key={ex.id} className="rounded-xl bg-[var(--color-void-1)] border border-white/[0.05] p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  value={ex.name}
                  onChange={e => patchLibraryExercise(ex.id, { name: e.target.value, trackingId: slug(e.target.value) })}
                  className="flex-1 h-9 rounded-lg bg-[var(--color-void-3)] border border-white/[0.07] px-3 text-sm font-bold outline-none"
                />
                <button
                  onClick={() => setDraft(prev => ({ ...prev, library: prev.library.filter(item => item.id !== ex.id) }))}
                  className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <SmallField label="Sets" value={ex.sets} onChange={value => patchLibraryExercise(ex.id, { sets: Number(value) || 1 })} />
                <SmallField label="Reps" value={ex.reps} onChange={value => patchLibraryExercise(ex.id, { reps: value })} />
                <SmallField label="RIR" value={ex.rir} onChange={value => patchLibraryExercise(ex.id, { rir: value })} />
                <SmallField label="Repos" value={ex.rest ?? 90} onChange={value => patchLibraryExercise(ex.id, { rest: Number(value) || 0 })} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MUSCLE_GROUPS.map(group => {
                  const active = ex.muscleGroups?.includes(group.key) ?? false;
                  return (
                    <button
                      key={group.key}
                      onClick={() => patchLibraryExercise(ex.id, {
                        muscleGroups: active
                          ? ex.muscleGroups?.filter(mg => mg !== group.key)
                          : [...(ex.muscleGroups ?? []), group.key],
                      })}
                      className={`px-2 h-7 rounded-lg text-[10px] font-bold border ${
                        active
                          ? "bg-signal-soft border-signal-soft text-[var(--color-signal)]"
                          : "bg-[var(--color-void-2)] border-white/[0.06] text-slate-600"
                      }`}
                    >
                      {group.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-slate-500 px-1">{title}</div>;
}

function SmallField({ label, value, onChange }: { label: string; value: string | number; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="block text-[9px] uppercase tracking-[0.12em] text-slate-600 mb-1">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-8 rounded-lg bg-[var(--color-void-3)] border border-white/[0.07] px-2 text-xs font-mono outline-none"
      />
    </label>
  );
}
