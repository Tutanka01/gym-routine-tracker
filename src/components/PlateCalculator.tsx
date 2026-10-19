import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { calcPlatesPerSide, warmupLadder } from "../lib/intelligence";
import { fmtKg, sanitizeDecimal } from "../lib/stats";
import { FlowHeader } from "./ui";

// IWF calibrated plate colours, with height following plate diameter.
const PLATES: Record<number, { color: string; h: number; w: number; ink: string }> = {
  25:   { color: "#d93a35", h: 88, w: 15, ink: "#fff" },
  20:   { color: "#2f62d8", h: 88, w: 13, ink: "#fff" },
  15:   { color: "#e8b923", h: 88, w: 11, ink: "#141517" },
  10:   { color: "#2f9a57", h: 88, w: 10, ink: "#fff" },
  5:    { color: "#e9e7e2", h: 58, w: 9, ink: "#141517" },
  2.5:  { color: "#d93a35", h: 44, w: 8, ink: "#fff" },
  1.25: { color: "#a4a8ae", h: 36, w: 7, ink: "#141517" },
};

const BAR_WEIGHTS = [20, 15, 10] as const;
type Bar = typeof BAR_WEIGHTS[number];

export function PlateCalculator({ onClose, initialWeight = 100, inline }: { onClose: () => void; initialWeight?: number; inline?: boolean }) {
  const [targetWeight, setTargetWeight] = useState(initialWeight);
  const [draft, setDraft] = useState(String(initialWeight));
  const [barWeight, setBarWeight] = useState<Bar>(20);

  const plates = useMemo(() => calcPlatesPerSide(targetWeight, barWeight), [targetWeight, barWeight]);
  const ladder = useMemo(() => warmupLadder(targetWeight), [targetWeight]);
  const loaded = barWeight + plates.reduce((a, p) => a + p.kg * p.count * 2, 0);
  const remainder = Math.round((targetWeight - loaded) * 100) / 100;
  const sleeve = plates.flatMap(p => Array.from({ length: p.count }, () => p.kg));

  const setWeight = (w: number) => {
    const next = Math.max(0, Math.round(w * 4) / 4);
    setTargetWeight(next);
    setDraft(String(next));
  };

  const body = (
    <div className="space-y-4">
      <section className="rounded-2xl bg-surface border border-line p-4">
        <label htmlFor="plate-target" className="block text-[15px] text-muted mb-2">Charge totale visée</label>
        <div className="flex items-center gap-3">
          <button onClick={() => setWeight(targetWeight - 2.5)} aria-label="Retirer 2,5 kg" className="w-14 h-14 rounded-xl bg-raised text-ink flex items-center justify-center active:bg-line">
            <Minus className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-baseline justify-center gap-1">
            <input
              id="plate-target"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={draft.replace(".", ",")}
              onChange={e => { const v = sanitizeDecimal(e.target.value); setDraft(v); if (v !== "") setTargetWeight(Number(v)); }}
              onBlur={() => setWeight(targetWeight)}
              className="type-num w-full min-w-0 text-center bg-transparent text-[64px] text-ink outline-none"
            />
            <span className="text-lg text-muted">kg</span>
          </div>
          <button onClick={() => setWeight(targetWeight + 2.5)} aria-label="Ajouter 2,5 kg" className="w-14 h-14 rounded-xl bg-raised text-ink flex items-center justify-center active:bg-line">
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-4">
          <span id="bar-label" className="block text-sm text-muted mb-2">Barre</span>
          <div className="flex gap-2" role="radiogroup" aria-labelledby="bar-label">
            {BAR_WEIGHTS.map(bw => (
              <button
                key={bw}
                role="radio"
                aria-checked={barWeight === bw}
                onClick={() => setBarWeight(bw)}
                className={`flex-1 h-11 rounded-xl text-[15px] font-semibold ${barWeight === bw ? "bg-chalk text-on-chalk" : "bg-raised text-muted"}`}
              >
                {bw} kg
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-surface border border-line p-4">
        <h2 className="text-[17px] font-semibold text-ink mb-4">Sur chaque côté</h2>
        {targetWeight <= barWeight ? (
          <p className="text-muted">Barre seule ({barWeight} kg). Rien à charger.</p>
        ) : (
          <>
            {/* Sleeve: plates drawn from the collar outwards, sized like the real thing. */}
            <div className="flex items-center h-24 mb-4" aria-hidden>
              <div className="w-10 h-3 rounded-l bg-faint" />
              <div className="w-2 h-8 rounded-sm bg-muted" />
              {sleeve.map((kg, i) => {
                const p = PLATES[kg];
                return (
                  <div
                    key={i}
                    className="rounded-[3px] ml-[2px] flex items-center justify-center"
                    style={{ width: p.w * 1.6, height: p.h, background: p.color }}
                  />
                );
              })}
              <div className="flex-1 h-3 rounded-r bg-faint ml-[2px]" />
            </div>
            <ul className="space-y-2">
              {plates.map(p => (
                <li key={p.kg} className="flex items-center gap-3 text-[16px]">
                  <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: PLATES[p.kg]?.color }} aria-hidden />
                  <span className="flex-1 text-ink">Disque de {fmtKg(p.kg)} kg</span>
                  <span className="type-num text-xl text-ink">× {p.count}</span>
                </li>
              ))}
            </ul>
            {remainder > 0 && (
              <p className="text-sm text-warn mt-3">Impossible au gramme près : {fmtKg(loaded)} kg chargés, il manque {fmtKg(remainder)} kg.</p>
            )}
          </>
        )}
      </section>

      {targetWeight > barWeight + 10 && (
        <section className="rounded-2xl bg-surface border border-line p-4">
          <h2 className="text-[17px] font-semibold text-ink mb-1">Montée en charge</h2>
          <p className="text-sm text-faint mb-3">Séries d'échauffement avant ta première série de travail.</p>
          <ol className="divide-y divide-line">
            {ladder.map((step, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <span className="w-12 text-sm text-muted tnum">{step.pct} %</span>
                <span className="flex-1 type-num text-xl text-ink">{fmtKg(step.weight)} kg × {step.reps}</span>
                <span className="text-sm text-faint tnum text-right">
                  {calcPlatesPerSide(step.weight, barWeight).map(p => `${p.count}×${fmtKg(p.kg)}`).join(" + ") || "barre"}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-3 py-2.5">
              <span className="w-12 text-sm text-ink font-semibold">Travail</span>
              <span className="flex-1 type-num text-xl text-ink">{fmtKg(targetWeight)} kg</span>
            </li>
          </ol>
        </section>
      )}
    </div>
  );

  if (inline) return body;

  return (
    <div className="min-h-screen max-w-md mx-auto">
      <FlowHeader title="Charger la barre" onBack={onClose} closeIcon backLabel="Fermer" />
      <div className="px-4 py-5 safe-scroll">{body}</div>
    </div>
  );
}
