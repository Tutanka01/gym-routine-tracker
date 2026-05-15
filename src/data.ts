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
    name: "SÉANCE 1 — UPPER A",
    warmup: "5 à 8 min marche inclinée ou vélo tranquille.",
    exercises: [
      { id: "ua1", trackingId: "chest-press-machine", legacyIds: ["ua1"], name: "Chest press machine", sets: 3, reps: "6-10", rir: "2", rest: 150, isCompound: true, muscleGroups: ['chest'], alternatives: ["Chest press convergente", "Developpe couche barre", "Developpe couche halteres"] },
      { id: "ua2", trackingId: "tirage-vertical", legacyIds: ["ua2", "ub3"], name: "Tirage vertical", sets: 3, reps: "8-12", rir: "2", rest: 120, isCompound: true, muscleGroups: ['back-vert'], alternatives: ["Tirage vertical prise neutre", "Tractions assistees", "Tirage vertical unilateral"] },
      { id: "ua3", trackingId: "rowing-assis-cable", legacyIds: ["ua3"], name: "Rowing assis câble", sets: 3, reps: "8-12", rir: "2", rest: 120, isCompound: true, muscleGroups: ['back-horiz'], alternatives: ["Rowing poitrine appuyee", "Rowing haltere un bras", "Rowing cable unilateral"] },
      { id: "ua4", trackingId: "developpe-epaules-machine", legacyIds: ["ua4"], name: "Développé épaules machine", sets: 3, reps: "8-12", rir: "2", rest: 120, isCompound: true, muscleGroups: ['shoulders-side'], alternatives: ["Developpe militaire halteres", "Shoulder press convergente", "Landmine press"] },
      { id: "ua5", trackingId: "elevations-laterales-cable", legacyIds: ["ua5"], name: "Élévations latérales câble", sets: 3, reps: "12-20", rir: "1-2", rest: 60, muscleGroups: ['shoulders-side'], alternatives: ["Elevations laterales haltères", "Elevations laterales machine", "Elevations laterales assis"] },
      { id: "ua6", trackingId: "extension-triceps-corde", legacyIds: ["ua6"], name: "Extension triceps à la corde", sets: 3, reps: "10-15", rir: "1-2", rest: 75, muscleGroups: ['triceps'], alternatives: ["Barre V poulie haute", "Extension triceps overhead", "Dips assistes"] },
      { id: "ua7", trackingId: "curl-incline", legacyIds: ["ua7"], name: "Curl incliné", sets: 3, reps: "10-15", rir: "1-2", rest: 75, muscleGroups: ['biceps'], alternatives: ["Curl câble", "Curl pupitre machine", "Curl halteres alternes", "Curl barre EZ"] },
    ],
    cooldown: "15 à 20 min marche inclinée tranquille.",
  },
  "lower-a": {
    id: "lower-a",
    name: "SÉANCE 2 — LOWER A",
    warmup: "5 à 8 min vélo ou marche.",
    exercises: [
      { id: "la1", trackingId: "leg-press", legacyIds: ["la1", "lb2"], name: "Leg press", sets: 3, reps: "8-12", rir: "2", rest: 180, isCompound: true, muscleGroups: ['quads', 'glutes'], alternatives: ["Hack squat", "Smith machine squat", "Goblet squat lourd"] },
      { id: "la2", trackingId: "romanian-deadlift-halteres", legacyIds: ["la2"], name: "Romanian deadlift haltères", sets: 3, reps: "8-10", rir: "2-3", rest: 180, isCompound: true, muscleGroups: ['hamstrings', 'glutes'], alternatives: ["Souleve de terre roumain barre", "Good morning machine"] },
      { id: "la3", trackingId: "leg-curl", legacyIds: ["la3", "lb4"], name: "Leg curl assis", sets: 3, reps: "10-15", rir: "1-2", rest: 90, muscleGroups: ['hamstrings'], alternatives: ["Leg curl allonge", "Leg curl debout", "Nordic curl assiste"] },
      { id: "la4", trackingId: "leg-extension", legacyIds: ["la4"], name: "Leg extension", sets: 3, reps: "10-15", rir: "1-2", rest: 90, muscleGroups: ['quads'], alternatives: ["Leg extension unilateral", "Sissy squat assiste", "Spanish squat"] },
      { id: "la5", trackingId: "mollets", legacyIds: ["la5", "lb5"], name: "Mollets debout machine", sets: 3, reps: "10-20", rir: "1-2", rest: 60, muscleGroups: ['calves'], alternatives: ["Mollets presse", "Mollets assis machine"] },
      { id: "la6", trackingId: "crunch-cable", legacyIds: ["la6", "lb6"], name: "Crunch câble", sets: 3, reps: "10-15", rir: "-", rest: 60, muscleGroups: ['core'], alternatives: ["Crunch machine", "Pallof press", "Dead bug charge"] },
    ],
    notes: "Important: Ne pas détruire les jambes les deux premières semaines. Le but est de reprendre, pas de boiter pendant 4 jours.",
  },
  "upper-b": {
    id: "upper-b",
    name: "SÉANCE 3 — UPPER B",
    warmup: "5 à 8 min marche inclinée ou vélo tranquille.",
    exercises: [
      { id: "ub1", trackingId: "developpe-incline-halteres", legacyIds: ["ub1"], name: "Développé incliné haltères", sets: 3, reps: "8-12", rir: "2", rest: 150, isCompound: true, muscleGroups: ['chest'], alternatives: ["Developpe incline machine", "Developpe incline barre", "Chest press inclinee"] },
      { id: "ub2", trackingId: "rowing-poitrine-appuyee", legacyIds: ["ub2"], name: "Rowing poitrine appuyée", sets: 3, reps: "8-12", rir: "2", rest: 120, isCompound: true, muscleGroups: ['back-horiz'], alternatives: ["Rowing T-bar appuye", "Rowing assis cable", "Rowing machine convergente"] },
      { id: "ub3", trackingId: "tirage-vertical", legacyIds: ["ua2", "ub3"], name: "Tirage vertical", sets: 3, reps: "8-12", rir: "2", rest: 120, isCompound: true, muscleGroups: ['back-vert'], alternatives: ["Tirage vertical prise neutre", "Tractions assistees", "Pull-over cable"] },
      { id: "ub4", trackingId: "pec-deck", legacyIds: ["ub4"], name: "Pec deck", sets: 3, reps: "12-15", rir: "1-2", rest: 75, muscleGroups: ['chest'], alternatives: ["Ecartes cable bas-haut", "Ecartes halteres incline", "Chest fly machine"] },
      { id: "ub5", trackingId: "oiseau-machine", legacyIds: ["ub5"], name: "Oiseau machine", sets: 3, reps: "12-20", rir: "1-2", rest: 60, muscleGroups: ['shoulders-rear'], alternatives: ["Face pull", "Oiseau cable", "Reverse pec deck"] },
      { id: "ub6", trackingId: "dips-assistes", legacyIds: ["ub6"], name: "Dips assistés", sets: 3, reps: "8-15", rir: "1-2", rest: 90, isCompound: true, muscleGroups: ['triceps', 'chest'], alternatives: ["Extension corde", "Barre au front EZ", "Pompes serrees"] },
      { id: "ub7", trackingId: "curl-marteau", legacyIds: ["ub7"], name: "Curl marteau", sets: 3, reps: "10-15", rir: "1-2", rest: 75, muscleGroups: ['biceps'], alternatives: ["Curl corde marteau", "Curl incline", "Curl pupitre"] },
    ],
    cooldown: "15 à 20 min marche inclinée tranquille.",
  },
  "lower-b": {
    id: "lower-b",
    name: "SÉANCE 4 — LOWER B",
    warmup: "5 à 8 min vélo ou marche.",
    exercises: [
      { id: "lb1", trackingId: "hack-squat", legacyIds: ["lb1"], name: "Hack squat", sets: 3, reps: "8-12", rir: "2", rest: 180, isCompound: true, muscleGroups: ['quads', 'glutes'], alternatives: ["Squat guidé", "Leg press", "Belt squat"] },
      { id: "lb2", trackingId: "leg-press", legacyIds: ["la1", "lb2"], name: "Leg press", sets: 3, reps: "8-12", rir: "2", rest: 150, isCompound: true, muscleGroups: ['quads', 'glutes'], alternatives: ["Presse pieds hauts", "Glute bridge machine", "Pull-through cable"] },
      { id: "lb3", trackingId: "fentes-bulgares", legacyIds: ["lb3"], name: "Fentes bulgares", sets: 2, reps: "8-12", rir: "2-3", rest: 120, isCompound: true, muscleGroups: ['quads', 'glutes'], notes: "Si les fentes détruisent trop : Remplacer par une machine jambes plus stable.", alternatives: ["Split squat Smith", "Step-up", "Leg press unilaterale"] },
      { id: "lb4", trackingId: "leg-curl", legacyIds: ["la3", "lb4"], name: "Leg curl assis", sets: 3, reps: "10-15", rir: "1-2", rest: 90, muscleGroups: ['hamstrings'], alternatives: ["Leg curl allonge", "Leg curl debout", "Nordic curl assiste", "Swiss ball leg curl"] },
      { id: "lb5", trackingId: "mollets", legacyIds: ["la5", "lb5"], name: "Mollets debout machine", sets: 3, reps: "10-20", rir: "1-2", rest: 60, muscleGroups: ['calves'], alternatives: ["Mollets presse", "Mollets assis"] },
      { id: "lb6", trackingId: "crunch-cable", legacyIds: ["la6", "lb6"], name: "Crunch câble", sets: 3, reps: "10-15", rir: "-", rest: 60, muscleGroups: ['core'], alternatives: ["Releves de jambes", "Captain chair", "Planche lestee"] },
    ]
  }
};

export const defaultWeeklySchedule: WeekDay[] = [
  { day: "Lundi", type: "workout", workoutId: "upper-a", description: "Matin : Upper A" },
  { day: "Mardi", type: "workout", workoutId: "lower-a", description: "Matin : Lower A" },
  { day: "Mercredi", type: "rest", description: "Repos actif / marche" },
  { day: "Jeudi", type: "workout", workoutId: "upper-b", description: "Matin : Upper B" },
  { day: "Vendredi", type: "workout", workoutId: "lower-b", description: "Matin : Lower B" },
  { day: "Samedi", type: "rest", description: "Marche longue ou cardio léger" },
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
