import { useMemo } from "react";
import { motion } from "motion/react";
import { ChevronLeft, TrendingUp } from "lucide-react";
import { storage } from "../lib/storage";
import { allExercises } from "../data";
import {
  VOLUME_LANDMARKS,
  weeklyMuscleGroupSets,
  getVolumeStatus,
  volumeStatusMeta,
} from "../lib/intelligence";

interface VolumeDashboardProps {
  onClose: () => void;
}

const STATUS_ORDER: Array<ReturnType<typeof getVolumeStatus>> = [
  'below-mev', 'above-mrv', 'mav-mrv', 'mev-mav',
];

const now = new Date();
const weekStart = new Date(now);
weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
weekStart.setHours(0, 0, 0, 0);
const weekLabel = weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

export function VolumeDashboard({ onClose }: VolumeDashboardProps) {
  const sessions = useMemo(() => storage.getSessions(), []);
  const exercises = useMemo(() => allExercises(), []);
  const weeklySets = useMemo(() => weeklyMuscleGroupSets(sessions, exercises), [sessions, exercises]);

  const rows = useMemo(() =>
    Object.entries(VOLUME_LANDMARKS)
      .map(([key, lm]) => ({
        key,
        label: lm.label,
        sets: weeklySets[key] ?? 0,
        mev: lm.mev,
        mav: lm.mav,
        mrv: lm.mrv,
        status: getVolumeStatus(weeklySets[key] ?? 0, key),
      }))
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)),
    [weeklySets],
  );

  const totalSets = rows.reduce((a, r) => a + r.sets, 0);
  const optimal = rows.filter(r => r.status === 'mev-mav' || r.status === 'mav-mrv').length;

  return (
    <div className="flex flex-col h-screen bg-[var(--color-void-0)] text-[#C0D0F0] overflow-hidden max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] bg-[var(--color-void-0)]/90 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-300 active:text-white transition-colors"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-signal)] opacity-80">
            Semaine du {weekLabel}
          </div>
          <h2 className="font-display font-black uppercase text-[#C0D0F0]" style={{ fontSize: '22px', lineHeight: 1 }}>
            VOLUME PAR GROUPE
          </h2>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-xl text-[#C0D0F0] tnum">{totalSets}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">sets totaux</div>
        </div>
      </div>

      {/* RP Legend */}
      <div className="px-4 py-3 bg-[var(--color-void-1)] border-b border-white/[0.04]">
        <div className="flex gap-2 flex-wrap">
          {(['below-mev', 'mev-mav', 'mav-mrv', 'above-mrv'] as const).map(s => {
            const m = volumeStatusMeta[s];
            return (
              <span
                key={s}
                className="text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}
              >
                {m.label}
              </span>
            );
          })}
          <span className="ml-auto text-[10px] text-slate-600 font-mono self-center">
            {optimal}/{rows.length} optimal
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto view-no-scrollbar px-4 py-3 space-y-3">
        {rows.map((row, i) => {
          const meta = volumeStatusMeta[row.status];
          const maxDisplay = row.mrv + 4;
          const setsRatio = Math.min(row.sets / maxDisplay, 1);
          const mevPct = (row.mev / maxDisplay) * 100;
          const mavPct = (row.mav / maxDisplay) * 100;
          const mrvPct = (row.mrv / maxDisplay) * 100;

          return (
            <motion.div
              key={row.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl bg-[var(--color-void-1)] border border-white/[0.05] p-4"
            >
              {/* Top row */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-sm text-[#C0D0F0]">{row.label}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5 font-mono">
                    MEV {row.mev} · MAV {row.mav} · MRV {row.mrv}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="font-display font-black tnum"
                    style={{ fontSize: '28px', lineHeight: 1, color: meta.color }}
                  >
                    {row.sets}
                  </div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: meta.color, opacity: 0.75 }}
                  >
                    {meta.label}
                  </div>
                </div>
              </div>

              {/* Zone bar */}
              <div className="relative h-2.5 rounded-full bg-[var(--color-void-3)] overflow-hidden">
                {/* Zone bands */}
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    left: 0,
                    width: `${mevPct}%`,
                    background: 'rgba(100,116,139,0.25)',
                  }}
                />
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${mevPct}%`,
                    width: `${mavPct - mevPct}%`,
                    background: 'rgba(13,223,184,0.2)',
                  }}
                />
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${mavPct}%`,
                    width: `${mrvPct - mavPct}%`,
                    background: 'rgba(255,215,64,0.2)',
                  }}
                />
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${mrvPct}%`,
                    right: 0,
                    background: 'rgba(255,107,53,0.2)',
                  }}
                />

                {/* Current sets fill */}
                <motion.div
                  className="absolute top-0 bottom-0 left-0 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${setsRatio * 100}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 + 0.1 }}
                  style={{ background: meta.color, opacity: 0.9 }}
                />

                {/* MEV / MAV / MRV tick marks */}
                {[{ pct: mevPct, label: 'MEV' }, { pct: mavPct, label: 'MAV' }, { pct: mrvPct, label: 'MRV' }].map(t => (
                  <div
                    key={t.label}
                    className="absolute top-0 bottom-0 w-px bg-white/20"
                    style={{ left: `${t.pct}%` }}
                  />
                ))}
              </div>

              {/* Tick labels */}
              <div className="relative h-4 mt-1">
                {[
                  { pct: mevPct, val: row.mev },
                  { pct: mavPct, val: row.mav },
                  { pct: mrvPct, val: row.mrv },
                ].map(t => (
                  <div
                    key={t.val}
                    className="absolute text-[9px] font-mono text-slate-700 -translate-x-1/2"
                    style={{ left: `${t.pct}%` }}
                  >
                    {t.val}
                  </div>
                ))}
              </div>

              {/* Advice */}
              {row.status === 'below-mev' && row.sets === 0 && (
                <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" />
                  Aucun set cette semaine
                </div>
              )}
              {row.status === 'below-mev' && row.sets > 0 && (
                <div className="mt-2 text-[11px] text-slate-600">
                  +{row.mev - row.sets} sets pour atteindre le MEV
                </div>
              )}
              {row.status === 'above-mrv' && (
                <div className="mt-2 text-[11px]" style={{ color: '#FF6B35', opacity: 0.8 }}>
                  Sur-volume — récupération compromise
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Footer note */}
        <div className="py-3 text-center text-[10px] text-slate-700 font-mono">
          Framework Renaissance Periodization · Dr. Mike Israetel
        </div>
      </div>
    </div>
  );
}
