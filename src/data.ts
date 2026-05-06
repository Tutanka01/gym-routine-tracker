export type MuscleGroup =
  | 'chest' | 'back-vert' | 'back-horiz'
  | 'quads' | 'hamstrings' | 'glutes'
  | 'shoulders-side' | 'shoulders-rear'
  | 'triceps' | 'biceps' | 'calves' | 'core';

export type Exercise = {
  id: string;
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

export const workouts: Record<string, Workout> = {
  "upper-a": {
    id: "upper-a",
    name: "SÉANCE 1 — UPPER A",
    warmup: "5 à 8 min marche inclinée ou vélo tranquille.",
    exercises: [
      { id: "ua1", name: "Chest press machine ou développé couché", sets: 3, reps: "6-10", rir: "2", rest: 150, isCompound: true, muscleGroups: ['chest'], alternatives: ["Chest press convergente", "Developpe couche barre", "Developpe couche halteres"] },
      { id: "ua2", name: "Tirage vertical / Lat pulldown", sets: 3, reps: "8-12", rir: "2", rest: 120, isCompound: true, muscleGroups: ['back-vert'], alternatives: ["Tractions assistees", "Tirage vertical prise neutre", "Tirage vertical unilateral"] },
      { id: "ua3", name: "Rowing assis machine ou câble", sets: 3, reps: "8-12", rir: "2", rest: 120, isCompound: true, muscleGroups: ['back-horiz'], alternatives: ["Rowing poitrine appuyee", "Rowing haltere un bras", "Rowing cable unilateral"] },
      { id: "ua4", name: "Développé épaules machine", sets: 3, reps: "8-12", rir: "2", rest: 120, isCompound: true, muscleGroups: ['shoulders-side'], alternatives: ["Developpe militaire halteres", "Shoulder press convergente", "Landmine press"] },
      { id: "ua5", name: "Élévations latérales haltères ou câble", sets: 3, reps: "12-20", rir: "1-2", rest: 60, muscleGroups: ['shoulders-side'], alternatives: ["Elevations laterales machine", "Elevations laterales cable", "Elevations laterales assis"] },
      { id: "ua6", name: "Extension triceps à la corde", sets: 3, reps: "10-15", rir: "1-2", rest: 75, muscleGroups: ['triceps'], alternatives: ["Barre V poulie haute", "Extension triceps overhead", "Dips assistes"] },
      { id: "ua7", name: "Curl incliné ou curl câble", sets: 3, reps: "10-15", rir: "1-2", rest: 75, muscleGroups: ['biceps'], alternatives: ["Curl pupitre machine", "Curl halteres alternes", "Curl barre EZ"] },
    ],
    cooldown: "15 à 20 min marche inclinée tranquille.",
  },
  "lower-a": {
    id: "lower-a",
    name: "SÉANCE 2 — LOWER A",
    warmup: "5 à 8 min vélo ou marche.",
    exercises: [
      { id: "la1", name: "Leg press ou hack squat", sets: 3, reps: "8-12", rir: "2", rest: 180, isCompound: true, muscleGroups: ['quads', 'glutes'], alternatives: ["Hack squat", "Smith machine squat", "Goblet squat lourd"] },
      { id: "la2", name: "Romanian deadlift haltères ou barre", sets: 3, reps: "8-10", rir: "2-3", rest: 180, isCompound: true, muscleGroups: ['hamstrings', 'glutes'], alternatives: ["Souleve de terre roumain barre", "Souleve de terre roumain halteres", "Good morning machine"] },
      { id: "la3", name: "Leg curl", sets: 3, reps: "10-15", rir: "1-2", rest: 90, muscleGroups: ['hamstrings'], alternatives: ["Leg curl assis", "Leg curl allonge", "Nordic curl assiste"] },
      { id: "la4", name: "Leg extension", sets: 3, reps: "10-15", rir: "1-2", rest: 90, muscleGroups: ['quads'], alternatives: ["Leg extension unilateral", "Sissy squat assiste", "Spanish squat"] },
      { id: "la5", name: "Mollets debout ou assis", sets: 3, reps: "10-20", rir: "1-2", rest: 60, muscleGroups: ['calves'], alternatives: ["Mollets presse", "Mollets debout machine", "Mollets assis machine"] },
      { id: "la6", name: "Gainage ou crunch câble", sets: 3, reps: "10-15 (ou 30-60s)", rir: "-", rest: 60, muscleGroups: ['core'], alternatives: ["Crunch machine", "Pallof press", "Dead bug charge"] },
    ],
    notes: "Important: Ne pas détruire les jambes les deux premières semaines. Le but est de reprendre, pas de boiter pendant 4 jours.",
  },
  "upper-b": {
    id: "upper-b",
    name: "SÉANCE 3 — UPPER B",
    warmup: "5 à 8 min marche inclinée ou vélo tranquille.",
    exercises: [
      { id: "ub1", name: "Développé incliné haltères ou machine", sets: 3, reps: "8-12", rir: "2", rest: 150, isCompound: true, muscleGroups: ['chest'], alternatives: ["Developpe incline machine", "Developpe incline barre", "Chest press inclinee"] },
      { id: "ub2", name: "Rowing poitrine appuyée / chest-supported row", sets: 3, reps: "8-12", rir: "2", rest: 120, isCompound: true, muscleGroups: ['back-horiz'], alternatives: ["Rowing T-bar appuye", "Rowing assis cable", "Rowing machine convergente"] },
      { id: "ub3", name: "Tirage neutre ou tractions assistées", sets: 3, reps: "8-12", rir: "2", rest: 120, isCompound: true, muscleGroups: ['back-vert'], alternatives: ["Lat pulldown neutre", "Tractions elastique", "Pull-over cable"] },
      { id: "ub4", name: "Pec deck ou écartés câble", sets: 3, reps: "12-15", rir: "1-2", rest: 75, muscleGroups: ['chest'], alternatives: ["Ecartes cable bas-haut", "Ecartes halteres incline", "Chest fly machine"] },
      { id: "ub5", name: "Oiseau machine / rear delts", sets: 3, reps: "12-20", rir: "1-2", rest: 60, muscleGroups: ['shoulders-rear'], alternatives: ["Face pull", "Oiseau cable", "Reverse pec deck"] },
      { id: "ub6", name: "Dips assistés ou extension triceps", sets: 3, reps: "8-15", rir: "1-2", rest: 90, isCompound: true, muscleGroups: ['triceps', 'chest'], alternatives: ["Extension corde", "Barre au front EZ", "Pompes serrees"] },
      { id: "ub7", name: "Curl marteau", sets: 3, reps: "10-15", rir: "1-2", rest: 75, muscleGroups: ['biceps'], alternatives: ["Curl corde marteau", "Curl incline", "Curl pupitre"] },
    ],
    cooldown: "15 à 20 min marche inclinée tranquille.",
  },
  "lower-b": {
    id: "lower-b",
    name: "SÉANCE 4 — LOWER B",
    warmup: "5 à 8 min vélo ou marche.",
    exercises: [
      { id: "lb1", name: "Squat guidé, hack squat ou goblet squat", sets: 3, reps: "8-12", rir: "2", rest: 180, isCompound: true, muscleGroups: ['quads', 'glutes'], alternatives: ["Hack squat", "Leg press", "Belt squat"] },
      { id: "lb2", name: "Hip thrust ou presse pieds hauts", sets: 3, reps: "8-12", rir: "2", rest: 150, isCompound: true, muscleGroups: ['glutes', 'hamstrings'], alternatives: ["Glute bridge machine", "Presse pieds hauts", "Pull-through cable"] },
      { id: "lb3", name: "Fentes bulgares ou split squat", sets: 2, reps: "8-12", rir: "2-3", rest: 120, isCompound: true, muscleGroups: ['quads', 'glutes'], notes: "Si les fentes détruisent trop : Remplacer par une machine jambes plus stable.", alternatives: ["Split squat Smith", "Step-up", "Leg press unilaterale"] },
      { id: "lb4", name: "Leg curl assis ou allongé", sets: 3, reps: "10-15", rir: "1-2", rest: 90, muscleGroups: ['hamstrings'], alternatives: ["Leg curl debout", "Nordic curl assiste", "Swiss ball leg curl"] },
      { id: "lb5", name: "Mollets", sets: 3, reps: "10-20", rir: "1-2", rest: 60, muscleGroups: ['calves'], alternatives: ["Mollets presse", "Mollets assis", "Mollets debout"] },
      { id: "lb6", name: "Relevés de jambes ou crunch câble", sets: 3, reps: "10-15", rir: "-", rest: 60, muscleGroups: ['core'], alternatives: ["Crunch cable", "Captain chair", "Planche lestee"] },
    ]
  }
};

export const weeklySchedule: WeekDay[] = [
  { day: "Lundi", type: "workout", workoutId: "upper-a", description: "Matin : Upper A" },
  { day: "Mardi", type: "workout", workoutId: "lower-a", description: "Matin : Lower A" },
  { day: "Mercredi", type: "rest", description: "Repos actif / marche" },
  { day: "Jeudi", type: "workout", workoutId: "upper-b", description: "Matin : Upper B" },
  { day: "Vendredi", type: "workout", workoutId: "lower-b", description: "Matin : Lower B" },
  { day: "Samedi", type: "rest", description: "Marche longue ou cardio léger" },
  { day: "Dimanche", type: "rest", description: "Repos + pesée + photo + tour de taille" },
];

export function getToday(): WeekDay {
  const date = new Date();
  let dayIndex = date.getDay();
  if (dayIndex === 0) dayIndex = 7;
  return weeklySchedule[dayIndex - 1];
}

export const allExercises = (): Exercise[] =>
  Object.values(workouts).flatMap(w => w.exercises);

export const findExercise = (id: string): { workout: Workout; exercise: Exercise } | null => {
  for (const w of Object.values(workouts)) {
    const ex = w.exercises.find(e => e.id === id);
    if (ex) return { workout: w, exercise: ex };
  }
  return null;
};
