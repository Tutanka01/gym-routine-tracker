import { Exercise } from '../data';
import { WorkoutSession } from './storage';

// ── A2: Epley estimated 1RM ───────────────────────────────────────────────────
export const calcE1RM = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

// ── A1: RP Volume Landmarks (MEV/MAV/MRV per muscle group, sets/week) ─────────
export const VOLUME_LANDMARKS: Record<string, { label: string; mev: number; mav: number; mrv: number }> = {
  'chest':          { label: 'Pectoraux',       mev: 8,  mav: 16, mrv: 22 },
  'back-vert':      { label: 'Dos vertical',    mev: 8,  mav: 16, mrv: 25 },
  'back-horiz':     { label: 'Dos horizontal',  mev: 6,  mav: 14, mrv: 20 },
  'quads':          { label: 'Quadriceps',      mev: 8,  mav: 16, mrv: 22 },
  'hamstrings':     { label: 'Ischio-jambiers', mev: 6,  mav: 12, mrv: 18 },
  'glutes':         { label: 'Fessiers',        mev: 6,  mav: 12, mrv: 20 },
  'shoulders-side': { label: 'Deltoïdes lat.',  mev: 8,  mav: 16, mrv: 22 },
  'shoulders-rear': { label: 'Deltoïdes post.', mev: 6,  mav: 12, mrv: 18 },
  'triceps':        { label: 'Triceps',         mev: 6,  mav: 14, mrv: 18 },
  'biceps':         { label: 'Biceps',          mev: 6,  mav: 14, mrv: 20 },
  'calves':         { label: 'Mollets',         mev: 6,  mav: 12, mrv: 16 },
  'core':           { label: 'Core',            mev: 4,  mav: 10, mrv: 16 },
};

export type VolumeStatus = 'below-mev' | 'mev-mav' | 'mav-mrv' | 'above-mrv';

export const getVolumeStatus = (sets: number, mg: string): VolumeStatus => {
  const lm = VOLUME_LANDMARKS[mg];
  if (!lm) return 'below-mev';
  if (sets < lm.mev) return 'below-mev';
  if (sets < lm.mav) return 'mev-mav';
  if (sets <= lm.mrv) return 'mav-mrv';
  return 'above-mrv';
};

export const volumeStatusMeta: Record<VolumeStatus, { label: string; color: string; bg: string; border: string }> = {
  'below-mev': { label: 'Sous MEV', color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)' },
  'mev-mav':   { label: 'MEV → MAV', color: '#0DDFB8', bg: 'rgba(13,223,184,0.1)', border: 'rgba(13,223,184,0.25)' },
  'mav-mrv':   { label: 'MAV → MRV', color: '#FFD740', bg: 'rgba(255,215,64,0.1)', border: 'rgba(255,215,64,0.25)' },
  'above-mrv': { label: 'Sur MRV', color: '#FF6B35', bg: 'rgba(255,107,53,0.1)', border: 'rgba(255,107,53,0.25)' },
};

// Count completed hard sets per muscle group from the current week's sessions
export const weeklyMuscleGroupSets = (
  sessions: WorkoutSession[],
  exercises: Exercise[],
): Record<string, number> => {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - day);

  const weekSessions = sessions.filter(s => new Date(s.date) >= monday);
  const result: Record<string, number> = {};

  for (const session of weekSessions) {
    for (const [exId, log] of Object.entries(session.logs)) {
      const ex = exercises.find(e => e.id === exId);
      if (!ex?.muscleGroups) continue;
      const hardSets = log.sets.filter(s => s.isComplete && Number(s.weight) > 0).length;
      for (const mg of ex.muscleGroups) {
        result[mg] = (result[mg] || 0) + hardSets;
      }
    }
  }

  return result;
};

// ── A2: e1RM progression history ─────────────────────────────────────────────
export const e1RMProgression = (
  sessions: WorkoutSession[],
  exId: string,
): Array<{ date: string; e1rm: number; weight: string; reps: string }> =>
  sessions
    .filter(s => s.logs[exId])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(s => {
      const sets = (s.logs[exId]?.sets ?? []).filter(
        st => st.isComplete && Number(st.weight) > 0 && Number(st.reps) > 0,
      );
      if (!sets.length) return null;
      const best = sets.reduce(
        (acc, st) => {
          const e = calcE1RM(Number(st.weight), Number(st.reps));
          return e > acc.e1rm ? { e1rm: e, weight: st.weight, reps: st.reps } : acc;
        },
        { e1rm: 0, weight: '0', reps: '0' },
      );
      return { date: s.date, ...best };
    })
    .filter(Boolean) as Array<{ date: string; e1rm: number; weight: string; reps: string }>;

// Linear projection for "you'll hit X kg by [date]"
export const projectE1RM = (
  sessions: WorkoutSession[],
  exId: string,
  targetE1RM: number,
): Date | null => {
  const prog = e1RMProgression(sessions, exId);
  if (prog.length < 2) return null;
  const recent = prog.slice(-Math.min(4, prog.length));
  const first = recent[0];
  const last = recent[recent.length - 1];
  const daysDiff = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000;
  const e1rmDiff = last.e1rm - first.e1rm;
  if (e1rmDiff <= 0 || daysDiff <= 0) return null;
  const daysToTarget = (targetE1RM - last.e1rm) / (e1rmDiff / daysDiff);
  if (daysToTarget <= 0 || daysToTarget > 365) return null;
  const d = new Date(last.date);
  d.setDate(d.getDate() + Math.round(daysToTarget));
  return d;
};

// ── A5: Plateau detection ─────────────────────────────────────────────────────
export const detectPlateau = (sessions: WorkoutSession[], exId: string): boolean => {
  const prog = e1RMProgression(sessions, exId);
  if (prog.length < 3) return false;
  const last3 = prog.slice(-3);
  const baseline = last3[0].e1rm;
  return last3.every(p => p.e1rm <= baseline * 1.02);
};

// ── A4: Rule-based auto-progression ──────────────────────────────────────────
export type ProgressionAction = 'increase-weight' | 'maintain' | 'deload' | 'plateau';

export interface ProgressionSuggestion {
  action: ProgressionAction;
  nextWeight?: number;
  reason: string;
  urgency: 'info' | 'warning' | 'critical';
}

export const autoProgression = (
  sessions: WorkoutSession[],
  exId: string,
  repRange: string,
  isCompound: boolean,
): ProgressionSuggestion | null => {
  const prog = e1RMProgression(sessions, exId);
  if (!prog.length) return null;

  const sessionsForEx = sessions
    .filter(s => s.logs[exId])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const lastSession = sessionsForEx[0];
  if (!lastSession) return null;

  const lastSets = lastSession.logs[exId].sets.filter(
    s => s.isComplete && Number(s.weight) > 0 && Number(s.reps) > 0,
  );
  if (!lastSets.length) return null;

  const topSet = lastSets.reduce(
    (top, s) => Number(s.weight) * Number(s.reps) > Number(top.weight) * Number(top.reps) ? s : top,
    lastSets[0],
  );

  const parts = repRange.split('-').map(Number);
  const maxReps = parts[1] ?? parts[0];

  // Two consecutive drops → deload
  if (prog.length >= 3) {
    const [p3, p2, p1] = prog.slice(-3);
    if (p1.e1rm < p2.e1rm && p2.e1rm < p3.e1rm) {
      return {
        action: 'deload',
        nextWeight: Math.round(Number(topSet.weight) * 0.9 / 2.5) * 2.5,
        reason: '2 séances en baisse — deload de 10%',
        urgency: 'warning',
      };
    }
  }

  if (detectPlateau(sessions, exId)) {
    return {
      action: 'plateau',
      reason: '3 séances sans progression — changer la plage de reps ou swapper',
      urgency: 'warning',
    };
  }

  const allSetsReachedMax = lastSets.every(s => Number(s.reps) >= maxReps);
  const e1rmGrowing = prog.length >= 2 && prog[prog.length - 1].e1rm >= prog[prog.length - 2].e1rm;

  if (allSetsReachedMax || e1rmGrowing) {
    const inc = isCompound ? 2.5 : 1.25;
    return {
      action: 'increase-weight',
      nextWeight: Number(topSet.weight) + inc,
      reason: `Performance solide — +${inc} kg la prochaine fois`,
      urgency: 'info',
    };
  }

  return { action: 'maintain', reason: 'Maintenir le poids actuel', urgency: 'info' };
};

// ── A3: RIR consistency check ─────────────────────────────────────────────────
export const rirConsistencyWarning = (
  declaredRir: number,
  currentReps: number,
  prevReps: number | null,
  sameWeight: boolean,
): string | null => {
  if (prevReps === null || !sameWeight || prevReps <= 0) return null;
  const drop = prevReps - currentReps;
  if (drop >= 3 && declaredRir >= 2) {
    return `RIR sous-estimé probable — chute de ${drop} reps vs dernière fois`;
  }
  return null;
};

// ── A6: Readiness adjustment ──────────────────────────────────────────────────
export const readinessFactor = (sleep: number, energy: number): number => {
  const avg = (sleep + energy) / 2;
  if (avg <= 1) return 0.85;
  if (avg <= 2) return 0.90;
  if (avg <= 2.5) return 0.95;
  return 1.0;
};

export const readinessLabel = (sleep: number, energy: number): string => {
  const f = readinessFactor(sleep, energy);
  if (f >= 1) return 'Optimal';
  if (f >= 0.95) return 'Bon';
  if (f >= 0.90) return 'Réduit';
  return 'Faible';
};

// ── B4: Plate calculator ──────────────────────────────────────────────────────
export const calcPlatesPerSide = (
  targetWeight: number,
  barWeight: number,
): Array<{ kg: number; count: number }> => {
  const available = [25, 20, 15, 10, 5, 2.5, 1.25];
  let remaining = (targetWeight - barWeight) / 2;
  if (remaining <= 0) return [];
  const result: Array<{ kg: number; count: number }> = [];
  for (const plate of available) {
    if (remaining >= plate) {
      const count = Math.floor(remaining / plate);
      result.push({ kg: plate, count });
      remaining = Math.round((remaining - plate * count) * 100) / 100;
    }
    if (remaining <= 0) break;
  }
  return result;
};

export const warmupLadder = (workWeight: number): Array<{ pct: number; weight: number; reps: number }> => {
  const steps = [
    { pct: 40, reps: 8 },
    { pct: 60, reps: 5 },
    { pct: 80, reps: 3 },
  ];
  return steps.map(s => ({
    ...s,
    weight: Math.round(workWeight * s.pct / 100 / 2.5) * 2.5,
  }));
};
