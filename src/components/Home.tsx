import { weeklySchedule, getToday, workouts } from "../data";
import { Dumbbell, ChevronRight, CheckCircle2, ClipboardCheck, BarChart3, Settings as SettingsIcon, Flame, Play } from "lucide-react";
import { motion } from "motion/react";
import { storage, ActiveSession } from "../lib/storage";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import { computeStreak, fmtVol, sessionVolume, sessionsThisWeek } from "../lib/stats";

interface HomeProps {
  onStartWorkout: (workoutId: string, opts?: { resume?: boolean }) => void;
  onStartCheckin: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

const workoutSubtitle = (name: string) => name.split("—").pop()?.trim() || name;

export function Home({ onStartWorkout, onStartCheckin, onOpenHistory, onOpenSettings }: HomeProps) {
  const today = getToday();
  const todayWorkout = today.workoutId ? workouts[today.workoutId] : null;
  const isSundayCheckin = today.day === "Dimanche";

  const [active, setActive] = useState<ActiveSession | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { setActive(storage.getActiveSession()); }, [tick]);

  const sessions = useMemo(() => storage.getSessions(), [tick]);

  const stats = useMemo(() => {
    const week = sessionsThisWeek(sessions);
    const totalVolWeek = week.reduce((a, s) => a + (s.totalVolume ?? sessionVolume(s)), 0);
    return {
      total: sessions.length,
      week: week.length,
      weekVolume: totalVolWeek,
      streak: computeStreak(sessions),
    };
  }, [sessions]);

  const discardActive = () => {
    if (!confirm("Abandonner la séance en cours ?")) return;
    storage.clearActiveSession();
    setTick(t => t + 1);
  };

  const activeWorkout = active ? workouts[active.workoutId] : null;
  const activeMinutes = active ? Math.max(1, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 60000)) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-void-0)] px-4 py-6 max-w-md mx-auto pb-14">
      {/* Header */}
      <header className="mb-6 mt-1 flex items-end justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-signal)] mb-2" style={{ opacity: 0.75 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
          <h1 className="font-display font-black leading-[0.82] text-[#C0D0F0]" style={{ fontSize: '72px', letterSpacing: '-0.01em' }}>
            ROUTINE
          </h1>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <button
            onClick={onOpenHistory}
            className="w-10 h-10 rounded-xl bg-[var(--color-void-2)] border border-white/[0.06] flex items-center justify-center text-slate-400 active:bg-[var(--color-void-3)] transition"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-xl bg-[var(--color-void-2)] border border-white/[0.06] flex items-center justify-center text-slate-400 active:bg-[var(--color-void-3)] transition"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <StatPill label="Séances/sem" value={`${stats.week}`} />
        <StatPill label="Volume 7j" value={fmtVol(stats.weekVolume)} unit="kg" />
        <StatPill label="Streak" value={`${stats.streak}`} unit={stats.streak === 1 ? "j" : "j"} tone={stats.streak >= 3 ? "flame" : undefined} />
      </div>

      {/* Resume banner */}
      {active && activeWorkout && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-xl border border-[var(--color-signal)]/20 bg-signal-soft p-[3px]"
        >
          <div className="rounded-[10px] bg-[var(--color-void-1)] p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[var(--color-signal)] text-black flex items-center justify-center shrink-0">
              <Play className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-signal)] mb-0.5">En cours</div>
              <div className="font-bold text-sm truncate text-[#C0D0F0]">{workoutSubtitle(activeWorkout.name)}</div>
              <div className="text-[11px] font-mono tnum text-slate-500">Il y a {activeMinutes} min</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => onStartWorkout(active.workoutId, { resume: true })}
                className="px-3 h-8 rounded-lg bg-[var(--color-signal)] text-black text-xs font-bold active:scale-95 transition"
              >
                Reprendre
              </button>
              <button
                onClick={discardActive}
                className="px-3 h-6 rounded-lg text-[10px] font-medium text-slate-500 active:text-red-400 transition"
              >
                Abandonner
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Today's Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-[var(--color-void-1)] mb-7"
      >
        {/* Left signal strip */}
        {(today.type === 'workout' || isSundayCheckin) && (
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px]"
            style={{ background: 'var(--color-signal)', boxShadow: '4px 0 16px rgba(13,223,184,0.25)' }}
          />
        )}
        {/* Ambient glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(13,223,184,0.06) 0%, transparent 70%)' }}
        />
        <div className="relative pl-6 pr-5 py-5">
          {isSundayCheckin ? (
            <>
              <Pretitle icon={<ClipboardCheck className="w-3.5 h-3.5" />} text="Check-in du dimanche" tone="blue" />
              <h2 className="font-display font-black text-[#C0D0F0] mt-3 mb-2" style={{ fontSize: '38px', lineHeight: 0.9, letterSpacing: '-0.01em' }}>
                BILAN<br />SEMAINE
              </h2>
              <p className="text-slate-400 text-sm mb-5 leading-relaxed">Pesée, tour de taille et photos.</p>
              <button
                onClick={onStartCheckin}
                className="w-full text-black font-bold py-4 rounded-xl active:scale-[0.97] transition flex items-center justify-center gap-2"
                style={{ background: 'var(--color-signal)', boxShadow: '0 6px 20px rgba(13,223,184,0.25)' }}
              >
                Faire le check-in <ChevronRight className="w-5 h-5" />
              </button>
            </>
          ) : today.type === "workout" && todayWorkout ? (
            <>
              <Pretitle icon={<Dumbbell className="w-3.5 h-3.5" />} text={`${todayWorkout.exercises.length} exercices`} tone="success" />
              <h2 className="font-display font-black uppercase text-[#C0D0F0] mt-3 mb-2" style={{ fontSize: '42px', lineHeight: 0.88, letterSpacing: '-0.01em' }}>
                {workoutSubtitle(todayWorkout.name)}
              </h2>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {todayWorkout.exercises.slice(0, 4).map(e => (
                  <span key={e.id} className="text-[11px] text-slate-500 bg-white/[0.04] border border-white/[0.05] px-2.5 py-1 rounded-lg">
                    {e.name.split(/\s+/).slice(0, 2).join(' ')}
                  </span>
                ))}
                {todayWorkout.exercises.length > 4 && (
                  <span className="text-[11px] text-slate-600 px-2 py-1">+{todayWorkout.exercises.length - 4}</span>
                )}
              </div>
              <button
                onClick={() => onStartWorkout(todayWorkout.id)}
                className="w-full text-black font-bold py-4 rounded-xl active:scale-[0.97] transition flex items-center justify-center gap-2 font-display text-lg"
                style={{ background: 'var(--color-signal)', boxShadow: '0 6px 20px rgba(13,223,184,0.25)' }}
              >
                Commencer <ChevronRight className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <Pretitle icon={<CheckCircle2 className="w-3.5 h-3.5" />} text="Repos" tone="zinc" />
              <h2 className="font-display font-black uppercase text-[#C0D0F0] mt-3 mb-2" style={{ fontSize: '38px', lineHeight: 0.9, letterSpacing: '-0.01em' }}>
                RÉCUPÉRATION
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">{today.description}</p>
            </>
          )}
        </div>
      </motion.div>

      {/* Week schedule */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Programme</h3>
          <span className="text-[10px] font-mono tnum text-slate-600">7 jours</span>
        </div>

        <div className="rounded-2xl bg-[var(--color-void-1)] border border-white/[0.05] overflow-hidden">
          {weeklySchedule.map((day, idx) => {
            const isToday = day.day === today.day;
            const isWorkout = day.type === "workout";
            const isSunday = day.day === "Dimanche";
            const w = day.workoutId ? workouts[day.workoutId] : null;
            const isLast = idx === weeklySchedule.length - 1;

            return (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 + idx * 0.025 }}
                key={day.day}
                className={`flex items-center px-4 py-3.5 transition ${
                  !isLast ? 'border-b border-[rgba(100,150,255,0.05)]' : ''
                } ${isToday ? 'bg-[var(--color-void-2)]' : ''}`}
              >
                <div className={`w-8 text-center mr-4 ${isToday ? 'text-[var(--color-signal)]' : 'text-slate-600'}`}>
                  <div className="text-[10px] font-bold tracking-wide uppercase">{day.day.slice(0, 3)}</div>
                  {isToday && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-signal)] mx-auto mt-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm leading-tight ${isToday ? 'text-[#C0D0F0]' : 'text-slate-400'}`}>
                    {isWorkout ? workoutSubtitle(w?.name || "Séance") : isSunday ? "Check-in" : "Repos"}
                  </p>
                  {isWorkout && w && (
                    <p className={`text-[11px] mt-0.5 ${isToday ? 'text-slate-500' : 'text-slate-700'}`}>
                      {w.exercises.length} exercices
                    </p>
                  )}
                </div>
                {isWorkout && w && (
                  <button
                    onClick={() => onStartWorkout(w.id)}
                    className="p-2 bg-white/[0.04] hover:bg-white/[0.07] rounded-lg transition active:bg-white/[0.1]"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                )}
                {isSunday && (
                  <button onClick={onStartCheckin} className="p-2 bg-blue-500/10 hover:bg-blue-500/15 rounded-lg transition">
                    <ClipboardCheck className="w-4 h-4 text-blue-400" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: "flame" }) {
  return (
    <div className="rounded-xl bg-[var(--color-void-1)] border border-white/[0.05] p-3 flex flex-col">
      <div className={`font-display font-black tnum leading-none ${
        tone === 'flame' ? 'text-[var(--color-flame)]' : 'text-[#C0D0F0]'
      }`} style={{ fontSize: '38px' }}>
        {value}
      </div>
      <div className="flex items-center gap-1 mt-1">
        {unit && <span className="font-mono text-[10px] text-slate-500 tnum">{unit}</span>}
        {tone === 'flame' && <Flame className="w-3 h-3 text-[var(--color-flame)]" />}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600 mt-0.5">{label}</div>
    </div>
  );
}

function Pretitle({ icon, text, tone }: { icon: ReactNode; text: string; tone: "success" | "blue" | "zinc" }) {
  const cls =
    tone === "success"
      ? "text-[var(--color-signal)] bg-signal-soft border-signal-soft"
      : tone === "blue"
      ? "text-blue-300 bg-blue-500/10 border-blue-500/15"
      : "text-slate-500 bg-white/[0.04] border-white/[0.07]";
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${cls} text-[11px] font-medium`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}
