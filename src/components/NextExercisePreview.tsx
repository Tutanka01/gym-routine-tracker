import { ChevronRight } from "lucide-react";
import { Workout } from "../data";

function formatRest(s: number) {
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return sec > 0 ? `${m} min ${sec}s` : `${m} min`;
  }
  return `${s}s`;
}

export function NextExercisePreview({
  workout,
  currentStep,
  defaultRest,
  displayNameFor,
  onJump,
}: {
  workout: Workout;
  currentStep: number;
  defaultRest: number;
  displayNameFor: (exerciseId: string) => string;
  onJump: (step: number) => void;
}) {
  if (currentStep < 0 || currentStep >= workout.exercises.length) return null;

  const nextStep = currentStep + 1;
  const next = workout.exercises[nextStep];
  const label = next ? "SUIVANT" : workout.cooldown ? "COOLDOWN" : "TERMINER LA SEANCE";
  const title = next ? displayNameFor(next.id) : workout.cooldown ? "Retour au calme" : "Splash final";
  const meta = next
    ? `${next.sets} series · ${next.reps} reps · Repos ${formatRest(next.rest ?? defaultRest)}`
    : workout.cooldown || "Voir le recap de la seance";

  return (
    <button
      type="button"
      onClick={() => onJump(nextStep)}
      className="w-full mt-5 text-left rounded-xl bg-[var(--color-void-2)] border border-white/[0.05] px-4 py-3 active:scale-[0.99] transition"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 mb-1">{label}</div>
          <div className="font-semibold text-sm text-[#C0D0F0] truncate">{title}</div>
          <div className="text-xs text-slate-500 mt-1 truncate">{meta}</div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" />
      </div>
    </button>
  );
}

