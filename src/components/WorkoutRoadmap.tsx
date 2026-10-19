import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { Workout } from "../data";
import type { ExerciseLog } from "../lib/storage";
import { estimateRemainingSec } from "../lib/stats";
import { Sheet, btn } from "./ui";

export function formatRest(s: number) {
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return sec > 0 ? `${m} min ${sec}` : `${m} min`;
  }
  return `${s} s`;
}

const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
};

export function WorkoutRoadmap({
  open, workout, sessionLogs, currentStep, startedAt, defaultRest, displayNameFor, onJump, onClose, onFinish, onAbandon,
}: {
  open: boolean;
  workout: Workout;
  sessionLogs: Record<string, ExerciseLog>;
  currentStep: number;
  startedAt: string;
  defaultRest: number;
  displayNameFor: (exerciseId: string) => string;
  onJump: (step: number) => void;
  onClose: () => void;
  onFinish: () => void;
  onAbandon: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const remainingSec = estimateRemainingSec(workout, sessionLogs, Math.max(0, currentStep), defaultRest);
  const elapsedSec = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, [open]);

  const jump = (target: number) => { onJump(target); onClose(); };

  const Row = ({ step, title, sub, done, progress }: { step: number; title: string; sub?: string; done: boolean; progress?: [number, number] }) => {
    const current = currentStep === step;
    return (
      <li>
        <button
          onClick={() => jump(step)}
          aria-current={current ? "step" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition ${current ? "bg-raised" : "active:bg-raised"}`}
        >
          <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            done ? "bg-go text-on-chalk" : current ? "border-2 border-chalk" : "border-2 border-line"
          }`}>
            {done && <Check className="w-4 h-4" strokeWidth={3} />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[16px] font-semibold text-ink truncate">{title}</span>
            {sub && <span className="block text-sm text-faint truncate">{sub}</span>}
          </span>
          {progress && <span className="type-num text-lg text-muted">{progress[0]}/{progress[1]}</span>}
        </button>
      </li>
    );
  };

  return (
    <Sheet open={open} onClose={onClose} label="Plan de la séance" tall>
      <h2 className="text-xl font-bold text-ink">Plan de la séance</h2>
      <p className="text-[15px] text-muted mb-4 tnum">
        {formatDuration(elapsedSec)} écoulées, environ {formatDuration(remainingSec)} restantes
      </p>

      <ol className="space-y-0.5 mb-5">
        <Row step={-1} title="Échauffement" sub={workout.warmup} done={currentStep > -1} />
        {workout.exercises.map((ex, i) => {
          const done = (sessionLogs[ex.id]?.sets || []).filter(s => s.isComplete).length;
          return <Row key={ex.id} step={i} title={displayNameFor(ex.id)} done={done >= ex.sets} progress={[done, ex.sets]} />;
        })}
        {workout.cooldown && <Row step={workout.exercises.length} title="Retour au calme" sub={workout.cooldown} done={currentStep > workout.exercises.length} />}
      </ol>

      <div className="flex gap-2">
        <button onClick={() => { onClose(); onAbandon(); }} className={btn.quiet + " h-12 text-warn"}>Abandonner</button>
        <button onClick={() => { onFinish(); onClose(); }} className={`${btn.secondary} flex-1`}>
          Terminer la séance
        </button>
      </div>
    </Sheet>
  );
}
