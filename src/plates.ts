// Plate reconstruction: where a plate was at a given age (millions of years ago).
//
// Follows GPlates' rotation model: each plate has "total reconstruction poles"
// relative to another (fixed) plate at listed ages. A plate's rotation at any
// age is found by interpolating between the two nearest poles (quaternion
// slerp) and chaining through its fixed plates down to the anchor (plate 0).
// Rotating a present-day point by that quaternion gives its past position.

/** Quaternion [w, x, y, z]. */
export type Quat = [number, number, number, number];

/** [age Ma, pole lat, pole lon, angle deg] */
type Pole = [number, number, number, number];
interface Sequence {
  fixed: number;
  poles: Pole[];
}
export type RotationModel = Record<string, Sequence[]>;

const IDENTITY: Quat = [1, 0, 0, 0];
const RAD = Math.PI / 180;

export class Plates {
  private cache = new Map<number, Quat>();
  private age = 0;

  constructor(private model: RotationModel) {}

  /** Set the age (Ma) that `rotation` answers for. */
  setAge(age: number) {
    if (age !== this.age) this.cache.clear();
    this.age = age;
  }

  /** Rotation taking `plate` from its present position to where it was at the current age. */
  rotation(plate: number, depth = 0): Quat {
    if (plate === 0 || this.age === 0 || depth > 32) return IDENTITY;
    const hit = this.cache.get(plate);
    if (hit) return hit;
    const seqs = this.model[plate];
    let q = IDENTITY;
    if (seqs) {
      const seq =
        seqs.find((s) => this.age >= s.poles[0][0] && this.age <= s.poles[s.poles.length - 1][0]) ??
        // Past the model's range: hold the oldest (or youngest) known position.
        seqs.reduce((a, b) => (Math.abs(end(b) - this.age) < Math.abs(end(a) - this.age) ? b : a));
      const relative = interpolate(seq.poles, this.age);
      q = multiply(this.rotation(seq.fixed, depth + 1), relative);
    }
    this.cache.set(plate, q);
    return q;
  }
}

function end(s: Sequence) {
  return s.poles[s.poles.length - 1][0];
}

function interpolate(poles: Pole[], age: number): Quat {
  if (age <= poles[0][0]) return fromPole(poles[0]);
  for (let i = 1; i < poles.length; i++) {
    const [a1] = poles[i - 1];
    const [a2] = poles[i];
    if (age <= a2) return slerp(fromPole(poles[i - 1]), fromPole(poles[i]), a2 === a1 ? 0 : (age - a1) / (a2 - a1));
  }
  return fromPole(poles[poles.length - 1]);
}

export function fromPole([, lat, lon, angle]: Pole): Quat {
  const h = (angle * RAD) / 2;
  const s = Math.sin(h);
  const cl = Math.cos(lat * RAD);
  return [Math.cos(h), cl * Math.cos(lon * RAD) * s, cl * Math.sin(lon * RAD) * s, Math.sin(lat * RAD) * s];
}

export function multiply(a: Quat, b: Quat): Quat {
  const [aw, ax, ay, az] = a;
  const [bw, bx, by, bz] = b;
  return [
    aw * bw - ax * bx - ay * by - az * bz,
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
  ];
}

function slerp(a: Quat, b: Quat, t: number): Quat {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b;
  if (dot < 0) {
    dot = -dot;
    bb = [-b[0], -b[1], -b[2], -b[3]];
  }
  if (dot > 0.9995) {
    const r = a.map((v, i) => v + t * (bb[i] - v)) as Quat;
    const n = Math.hypot(...r);
    return r.map((v) => v / n) as Quat;
  }
  const th = Math.acos(dot);
  const s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s;
  const wb = Math.sin(t * th) / s;
  return [wa * a[0] + wb * bb[0], wa * a[1] + wb * bb[1], wa * a[2] + wb * bb[2], wa * a[3] + wb * bb[3]];
}

/** Rotate a lon/lat point (degrees) by a quaternion. */
export function rotateLonLat(q: Quat, lon: number, lat: number): [number, number] {
  const cl = Math.cos(lat * RAD);
  const v: Quat = [0, cl * Math.cos(lon * RAD), cl * Math.sin(lon * RAD), Math.sin(lat * RAD)];
  const [, x, y, z] = multiply(multiply(q, v), [q[0], -q[1], -q[2], -q[3]]);
  return [Math.atan2(y, x) / RAD, Math.asin(Math.max(-1, Math.min(1, z))) / RAD];
}
