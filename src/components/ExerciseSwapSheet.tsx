import { Check, Shuffle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Exercise } from "../data";

export function ExerciseSwapSheet({
  isOpen,
  exercise,
  library,
  selectedName,
  onClose,
  onSelect,
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
      ...library.filter(candidate => (
        candidate.id !== exercise.id
        && candidate.muscleGroups?.some(mg => exercise.muscleGroups?.includes(mg))
      )),
      ...(exercise.alternatives || []).map((name, index) => ({
        ...exercise,
        id: `${exercise.id}-alt-${index}`,
        trackingId: `${exercise.trackingId ?? exercise.id}-alt-${index}`,
        name,
      })),
    ].filter((candidate, index, arr) => arr.findIndex(x => x.name === candidate.name) === index)
    : [];

  return (
    <AnimatePresence>
      {isOpen && exercise && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            onClick={e => e.stopPropagation()}
            className="w-full bg-[var(--color-void-1)] border-t border-white/[0.07] rounded-t-3xl px-5 pb-10 pt-5"
          >
            <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />
            <div className="flex items-center gap-2 text-[var(--color-signal)] mb-2">
              <Shuffle className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em]">Swap exercice</span>
            </div>
            <p className="text-slate-500 text-sm mb-5 leading-relaxed">
              Les series, reps et repos restent identiques pour garder la seance lisible.
            </p>
            <div className="space-y-2">
              {options.map(option => {
                const active = option.name === selectedName;
                return (
                  <button
                    key={option.id}
                    onClick={() => { onSelect(option); onClose(); }}
                    className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left active:scale-[0.99] transition ${
                      active
                        ? "bg-signal-soft border-signal-soft text-[var(--color-signal)]"
                        : "bg-[var(--color-void-2)] border-white/[0.06] text-[#C0D0F0]"
                    }`}
                  >
                    <span className="flex-1 text-sm font-semibold">{option.name}</span>
                    {active && <Check className="w-4 h-4" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
