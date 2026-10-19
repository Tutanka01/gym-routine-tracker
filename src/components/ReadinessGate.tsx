import { useState } from "react";
import { motion } from "motion/react";
import { readinessFactor, readinessLabel } from "../lib/intelligence";
import { btn } from "./ui";

function Scale({
  id, label, low, high, value, onChange,
}: {
  id: string; label: string; low: string; high: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <fieldset>
      <legend id={id} className="text-[17px] font-semibold text-ink mb-3">{label}</legend>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-labelledby={id}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={`h-14 rounded-xl type-num text-2xl transition ${
              value === n ? "bg-chalk text-on-chalk" : n < value ? "bg-raised text-ink" : "bg-surface border border-line text-faint"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-sm text-faint mt-1.5" aria-hidden>
        <span>{low}</span><span>{high}</span>
      </div>
    </fieldset>
  );
}

export function ReadinessGate({ onStart, onSkip }: { onStart: (sleep: number, energy: number) => void; onSkip: () => void }) {
  const [sleep, setSleep] = useState(3);
  const [energy, setEnergy] = useState(3);

  const factor = readinessFactor(sleep, energy);
  const label = readinessLabel(sleep, energy);
  const tone = factor <= 0.9 ? "text-warn" : factor < 1 ? "text-pr" : "text-go";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-bg overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="readiness-title"
    >
      <div className="max-w-md mx-auto min-h-full flex flex-col px-5 safe-header">
        <div className="flex justify-end">
          <button onClick={onSkip} className={btn.quiet}>Passer</button>
        </div>
        <h1 id="readiness-title" className="type-display text-[52px] text-ink mt-4 mb-2">Comment tu te sens ?</h1>
        <p className="text-[15px] text-muted mb-8">Deux réponses pour ajuster les charges du jour. Sois honnête, c'est pour toi.</p>

        <div className="space-y-7">
          <Scale id="sleep" label="Sommeil cette nuit" low="Très mauvais" high="Excellent" value={sleep} onChange={setSleep} />
          <Scale id="energy" label="Énergie maintenant" low="À plat" high="Au top" value={energy} onChange={setEnergy} />
        </div>

        <div className="mt-8 rounded-2xl bg-surface border border-line p-4" aria-live="polite">
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] text-muted">Forme du jour</span>
            <span className={`text-[17px] font-semibold ${tone}`}>{label}</span>
          </div>
          <p className="text-sm text-muted mt-1">
            {factor < 1
              ? `Charges cibles réduites d'environ ${Math.round((1 - Math.max(0.95, factor)) * 100)} % et une rep de marge en plus. Si ça se dégrade, coupe une série.`
              : "Charges normales. Bonne séance."}
          </p>
        </div>

        <div className="mt-auto pt-6 safe-bottom-bar">
          <button onClick={() => onStart(sleep, energy)} className={`${btn.primary} w-full`}>Commencer</button>
        </div>
      </div>
    </motion.div>
  );
}
