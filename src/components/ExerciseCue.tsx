import { Dumbbell, Gauge } from "lucide-react";
import { calcPlatesPerSide } from "../lib/intelligence";
import type { RepsHint, SessionTarget } from "../lib/intelligence";

interface ExerciseCueProps {
  target: SessionTarget;
  repsHint: RepsHint;
  compact: boolean;
}

const formatWeight = (weight: number) =>
  Number.isInteger(weight) ? String(weight) : weight.toFixed(2).replace(/\.?0+$/, "");

const formatDelta = (delta: number | null) => {
  if (delta === null || Math.abs(delta) < 0.01) return "stable";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatWeight(delta)} kg`;
};

const platesText = (targetWeight: number | null) => {
  if (!targetWeight || targetWeight <= 20) return "Barre seule ou machine";
  const plates = calcPlatesPerSide(targetWeight, 20);
  if (!plates.length) return "Barre 20 kg seule";
  return `Barre 20 kg: ${plates.map(p => `${p.count}x${p.kg}`).join(" + ")} par cote`;
};

export function ExerciseCue({ target, repsHint, compact }: ExerciseCueProps) {
  const hasWeight = target.targetWeight !== null;
  const weightLabel = hasWeight ? `${formatWeight(target.targetWeight!)} kg` : "Charge a trouver";
  const cueTone =
    target.action === "deload" ? "border-[var(--color-flame)]/20 bg-[rgba(255,107,53,0.07)]" :
    target.deltaKg !== null && target.deltaKg > 0 ? "border-signal-soft bg-signal-soft" :
    "border-white/[0.06] bg-[var(--color-void-2)]";
  const deltaTone =
    target.action === "deload" ? "text-[var(--color-flame)] bg-[rgba(255,107,53,0.12)] border-[rgba(255,107,53,0.18)]" :
    target.deltaKg !== null && target.deltaKg > 0 ? "text-[var(--color-signal)] bg-[var(--color-signal)]/10 border-[var(--color-signal)]/20" :
    "text-slate-500 bg-white/[0.04] border-white/[0.06]";
  const rirNote = repsHint.note ? ` · ${repsHint.note}` : "";

  if (compact) {
    return (
      <div className={`mt-4 rounded-xl border px-3 py-2.5 flex items-center gap-2 ${cueTone}`}>
        <Gauge className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <div className="min-w-0 flex-1 text-xs font-mono tnum text-slate-400 truncate">
          <span className="text-[#C0D0F0] font-bold">{weightLabel}</span>
          <span className="text-slate-600"> · </span>
          <span>{repsHint.label || target.reps} reps{rirNote}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-4 rounded-xl border p-3.5 ${cueTone}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          <Dumbbell className="w-3.5 h-3.5" />
          Cible
        </div>
        <span className={`px-2 py-1 rounded-lg border text-[10px] font-bold font-mono tnum ${deltaTone}`}>
          {formatDelta(target.deltaKg)}
        </span>
      </div>

      <div className="flex items-end gap-2 mb-2">
        <div className="font-display font-black tnum leading-none text-[#C0D0F0]" style={{ fontSize: "42px" }}>
          {weightLabel}
        </div>
        <div className="pb-1.5 text-sm font-bold text-slate-500">x {target.reps} reps</div>
      </div>

      <div className="text-xs text-slate-500 font-mono tnum mb-3">
        {hasWeight ? platesText(target.targetWeight) : "Note la charge propre apres ton premier set."}
      </div>

      {repsHint.note && (
        <div className="mb-3 text-[11px] text-slate-400">
          {repsHint.note}
        </div>
      )}
    </div>
  );
}
