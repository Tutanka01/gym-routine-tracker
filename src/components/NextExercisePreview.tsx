import { ChevronRight } from "lucide-react";
import type { Workout } from "../data";
import { formatRest } from "./WorkoutRoadmap";

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
  const title = next ? displayNameFor(next.id) : workout.cooldown ? "Retour au calme" : "Récapitulatif";
  const meta = next
    ? `${next.sets} × ${next.reps.replace("-", "–")}, repos ${formatRest(next.rest ?? defaultRest)}`
    : workout.cooldown || "Vérifier et enregistrer la séance";

  return (
    <button
      type="button"
      onClick={() => onJump(nextStep)}
      className="w-full mt-6 text-left rounded-2xl border border-line px-4 py-3.5 flex items-center gap-3 active:bg-surface transition"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm text-faint">Ensuite</div>
        <div className="text-[17px] font-semibold text-ink truncate">{title}</div>
        <div className="text-sm text-muted truncate">{meta}</div>
      </div>
      <ChevronRight className="w-5 h-5 text-faint shrink-0" />
    </button>
  );
}
