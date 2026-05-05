import { Workout } from '../data';
import { WorkoutSession, SetData, ExerciseLog } from './storage';

export const setVolume = (s: SetData) => (Number(s.weight) || 0) * (Number(s.reps) || 0);

export const sessionVolume = (s: WorkoutSession) =>
  Object.values(s.logs).flatMap(l => l.sets).reduce((a, x) => a + setVolume(x), 0);

export const topSet = (sets: SetData[]): SetData | null => {
  let top: SetData | null = null;
  let topV = 0;
  for (const set of sets) {
    const v = setVolume(set);
    if (v > topV) { topV = v; top = set; }
  }
  return top;
};

export const isVolumePR = (candidate: SetData, history: SetData[]) => {
  const v = setVolume(candidate);
  if (v <= 0 || history.length === 0) return false;
  return history.every(h => setVolume(h) < v);
};

export const isWeightPR = (candidate: SetData, history: SetData[]) => {
  const w = Number(candidate.weight) || 0;
  if (w <= 0 || history.length === 0) return false;
  return history.every(h => (Number(h.weight) || 0) < w);
};

export const bestSetEver = (sessions: WorkoutSession[], exId: string) => {
  let best: { weight: number; reps: number; volume: number; date: string } | null = null;
  for (const sess of sessions) {
    const log = sess.logs[exId];
    if (!log) continue;
    for (const set of log.sets) {
      const v = setVolume(set);
      if (v > 0 && (!best || v > best.volume)) {
        best = { weight: Number(set.weight), reps: Number(set.reps), volume: v, date: sess.date };
      }
    }
  }
  return best;
};

export const exerciseHistorySets = (sessions: WorkoutSession[], exId: string): SetData[] =>
  sessions.flatMap(s => s.logs[exId]?.sets || []).filter(s => s.isComplete && Number(s.weight) > 0);

export const exerciseProgression = (sessions: WorkoutSession[], exId: string) =>
  sessions
    .filter(s => s.logs[exId])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(s => ({
      date: s.date,
      top: topSet(s.logs[exId].sets) || null,
      volume: (s.logs[exId].sets || []).reduce((a, x) => a + setVolume(x), 0),
    }))
    .filter(p => p.top && setVolume(p.top) > 0);

// Days streak: how many consecutive days back from today have at least one session.
export const computeStreak = (sessions: WorkoutSession[]) => {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map(s => s.date.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  // Don't break the streak just because today is a rest day — count back from the most recent session day.
  // Simple heuristic: walk backwards from today; allow up to 2 missing days between hits.
  let misses = 0;
  for (let i = 0; i < 60; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      misses = 0;
    } else {
      misses += 1;
      if (misses > 2 && streak > 0) break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export const sessionsThisWeek = (sessions: WorkoutSession[]) => {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Mon=0
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - day);
  return sessions.filter(s => new Date(s.date) >= monday);
};

export const fmtVol = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
};

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

export const fmtRelativeShort = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return 'Hier';
  if (d < 7) return `Il y a ${d}j`;
  if (d < 30) return `Il y a ${Math.floor(d / 7)}sem`;
  return fmtDate(iso);
};

export function estimateRemainingSec(
  workout: Workout,
  logs: Record<string, ExerciseLog>,
  currentStep: number,
  defaultRest: number,
): number {
  const SET_EXEC_SEC = 45;
  let total = 0;

  workout.exercises.forEach((ex, i) => {
    if (i < currentStep) return;
    const sets = logs[ex.id]?.sets || [];
    const setsLeft = sets.length > 0 ? sets.filter(s => !s.isComplete).length : ex.sets;
    total += setsLeft * (SET_EXEC_SEC + (ex.rest ?? defaultRest));
  });

  if (workout.cooldown && currentStep <= workout.exercises.length) total += 60;
  return total;
}

export function sessionPRs(
  sessionLogs: Record<string, ExerciseLog>,
  pastSessions: WorkoutSession[],
): Array<{ exerciseId: string; setIndex: number; type: 'volume' | 'weight'; weight: string; reps: string }> {
  const prs: Array<{ exerciseId: string; setIndex: number; type: 'volume' | 'weight'; weight: string; reps: string }> = [];

  Object.entries(sessionLogs).forEach(([exerciseId, log]) => {
    const pastHistory = exerciseHistorySets(pastSessions, exerciseId);
    const acceptedThisSession: SetData[] = [];

    log.sets.forEach((set, setIndex) => {
      if (!set.isComplete || Number(set.weight) <= 0 || Number(set.reps) <= 0) return;
      const history = [...pastHistory, ...acceptedThisSession];
      if (isVolumePR(set, history)) {
        prs.push({ exerciseId, setIndex, type: 'volume', weight: set.weight, reps: set.reps });
      }
      if (isWeightPR(set, history)) {
        prs.push({ exerciseId, setIndex, type: 'weight', weight: set.weight, reps: set.reps });
      }
      acceptedThisSession.push(set);
    });
  });

  return prs;
}
