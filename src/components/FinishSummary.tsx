import { CheckCircle2, Trophy, Zap } from "lucide-react";
import { motion } from "motion/react";
import { Workout } from "../data";
import { ExerciseLog, WorkoutSession } from "../lib/storage";
import { computeStreak, fmtVol, sessionPRs, setVolume } from "../lib/stats";

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-void-2)] border border-white/[0.06] p-4 text-left">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 mb-1.5">{label}</div>
      <div className="font-mono tnum font-bold text-2xl text-[#C0D0F0] leading-none">
        {value}
        {unit && <span className="text-xs text-slate-500 ml-1 font-sans">{unit}</span>}
      </div>
    </div>
  );
}

export function FinishSummary({
  workout,
  sessionLogs,
  startedAt,
  pastSessions,
  completedSets,
  liveVolume,
  displayNameFor,
  onFinish,
}: {
  workout: Workout;
  sessionLogs: Record<string, ExerciseLog>;
  startedAt: string;
  pastSessions: WorkoutSession[];
  completedSets: number;
  liveVolume: number;
  displayNameFor: (exerciseId: string) => string;
  onFinish: () => void;
}) {
  const durationSec = Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const prs = sessionPRs(sessionLogs, pastSessions);
  const previousSame = [...pastSessions]
    .filter(s => s.workoutId === workout.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const previousVolume = previousSame?.totalVolume ?? (previousSame ? Object.values(previousSame.logs).flatMap(l => l.sets).reduce((a, s) => a + setVolume(s), 0) : 0);
  const volumeDeltaPct = previousVolume > 0 ? Math.round(((liveVolume - previousVolume) / previousVolume) * 100) : null;
  const durationDeltaMin = previousSame?.durationSec ? Math.round((durationSec - previousSame.durationSec) / 60) : null;
  const streak = computeStreak([
    ...pastSessions,
    {
      v: 1,
      id: "current",
      date: new Date().toISOString(),
      workoutId: workout.id,
      workoutName: workout.name,
      logs: sessionLogs,
      durationSec,
      totalVolume: liveVolume,
    },
  ]);

  return (
    <motion.div
      key="finish"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28 }}
      className="flex flex-col items-center text-center pb-12 pt-8"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 240, damping: 18 }}
        className="w-24 h-24 bg-signal-soft rounded-full flex items-center justify-center mb-7"
        style={{ boxShadow: "0 0 40px rgba(13,223,184,0.2)" }}
      >
        <CheckCircle2 className="w-11 h-11 text-[var(--color-signal)]" strokeWidth={1.6} />
      </motion.div>

      <h2 className="font-display font-black text-[#C0D0F0] mb-1 uppercase" style={{ fontSize: "64px", lineHeight: 0.85 }}>
        BRAVO
      </h2>
      <p className="text-slate-500 text-sm mb-8">Seance prete a enregistrer.</p>

      <div className="grid grid-cols-3 gap-3 w-full px-2 max-w-sm mb-5">
        <StatCard label="Sets" value={`${completedSets}`} />
        <StatCard label="Volume" value={fmtVol(liveVolume)} unit="kg" />
        <StatCard label="Duree" value={`${Math.max(1, Math.floor(durationSec / 60))}'`} />
      </div>

      {prs.length > 0 && (
        <div className="w-full text-left rounded-xl bg-acid-soft border border-[var(--color-acid)]/20 p-4 mb-4">
          <div className="flex items-center gap-2 text-[var(--color-acid)] mb-3">
            <Trophy className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]">PR battus</span>
          </div>
          <div className="space-y-2">
            {prs.slice(0, 6).map((pr, idx) => (
              <div key={`${pr.exerciseId}-${pr.setIndex}-${pr.type}-${idx}`} className="text-xs text-slate-300">
                <span className="font-semibold text-[#C0D0F0]">{displayNameFor(pr.exerciseId)}</span>
                <span className="text-slate-500"> · </span>
                <span className="font-mono tnum">{pr.weight} kg × {pr.reps}</span>
                <span className="text-[var(--color-acid)] font-bold"> · {pr.type === "volume" ? "Volume PR" : "Poids PR"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {previousSame && (
        <div className="w-full text-left rounded-xl bg-[var(--color-void-2)] border border-white/[0.06] p-4 mb-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 mb-3">Vs derniere meme seance</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">Volume</div>
              <div className={`font-mono tnum font-bold ${volumeDeltaPct !== null && volumeDeltaPct >= 0 ? "text-[var(--color-signal)]" : "text-orange-300"}`}>
                {fmtVol(liveVolume)} kg {volumeDeltaPct !== null && `(${volumeDeltaPct >= 0 ? "+" : ""}${volumeDeltaPct}%)`}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Duree</div>
              <div className={`font-mono tnum font-bold ${durationDeltaMin !== null && durationDeltaMin <= 0 ? "text-[var(--color-signal)]" : "text-orange-300"}`}>
                {Math.max(1, Math.floor(durationSec / 60))} min {durationDeltaMin !== null && `(${durationDeltaMin >= 0 ? "+" : ""}${durationDeltaMin} min)`}
              </div>
            </div>
          </div>
        </div>
      )}

      {streak > 1 && (
        <div className="w-full rounded-xl bg-signal-soft border border-signal-soft px-4 py-3 text-sm font-semibold text-[var(--color-signal)] mb-5">
          {streak}e seance d'affilee.
        </div>
      )}

      <button
        onClick={onFinish}
        className="w-full text-black font-bold py-4 rounded-xl text-base active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        style={{ background: "var(--color-signal)", boxShadow: "0 6px 24px rgba(13,223,184,0.3)" }}
      >
        <Zap className="w-5 h-5" strokeWidth={2.5} />
        Enregistrer la seance
      </button>
    </motion.div>
  );
}

