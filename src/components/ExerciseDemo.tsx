import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { buildSkeleton, drawDemo, lerpPose, tracePoint, GROUND, type Demo, type MuscleSpot, type Prim, type Tone } from "../lib/exerciseDemos";
import { demoFor } from "../lib/exerciseCatalog";
import { Sheet } from "./ui";

const MUSCLE_COLOR = "#ff7a45";
const OUTLINE = "#1f2124";

const TONES: Record<Tone, { fill: string; stroke: string }> = {
  body: { fill: "#e9e6df", stroke: "#e9e6df" },
  far: { fill: "#686d74", stroke: "#686d74" },
  iron: { fill: "#c3c6cb", stroke: "#c3c6cb" },
  plate: { fill: "#2b2f34", stroke: "#8d939a" },
  frame: { fill: "#25282c", stroke: "#363a40" },
  pad: { fill: "#3b4047", stroke: "#4d535b" },
  cable: { fill: "none", stroke: "#a4a8ae" },
};

export const MUSCLE_LABELS: Record<MuscleSpot, string> = {
  chest: "Pectoraux",
  back: "Grand dorsal",
  lowBack: "Lombaires",
  abs: "Abdominaux",
  glutes: "Fessiers",
  delts: "Deltoïdes",
  rearDelts: "Deltoïdes postérieurs",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quadriceps",
  hams: "Ischio-jambiers",
  calves: "Mollets",
};

// One rep: pause, effort (1.2 s), squeeze, controlled return (2 s).
const SEGMENTS = [500, 1200, 450, 2000];
const CYCLE = SEGMENTS.reduce((a, b) => a + b, 0);
const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;

type Phase = "effort" | "return";

function frameAt(ms: number): { p: number; phase: Phase } {
  let t = ms % CYCLE;
  if (t < SEGMENTS[0]) return { p: 0, phase: "return" };
  t -= SEGMENTS[0];
  if (t < SEGMENTS[1]) return { p: ease(t / SEGMENTS[1]), phase: "effort" };
  t -= SEGMENTS[1];
  if (t < SEGMENTS[2]) return { p: 1, phase: "effort" };
  t -= SEGMENTS[2];
  return { p: 1 - ease(t / SEGMENTS[3]), phase: "return" };
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Drives the rep loop with rAF, paused while off-screen. */
function useRepClock(enabled: boolean, ref: React.RefObject<Element | null>) {
  const [frame, setFrame] = useState(() => ({ p: 0, phase: "return" as Phase }));
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let visible = true;
    const start = performance.now();
    const tick = (now: number) => {
      setFrame(frameAt(now - start));
      raf = requestAnimationFrame(tick);
    };
    const observer = typeof IntersectionObserver !== "undefined" && ref.current
      ? new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !visible) raf = requestAnimationFrame(tick);
        if (!entry.isIntersecting) cancelAnimationFrame(raf);
        visible = entry.isIntersecting;
      })
      : null;
    if (observer && ref.current) observer.observe(ref.current);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); observer?.disconnect(); };
  }, [enabled, ref]);
  return frame;
}

function Shape({ prim, opacity }: { prim: Prim; opacity?: number }) {
  if (prim.k === "muscle") return null;
  const tone = TONES[prim.tone];
  switch (prim.k) {
    case "line": {
      const line = <line x1={prim.a[0]} y1={prim.a[1]} x2={prim.b[0]} y2={prim.b[1]} stroke={tone.stroke} strokeWidth={prim.w} strokeLinecap="round" opacity={opacity} />;
      if (prim.tone !== "body" || opacity !== undefined) return line;
      // A dark rim keeps limbs readable where they cross the torso.
      return (
        <>
          <line x1={prim.a[0]} y1={prim.a[1]} x2={prim.b[0]} y2={prim.b[1]} stroke={OUTLINE} strokeWidth={prim.w + 2.4} strokeLinecap="round" />
          {line}
        </>
      );
    }
    case "circle":
      return <circle cx={prim.c[0]} cy={prim.c[1]} r={prim.r} fill={tone.fill} stroke={tone.stroke} strokeWidth={prim.tone === "plate" ? 2 : 0} opacity={opacity} />;
    case "box":
      return (
        <rect
          x={-prim.w / 2} y={-prim.h / 2} width={prim.w} height={prim.h} rx={prim.rx ?? 0}
          transform={`translate(${prim.c[0]} ${prim.c[1]}) rotate(${prim.rot})`}
          fill={tone.fill} stroke={tone.stroke} strokeWidth={1.2} opacity={opacity}
        />
      );
    case "poly":
      return <polygon points={prim.pts.map(p => p.join(",")).join(" ")} fill={tone.fill} stroke={tone.stroke} strokeWidth={5} strokeLinejoin="round" opacity={opacity} />;
  }
}

function Muscles({ prims, glow, filter }: { prims: Prim[]; glow: number; filter: string }) {
  return (
    <g filter={`url(#${filter})`} opacity={0.4 + 0.6 * glow}>
      {prims.map((m, i) => m.k === "muscle" && (
        <line key={i} x1={m.a[0]} y1={m.a[1]} x2={m.b[0]} y2={m.b[1]} stroke={MUSCLE_COLOR} strokeWidth={m.w} strokeLinecap="round" />
      ))}
    </g>
  );
}

function Figure({ demo, p, ghost, filter }: { demo: Demo; p: number; ghost?: boolean; filter: string }) {
  const skel = buildSkeleton(demo, lerpPose(demo.a, demo.b, p));
  const layers = drawDemo(demo, skel, p);
  const op = ghost ? 0.18 : undefined;
  const render = (prims: Prim[]) => prims.map((prim, i) => <Shape key={i} prim={prim} opacity={op} />);
  if (ghost) return <g>{render([...layers.far, ...layers.body, ...layers.nearLeg, ...layers.nearArm])}</g>;
  return (
    <g>
      {render(layers.back)}
      {render(layers.far)}
      {render(layers.mid)}
      {render(layers.body)}
      {render(layers.nearLeg)}
      <Muscles prims={layers.coreMuscles} glow={p} filter={filter} />
      {render(layers.nearArm)}
      <Muscles prims={layers.armMuscles} glow={p} filter={filter} />
      {render(layers.front)}
    </g>
  );
}

export function ExerciseAnimation({
  demo,
  progress,
  showPhase,
  className = "",
}: {
  demo: Demo;
  /** Fixed position (0 = start, 1 = contraction) instead of the loop. */
  progress?: number;
  showPhase?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const animated = progress === undefined && !reduced;
  const frame = useRepClock(animated, ref);
  const p = progress ?? (reduced ? 1 : frame.p);
  const id = useId().replace(/:/g, "");

  const trail = useMemo(() => {
    const pts = Array.from({ length: 25 }, (_, i) => tracePoint(demo, buildSkeleton(demo, lerpPose(demo.a, demo.b, i / 24))));
    return pts.every(Boolean) ? pts.map(pt => pt!.map(n => n.toFixed(1)).join(",")).join(" ") : null;
  }, [demo]);
  const skel = buildSkeleton(demo, lerpPose(demo.a, demo.b, p));
  const marker = tracePoint(demo, skel);
  const scale = demo.scale ?? 1;

  return (
    <div ref={ref} className={className}>
      <svg viewBox="0 0 240 160" className="w-full h-auto block" role="img" aria-label={`Animation : ${demo.label}`}>
        <defs>
          <radialGradient id={`${id}-spot`} cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#2a2d32" />
            <stop offset="100%" stopColor="#1c1e21" />
          </radialGradient>
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width="240" height="160" fill={`url(#${id}-spot)`} />
        <g transform={scale === 1 ? undefined : `translate(120 80) scale(${scale}) translate(-120 -80)`}>
          <line x1="8" y1={GROUND} x2="232" y2={GROUND} stroke="#31353a" strokeWidth="1.5" />
          <ellipse cx={skel.hip[0]} cy={GROUND + 1} rx="34" ry="3" fill="#000" opacity="0.28" />
          {reduced && progress === undefined && <Figure demo={demo} p={0} ghost filter={`${id}-glow`} />}
          {trail && <polyline points={trail} fill="none" stroke="#eeece7" strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray="2 3" strokeLinecap="round" />}
          <Figure demo={demo} p={p} filter={`${id}-glow`} />
          {marker && <circle cx={marker[0]} cy={marker[1]} r="2.2" fill={MUSCLE_COLOR} />}
        </g>
      </svg>
      {showPhase && animated && (
        <div className="flex gap-1.5 mt-2" aria-hidden>
          <PhasePill active={frame.phase === "effort"} label="Effort · 1 s" />
          <PhasePill active={frame.phase === "return"} label="Retour contrôlé · 2 s" />
        </div>
      )}
    </div>
  );
}

function PhasePill({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`flex-1 text-center text-xs font-semibold rounded-lg py-1.5 transition-colors ${active ? "bg-raised text-ink" : "text-faint"}`}>
      {label}
    </span>
  );
}

/** Compact card on the exercise screen: looping animation + first cue, opens the full sheet. */
export function ExerciseDemoCard({ name, onOpen }: { name: string; onOpen: () => void }) {
  const demo = demoFor(name);
  if (!demo) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full mt-4 flex items-center gap-3 rounded-2xl bg-surface border border-line p-2 pr-3 text-left active:bg-raised transition"
    >
      <ExerciseAnimation demo={demo} className="w-32 shrink-0 rounded-xl overflow-hidden" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-faint">Technique</span>
        <span className="block text-[15px] text-ink leading-snug line-clamp-2">{demo.cues[1]}</span>
      </span>
      <ChevronRight className="w-5 h-5 text-faint shrink-0" />
    </button>
  );
}

/** Small looping thumbnail for lists. */
export function ExerciseThumb({ name, className = "" }: { name: string; className?: string }) {
  const demo = demoFor(name);
  if (!demo) return <span className={`${className} bg-raised`} aria-hidden />;
  return <ExerciseAnimation demo={demo} className={`${className} overflow-hidden`} />;
}

export function ExerciseTechniqueSheet({ name, open, onClose }: { name: string | null; open: boolean; onClose: () => void }) {
  const demo = name ? demoFor(name) : null;
  return (
    <Sheet open={open && !!demo} onClose={onClose} label={`Technique : ${name ?? ""}`} tall>
      {demo && (
        <>
          <h2 className="type-display text-[34px] text-ink mb-3">{name}</h2>
          <ExerciseAnimation demo={demo} showPhase className="rounded-2xl overflow-hidden" />
          <div className="flex flex-wrap gap-1.5 mt-4" aria-label="Muscles ciblés">
            {demo.muscles.map(m => (
              <span key={m} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-raised text-sm font-medium text-ink">
                <span className="w-2 h-2 rounded-full" style={{ background: MUSCLE_COLOR }} aria-hidden />
                {MUSCLE_LABELS[m]}
              </span>
            ))}
          </div>
          <ol className="mt-5 space-y-3 pb-2">
            {demo.cues.map((cue, i) => (
              <li key={i} className="flex gap-3">
                <span className="type-num text-[22px] text-faint w-5 shrink-0">{i + 1}</span>
                <span className="text-[16px] text-ink leading-snug">{cue}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </Sheet>
  );
}
