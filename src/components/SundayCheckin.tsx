import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Camera, Ruler, Weight, ChevronLeft, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { storage } from "../lib/storage";
import { Sparkline } from "./Sparkline";
import { fmtRelativeShort } from "../lib/stats";

interface Props {
  onClose: () => void;
}

export function SundayCheckin({ onClose }: Props) {
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [photosTaken, setPhotosTaken] = useState(false);
  const [done, setDone] = useState(false);

  const checkins = useMemo(() => storage.getCheckins(), []);
  const last = checkins[checkins.length - 1];

  const weightSeries = useMemo(
    () => checkins.map(c => Number(c.weight) || 0).filter(n => n > 0),
    [checkins],
  );
  const waistSeries = useMemo(
    () => checkins.map(c => Number(c.waist) || 0).filter(n => n > 0),
    [checkins],
  );

  const weightDelta = last && weight ? Number(weight) - Number(last.weight) : null;
  const waistDelta = last && waist ? Number(waist) - Number(last.waist) : null;

  const handleSave = () => {
    if (!weight && !waist && !photosTaken) {
      onClose();
      return;
    }
    storage.saveCheckin({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      weight,
      waist,
      photosTaken,
    });
    setDone(true);
    setTimeout(onClose, 1800);
  };

  if (done) {
    return (
      <div className="flex flex-col h-screen justify-center items-center bg-[var(--color-ink-0)] text-white pb-20 max-w-md mx-auto">
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative mb-6"
        >
          <div className="absolute inset-0 blur-2xl bg-[var(--color-acid)]/40 rounded-full" />
          <div className="relative w-24 h-24 bg-[var(--color-acid)] text-black rounded-full flex items-center justify-center">
            <Check className="w-12 h-12" strokeWidth={3} />
          </div>
        </motion.div>
        <h2 className="font-display text-4xl font-bold tracking-tight mb-2">Validé.</h2>
        <p className="text-zinc-400">Prêt pour une nouvelle semaine.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-ink-0)] text-white max-w-md mx-auto relative">
      <div className="flex items-center p-4 sticky top-0 bg-[var(--color-ink-0)]/85 backdrop-blur-xl z-10 border-b border-white/5">
        <button
          onClick={onClose}
          aria-label="Retour"
          className="relative z-10 p-2 -ml-2 text-zinc-400 active:text-white shrink-0"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <h1 className="flex-1 text-center font-display font-bold text-xs tracking-[0.3em] text-zinc-400 uppercase pointer-events-none">Rituel du dimanche</h1>
        <div className="w-11 shrink-0" />
      </div>

      <div className="px-5 pt-6 flex-1">
        <div className="text-[10px] tracking-[0.4em] font-bold uppercase text-blue-300 mb-2">
          Semaine #{checkins.length + 1}
        </div>
        <h2 className="font-display text-4xl font-bold mb-6 leading-[0.95] tracking-tight">
          Check-in<br/>hebdomadaire
        </h2>

        <div className="space-y-4">
          {/* Weight */}
          <div className="bg-[var(--color-ink-1)] border border-white/5 rounded-[24px] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center text-zinc-300 gap-2">
                <Weight className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-sm tracking-tight">Poids à jeun</span>
              </div>
              {last && <span className="text-[10px] font-mono tnum text-zinc-500">Dernier : {last.weight || "—"} kg · {fmtRelativeShort(last.date)}</span>}
            </div>
            <div className="flex items-end gap-2 mb-3">
              <input
                type="number" inputMode="decimal"
                value={weight} onChange={e => setWeight(e.target.value)}
                placeholder={last?.weight || "00.0"}
                className="bg-transparent w-full font-display font-bold text-5xl py-2 text-white outline-none placeholder-zinc-700 tnum"
              />
              <span className="text-zinc-500 font-mono mb-3 text-base">kg</span>
              {weightDelta !== null && (
                <DeltaPill delta={weightDelta} unit="kg" inverse />
              )}
            </div>
            {weightSeries.length > 0 && (
              <div className="rounded-xl bg-[var(--color-ink-0)] border border-white/5 p-2 spark-grid">
                <Sparkline values={weightSeries} stroke="#60a5fa" fill="rgba(96,165,250,0.08)" />
              </div>
            )}
          </div>

          {/* Waist */}
          <div className="bg-[var(--color-ink-1)] border border-white/5 rounded-[24px] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center text-zinc-300 gap-2">
                <Ruler className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm tracking-tight">Tour de taille</span>
              </div>
              {last && <span className="text-[10px] font-mono tnum text-zinc-500">Dernier : {last.waist || "—"} cm</span>}
            </div>
            <div className="flex items-end gap-2 mb-3">
              <input
                type="number" inputMode="decimal"
                value={waist} onChange={e => setWaist(e.target.value)}
                placeholder={last?.waist || "00.0"}
                className="bg-transparent w-full font-display font-bold text-5xl py-2 text-white outline-none placeholder-zinc-700 tnum"
              />
              <span className="text-zinc-500 font-mono mb-3 text-base">cm</span>
              {waistDelta !== null && <DeltaPill delta={waistDelta} unit="cm" inverse />}
            </div>
            {waistSeries.length > 0 && (
              <div className="rounded-xl bg-[var(--color-ink-0)] border border-white/5 p-2 spark-grid">
                <Sparkline values={waistSeries} stroke="#34d399" fill="rgba(52,211,153,0.08)" />
              </div>
            )}
          </div>

          {/* Photos */}
          <button
            onClick={() => setPhotosTaken(!photosTaken)}
            className={`w-full border ${photosTaken ? 'border-orange-500/40 bg-orange-500/5' : 'border-white/5 bg-[var(--color-ink-1)]'} rounded-[24px] p-5 flex items-center transition text-left active:scale-[0.99]`}
          >
            <div className={`p-3.5 rounded-xl mr-4 transition-colors ${photosTaken ? 'bg-orange-500 text-black' : 'bg-white/5 text-zinc-400'}`}>
              <Camera className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-base tracking-tight">{photosTaken ? "Photos prises" : "Prendre ses photos"}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Face, dos, profil</div>
            </div>
            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${photosTaken ? 'border-orange-500 bg-orange-500 text-black' : 'border-white/20'}`}>
              {photosTaken && <Check className="w-4 h-4" strokeWidth={3} />}
            </div>
          </button>
        </div>
      </div>

      <div className="p-5 sticky bottom-0 bg-gradient-to-t from-[var(--color-ink-0)] via-[var(--color-ink-0)] to-transparent">
        <button
          onClick={handleSave}
          className="w-full bg-white text-black font-bold py-4 rounded-2xl text-lg shadow-xl active:scale-[0.98] transition flex items-center justify-center gap-2 font-display tracking-tight"
        >
          <Check className="w-5 h-5" />
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function DeltaPill({ delta, unit, inverse }: { delta: number; unit: string; inverse?: boolean }) {
  const eps = 0.05;
  if (Math.abs(delta) < eps) {
    return (
      <span className="flex items-center gap-1 px-2 py-1 mb-3 rounded-md bg-white/5 text-zinc-400 text-[10px] font-mono tnum font-bold whitespace-nowrap">
        <Minus className="w-3 h-3" /> 0 {unit}
      </span>
    );
  }
  const isPositive = delta > 0;
  // For weight/waist tracked goal is usually decrease, so "inverse" means a decrease (negative delta) is good.
  const good = inverse ? !isPositive : isPositive;
  const cls = good ? "bg-emerald-400/10 text-emerald-300" : "bg-orange-500/10 text-orange-300";
  return (
    <span className={`flex items-center gap-1 px-2 py-1 mb-3 rounded-md text-[10px] font-mono tnum font-bold whitespace-nowrap ${cls}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? "+" : ""}{delta.toFixed(1)} {unit}
    </span>
  );
}
