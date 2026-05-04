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
    <div className="flex flex-col min-h-screen bg-[var(--color-ink-0)] px-4 py-6 max-w-md mx-auto pb-12">
      {/* Header */}
      <header className="mb-6 mt-2 flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-[var(--color-success)] mb-1.5 capitalize">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
          <h1 className="font-display text-5xl font-bold leading-[0.88] text-[#EDE8E0]">
            Routine
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={onOpenHistory}
            className="w-10 h-10 rounded-full bg-[var(--color-ink-2)] border border-white/[0.06] flex items-center justify-center text-zinc-400 active:bg-[var(--color-ink-3)] transition"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-full bg-[var(--color-ink-2)] border border-white/[0.06] flex items-center justify-center text-zinc-400 active:bg-[var(--color-ink-3)] transition"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <StatPill label="Cette semaine" value={`${stats.week}`} unit="séances" tone="success" />
        <StatPill label="Volume 7j" value={fmtVol(stats.weekVolume)} unit="kg" />
        <StatPill label="Série" value={`${stats.streak}`} unit={stats.streak === 1 ? "jour" : "jours"} tone={stats.streak >= 3 ? "flame" : undefined} />
      </div>

      {/* Resume banner */}
      {active && activeWorkout && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-2xl border border-[var(--color-accent)]/25 bg-accent-soft p-1"
        >
          <div className="rounded-xl bg-[var(--color-ink-1)] p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[var(--color-accent)] text-white flex items-center justify-center shrink-0">
              <Play className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium text-accent mb-0.5">Séance en cours</div>
              <div className="font-bold text-sm truncate text-[#EDE8E0]">{workoutSubtitle(activeWorkout.name)}</div>
              <div className="text-[11px] font-mono tnum text-zinc-500">Il y a {activeMinutes} min</div>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onStartWorkout(active.workoutId, { resume: true })}
                className="px-3 h-9 rounded-lg bg-white text-black text-xs font-bold active:scale-95 transition"
              >
                Reprendre
              </button>
              <button
                onClick={discardActive}
                className="px-3 h-7 rounded-lg text-[10px] font-medium text-zinc-500 active:text-red-400 transition"
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
        className="bg-[var(--color-ink-1)] rounded-[28px] p-6 border border-white/[0.05] relative overflow-hidden mb-8"
      >
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[var(--color-success)]/8 blur-3xl rounded-full pointer-events-none" />
        <div className="relative">
          {isSundayCheckin ? (
            <>
              <Pretitle icon={<ClipboardCheck className="w-4 h-4" />} text="Check-in du dimanche" tone="blue" />
              <h2 className="font-display text-3xl font-bold leading-tight mt-3 mb-2 text-[#EDE8E0]">
                Bilan<br />de la semaine
              </h2>
              <p className="text-zinc-400 text-sm mb-5 max-w-xs leading-relaxed">
                Pesée, tour de taille et photos. Moins de 3 minutes.
              </p>
              <button
                onClick={onStartCheckin}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl active:scale-[0.98] transition flex items-center justify-center gap-2 font-display"
              >
                Faire le check-in <ChevronRight className="w-5 h-5" />
              </button>
            </>
          ) : today.type === "workout" && todayWorkout ? (
            <>
              <Pretitle icon={<Dumbbell className="w-4 h-4" />} text={`${todayWorkout.exercises.length} exercices`} tone="success" />
              <h2 className="font-display text-3xl font-bold leading-tight mt-3 mb-2 text-[#EDE8E0]">
                {workoutSubtitle(todayWorkout.name)}
              </h2>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {todayWorkout.exercises.slice(0, 4).map(e => (
                  <span key={e.id} className="text-[11px] text-zinc-500 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-lg">
                    {e.name.split(/\s+/).slice(0, 2).join(' ')}
                  </span>
                ))}
                {todayWorkout.exercises.length > 4 && (
                  <span className="text-[11px] text-zinc-600 px-2 py-1">+{todayWorkout.exercises.length - 4}</span>
                )}
              </div>
              <button
                onClick={() => onStartWorkout(todayWorkout.id)}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl active:scale-[0.98] transition flex items-center justify-center gap-2 font-display text-lg"
              >
                Commencer <ChevronRight className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <Pretitle icon={<CheckCircle2 className="w-4 h-4" />} text="Repos" tone="zinc" />
              <h2 className="font-display text-3xl font-bold leading-tight mt-3 mb-2 text-[#EDE8E0]">
                Récupération
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">{today.description}</p>
            </>
          )}
        </div>
      </motion.div>

      {/* Week schedule */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-semibold text-sm text-zinc-400">Programme</h3>
          <span className="text-[11px] font-mono tnum text-zinc-600">7 jours</span>
        </div>

        <div className="space-y-2">
          {weeklySchedule.map((day, idx) => {
            const isToday = day.day === today.day;
            const isWorkout = day.type === "workout";
            const isSunday = day.day === "Dimanche";
            const w = day.workoutId ? workouts[day.workoutId] : null;

            return (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 + idx * 0.025 }}
                key={day.day}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                  isToday
                    ? "bg-[var(--color-ink-1)] border-[var(--color-success)]/20"
                    : "bg-[var(--color-ink-1)]/40 border-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 text-center ${isToday ? "text-success" : "text-zinc-600"}`}>
                    <div className="text-[10px] font-mono tracking-wide uppercase">{day.day.slice(0, 3)}</div>
                    {isToday && <div className="w-1 h-1 rounded-full bg-[var(--color-success)] mx-auto mt-1" />}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm leading-tight ${isToday ? "text-[#EDE8E0]" : "text-zinc-400"}`}>
                      {isWorkout ? workoutSubtitle(w?.name || "Séance") : isSunday ? "Check-in" : "Repos"}
                    </p>
                    <p className={`text-[11px] font-medium truncate max-w-[180px] ${isToday ? "text-zinc-500" : "text-zinc-700"}`}>
                      {isWorkout && w ? `${w.exercises.length} exercices · ${day.description}` : day.description}
                    </p>
                  </div>
                </div>
                {isWorkout && w && (
                  <button
                    onClick={() => onStartWorkout(w.id)}
                    className="p-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition active:bg-white/[0.12]"
                  >
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </button>
                )}
                {isSunday && (
                  <button onClick={onStartCheckin} className="p-2 bg-blue-500/10 hover:bg-blue-500/15 rounded-xl transition">
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

function StatPill({ label, value, unit, tone }: { label: string; value: string; unit: string; tone?: "success" | "flame" }) {
  const valueColor =
    tone === "flame" ? "text-[var(--color-accent)]" :
    tone === "success" ? "text-[#EDE8E0]" : "text-[#EDE8E0]";
  return (
    <div className="rounded-2xl bg-[var(--color-ink-1)] border border-white/[0.05] p-3">
      <div className="text-[9px] font-medium uppercase tracking-wide text-zinc-600 mb-1.5">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`font-display font-bold text-2xl tnum leading-none ${valueColor}`}>{value}</span>
        <span className="text-[10px] font-mono tnum text-zinc-600">{unit}</span>
        {tone === "flame" && <Flame className="w-3.5 h-3.5 text-[var(--color-accent)] ml-0.5" />}
      </div>
    </div>
  );
}

function Pretitle({ icon, text, tone }: { icon: ReactNode; text: string; tone: "success" | "blue" | "zinc" }) {
  const cls =
    tone === "success"
      ? "text-[var(--color-success)] bg-success-soft border-success-soft"
      : tone === "blue"
      ? "text-blue-300 bg-blue-500/10 border-blue-500/15"
      : "text-zinc-500 bg-white/[0.04] border-white/[0.07]";
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${cls} text-[11px] font-medium`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}
