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

export function Home({ onStartWorkout, onStartCheckin, onOpenHistory, onOpenSettings }: HomeProps) {
  const today = getToday();
  const todayWorkout = today.workoutId ? workouts[today.workoutId] : null;
  const isSundayCheckin = today.day === "Dimanche";

  const [active, setActive] = useState<ActiveSession | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setActive(storage.getActiveSession());
  }, [tick]);

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
    if (!confirm("Abandonner la séance en cours ? Les sets non enregistrés seront perdus.")) return;
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
          <div className="text-[10px] tracking-[0.4em] font-bold uppercase text-emerald-400 mb-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
          <h1 className="font-display text-5xl font-bold tracking-tight leading-[0.85] text-white">
            Routine
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenHistory} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 active:bg-white/10">
            <BarChart3 className="w-4.5 h-4.5" />
          </button>
          <button onClick={onOpenSettings} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 active:bg-white/10">
            <SettingsIcon className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <StatPill label="Cette semaine" value={`${stats.week}`} unit="séances" tone="emerald" />
        <StatPill label="Volume 7j" value={fmtVol(stats.weekVolume)} unit="kg" />
        <StatPill label="Série" value={`${stats.streak}`} unit={stats.streak === 1 ? "jour" : "jours"} tone={stats.streak >= 3 ? "flame" : undefined} />
      </div>

      {/* Resume banner */}
      {active && activeWorkout && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-2xl border border-[var(--color-acid)]/30 bg-gradient-to-br from-[var(--color-acid)]/10 to-transparent p-1"
        >
          <div className="rounded-xl bg-[var(--color-ink-1)] p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-acid)] text-black flex items-center justify-center shrink-0">
              <Play className="w-6 h-6" strokeWidth={2.6} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--color-acid)] mb-0.5">Reprendre</div>
              <div className="font-bold text-sm truncate">{activeWorkout.name.split("—")[1]?.trim()}</div>
              <div className="text-[11px] font-mono tnum text-zinc-500">Démarrée il y a {activeMinutes} min</div>
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
                className="px-3 h-7 rounded-lg text-[10px] font-bold text-zinc-500 active:text-red-400 transition"
              >
                Abandonner
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Today's Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-ink-1)] rounded-[28px] p-6 border border-white/5 relative overflow-hidden mb-8"
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/10 blur-3xl rounded-full" />
        <div className="relative">
          {isSundayCheckin ? (
            <>
              <Pretitle icon={<ClipboardCheck className="w-4 h-4" />} text="Aujourd'hui · Check-in" tone="blue" />
              <h2 className="font-display text-3xl font-bold tracking-tight mb-2 leading-tight mt-3">
                Rituel<br />du dimanche
              </h2>
              <p className="text-zinc-400 text-sm mb-5 max-w-xs">
                Pesée, tour de taille et photos. Le point de la semaine, en moins de 3 minutes.
              </p>
              <button
                onClick={onStartCheckin}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl active:scale-[0.98] transition flex items-center justify-center gap-2 font-display tracking-tight"
              >
                Faire le check-in <ChevronRight className="w-5 h-5" />
              </button>
            </>
          ) : today.type === "workout" && todayWorkout ? (
            <>
              <Pretitle icon={<Dumbbell className="w-4 h-4" />} text={`Aujourd'hui · ${todayWorkout.exercises.length} exercices`} tone="emerald" />
              <h2 className="font-display text-3xl font-bold tracking-tight mb-2 leading-tight mt-3">
                {todayWorkout.name.split("—")[1]?.trim() || todayWorkout.name}
              </h2>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {todayWorkout.exercises.slice(0, 4).map(e => (
                  <span key={e.id} className="text-[10px] tracking-wide font-mono tnum text-zinc-400 bg-white/5 border border-white/5 px-2 py-1 rounded-md">
                    {e.name.split(/\s+/).slice(0, 2).join(' ')}
                  </span>
                ))}
                {todayWorkout.exercises.length > 4 && (
                  <span className="text-[10px] tracking-wide font-mono tnum text-zinc-500 px-2 py-1">+{todayWorkout.exercises.length - 4}</span>
                )}
              </div>
              <button
                onClick={() => onStartWorkout(todayWorkout.id)}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl active:scale-[0.98] transition flex items-center justify-center gap-2 font-display tracking-tight text-lg"
              >
                Commencer <ChevronRight className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <Pretitle icon={<CheckCircle2 className="w-4 h-4" />} text="Aujourd'hui · Repos" tone="zinc" />
              <h2 className="font-display text-3xl font-bold tracking-tight mb-2 leading-tight mt-3">
                Récupération
              </h2>
              <p className="text-zinc-400 text-sm">{today.description}</p>
            </>
          )}
        </div>
      </motion.div>

      {/* Week */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-display text-sm font-bold tracking-[0.2em] uppercase text-zinc-400">Programme</h3>
          <span className="text-[10px] font-mono tnum text-zinc-600">7 jours</span>
        </div>

        <div className="space-y-2">
          {weeklySchedule.map((day, idx) => {
            const isToday = day.day === today.day;
            const isWorkout = day.type === "workout";
            const isSunday = day.day === "Dimanche";
            const w = day.workoutId ? workouts[day.workoutId] : null;

            return (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + idx * 0.03 }}
                key={day.day}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                  isToday
                    ? "bg-[var(--color-ink-1)] border-emerald-500/30 shadow-[0_0_0_1px_rgba(52,211,153,0.06)_inset]"
                    : "bg-[var(--color-ink-1)]/40 border-white/5"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 text-center ${isToday ? "text-emerald-400" : "text-zinc-600"}`}>
                    <div className="text-[10px] font-mono tnum tracking-widest uppercase">{day.day.slice(0, 3)}</div>
                    {isToday && <div className="w-1 h-1 rounded-full bg-emerald-400 mx-auto mt-1" />}
                  </div>
                  <div>
                    <p className={`font-bold leading-tight tracking-tight ${isToday ? "text-white" : "text-zinc-300"}`}>
                      {isWorkout ? w?.name.split("—")[1]?.trim() || "Séance" : isSunday ? "Check-in" : "Repos"}
                    </p>
                    <p className={`text-[11px] font-medium truncate max-w-[180px] ${isToday ? "text-zinc-400" : "text-zinc-600"}`}>
                      {isWorkout && w ? `${w.exercises.length} exercices · ${day.description}` : day.description}
                    </p>
                  </div>
                </div>
                {isWorkout && w && (
                  <button onClick={() => onStartWorkout(w.id)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition active:bg-white/20">
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  </button>
                )}
                {isSunday && (
                  <button onClick={onStartCheckin} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-full transition">
                    <ClipboardCheck className="w-5 h-5 text-blue-400" />
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

function StatPill({ label, value, unit, tone }: { label: string; value: string; unit: string; tone?: "emerald" | "flame" }) {
  const valueColor = tone === "flame" ? "text-[var(--color-flame)]" : tone === "emerald" ? "text-white" : "text-white";
  return (
    <div className="rounded-2xl bg-[var(--color-ink-1)] border border-white/5 p-3">
      <div className="text-[9px] tracking-[0.25em] uppercase text-zinc-500 font-bold mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`font-display font-bold text-2xl tnum leading-none ${valueColor}`}>{value}</span>
        <span className="text-[10px] font-mono tnum text-zinc-500">{unit}</span>
        {tone === "flame" && <Flame className="w-3.5 h-3.5 text-[var(--color-flame)] ml-0.5" />}
      </div>
    </div>
  );
}

function Pretitle({ icon, text, tone }: { icon: ReactNode; text: string; tone: "emerald" | "blue" | "zinc" }) {
  const cls = tone === "emerald"
    ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
    : tone === "blue"
    ? "text-blue-300 bg-blue-500/10 border-blue-500/20"
    : "text-zinc-400 bg-white/5 border-white/10";
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${cls} text-[10px] font-bold uppercase tracking-[0.2em]`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

