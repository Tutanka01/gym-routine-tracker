import { Check } from "lucide-react";
import type { Exercise } from "../data";
import { Sheet } from "./ui";

export function ExerciseSwapSheet({
  isOpen, exercise, library, selectedName, onClose, onSelect,
}: {
  isOpen: boolean;
  exercise: Exercise | null;
  library: Exercise[];
  selectedName: string;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}) {
  const options = exercise
    ? [
      exercise,
      ...(exercise.alternatives || []).map((name, index) => ({
        ...exercise,
        id: `${exercise.id}-alt-${index}`,
        trackingId: `${exercise.trackingId ?? exercise.id}-alt-${index}`,
        name,
      })),
      ...library.filter(c => c.id !== exercise.id && c.muscleGroups?.some(mg => exercise.muscleGroups?.includes(mg))),
    ].filter((c, index, arr) => arr.findIndex(x => x.name === c.name) === index)
    : [];

  return (
    <Sheet open={isOpen && !!exercise} onClose={onClose} label="Remplacer l'exercice" tall>
      <h2 className="text-xl font-bold text-ink">Remplacer l'exercice</h2>
      <p className="text-[15px] text-muted mb-4">Machine prise ou gêne ? Séries, reps et repos restent les mêmes.</p>
      <ul className="space-y-1">
        {options.map((option, i) => {
          const active = option.name === selectedName;
          return (
            <li key={option.id}>
              <button
                onClick={() => { onSelect(option); onClose(); }}
                aria-pressed={active}
                className={`w-full flex items-center gap-3 rounded-xl px-4 h-14 text-left transition ${active ? "bg-raised" : "active:bg-raised"}`}
              >
                <span className="flex-1 text-[16px] font-medium text-ink">
                  {option.name}
                  {i === 0 && <span className="text-sm text-faint font-normal"> (prévu)</span>}
                </span>
                {active && <Check className="w-5 h-5 text-go" strokeWidth={3} aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
