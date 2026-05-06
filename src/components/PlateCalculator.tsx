import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Minus, Plus } from "lucide-react";
import { calcPlatesPerSide, warmupLadder } from "../lib/intelligence";

interface PlateCalculatorProps {
  onClose: () => void;
  initialWeight?: number;
}

const PLATE_COLORS: Record<number, string> = {
  25:   '#EF4444', // red
  20:   '#3B82F6', // blue
  15:   '#F59E0B', // amber
  10:   '#10B981', // emerald
  5:    '#8B5CF6', // violet
  2.5:  '#EC4899', // pink
  1.25: '#6B7280', // gray
};

const BAR_WEIGHTS = [20, 15, 10] as const;

export function PlateCalculator({ onClose, initialWeight = 100 }: PlateCalculatorProps) {
  const [targetWeight, setTargetWeight] = useState(initialWeight);
  const [barWeight, setBarWeight] = useState<20 | 15 | 10>(20);

  const plates = useMemo(() => calcPlatesPerSide(targetWeight, barWeight), [targetWeight, barWeight]);
  const ladder = useMemo(() => warmupLadder(targetWeight), [targetWeight]);

  const canCompute = targetWeight > barWeight;

  const adjustWeight = (delta: number) => {
    setTargetWeight(w => Math.max(barWeight + 2.5, Math.round((w + delta) / 2.5) * 2.5));
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-void-0)] text-[#C0D0F0] overflow-hidden max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] bg-[var(--color-void-0)]/90 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:text-slate-300 transition-colors">
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-signal)] opacity-80">Utilitaire</div>
          <h2 className="font-display font-black uppercase text-[#C0D0F0]" style={{ fontSize: '22px', lineHeight: 1 }}>
            CALCULATEUR
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto view-no-scrollbar px-4 py-5 space-y-5">
        {/* Target weight */}
        <div className="rounded-2xl bg-[var(--color-void-1)] border border-white/[0.05] p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Poids cible</div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => adjustWeight(-2.5)}
              className="w-12 h-12 rounded-xl bg-[var(--color-void-3)] border border-white/[0.06] flex items-center justify-center text-slate-400 active:scale-95 transition"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="flex-1 text-center">
              <div className="font-display font-black tnum" style={{ fontSize: '64px', lineHeight: 0.9, color: 'var(--color-signal)' }}>
                {targetWeight}
              </div>
              <div className="text-sm text-slate-500 mt-1">kg</div>
            </div>
            <button
              onClick={() => adjustWeight(2.5)}
              className="w-12 h-12 rounded-xl bg-[var(--color-void-3)] border border-white/[0.06] flex items-center justify-center text-slate-400 active:scale-95 transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Bar weight selector */}
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2.5">Poids de barre</div>
            <div className="flex gap-2">
              {BAR_WEIGHTS.map(bw => (
                <button
                  key={bw}
                  onClick={() => setBarWeight(bw as 20 | 15 | 10)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    barWeight === bw
                      ? 'border-transparent text-black'
                      : 'bg-[var(--color-void-3)] border-white/[0.07] text-slate-500'
                  }`}
                  style={barWeight === bw ? { background: 'var(--color-signal)' } : {}}
                >
                  {bw} kg
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Plate visualization */}
        <AnimatePresence mode="wait">
          {canCompute && plates.length > 0 && (
            <motion.div
              key={`${targetWeight}-${barWeight}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-[var(--color-void-1)] border border-white/[0.05] p-5"
            >
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
                Disques par côté
              </div>

              {/* Visual bar */}
              <div className="flex items-center justify-center mb-5 gap-1 overflow-hidden">
                {/* Plates left (reversed) */}
                <div className="flex items-center gap-0.5">
                  {[...plates].reverse().flatMap(p =>
                    Array.from({ length: p.count }, (_, i) => (
                      <motion.div
                        key={`L-${p.kg}-${i}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-sm"
                        style={{
                          width: Math.max(10, p.kg * 1.4),
                          height: 52,
                          background: PLATE_COLORS[p.kg] ?? '#6B7280',
                          opacity: 0.85,
                        }}
                      />
                    ))
                  )}
                </div>
                {/* Bar */}
                <div className="w-10 h-3 rounded-full bg-slate-600 border border-slate-500" />
                {/* Plates right */}
                <div className="flex items-center gap-0.5">
                  {plates.flatMap(p =>
                    Array.from({ length: p.count }, (_, i) => (
                      <motion.div
                        key={`R-${p.kg}-${i}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-sm"
                        style={{
                          width: Math.max(10, p.kg * 1.4),
                          height: 52,
                          background: PLATE_COLORS[p.kg] ?? '#6B7280',
                          opacity: 0.85,
                        }}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Plate list */}
              <div className="space-y-2">
                {plates.map(p => (
                  <div key={p.kg} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ background: PLATE_COLORS[p.kg] ?? '#6B7280' }}
                    />
                    <span className="flex-1 text-sm text-slate-300">
                      <span className="font-bold">{p.kg} kg</span>
                    </span>
                    <span className="font-mono text-sm font-bold text-[#C0D0F0]">
                      × {p.count} <span className="text-slate-600 text-xs">par côté</span>
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {canCompute && plates.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl bg-[var(--color-void-1)] border border-white/[0.05] p-5 text-center text-slate-600 text-sm"
            >
              Barre seule ({barWeight} kg)
            </motion.div>
          )}
        </AnimatePresence>

        {/* Warmup ladder */}
        {canCompute && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl bg-[var(--color-void-1)] border border-white/[0.05] p-5"
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
              Ladder d'échauffement
            </div>
            <div className="space-y-2.5">
              {ladder.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-black shrink-0"
                    style={{ background: `rgba(13,223,184,${0.4 + i * 0.2})` }}
                  >
                    {step.pct}%
                  </div>
                  <div className="flex-1">
                    <span className="font-mono font-bold text-[#C0D0F0]">{step.weight} kg</span>
                    <span className="text-slate-600 text-xs ml-2">× {step.reps} reps</span>
                  </div>
                  <div className="text-[11px] text-slate-700 font-mono">
                    {calcPlatesPerSide(step.weight, barWeight).map(p => `${p.count}×${p.kg}`).join(' + ') || 'barre'}
                  </div>
                </div>
              ))}
              {/* Work set */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.05] mt-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-black shrink-0"
                  style={{ background: 'var(--color-signal)' }}
                >
                  WK
                </div>
                <div className="flex-1">
                  <span className="font-mono font-bold text-[var(--color-signal)]">{targetWeight} kg</span>
                  <span className="text-slate-600 text-xs ml-2">série de travail</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
