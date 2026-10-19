import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Camera } from "lucide-react";
import { storage } from "../lib/storage";
import { fmtKg, fmtRelativeShort, sanitizeDecimal } from "../lib/stats";
import { FlowHeader, btn } from "./ui";

export function SundayCheckin({ onClose }: { onClose: () => void }) {
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [photosTaken, setPhotosTaken] = useState(false);
  const [done, setDone] = useState(false);

  const checkins = useMemo(() => storage.getCheckins(), []);
  const last = checkins[checkins.length - 1];
  const canSave = !!(weight || waist || photosTaken);

  const handleSave = () => {
    storage.saveCheckin({ id: Date.now().toString(), date: new Date().toISOString(), weight, waist, photosTaken });
    setDone(true);
    window.setTimeout(onClose, 1500);
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 max-w-md mx-auto">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-20 h-20 rounded-full bg-go text-on-chalk flex items-center justify-center mb-6"
        >
          <Check className="w-10 h-10" strokeWidth={3} />
        </motion.div>
        <h1 className="type-display text-[52px] text-ink mb-2">Check-in enregistré</h1>
        <p className="text-muted">Semaine {checkins.length + 1}. Retrouve l'évolution dans Progrès, onglet Corps.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto">
      <FlowHeader title="Check-in de la semaine" onBack={onClose} closeIcon backLabel="Fermer" />

      <div className="flex-1 px-4 pt-5 space-y-3">
        <p className="text-[15px] text-muted mb-2">
          Pèse-toi à jeun, après être passé aux toilettes, toujours dans les mêmes conditions. Remplis ce que tu as mesuré.
        </p>

        <Measure
          id="weight" label="Poids à jeun" unit="kg" value={weight} onChange={setWeight}
          previous={last?.weight} previousDate={last?.date}
        />
        <Measure
          id="waist" label="Tour de taille (au nombril)" unit="cm" value={waist} onChange={setWaist}
          previous={last?.waist}
        />

        <button
          role="checkbox"
          aria-checked={photosTaken}
          onClick={() => setPhotosTaken(!photosTaken)}
          className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition ${
            photosTaken ? "bg-go/10 border-go/40" : "bg-surface border-line"
          }`}
        >
          <Camera className="w-6 h-6 text-muted shrink-0" aria-hidden />
          <span className="flex-1">
            <span className="block text-[17px] font-semibold text-ink">Photos prises</span>
            <span className="block text-sm text-faint">Face, dos, profil. Même lumière, même endroit.</span>
          </span>
          <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${photosTaken ? "bg-go border-go text-on-chalk" : "border-line"}`}>
            {photosTaken && <Check className="w-4 h-4" strokeWidth={3} />}
          </span>
        </button>
      </div>

      <div className="sticky bottom-0 px-4 pt-4 safe-bottom-bar bg-gradient-to-t from-bg via-bg to-bg/0">
        <button onClick={handleSave} disabled={!canSave} className={`${btn.primary} w-full`}>
          Enregistrer le check-in
        </button>
      </div>
    </div>
  );
}

function Measure({
  id, label, unit, value, onChange, previous, previousDate,
}: {
  id: string; label: string; unit: string; value: string; onChange: (v: string) => void;
  previous?: string; previousDate?: string;
}) {
  const prev = Number(previous);
  const delta = value && prev > 0 ? Math.round((Number(value) - prev) * 10) / 10 : null;
  return (
    <div className="rounded-2xl bg-surface border border-line p-4">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <label htmlFor={id} className="text-[17px] font-semibold text-ink">{label}</label>
        {prev > 0 && (
          <span className="text-sm text-faint tnum">
            Précédent {fmtKg(prev)} {unit}{previousDate ? `, ${fmtRelativeShort(previousDate).toLowerCase()}` : ""}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value.replace(".", ",")}
          onChange={e => onChange(sanitizeDecimal(e.target.value))}
          placeholder={prev > 0 ? fmtKg(prev) : "0"}
          className="type-num bg-transparent w-full text-[56px] text-ink outline-none placeholder:text-faint/50"
        />
        <span className="text-lg text-muted">{unit}</span>
      </div>
      {delta !== null && (
        <p className="text-sm text-muted tnum mt-1">
          {delta === 0 ? "Stable" : `${delta > 0 ? "+" : "−"}${fmtKg(Math.abs(delta))} ${unit} depuis la dernière fois`}
        </p>
      )}
    </div>
  );
}
