// Animated technique demos.
// Each exercise is a small 2D rig posed between two keyframes (A = start/stretch, B = contraction).
// The rig is pure geometry: `drawDemo` turns a pose into flat primitives the SVG component renders.

export type Vec = [number, number];

export type Tone = 'body' | 'far' | 'iron' | 'plate' | 'frame' | 'pad' | 'cable';

export type Prim =
  | { k: 'line'; a: Vec; b: Vec; w: number; tone: Tone }
  | { k: 'circle'; c: Vec; r: number; tone: Tone }
  | { k: 'box'; c: Vec; w: number; h: number; rot: number; tone: Tone; rx?: number }
  | { k: 'poly'; pts: Vec[]; tone: Tone }
  | { k: 'muscle'; a: Vec; b: Vec; w: number };

type Limb = [number, number];
type Leg = [number, number, number];

/**
 * Angles are in degrees: 0 points down, 90 points forward (screen right), 180 up, -90 back.
 * In the front view, `arm`/`leg` describe the screen-right limbs; `arm2`/`leg2` the mirrored ones.
 */
export type Pose = {
  hip?: Vec;
  torso: number;
  head?: number;
  arm: Limb;
  arm2?: Limb;
  leg: Leg;
  leg2?: Leg;
  /** Absolute IK targets: the limb bends to reach them. */
  hand?: Vec;
  hand2?: Vec;
  ankle?: Vec;
  ankle2?: Vec;
  /** Toe target: the foot keeps its angle, the knee solves the rest. */
  toe?: Vec;
  /** Projected length of upper arms / thighs (foreshortening, negative = pointing the other way). */
  uScale?: number;
  tScale?: number;
};

type Joint = 'hip' | 'shoulder' | 'hand' | 'ankle' | 'toe' | 'knee';
export type TracePoint = Joint | 'bar';
type Anchor = 'hands' | 'back' | 'hip';
type Bend = 1 | -1;

type Prop =
  | { t: 'barbell'; at: Anchor; r: number }
  | { t: 'dumbbell'; end?: boolean }
  | { t: 'cable'; pulley: Vec; column: number; handle: 'rope' | 'grip' }
  | { t: 'box'; x: number; y: number; w: number; h: number; rot?: number; tone?: 'frame' | 'pad' }
  | { t: 'bar'; y: number; x1: number; x2: number }
  | { t: 'roller'; side: 'front' | 'back'; pivot?: Vec }
  | { t: 'kneePad' }
  | { t: 'yoke'; column: number }
  | { t: 'sled'; rail: [Vec, Vec] }
  | { t: 'wheel' }
  | { t: 'armPads' };

export type MuscleSpot =
  | 'chest' | 'back' | 'lowBack' | 'abs' | 'glutes' | 'delts' | 'rearDelts'
  | 'biceps' | 'triceps' | 'quads' | 'hams' | 'calves';

export type Demo = {
  key: string;
  view: 'side' | 'front';
  a: Pose;
  b: Pose;
  pin?: { joint: Joint; at: Vec };
  props?: Prop[];
  /** Hands follow the barbell anchor (squat, hip thrust). */
  grip?: Bend;
  bend?: { arm?: Bend; arm2?: Bend; leg?: Bend; leg2?: Bend };
  muscles: MuscleSpot[];
  trace?: TracePoint;
  scale?: number;
  label: string;
  cues: [string, string, string];
};

// ── Rig ─────────────────────────────────────────────────────────────────────────

const L = { torso: 40, neck: 13, head: 8.5, uArm: 24, fArm: 22, thigh: 30, shin: 29, foot: 11 };
const W = { torso: 13, uArm: 7, fArm: 6, thigh: 10, shin: 7.5, foot: 5 };
export const GROUND = 146;
const DEFAULT_HIP: Vec = [120, 84];

const rad = (deg: number) => (deg * Math.PI) / 180;
const dir = (deg: number): Vec => [Math.sin(rad(deg)), Math.cos(rad(deg))];
const add = (p: Vec, v: Vec, s = 1): Vec => [p[0] + v[0] * s, p[1] + v[1] * s];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const len = (v: Vec) => Math.hypot(v[0], v[1]);
const unit = (v: Vec): Vec => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
const mirror = (v: Vec): Vec => [-v[0], v[1]];
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixVec = (a: Vec, b: Vec, t: number): Vec => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
/** Normal on the anatomical front of a limb pointing away from its root. */
const frontOfLimb = (d: Vec): Vec => [d[1], -d[0]];

/** Two-bone IK: returns the middle joint and the (reach-clamped) end point. */
function solve(root: Vec, target: Vec, a: number, b: number, bend: Bend): [Vec, Vec] {
  const delta = sub(target, root);
  const d = Math.min(Math.max(len(delta), Math.abs(a - b) + 0.01), a + b - 0.01);
  const base = Math.atan2(delta[1], delta[0]);
  const cos = (a * a + d * d - b * b) / (2 * a * d);
  const ang = base + bend * Math.acos(Math.max(-1, Math.min(1, cos)));
  return [[root[0] + a * Math.cos(ang), root[1] + a * Math.sin(ang)], [root[0] + d * Math.cos(base), root[1] + d * Math.sin(base)]];
}

type Resolved = Required<Omit<Pose, 'hand' | 'hand2' | 'ankle' | 'ankle2' | 'toe'>> & Pick<Pose, 'hand' | 'hand2' | 'ankle' | 'ankle2' | 'toe'>;

const resolve = (p: Pose): Resolved => ({
  ...p,
  hip: p.hip ?? DEFAULT_HIP,
  head: p.head ?? p.torso,
  arm2: p.arm2 ?? p.arm,
  leg2: p.leg2 ?? p.leg,
  uScale: p.uScale ?? 1,
  tScale: p.tScale ?? 1,
});

const mixOpt = (a: Vec | undefined, b: Vec | undefined, t: number) => (a && b ? mixVec(a, b, t) : a ?? b);

export function lerpPose(pa: Pose, pb: Pose, t: number): Resolved {
  const a = resolve(pa);
  const b = resolve(pb);
  const n = (x: number, y: number) => mix(x, y, t);
  return {
    hip: mixVec(a.hip, b.hip, t),
    torso: n(a.torso, b.torso),
    head: n(a.head, b.head),
    arm: [n(a.arm[0], b.arm[0]), n(a.arm[1], b.arm[1])],
    arm2: [n(a.arm2[0], b.arm2[0]), n(a.arm2[1], b.arm2[1])],
    leg: [n(a.leg[0], b.leg[0]), n(a.leg[1], b.leg[1]), n(a.leg[2], b.leg[2])],
    leg2: [n(a.leg2[0], b.leg2[0]), n(a.leg2[1], b.leg2[1]), n(a.leg2[2], b.leg2[2])],
    uScale: n(a.uScale, b.uScale),
    tScale: n(a.tScale, b.tScale),
    hand: mixOpt(a.hand, b.hand, t),
    hand2: mixOpt(a.hand2, b.hand2, t),
    ankle: mixOpt(a.ankle, b.ankle, t),
    ankle2: mixOpt(a.ankle2, b.ankle2, t),
    toe: mixOpt(a.toe, b.toe, t),
  };
}

type Side = { shoulder: Vec; elbow: Vec; hand: Vec; hip: Vec; knee: Vec; ankle: Vec; toe: Vec; heel: Vec };
export type Skeleton = { hip: Vec; shoulder: Vec; head: Vec; near: Side; far: Side; torsoDir: Vec };

const FAR_OFFSET: Vec = [-2.5, -1.5];

export function buildSkeleton(demo: Demo, pose: Resolved): Skeleton {
  const front = demo.view === 'front';
  const hip = pose.hip;
  const torsoDir = dir(pose.torso);
  const shoulder = add(hip, torsoDir, L.torso);
  const head = add(shoulder, dir(pose.head), L.neck);
  const flip = (v: Vec, mirrored: boolean) => (mirrored ? mirror(v) : v);

  const limb = (mirrored: boolean, arm: Limb, leg: Leg): Side => {
    const sh = front ? add(shoulder, [mirrored ? -14 : 14, 2]) : mirrored ? add(shoulder, FAR_OFFSET) : shoulder;
    const hp = front ? add(hip, [mirrored ? -7 : 7, 0]) : mirrored ? add(hip, FAR_OFFSET) : hip;
    const elbow = add(sh, flip(dir(arm[0]), mirrored), L.uArm * pose.uScale);
    const hand = add(elbow, flip(dir(arm[1]), mirrored), L.fArm);
    const knee = add(hp, flip(dir(leg[0]), mirrored), L.thigh * pose.tScale);
    const ankle = add(knee, flip(dir(leg[1]), mirrored), L.shin);
    const footDir = flip(dir(leg[2]), mirrored);
    const footLen = front ? L.foot * 0.55 : L.foot;
    return { shoulder: sh, elbow, hand, hip: hp, knee, ankle, toe: add(ankle, footDir, footLen), heel: add(ankle, footDir, -3) };
  };

  // In the side view the far limbs share the near limbs' joints unless overridden.
  const near = limb(false, pose.arm, pose.leg);
  const far = limb(!front ? false : true, pose.arm2, pose.leg2);
  if (!front) {
    for (const key of Object.keys(far) as Array<keyof Side>) far[key] = add(far[key], FAR_OFFSET);
  }

  const skel: Skeleton = { hip, shoulder, head, near, far, torsoDir };

  if (demo.pin) {
    const current = demo.pin.joint === 'hip' ? hip : demo.pin.joint === 'shoulder' ? shoulder : near[demo.pin.joint];
    translate(skel, sub(demo.pin.at, current));
  }

  // IK passes run on final (pinned) coordinates.
  const bend = demo.bend ?? {};
  const ikArm = (side: Side, target: Vec | undefined, b: Bend) => {
    if (!target) return;
    [side.elbow, side.hand] = solve(side.shoulder, target, L.uArm, L.fArm, b);
  };
  const ikLeg = (side: Side, target: Vec | undefined, footDeg: number, b: Bend, mirrored: boolean) => {
    if (!target) return;
    [side.knee, side.ankle] = solve(side.hip, target, L.thigh, L.shin, b);
    const footDir = mirrored ? mirror(dir(footDeg)) : dir(footDeg);
    side.toe = add(side.ankle, footDir, front ? L.foot * 0.55 : L.foot);
    side.heel = add(side.ankle, footDir, -3);
  };
  ikArm(skel.near, pose.hand, bend.arm ?? 1);
  ikArm(skel.far, pose.hand2 ?? (!front && pose.hand ? add(pose.hand, FAR_OFFSET) : undefined), bend.arm2 ?? bend.arm ?? 1);
  if (pose.toe) {
    const ankleTarget = add(pose.toe, dir(pose.leg[2]), -L.foot);
    ikLeg(skel.near, ankleTarget, pose.leg[2], bend.leg ?? -1, false);
    if (!front && !pose.ankle2) ikLeg(skel.far, add(ankleTarget, FAR_OFFSET), pose.leg[2], bend.leg ?? -1, false);
  }
  ikLeg(skel.near, pose.ankle, pose.leg[2], bend.leg ?? -1, false);
  // Without its own angles, the far leg mirrors the near leg's IK target.
  const farFollows = !front && !demo.a.leg2 && pose.ankle;
  ikLeg(skel.far, pose.ankle2 ?? (farFollows ? add(pose.ankle!, FAR_OFFSET) : undefined), pose.leg2[2], bend.leg2 ?? bend.leg ?? -1, front);

  if (demo.grip) {
    const bar = anchorPoint(skel, 'hands', demo);
    ikArm(skel.near, bar, demo.grip);
    ikArm(skel.far, add(bar, FAR_OFFSET), demo.grip);
  }
  return skel;
}

function translate(skel: Skeleton, d: Vec) {
  skel.hip = add(skel.hip, d);
  skel.shoulder = add(skel.shoulder, d);
  skel.head = add(skel.head, d);
  for (const side of [skel.near, skel.far]) {
    for (const key of Object.keys(side) as Array<keyof Side>) side[key] = add(side[key], d);
  }
}

const torsoFront = (s: Skeleton): Vec => [-s.torsoDir[1], s.torsoDir[0]];

function barbellAnchor(demo: Demo): Anchor {
  const bar = demo.props?.find(p => p.t === 'barbell');
  return bar && bar.t === 'barbell' ? bar.at : 'hands';
}

function anchorPoint(s: Skeleton, at: Anchor, demo: Demo): Vec {
  const kind = at === 'hands' ? barbellAnchor(demo) : at;
  if (kind === 'back') return add(add(s.shoulder, torsoFront(s), -6.5), s.torsoDir, -2);
  if (kind === 'hip') return add(s.hip, torsoFront(s), 9);
  return demo.view === 'front' ? mixVec(s.near.hand, s.far.hand, 0.5) : s.near.hand;
}

export function tracePoint(demo: Demo, s: Skeleton): Vec | null {
  const t = demo.trace;
  if (!t) return null;
  if (t === 'bar') return anchorPoint(s, 'hands', demo);
  if (t === 'hip') return s.hip;
  if (t === 'shoulder') return s.shoulder;
  return s.near[t];
}

// ── Drawing ─────────────────────────────────────────────────────────────────────

const seg = (a: Vec, b: Vec, w: number, tone: Tone): Prim => ({ k: 'line', a, b, w, tone });

function limbPrims(side: Side, tone: Tone, part: 'arm' | 'leg', front: boolean): Prim[] {
  if (part === 'leg') {
    return [
      seg(side.hip, side.knee, W.thigh, tone),
      seg(side.knee, side.ankle, W.shin, tone),
      seg(front ? side.ankle : side.heel, side.toe, W.foot, tone),
    ];
  }
  return [seg(side.shoulder, side.elbow, W.uArm, tone), seg(side.elbow, side.hand, W.fArm, tone)];
}

const partial = (a: Vec, b: Vec, t0: number, t1: number, offset: Vec, o: number): [Vec, Vec] =>
  [add(mixVec(a, b, t0), offset, o), add(mixVec(a, b, t1), offset, o)];

function musclePrims(spot: MuscleSpot, s: Skeleton, demo: Demo): Prim[] {
  const m = (pair: [Vec, Vec], w: number): Prim => ({ k: 'muscle', a: pair[0], b: pair[1], w });
  const sides = demo.view === 'front' ? [s.near, s.far] : [s.near];
  const limbs = (from: keyof Side, to: keyof Side, t0: number, t1: number, back: boolean, off: number, w: number) =>
    sides.map(side => {
      const d = unit(sub(side[to], side[from]));
      const n = demo.view === 'front' ? ([0, 0] as Vec) : frontOfLimb(d);
      return m(partial(side[from], side[to], t0, t1, n, back ? -off : off), w);
    });

  if (demo.view === 'front') {
    const c = s.shoulder;
    switch (spot) {
      case 'chest': return [m([add(c, [-11, 9]), add(c, [-3, 9])], 8), m([add(c, [3, 9]), add(c, [11, 9])], 8)];
      case 'abs': return [m([add(c, [0, 18]), add(c, [0, 32])], 8)];
      case 'back': return [m([add(c, [-12, 8]), add(c, [-8, 26])], 6), m([add(c, [12, 8]), add(c, [8, 26])], 6)];
      case 'delts':
      case 'rearDelts': return sides.map(side => m([side.shoulder, add(side.shoulder, unit(sub(side.elbow, side.shoulder)), 5)], 9));
      default: break;
    }
  }

  const tf = torsoFront(s);
  const td = s.torsoDir;
  switch (spot) {
    case 'chest': return [m(partial(s.hip, s.shoulder, 0.58, 0.9, tf, 3.2), 7)];
    case 'back': return [m(partial(s.hip, s.shoulder, 0.4, 0.92, tf, -3.4), 7.5)];
    case 'lowBack': return [m(partial(s.hip, s.shoulder, 0.08, 0.42, tf, -3.4), 6)];
    case 'abs': return [m(partial(s.hip, s.shoulder, 0.1, 0.52, tf, 3.2), 6.5)];
    case 'glutes': return [m([add(add(s.hip, tf, -4), td, -1), add(add(s.hip, tf, -4.5), td, 3)], 10)];
    case 'delts': return [m([s.shoulder, add(s.shoulder, unit(sub(s.near.elbow, s.shoulder)), 5)], 9)];
    case 'rearDelts': return [m([add(s.shoulder, tf, -2.5), add(add(s.shoulder, tf, -3), td, -3)], 8)];
    case 'biceps': return limbs('shoulder', 'elbow', 0.25, 0.85, false, 1.4, 5);
    case 'triceps': return limbs('shoulder', 'elbow', 0.2, 0.85, true, 1.4, 5);
    case 'quads': return limbs('hip', 'knee', 0.18, 0.85, false, 2.2, 7);
    case 'hams': return limbs('hip', 'knee', 0.18, 0.85, true, 2.2, 7);
    case 'calves': return limbs('knee', 'ankle', 0.1, 0.55, true, 1.8, 6.5);
  }
}

function dumbbell(at: Vec, end: boolean, tone: Tone): Prim[] {
  if (end) return [{ k: 'circle', c: at, r: 6.5, tone: 'plate' }, { k: 'circle', c: at, r: 2, tone }];
  return [
    seg(add(at, [-8, 0]), add(at, [8, 0]), 3, tone),
    { k: 'box', c: add(at, [-8, 0]), w: 5, h: 11, rot: 0, tone: 'plate', rx: 1.5 },
    { k: 'box', c: add(at, [8, 0]), w: 5, h: 11, rot: 0, tone: 'plate', rx: 1.5 },
  ];
}

function propPrims(prop: Prop, s: Skeleton, demo: Demo, progress: number): { back: Prim[]; mid: Prim[]; front: Prim[] } {
  const out = { back: [] as Prim[], mid: [] as Prim[], front: [] as Prim[] };
  const isFront = demo.view === 'front';
  switch (prop.t) {
    case 'box': {
      out.back.push({ k: 'box', c: [prop.x + prop.w / 2, prop.y + prop.h / 2], w: prop.w, h: prop.h, rot: prop.rot ?? 0, tone: prop.tone ?? 'pad', rx: 2.5 });
      break;
    }
    case 'bar':
      out.back.push(seg([prop.x1, prop.y], [prop.x2, prop.y], 4, 'iron'));
      out.back.push(seg([prop.x1, prop.y], [prop.x1, 0], 5, 'frame'), seg([prop.x2, prop.y], [prop.x2, 0], 5, 'frame'));
      break;
    case 'barbell': {
      const c = anchorPoint(s, prop.at, demo);
      if (isFront) {
        const a = add(s.far.hand, [-34, 0]);
        const b = add(s.near.hand, [34, 0]);
        out.front.push(seg(a, b, 3, 'iron'));
        out.front.push({ k: 'box', c: add(a, [6, 0]), w: 6, h: prop.r * 2, rot: 0, tone: 'plate', rx: 2 });
        out.front.push({ k: 'box', c: add(b, [-6, 0]), w: 6, h: prop.r * 2, rot: 0, tone: 'plate', rx: 2 });
      } else {
        out.mid.push({ k: 'circle', c, r: prop.r, tone: 'plate' }, { k: 'circle', c, r: 2.6, tone: 'iron' });
      }
      break;
    }
    case 'dumbbell':
      out.front.push(...dumbbell(s.near.hand, !!prop.end, 'iron'));
      (isFront ? out.front : out.back).push(...dumbbell(s.far.hand, !!prop.end, 'iron'));
      break;
    case 'cable': {
      const col = prop.column;
      out.back.push({ k: 'box', c: [col + 7, GROUND / 2], w: 14, h: GROUND, rot: 0, tone: 'frame', rx: 2 });
      if (Math.abs(prop.pulley[0] - (col + 7)) > 9) out.back.push(seg([col + 7, prop.pulley[1]], prop.pulley, 5, 'frame'));
      // The stack rises as the cable is pulled out.
      const hand = s.near.hand;
      // The top plates of the stack rise with the effort.
      for (let i = 0; i < 4; i++) {
        const y = GROUND - 4 - i * 6 - (i >= 2 ? progress * 16 : 0);
        out.back.push({ k: 'box', c: [col + 7, y], w: 11, h: 5, rot: 0, tone: 'plate', rx: 1 });
      }
      out.front.push({ k: 'circle', c: prop.pulley, r: 3.5, tone: 'iron' });
      out.front.push(seg(prop.pulley, hand, 1.6, 'cable'));
      if (prop.handle === 'rope') {
        const d = unit(sub(hand, prop.pulley));
        out.front.push(seg(hand, add(add(hand, d, 6), [d[1], -d[0]], 3), 2.6, 'cable'), seg(hand, add(add(hand, d, 6), [-d[1], d[0]], 3), 2.6, 'cable'));
      } else {
        out.front.push({ k: 'circle', c: hand, r: 3, tone: 'iron' });
      }
      break;
    }
    case 'roller': {
      const d = unit(sub(s.near.ankle, s.near.knee));
      const n = frontOfLimb(d);
      const c = add(add(s.near.ankle, d, -4), n, prop.side === 'front' ? 7.5 : -7.5);
      if (prop.pivot) out.back.push(seg(prop.pivot, c, 5, 'frame'), { k: 'circle', c: prop.pivot, r: 4, tone: 'iron' });
      out.front.push({ k: 'circle', c, r: 5.5, tone: 'pad' });
      break;
    }
    case 'kneePad': {
      const c = add(s.near.knee, [-3, -10]);
      out.front.push({ k: 'box', c, w: 18, h: 7, rot: 0, tone: 'pad', rx: 3 });
      out.back.push(seg(add(c, [8, 0]), [c[0] + 16, GROUND], 4, 'frame'));
      break;
    }
    case 'yoke': {
      // Shoulder pads ride a carriage on a fixed column behind the lifter.
      const c = add(s.shoulder, [2, -6]);
      out.back.push({ k: 'box', c: [prop.column, 80], w: 9, h: 132, rot: 0, tone: 'frame', rx: 2 });
      out.back.push(seg([prop.column, c[1]], add(c, [-10, 0]), 5, 'frame'), { k: 'box', c: [prop.column, c[1]], w: 13, h: 12, rot: 0, tone: 'pad', rx: 2 });
      out.front.push({ k: 'box', c, w: 20, h: 7, rot: 0, tone: 'pad', rx: 3 });
      break;
    }
    case 'sled': {
      const [r0, r1] = prop.rail;
      const along = unit(sub(r1, r0));
      const across: Vec = [along[1], -along[0]];
      out.back.push(seg(r0, r1, 5, 'frame'));
      const plateC = add(s.near.ankle, along, 6);
      out.back.push({ k: 'circle', c: add(add(plateC, along, 9), across, 14), r: 11, tone: 'plate' });
      out.front.push(seg(add(plateC, across, -10), add(plateC, across, 20), 5, 'pad'));
      break;
    }
    case 'wheel':
      out.front.push({ k: 'circle', c: [s.near.hand[0], GROUND - 9], r: 9, tone: 'plate' }, { k: 'circle', c: [s.near.hand[0], GROUND - 9], r: 2.5, tone: 'iron' });
      break;
    case 'armPads':
      for (const side of [s.near, s.far]) out.mid.push(seg(add(side.elbow, [0, 4]), add(side.hand, [0, 2]), 9, 'pad'));
      break;
  }
  return out;
}

const ARM_SPOTS: MuscleSpot[] = ['delts', 'biceps', 'triceps'];

/** Primitives for one frame, grouped in paint order (far limbs behind, props in front). */
export function drawDemo(demo: Demo, s: Skeleton, progress: number) {
  const front = demo.view === 'front';
  const props = (demo.props ?? []).map(p => propPrims(p, s, demo, progress));
  const muscles = (spots: MuscleSpot[]) => spots.flatMap(m => musclePrims(m, s, demo));

  const body: Prim[] = [];
  if (front) {
    const sl = s.far.shoulder, sr = s.near.shoulder, hl = add(s.far.hip, [-1.5, 0]), hr = add(s.near.hip, [1.5, 0]);
    body.push({ k: 'poly', pts: [sl, sr, add(hr, [0, 4]), add(hl, [0, 4])], tone: 'body' });
    body.push(seg(s.shoulder, add(s.shoulder, dir(180), 5), 6, 'body'));
  } else {
    body.push(seg(s.hip, s.shoulder, W.torso, 'body'));
    body.push(seg(s.shoulder, add(s.shoulder, sub(s.head, s.shoulder), 0.45), 6, 'body'));
  }
  body.push({ k: 'circle', c: s.head, r: L.head, tone: 'body' });

  return {
    back: props.flatMap(p => p.back),
    far: [...limbPrims(s.far, front ? 'body' : 'far', 'leg', front), ...limbPrims(s.far, front ? 'body' : 'far', 'arm', front)],
    mid: props.flatMap(p => p.mid),
    body,
    nearLeg: limbPrims(s.near, 'body', 'leg', front),
    coreMuscles: muscles(demo.muscles.filter(m => !ARM_SPOTS.includes(m))),
    nearArm: limbPrims(s.near, 'body', 'arm', front),
    armMuscles: muscles(demo.muscles.filter(m => ARM_SPOTS.includes(m))),
    front: props.flatMap(p => p.front),
  };
}
