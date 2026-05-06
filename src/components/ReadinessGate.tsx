import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Moon, Zap, ChevronRight, AlertTriangle } from "lucide-react";
import { readinessFactor, readinessLabel } from "../lib/intelligence";

interface ReadinessGateProps {
  onStart: (sleep: number, energy: number) => void;
}

const DOT_COUNT = 5;

function DotPicker({
  value,
  onChange,
  icon,
  label,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  icon: ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span style={{ color }} className="opacity-80">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <span className="ml-auto font-mono font-bold text-sm" style={{ color }}>{value}/5</span>
      </div>
      <div className="flex gap-2.5">
        {Array.from({ length: DOT_COUNT }, (_, i) => i + 1).map(n => (
          <motion.button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            whileTap={{ scale: 0.85 }}
            className={`flex-1 h-10 rounded-xl border transition-all ${
              n <= value
                ? "border-transparent"
                : "bg-[var(--color-void-3)] border-white/[0.07] text-slate-700"
            }`}
            style={
              n <= value
                ? { background: color, boxShadow: `0 4px 14px ${color}40` }
                : {}
            }
          >
            <span className={`text-xs font-bold ${n <= value ? "text-black" : ""}`}>{n}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export function ReadinessGate({ onStart }: ReadinessGateProps) {
  const [sleep, setSleep] = useState(3);
  const [energy, setEnergy] = useState(3);

  const factor = readinessFactor(sleep, energy);
  const label = readinessLabel(sleep, energy);
  const isLow = factor < 1.0;
  const isCritical = factor <= 0.90;
  const weightAdj = factor < 1 ? `−${Math.round((1 - factor) * 100)}%` : null;
  const rirAdj = factor < 1 ? "+1 RIR cible" : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 z-50 bg-[var(--color-void-0)]/80 backdrop-blur-md flex items-end"
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="w-full bg-[var(--color-void-1)] border-t border-white/[0.08] rounded-t-3xl px-5 pt-5 pb-10"
        >
          {/* Handle */}
          <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-6" />

          {/* Header */}
          <div className="mb-7">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-signal)] mb-1.5" style={{ opacity: 0.8 }}>
              Avant de démarrer
            </div>
            <h2 className="font-display font-black uppercase text-[#C0D0F0]" style={{ fontSize: '38px', lineHeight: 0.88 }}>
              COMMENT<br />TU TE SENS ?
            </h2>
          </div>

          {/* Sliders */}
          <div className="space-y-5 mb-6">
            <DotPicker
              value={sleep}
              onChange={setSleep}
              icon={<Moon className="w-4 h-4" />}
              label="Sommeil"
              color="#818CF8"
            />
            <DotPicker
              value={energy}
              onChange={setEnergy}
              icon={<Zap className="w-4 h-4" />}
              label="Énergie"
              color="#0DDFB8"
            />
          </div>

          {/* Readiness status */}
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-4 mb-5 border ${
              isCritical
                ? "bg-[rgba(255,107,53,0.08)] border-[rgba(255,107,53,0.2)]"
                : isLow
                ? "bg-[rgba(255,215,64,0.07)] border-[rgba(255,215,64,0.2)]"
                : "bg-signal-soft border-signal-soft"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Forme du jour</span>
              <span
                className="text-sm font-bold"
                style={{ color: isCritical ? '#FF6B35' : isLow ? '#FFD740' : '#0DDFB8' }}
              >
                {label}
              </span>
            </div>

            {isLow ? (
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="w-4 h-4 mt-0.5 shrink-0"
                  style={{ color: isCritical ? '#FF6B35' : '#FFD740' }}
                />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Poids suggérés ajustés à{" "}
                  <span className="font-bold text-[#C0D0F0]">{weightAdj}</span>
                  {rirAdj && (
                    <> et <span className="font-bold text-[#C0D0F0]">{rirAdj}</span></>
                  )}
                  . Reste dans les clous, c'est un cut.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Tu es au top. Bonne séance.
              </p>
            )}
          </motion.div>

          {/* CTA */}
          <motion.button
            onClick={() => onStart(sleep, energy)}
            whileTap={{ scale: 0.97 }}
            className="w-full text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 font-display text-xl uppercase tracking-wide"
            style={{ background: 'var(--color-signal)', boxShadow: '0 6px 24px rgba(13,223,184,0.3)' }}
          >
            Démarrer
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
