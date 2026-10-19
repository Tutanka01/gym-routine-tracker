import { useMemo, useState } from "react";
import { type ProgramData, type WorkoutSession } from "../lib/storage";
import { allExercises } from "../data";
import { Segmented } from "./ui";
import { VOLUME_LANDMARKS, weeklyMuscleGroupSets, getVolumeStatus, volumeStatusMeta, type VolumeStatus } from "../lib/intelligence";

const STATUS_ORDER: VolumeStatus[] = ["above-mrv", "below-mev", "mav-mrv", "mev-mav"];

const advice = (status: VolumeStatus, sets: number, mev: number, mrv: number) => {
  if (status === "above-mrv") return `${sets - mrv} série${sets - mrv > 1 ? "s" : ""} au-dessus du maximum récupérable. Allège la semaine prochaine.`;
  if (status === "below-mev") return sets === 0 ? "Pas travaillé sur cette période." : `Encore ${mev - sets} série${mev - sets > 1 ? "s" : ""} pour atteindre le minimum utile.`;
  if (status === "mav-mrv") return "Volume élevé : surveille la récupération.";
  return "Dans la zone de progression.";
};

export function VolumeDashboard({ program, sessions }: { program: ProgramData; sessions: WorkoutSession[] }) {
  const exercises = useMemo(() => allExercises(program.workouts), [program.workouts]);
  // Early in the week the current week is empty: default to last week so the view is useful.
  const [week, setWeek] = useState<"0" | "-1">(() =>
    Object.keys(weeklyMuscleGroupSets(sessions, exercises, 0)).length ? "0" : "-1",
  );
  const weeklySets = useMemo(() => weeklyMuscleGroupSets(sessions, exercises, Number(week)), [sessions, exercises, week]);

  const rows = useMemo(() =>
    Object.entries(VOLUME_LANDMARKS)
      .map(([key, lm]) => ({ key, ...lm, sets: weeklySets[key] ?? 0, status: getVolumeStatus(weeklySets[key] ?? 0, key) }))
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)),
    [weeklySets],
  );

  const inZone = rows.filter(r => r.status === "mev-mav" || r.status === "mav-mrv").length;

  return (
    <div>
      <div className="mb-4">
        <Segmented<"0" | "-1">
          label="Semaine"
          value={week}
          onChange={setWeek}
          options={[{ value: "-1", label: "Semaine dernière" }, { value: "0", label: "Cette semaine" }]}
        />
      </div>
      <p className="text-[15px] text-muted mb-1">
        Séries validées {week === "0" ? "depuis lundi" : "la semaine dernière"}, par groupe musculaire. <span className="text-ink font-medium">{inZone} sur {rows.length}</span> sont dans la zone productive.
      </p>
      <p className="text-sm text-faint mb-5">Repères de volume hebdomadaire de Renaissance Periodization (MEV, MAV, MRV).</p>

      <ul className="space-y-2">
        {rows.map(row => {
          const meta = volumeStatusMeta[row.status];
          const scale = row.mrv + 4;
          const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;
          return (
            <li key={row.key} className="rounded-2xl bg-surface border border-line p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-[17px] font-semibold text-ink">{row.label}</div>
                  <div className="flex items-center gap-1.5 text-sm text-muted mt-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} aria-hidden />
                    {meta.label}
                  </div>
                </div>
                <div className="text-right">
                  <span className="type-num text-[30px] text-ink">{row.sets}</span>
                  <span className="text-sm text-muted ml-1">séries</span>
                </div>
              </div>

              <div className="relative h-2.5 rounded-full bg-raised" aria-hidden>
                <div className="absolute inset-y-0 rounded-full bg-go/20" style={{ left: pct(row.mev), width: `calc(${pct(row.mrv)} - ${pct(row.mev)})` }} />
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct(row.sets), background: meta.color }} />
                {[row.mev, row.mav, row.mrv].map(t => (
                  <div key={t} className="absolute -top-0.5 -bottom-0.5 w-px bg-muted/60" style={{ left: pct(t) }} />
                ))}
              </div>
              <div className="relative h-4 mt-1 text-xs text-faint tnum" aria-hidden>
                {[{ v: row.mev, l: "min" }, { v: row.mrv, l: "max" }].map(t => (
                  <span key={t.l} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: pct(t.v) }}>{t.l} {t.v}</span>
                ))}
              </div>

              <p className="text-sm text-muted mt-2">{advice(row.status, row.sets, row.mev, row.mrv)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
