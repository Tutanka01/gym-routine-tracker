// Single-series trend line (e1RM, body weight, waist…).
// Touch or hover scrubs a crosshair that snaps to the nearest point; arrow keys
// do the same when focused. One series → no legend; the caller's title names it.

import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { fmtKg } from "../lib/stats";

export type TrendPoint = { date: string; value: number };

const W = 320;
const PAD = { top: 14, right: 12, bottom: 22, left: 34 };

const niceStep = (range: number) => {
  const raw = range / 3;
  const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export function TrendChart({
  points,
  unit,
  height = 132,
  label,
}: {
  points: TrendPoint[];
  unit: string;
  height?: number;
  label: string;
}) {
  const gradId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (!points.length) return null;
    const values = points.map(p => p.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) { min -= 1; max += 1; }
    const step = niceStep(max - min);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const innerW = W - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - ((v - lo) / (hi - lo)) * innerH;
    const ticks: number[] = [];
    for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
    const xy = points.map((p, i) => [x(i), y(p.value)] as const);
    const line = xy.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
    const base = PAD.top + innerH;
    const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${base} L${xy[0][0].toFixed(1)},${base} Z`;
    return { xy, line, area, ticks, y, base };
  }, [points, height]);

  if (!geo) {
    return (
      <div className="h-24 flex items-center justify-center text-sm text-faint rounded-xl border border-dashed border-line">
        Pas encore de données
      </div>
    );
  }

  const nearest = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const sx = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    geo.xy.forEach(([px], i) => { if (Math.abs(px - sx) < Math.abs(geo.xy[best][0] - sx)) best = i; });
    return best;
  };

  const onPointer = (e: PointerEvent<SVGSVGElement>) => setHover(nearest(e.clientX));
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const cur = hover ?? points.length - 1;
    setHover(Math.max(0, Math.min(points.length - 1, cur + (e.key === "ArrowRight" ? 1 : -1))));
  };

  const last = geo.xy[geo.xy.length - 1];
  const active = hover !== null ? points[hover] : null;
  const activeXY = hover !== null ? geo.xy[hover] : null;

  const shown = active ?? points[points.length - 1];

  return (
    <figure className="m-0">
      <figcaption className="flex items-baseline justify-between gap-3 mb-1" aria-live="polite">
        <span className="text-sm text-faint">{active ? shortDate(shown.date) : "Dernière mesure"}</span>
        <span>
          <span className="type-num text-xl text-ink">{fmtKg(shown.value)}</span>
          <span className="text-sm text-muted ml-1">{unit}</span>
        </span>
      </figcaption>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`${label} : de ${fmtKg(points[0].value)} à ${fmtKg(points[points.length - 1].value)} ${unit} sur ${points.length} mesures`}
        tabIndex={0}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        className="block touch-pan-y outline-none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-chalk)" stopOpacity="0.12" />
            <stop offset="1" stopColor="var(--color-chalk)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {geo.ticks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={geo.y(t)} y2={geo.y(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={PAD.left - 6} y={geo.y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-faint)" className="tnum">
              {fmtKg(t)}
            </text>
          </g>
        ))}

        <text x={PAD.left} y={height - 4} fontSize="11" fill="var(--color-faint)">{shortDate(points[0].date)}</text>
        {points.length > 1 && (
          <text x={W - PAD.right} y={height - 4} fontSize="11" textAnchor="end" fill="var(--color-faint)">
            {shortDate(points[points.length - 1].date)}
          </text>
        )}

        <path d={geo.area} fill={`url(#${gradId})`} />
        <path d={geo.line} fill="none" stroke="var(--color-chalk)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {activeXY && (
          <line x1={activeXY[0]} x2={activeXY[0]} y1={PAD.top - 6} y2={geo.base} stroke="var(--color-muted)" strokeWidth="1" />
        )}
        <circle
          cx={(activeXY ?? last)[0]}
          cy={(activeXY ?? last)[1]}
          r="4.5"
          fill="var(--color-chalk)"
          stroke="var(--color-surface)"
          strokeWidth="2"
        />
      </svg>
    </figure>
  );
}
