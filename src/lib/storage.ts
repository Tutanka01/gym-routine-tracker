// Persistent storage layer.
// localStorage today, but versioned + namespaced so we can migrate to IndexedDB later.
// Active sessions are auto-saved on every keystroke so a tab reload never loses work.

import {
  defaultWeeklySchedule,
  defaultWorkouts,
  trackedExercises,
  type Exercise,
  type WeekDay,
  type Workout,
} from '../data';

export const SCHEMA_VERSION = 1;

const KEYS = {
  sessions: 'gym.sessions.v1',
  checkins: 'gym.checkins.v1',
  active: 'gym.active.v1',
  settings: 'gym.settings.v1',
  program: 'gym.program.v1',
} as const;

export type SetType = 'normal' | 'drop' | 'cluster' | 'superset';

export type SetData = {
  weight: string;
  reps: string;
  isComplete: boolean;
  ts?: number;
  note?: string;
  rirActual?: number;
  setType?: SetType;
  supersetWith?: string;
};

export type ExerciseLog = {
  sets: SetData[];
  displayName?: string;
  performedExerciseId?: string;
  performedExercise?: Exercise;
};

export type Readiness = { sleep: number; energy: number };

export type WorkoutSession = {
  v: number;
  id: string;
  date: string;
  workoutId: string;
  workoutName?: string;
  logs: Record<string, ExerciseLog>;
  durationSec?: number;
  totalVolume?: number;
  readiness?: Readiness;
};

export type ActiveSession = {
  v: number;
  workoutId: string;
  startedAt: string;
  step: number;
  logs: Record<string, ExerciseLog>;
  readiness?: Readiness;
};

export type SundayCheckin = {
  v: number;
  id: string;
  date: string;
  weight: string;
  waist: string;
  photosTaken: boolean;
  notes?: string;
};

export type AppSettings = {
  defaultRest: number;
  soundOn: boolean;
  vibrate: boolean;
};

export type ProgramData = {
  v: number;
  workouts: Record<string, Workout>;
  weeklySchedule: WeekDay[];
  library: Exercise[];
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultRest: 90,
  soundOn: true,
  vibrate: true,
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const defaultProgram = (): ProgramData => ({
  v: SCHEMA_VERSION,
  workouts: clone(defaultWorkouts),
  weeklySchedule: clone(defaultWeeklySchedule),
  library: trackedExercises(defaultWorkouts).map(ex => clone(ex)),
});

const sanitizeProgram = (payload: Partial<ProgramData> | null | undefined): ProgramData => {
  const base = defaultProgram();
  if (!payload || typeof payload !== 'object') return base;
  const workouts = payload.workouts && typeof payload.workouts === 'object' ? payload.workouts : base.workouts;
  const weeklySchedule = Array.isArray(payload.weeklySchedule) && payload.weeklySchedule.length === 7
    ? payload.weeklySchedule
    : base.weeklySchedule;
  const library = Array.isArray(payload.library) && payload.library.length > 0
    ? payload.library
    : trackedExercises(workouts).map(ex => clone(ex));

  return {
    v: SCHEMA_VERSION,
    workouts,
    weeklySchedule,
    library,
  };
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('storage.write failed', key, e);
  }
}

export const storage = {
  // ---- Completed sessions ----
  getSessions: (): WorkoutSession[] => read<WorkoutSession[]>(KEYS.sessions, []),

  saveSession: (session: Omit<WorkoutSession, 'v'>) => {
    const sessions = storage.getSessions();
    sessions.push({ ...session, v: SCHEMA_VERSION });
    write(KEYS.sessions, sessions);
  },

  updateSession: (id: string, patch: Partial<WorkoutSession>) => {
    const sessions = storage.getSessions().map(s => (s.id === id ? { ...s, ...patch } : s));
    write(KEYS.sessions, sessions);
  },

  deleteSession: (id: string) => {
    write(KEYS.sessions, storage.getSessions().filter(s => s.id !== id));
  },

  getLastWorkoutLogs: (workoutId: string): Record<string, ExerciseLog> | null => {
    const past = storage.getSessions()
      .filter(s => s.workoutId === workoutId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return past.length > 0 ? past[0].logs : null;
  },

  getSessionsForWorkout: (workoutId: string): WorkoutSession[] =>
    storage.getSessions()
      .filter(s => s.workoutId === workoutId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),

  // ---- Active (in-progress) session ----
  getActiveSession: (): ActiveSession | null => read<ActiveSession | null>(KEYS.active, null),

  saveActiveSession: (a: Omit<ActiveSession, 'v'>) => {
    write<ActiveSession>(KEYS.active, { ...a, v: SCHEMA_VERSION });
  },

  clearActiveSession: () => {
    try { localStorage.removeItem(KEYS.active); } catch {}
  },

  // ---- Sunday check-ins ----
  getCheckins: (): SundayCheckin[] => read<SundayCheckin[]>(KEYS.checkins, []),

  saveCheckin: (c: Omit<SundayCheckin, 'v'>) => {
    const checkins = storage.getCheckins();
    checkins.push({ ...c, v: SCHEMA_VERSION });
    write(KEYS.checkins, checkins);
  },

  deleteCheckin: (id: string) => {
    write(KEYS.checkins, storage.getCheckins().filter(c => c.id !== id));
  },

  // ---- Settings ----
  getSettings: (): AppSettings => ({ ...DEFAULT_SETTINGS, ...read<Partial<AppSettings>>(KEYS.settings, {}) }),

  saveSettings: (s: AppSettings) => write(KEYS.settings, s),

  // ---- Editable training program ----
  getProgram: (): ProgramData => sanitizeProgram(read<Partial<ProgramData> | null>(KEYS.program, null)),

  saveProgram: (p: Omit<ProgramData, 'v'> | ProgramData) => {
    write<ProgramData>(KEYS.program, sanitizeProgram({ ...p, v: SCHEMA_VERSION }));
  },

  resetProgram: () => {
    write(KEYS.program, defaultProgram());
  },

  // ---- Backup / restore ----
  exportAll: () => ({
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sessions: storage.getSessions(),
    checkins: storage.getCheckins(),
    settings: storage.getSettings(),
    program: storage.getProgram(),
  }),

  importAll: (payload: any, mode: 'replace' | 'merge' = 'merge') => {
    if (!payload || typeof payload !== 'object') throw new Error('Format invalide');
    const incomingSessions: WorkoutSession[] = Array.isArray(payload.sessions) ? payload.sessions : [];
    const incomingCheckins: SundayCheckin[] = Array.isArray(payload.checkins) ? payload.checkins : [];

    if (mode === 'replace') {
      write(KEYS.sessions, incomingSessions);
      write(KEYS.checkins, incomingCheckins);
    } else {
      const dedupe = <T extends { id: string }>(a: T[], b: T[]) => {
        const map = new Map<string, T>();
        [...a, ...b].forEach(x => map.set(x.id, x));
        return Array.from(map.values());
      };
      write(KEYS.sessions, dedupe(storage.getSessions(), incomingSessions));
      write(KEYS.checkins, dedupe(storage.getCheckins(), incomingCheckins));
    }

    if (payload.settings) write(KEYS.settings, { ...DEFAULT_SETTINGS, ...payload.settings });
    if (payload.program) storage.saveProgram(payload.program);
  },

  wipeAll: () => {
    try {
      localStorage.removeItem(KEYS.sessions);
      localStorage.removeItem(KEYS.checkins);
      localStorage.removeItem(KEYS.active);
      localStorage.removeItem(KEYS.settings);
      localStorage.removeItem(KEYS.program);
    } catch {}
  },
};
