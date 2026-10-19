export type MuscleGroup =
  | 'chest' | 'back-vert' | 'back-horiz'
  | 'quads' | 'hamstrings' | 'glutes'
  | 'shoulders-side' | 'shoulders-rear'
  | 'triceps' | 'biceps' | 'calves' | 'core';

export type Exercise = {
  id: string;
  trackingId?: string;
  legacyIds?: string[];
  name: string;
  sets: number;
  reps: string;
  rir: string;
  /** Default rest between sets in seconds. Compounds get more, isolation less. */
  rest?: number;
  notes?: string;
  alternatives?: string[];
  muscleGroups?: MuscleGroup[];
  isCompound?: boolean;
};

export type Workout = {
  id: string;
  name: string;
  warmup: string;
  exercises: Exercise[];
  cooldown?: string;
  notes?: string;
};

export type WeekDay = {
  day: string;
  type: "workout" | "rest";
  workoutId?: string;
  description?: string;
};

export const defaultWorkouts: Record<string, Workout> = {
  "upper-a": {
    id: "upper-a",
    name: "LUNDI — HAUT A · FORCE",
    warmup: "5 à 8 min marche inclinée ou vélo tranquille, puis 2 séries légères de développé couché.",
    exercises: [
      { id: "ha1", trackingId: "developpe-couche-barre", name: "Développé couché barre", sets: 4, reps: "5-8", rir: "2", rest: 150, isCompound: true, muscleGroups: ['chest', 'triceps'], notes: "Force : 2 à 3 min de repos.", alternatives: ["Développé couché haltères", "Chest press machine", "Développé couché Smith"] },
      { id: "ha2", trackingId: "rowing-barre", name: "Rowing barre", sets: 4, reps: "6-10", rir: "2", rest: 120, isCompound: true, muscleGroups: ['back-horiz'], alternatives: ["Rowing machine appuyée", "Rowing T-bar appuyé", "Rowing assis câble"] },
      { id: "ha3", trackingId: "developpe-militaire-halteres-assis", name: "Développé militaire haltères assis", sets: 3, reps: "8-10", rir: "2", rest: 120, isCompound: true, muscleGroups: ['shoulders-side', 'triceps'], alternatives: ["Développé épaules machine", "Développé militaire barre", "Landmine press"] },
      { id: "ha4", trackingId: "tractions", name: "Tractions", sets: 3, reps: "6-10", rir: "2", rest: 120, isCompound: true, muscleGroups: ['back-vert', 'biceps'], notes: "Lestées si possible.", alternatives: ["Tractions assistées", "Tirage vertical", "Tirage vertical prise neutre"] },
      { id: "ha5", trackingId: "elevations-laterales-halteres", name: "Élévations latérales haltères", sets: 3, reps: "12-20", rir: "1-2", rest: 60, muscleGroups: ['shoulders-side'], alternatives: ["Élévations latérales poulie", "Élévations latérales machine"] },
      { id: "ha6", trackingId: "curl-barre-ez", name: "Curl barre EZ", sets: 3, reps: "8-12", rir: "1-2", rest: 90, muscleGroups: ['biceps'], alternatives: ["Curl haltères alternés", "Curl pupitre machine", "Curl câble"] },
      { id: "ha7", trackingId: "barre-au-front-ez", name: "Barre au front EZ", sets: 3, reps: "8-12", rir: "1-2", rest: 90, muscleGroups: ['triceps'], alternatives: ["Extension triceps corde poulie", "Extension triceps overhead", "Dips assistés"] },
    ],
    cooldown: "Marche inclinée : 20-25 min, pente 8-12 %, 5-6 km/h.",
  },
  "lower-a": {
    id: "lower-a",
    name: "MARDI — BAS A · FORCE",
    warmup: "5 à 8 min vélo ou marche, puis 2-3 séries de montée en charge au squat.",
    exercises: [
      { id: "ba1", trackingId: "squat-barre", name: "Squat barre", sets: 4, reps: "5-8", rir: "2", rest: 180, isCompound: true, muscleGroups: ['quads', 'glutes'], alternatives: ["Squat Smith", "Hack squat", "Presse à cuisses"] },
      { id: "ba2", trackingId: "souleve-de-terre-roumain", legacyIds: ["la2"], name: "Soulevé de terre roumain", sets: 3, reps: "6-10", rir: "2", rest: 150, isCompound: true, muscleGroups: ['hamstrings', 'glutes'], notes: "2 à 3 min de repos.", alternatives: ["Soulevé de terre roumain haltères", "Good morning machine", "Hip hinge à la poulie"] },
      { id: "ba3", trackingId: "fentes-bulgares", legacyIds: ["lb3"], name: "Fentes bulgares haltères", sets: 3, reps: "8-12", rir: "2", rest: 90, isCompound: true, muscleGroups: ['quads', 'glutes'], notes: "Reps par jambe.", alternatives: ["Split squat Smith", "Step-up", "Presse unilatérale"] },
      { id: "ba4", trackingId: "leg-extension", legacyIds: ["la4"], name: "Leg extension", sets: 3, reps: "12-15", rir: "1-2", rest: 60, muscleGroups: ['quads'], alternatives: ["Leg extension unilatéral", "Sissy squat assisté"] },
      { id: "ba5", trackingId: "mollets", legacyIds: ["la5", "lb5"], name: "Mollets debout", sets: 4, reps: "8-12", rir: "1-2", rest: 60, muscleGroups: ['calves'], alternatives: ["Mollets à la presse", "Mollets Smith"] },
      { id: "ba6", trackingId: "releves-de-jambes-suspendu", name: "Relevés de jambes suspendu", sets: 3, reps: "10-15", rir: "-", rest: 60, muscleGroups: ['core'], alternatives: ["Captain chair", "Crunch câble", "Relevés de jambes au sol"] },
    ],
    cooldown: "Marche inclinée : 20 min.",
    notes: "Bloc force : technique propre avant la charge. Garde 2 reps en réserve sur le squat.",
  },
  "upper-b": {
    id: "upper-b",
    name: "JEUDI — HAUT B · VOLUME",
    warmup: "5 à 8 min marche inclinée ou vélo tranquille.",
    exercises: [
      { id: "hb1", trackingId: "developpe-incline-halteres", legacyIds: ["ub1"], name: "Développé incliné haltères", sets: 4, reps: "8-12", rir: "2", rest: 120, isCompound: true, muscleGroups: ['chest'], alternatives: ["Développé incliné machine", "Développé incliné barre", "Chest press inclinée"] },
      { id: "hb2", trackingId: "tirage-vertical", legacyIds: ["ua2", "ub3"], name: "Tirage vertical", sets: 4, reps: "10-12", rir: "2", rest: 90, isCompound: true, muscleGroups: ['back-vert'], notes: "Poulie haute.", alternatives: ["Tirage vertical prise neutre", "Tractions assistées", "Tirage vertical unilatéral"] },
      { id: "hb3", trackingId: "pec-deck", legacyIds: ["ub4"], name: "Pec deck", sets: 3, reps: "12-15", rir: "1-2", rest: 60, muscleGroups: ['chest'], alternatives: ["Écarté poulie", "Écartés haltères inclinés"] },
      { id: "hb4", trackingId: "rowing-unilateral-haltere", name: "Rowing unilatéral haltère", sets: 3, reps: "10-12", rir: "2", rest: 90, isCompound: true, muscleGroups: ['back-horiz'], notes: "Reps par bras.", alternatives: ["Rowing câble unilatéral", "Rowing machine appuyée"] },
      { id: "hb5", trackingId: "elevations-laterales-cable", legacyIds: ["ua5"], name: "Élévations latérales poulie", sets: 3, reps: "15-20", rir: "1-2", rest: 60, muscleGroups: ['shoulders-side'], alternatives: ["Élévations latérales haltères", "Élévations latérales machine"] },
      { id: "hb6", trackingId: "face-pull", name: "Face pull", sets: 3, reps: "15-20", rir: "1-2", rest: 60, muscleGroups: ['shoulders-rear'], alternatives: ["Oiseau machine", "Oiseau câble", "Reverse pec deck"] },
      { id: "hb7", trackingId: "curl-incline", legacyIds: ["ua7"], name: "Curl incliné haltères", sets: 3, reps: "10-15", rir: "1-2", rest: 60, muscleGroups: ['biceps'], alternatives: ["Curl câble", "Curl marteau", "Curl pupitre"] },
      { id: "hb8", trackingId: "extension-triceps-corde", legacyIds: ["ua6"], name: "Extension triceps corde poulie", sets: 3, reps: "12-15", rir: "1-2", rest: 60, muscleGroups: ['triceps'], alternatives: ["Barre V poulie haute", "Extension triceps overhead"] },
    ],
    cooldown: "Marche inclinée : 20-25 min, pente 8-12 %, 5-6 km/h.",
  },
  "lower-b": {
    id: "lower-b",
    name: "VENDREDI — BAS B · VOLUME",
    warmup: "5 à 8 min vélo ou marche.",
    exercises: [
      { id: "bb1", trackingId: "leg-press", legacyIds: ["la1", "lb2"], name: "Presse à cuisses", sets: 4, reps: "8-12", rir: "2", rest: 120, isCompound: true, muscleGroups: ['quads', 'glutes'], alternatives: ["Hack squat", "Squat Smith", "Belt squat"] },
      { id: "bb2", trackingId: "hip-thrust", name: "Hip thrust", sets: 3, reps: "8-12", rir: "2", rest: 120, isCompound: true, muscleGroups: ['glutes', 'hamstrings'], alternatives: ["Hip thrust machine", "Glute bridge barre", "Pull-through câble"] },
      { id: "bb3", trackingId: "leg-curl", legacyIds: ["la3", "lb4"], name: "Leg curl assis", sets: 4, reps: "10-15", rir: "1-2", rest: 90, muscleGroups: ['hamstrings'], alternatives: ["Leg curl allongé", "Leg curl debout"] },
      { id: "bb4", trackingId: "fentes-marchees", name: "Fentes marchées", sets: 2, reps: "12", rir: "2", rest: 90, isCompound: true, muscleGroups: ['quads', 'glutes'], notes: "12 pas par jambe.", alternatives: ["Fentes arrière", "Step-up", "Fentes bulgares haltères"] },
      { id: "bb5", trackingId: "mollets-assis", name: "Mollets assis", sets: 4, reps: "12-15", rir: "1-2", rest: 60, muscleGroups: ['calves'], alternatives: ["Mollets debout", "Mollets à la presse"] },
      { id: "bb6", trackingId: "roue-abdominale", name: "Roue abdominale", sets: 3, reps: "10-12", rir: "-", rest: 60, muscleGroups: ['core'], notes: "Ou gainage : 45 s par série.", alternatives: ["Gainage", "Crunch câble", "Dead bug chargé"] },
    ],
    cooldown: "Marche inclinée : 20 min.",
  },
};

export const defaultWeeklySchedule: WeekDay[] = [
  { day: "Lundi", type: "workout", workoutId: "upper-a", description: "Haut A (force)" },
  { day: "Mardi", type: "workout", workoutId: "lower-a", description: "Bas A (force)" },
  { day: "Mercredi", type: "rest", description: "Repos actif / marche" },
  { day: "Jeudi", type: "workout", workoutId: "upper-b", description: "Haut B (volume)" },
  { day: "Vendredi", type: "workout", workoutId: "lower-b", description: "Bas B (volume)" },
  { day: "Samedi", type: "rest", description: "Cardio" },
  { day: "Dimanche", type: "rest", description: "Repos + pesée + photo + tour de taille" },
];

export function getToday(): WeekDay {
  return getTodayFromSchedule(defaultWeeklySchedule);
}

export function getTodayFromSchedule(schedule: WeekDay[]): WeekDay {
  const date = new Date();
  let dayIndex = date.getDay();
  if (dayIndex === 0) dayIndex = 7;
  return schedule[dayIndex - 1] ?? defaultWeeklySchedule[dayIndex - 1];
}

export const workouts = defaultWorkouts;
export const weeklySchedule = defaultWeeklySchedule;

export const allExercises = (source: Record<string, Workout> = defaultWorkouts): Exercise[] =>
  Object.values(source).flatMap(w => w.exercises);

export const trackingIdFor = (exercise: Exercise): string => exercise.trackingId ?? exercise.id;

export const exerciseLogKeys = (exercise: Exercise): string[] =>
  Array.from(new Set([exercise.id, trackingIdFor(exercise), ...(exercise.legacyIds ?? [])]));

export const findExerciseByLogKey = (
  logKey: string,
  source: Record<string, Workout> = defaultWorkouts,
): { workout: Workout; exercise: Exercise } | null => {
  for (const w of Object.values(source)) {
    const ex = w.exercises.find(e => exerciseLogKeys(e).includes(logKey));
    if (ex) return { workout: w, exercise: ex };
  }
  return null;
};

export const logKeysForExerciseId = (
  exerciseId: string,
  source: Record<string, Workout> = defaultWorkouts,
): string[] => {
  const found = findExercise(exerciseId, source)?.exercise ?? findExerciseByLogKey(exerciseId, source)?.exercise;
  if (!found) return [exerciseId];
  const trackingId = trackingIdFor(found);
  return Array.from(new Set(
    allExercises(source)
      .filter(ex => trackingIdFor(ex) === trackingId)
      .flatMap(exerciseLogKeys),
  ));
};

export const trackedExercises = (source: Record<string, Workout> = defaultWorkouts): Exercise[] => {
  const seen = new Set<string>();
  const result: Exercise[] = [];
  for (const ex of allExercises(source)) {
    const trackingId = trackingIdFor(ex);
    if (seen.has(trackingId)) continue;
    seen.add(trackingId);
    result.push(ex);
  }
  return result;
};

export const findExercise = (
  id: string,
  source: Record<string, Workout> = defaultWorkouts,
): { workout: Workout; exercise: Exercise } | null => {
  for (const w of Object.values(source)) {
    const ex = w.exercises.find(e => e.id === id);
    if (ex) return { workout: w, exercise: ex };
  }
  return null;
};
