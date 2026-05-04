import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Trophy, TrendingUp, TrendingDown, Search, Calendar, Trash2 } from "lucide-react";
import { storage, WorkoutSession, ExerciseLog } from "../lib/storage";
import { workouts, allExercises, findExercise } from "../data";
import { bestSetEver, exerciseProgression, fmtDate, fmtRelativeShort, fmtVol, sessionVolume, setVolume, topSet } from "../lib/stats";
import { Sparkline } from "./Sparkline";

interface Props {
  onClose: () => void;
}

type Tab = "exercises" | "sessions";

export function History({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("exercises");
  const [query, setQuery] = useState("");
  const [openExId, setOpenExId] = useState<string | null>(null);
  const [openSession, setOpenSession] = useState<WorkoutSession | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const sessions = useMemo(() => storage.getSessions(), [refreshKey]);
  const exercises = useMemo(
    () => allExercises().filter(ex => ex.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  const deleteSession = (id: string) => {
    if (!confirm("Supprimer cette séance définitivement ?")) return;
    storage.deleteSession(id);
    setOpenSession(null);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-ink-0)] text-white max-w-md mx-auto relative">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[var(--color-ink-0)]/85 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center p-4">
          <button
            onClick={onClose}
            aria-label="Retour"
            className="relative z-10 p-2 -ml-2 text-zinc-400 active:text-white shrink-0"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <h1 className="flex-1 text-center font-display font-bold text-xs tracking-[0.3em] text-zinc-400 uppercase pointer-events-none">
            Historique
          </h1>
          <div className="w-11 shrink-0" />
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3">
          <div className="flex p-1 bg-white/[0.04] rounded-xl border border-white/5">
            <TabBtn active={tab === "exercises"} onClick={() => setTab("exercises")}>Exercices</TabBtn>
            <TabBtn active={tab === "sessions"} onClick={() => setTab("sessions")}>Séances</TabBtn>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-12 view-no-scrollbar">
        {tab === "exercises" && (
          <div className="px-4 pt-4 space-y-2">
            {/* Search */}
            <label className="flex items-center gap-2 px-3 h-11 bg-[var(--color-ink-2)] rounded-xl border border-white/5 mb-3">
              <Search className="w-4 h-4 text-zinc-500" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher un exercice…"
                className="flex-1 bg-transparent outline-none text-sm placeholder-zinc-600"
              />
            </label>

            {exercises.length === 0 && (
              <div className="text-center text-zinc-500 text-sm py-12">Aucun exercice trouvé.</div>
            )}

            {exercises.map(ex => {
              const prog = exerciseProgression(sessions, ex.id);
              const best = bestSetEver(sessions, ex.id);
              const open = openExId === ex.id;
              const ctx = findExercise(ex.id);
              const values = prog.map(p => setVolume(p.top!));
              const trend = values.length > 1 ? values[values.length - 1] - values[0] : 0;
              const trendUp = trend > 0;

              return (
                <motion.div
                  key={ex.id}
                  layout
                  className={`rounded-2xl border ${open ? "bg-[var(--color-ink-2)] border-white/10" : "bg-[var(--color-ink-1)] border-white/5"}`}
                >
                  <button
                    onClick={() => setOpenExId(open ? null : ex.id)}
                    className="w-full text-left p-4 flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono tnum uppercase tracking-[0.25em] text-zinc-500 mb-1">
                        {ctx?.workout.name.split("—")[1]?.trim() || ""}
                      </div>
                      <div className="font-display font-bold text-base leading-tight truncate">{ex.name}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 font-mono tnum">
                        <span>{prog.length} séances</span>
                        {best && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className="flex items-center gap-1 text-[var(--color-acid)]">
                              <Trophy className="w-3 h-3" /> {best.weight}×{best.reps}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {prog.length > 1 && (
                      <div className={`flex items-center gap-1 text-xs font-mono tnum font-bold ${trendUp ? "text-emerald-400" : "text-orange-400"}`}>
                        {trendUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {trendUp ? "+" : ""}{Math.round(trend)}
                      </div>
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3">
                          <div className="rounded-xl bg-[var(--color-ink-0)] border border-white/5 p-3 spark-grid">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-zinc-500">Volume top set</div>
                              <div className="text-[10px] font-mono tnum text-zinc-600">{prog.length} pts</div>
                            </div>
                            <Sparkline values={values} />
                          </div>

                          <div className="space-y-1.5">
                            {prog.slice().reverse().slice(0, 8).map((p, i) => (
                              <div key={i} className="flex items-center gap-3 px-3 h-10 rounded-lg bg-white/[0.02] border border-white/5">
                                <div className="text-[11px] font-mono tnum text-zinc-500 w-16">{fmtDate(p.date)}</div>
                                <div className="flex-1 font-mono tnum text-sm">
                                  <span className="text-white">{p.top!.weight}</span>
                                  <span className="text-zinc-600 mx-1">×</span>
                                  <span className="text-white">{p.top!.reps}</span>
                                </div>
                                <div className="text-xs font-mono tnum text-zinc-500">{Math.round(p.volume)} kg</div>
                              </div>
                            ))}
                            {prog.length === 0 && (
                              <div className="text-xs text-zinc-600 italic py-2">Aucune donnée enregistrée pour cet exercice.</div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {tab === "sessions" && (
          <div className="px-4 pt-4 space-y-2">
            {sessions.length === 0 && (
              <div className="text-center text-zinc-500 text-sm py-16">
                <Calendar className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
                Aucune séance enregistrée.
              </div>
            )}
            {sessions.slice().reverse().map(s => {
              const w = workouts[s.workoutId];
              const vol = s.totalVolume ?? sessionVolume(s);
              const setsCount = (Object.values(s.logs) as ExerciseLog[]).flatMap(l => l.sets).filter(x => x.isComplete).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setOpenSession(s)}
                  className="w-full p-4 rounded-2xl bg-[var(--color-ink-1)] border border-white/5 text-left active:bg-[var(--color-ink-2)] transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] font-mono tnum uppercase tracking-[0.25em] text-emerald-400">
                      {fmtRelativeShort(s.date)}
                    </div>
                    <div className="text-[10px] font-mono tnum text-zinc-500">{new Date(s.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="font-display font-bold text-base leading-tight mb-2">
                    {w?.name.split("—")[1]?.trim() || s.workoutName || s.workoutId}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono tnum text-zinc-500">
                    <span>{setsCount} sets</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    <span>{fmtVol(vol)} kg</span>
                    {s.durationSec && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span>{Math.floor(s.durationSec / 60)}'</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Session detail modal */}
      <AnimatePresence>
        {openSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-end max-w-md mx-auto"
            onClick={() => setOpenSession(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              onClick={e => e.stopPropagation()}
              className="w-full bg-[var(--color-ink-1)] border-t border-white/10 rounded-t-[28px] max-h-[85vh] overflow-y-auto view-no-scrollbar"
            >
              <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                <div className="w-10 h-1 rounded-full bg-white/10 mx-auto" />
              </div>
              <div className="px-5 pb-6">
                <div className="text-[10px] font-mono tnum uppercase tracking-[0.25em] text-emerald-400 mb-1">
                  {fmtDate(openSession.date)}
                </div>
                <h3 className="font-display font-bold text-2xl mb-4">
                  {workouts[openSession.workoutId]?.name.split("—")[1]?.trim() || openSession.workoutName}
                </h3>

                <div className="space-y-3">
                  {(Object.entries(openSession.logs) as [string, ExerciseLog][]).map(([exId, log]) => {
                    const ex = workouts[openSession.workoutId]?.exercises.find(e => e.id === exId);
                    if (!ex) return null;
                    const top = topSet(log.sets);
                    return (
                      <div key={exId} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                        <div className="font-bold text-sm mb-2">{ex.name}</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {log.sets.map((set, i) => (
                            <div
                              key={i}
                              className={`text-xs font-mono tnum px-2 py-1.5 rounded-md text-center ${
                                set === top && Number(set.weight) > 0
                                  ? "bg-[var(--color-acid)]/15 text-[var(--color-acid)] border border-[var(--color-acid)]/30"
                                  : set.isComplete
                                  ? "bg-emerald-400/5 text-emerald-300 border border-emerald-400/15"
                                  : "bg-white/[0.02] text-zinc-600 border border-white/5"
                              }`}
                            >
                              {set.weight || "—"}<span className="text-zinc-600 mx-0.5">×</span>{set.reps || "—"}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => deleteSession(openSession.id)}
                  className="w-full mt-5 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer la séance
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-[0.15em] uppercase transition ${
        active ? "bg-white text-black shadow" : "text-zinc-400"
      }`}
    >
      {children}
    </button>
  );
}
