import type { RepsHint, SessionTarget } from "../lib/intelligence";
import { fmtKg } from "../lib/stats";

interface ExerciseCueProps {
  target: SessionTarget;
  repsHint: RepsHint;
  compact: boolean;
}

/** "What should I lift now?" — the answer, before anything else on the exercise screen. */
export function ExerciseCue({ target, repsHint, compact }: ExerciseCueProps) {
  const hasWeight = target.targetWeight !== null;
  const reps = (repsHint.label || target.reps).replace("-", "–");
  const delta = target.deltaKg;
  const deltaText =
    delta === null ? null
      : Math.abs(delta) < 0.01 ? "même charge que la dernière fois"
      : `${delta > 0 ? "+" : "−"}${fmtKg(Math.abs(delta))} kg vs la dernière fois`;
  const deltaTone = target.action === "deload" ? "text-warn" : delta !== null && delta > 0 ? "text-go" : "text-muted";

  if (compact) {
    return (
      <p className="text-[15px] text-muted">
        Objectif : <span className="text-ink font-semibold tnum">{hasWeight ? `${fmtKg(target.targetWeight!)} kg` : "charge propre"} × {reps}</span>
        {repsHint.note && <span className="block text-sm text-faint mt-0.5">{repsHint.note}</span>}
      </p>
    );
  }

  return (
    <div className="rounded-2xl bg-surface border border-line p-4">
      <div className="text-[15px] text-muted mb-1">Objectif du jour</div>
      {hasWeight ? (
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="type-num text-[56px] text-ink">{fmtKg(target.targetWeight!)}</span>
          <span className="text-xl text-muted">kg × {reps}</span>
        </div>
      ) : (
        <div className="type-num text-[36px] text-ink">{reps} reps</div>
      )}
      {deltaText && <p className={`text-[15px] font-medium mt-1 ${deltaTone}`}>{deltaText}</p>}
      <p className="text-sm text-faint mt-1">
        {hasWeight ? target.reason : "Première fois : trouve une charge que tu contrôles dans la plage de reps."}
      </p>
      {repsHint.note && <p className="text-sm text-muted mt-2">{repsHint.note}</p>}
    </div>
  );
}
