import { useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { storage, type ProgramData } from "../lib/storage";
import { fmtKg, fmtRelativeShort } from "../lib/stats";
import { ExerciseProgress, SessionLog } from "./History";
import { VolumeDashboard } from "./VolumeDashboard";
import { TrendChart } from "./TrendChart";
import { PageTitle, Segmented, btn } from "./ui";

export type ProgressTab = "exercises" | "sessions" | "volume" | "body";

const TABS: Array<{ value: ProgressTab; label: string }> = [
  { value: "exercises", label: "Exercices" },
  { value: "sessions", label: "Séances" },
  { value: "volume", label: "Volume" },
  { value: "body", label: "Corps" },
];

export function Progress({
  program, tab, onTabChange, onStartCheckin,
}: {
  program: ProgramData;
  tab: ProgressTab;
  onTabChange: (t: ProgressTab) => void;
  onStartCheckin: () => void;
}) {
  const [version, setVersion] = useState(0);
  const sessions = useMemo(() => storage.getSessions(), [version]);

  return (
    <div className="tab-page">
      <PageTitle>Progrès</PageTitle>
      <div className="sticky z-10 -mx-4 px-4 py-2 mb-4 bg-bg/94 backdrop-blur-md" style={{ top: "var(--safe-top)" }}>
        <Segmented label="Vue" value={tab} options={TABS} onChange={onTabChange} />
      </div>
      {tab === "exercises" && <ExerciseProgress program={program} sessions={sessions} />}
      {tab === "sessions" && <SessionLog program={program} sessions={sessions} onChanged={() => setVersion(v => v + 1)} />}
      {tab === "volume" && <VolumeDashboard program={program} sessions={sessions} />}
      {tab === "body" && <BodyProgress onStartCheckin={onStartCheckin} />}
    </div>
  );
}

function BodyProgress({ onStartCheckin }: { onStartCheckin: () => void }) {
  const checkins = useMemo(() => storage.getCheckins(), []);
  const weight = checkins.filter(c => Number(c.weight) > 0).map(c => ({ date: c.date, value: Number(c.weight) }));
  const waist = checkins.filter(c => Number(c.waist) > 0).map(c => ({ date: c.date, value: Number(c.waist) }));
  const last = checkins[checkins.length - 1];

  const delta = (pts: typeof weight) =>
    pts.length > 1 ? Math.round((pts[pts.length - 1].value - pts[0].value) * 10) / 10 : null;

  return (
    <div className="space-y-3">
      <button onClick={onStartCheckin} className={`${btn.primary} w-full`}>
        <ClipboardCheck className="w-5 h-5" /> Faire le check-in
      </button>
      {last && <p className="text-sm text-faint text-center">Dernier check-in {fmtRelativeShort(last.date).toLowerCase()}</p>}

      {[
        { title: "Poids à jeun", unit: "kg", pts: weight },
        { title: "Tour de taille", unit: "cm", pts: waist },
      ].map(m => {
        const d = delta(m.pts);
        return (
          <section key={m.title} className="rounded-2xl bg-surface border border-line p-4">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-[17px] font-semibold text-ink">{m.title}</h2>
              {d !== null && (
                <span className="text-sm text-muted tnum">
                  {d > 0 ? "+" : d < 0 ? "−" : ""}{fmtKg(Math.abs(d))} {m.unit} depuis le début
                </span>
              )}
            </div>
            <TrendChart label={m.title} unit={m.unit} points={m.pts} />
          </section>
        );
      })}
    </div>
  );
}
