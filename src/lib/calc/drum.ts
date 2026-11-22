// Drum — native rebuild of the Zoho sheet "Drum Geometry, Hold-up & Surge Rate" (Phase 7).
// Vertical or horizontal cylindrical drum with two equal heads; liquid volume, liquid cross section and surface area at
// each level; level-to-level volumes and times.
// Heads (owner's choice 2026-11-22: exact shapes, F&D and Korbbogen added), all referred to the inside diameter D:
//   2:1 semi-ellipsoidal  depth D/4, V = π·D³/24
//   torispherical         crown radius fd·D, knuckle radius fk·D (Crookston & Crookston, Chem. Eng. Sept 2011):
//                         10 % / Klöpper (DIN 28011) fd 1, fk 0.1; ASME F&D fd 1, fk 0.06; Korbbogen (DIN 28013) fd 0.8, fk 0.154
//                         (DIN profiles: De Plaatijzerindustrie data sheets 2025, where fd, fk refer to the OUTSIDE diameter;
//                         applied to the inside D here: head volume ≈ 0.2 % low at s/D = 1 %, ≈ 1 % low at s/D = 3 %)
//   hemispherical         depth D/2, V = π·D³/12
//   flat                  depth 0
// Ellipsoidal and hemispherical partial volumes are closed-form; torispherical ones integrate the exact profile
// (knuckle torus + spherical crown) numerically — Gauss–Legendre, split where the integrand is not smooth.
// The sheet used the ellipsoid formula with k = 0.189 for the 10 % dish (DRUM-3).
// SI throughout: m, m², m³, m³/s, s.

export type HeadId = 'ell21' | 'tori10' | 'asmefd' | 'korb' | 'hemi' | 'flat';
export interface HeadType { id: HeadId; label: string; fd?: number; fk?: number }
export const HEADS: HeadType[] = [
  { id: 'ell21', label: '2:1 semi-ellipsoidal' },
  { id: 'tori10', label: 'Torispherical 10 % (Klöpper)', fd: 1, fk: 0.1 },
  { id: 'asmefd', label: 'ASME F&D (torispherical 6 %)', fd: 1, fk: 0.06 },
  { id: 'korb', label: 'Korbbogen (DIN 28013)', fd: 0.8, fk: 0.154 },
  { id: 'hemi', label: 'Hemispherical' },
  { id: 'flat', label: 'Flat' },
];

/** Head geometry for inside diameter D: depth, profile radius ρ(z) at distance z from the tangent plane, volume. */
export interface Head {
  id: HeadId;
  D: number;
  depth: number;
  /** z where the knuckle meets the crown (torispherical), else undefined */
  zt?: number;
  rho: (z: number) => number;
  volume: number;
}

const PI = Math.PI;

/** Torispherical head: crown radius fd·D, knuckle radius fk·D. */
export function torispherical(D: number, fd: number, fk: number, id: HeadId = 'tori10'): Head {
  const R = D / 2, Rc = fd * D, rk = fk * D;
  const zc = Math.sqrt((Rc - rk) ** 2 - (R - rk) ** 2);   // crown centre behind the tangent plane
  const depth = Rc - zc, zt = rk * zc / (Rc - rk);
  const rho = (z: number) => (z <= zt ? R - rk + Math.sqrt(Math.max(0, rk * rk - z * z)) : Math.sqrt(Math.max(0, Rc * Rc - (z + zc) ** 2)));
  const h: Head = { id, D, depth, zt, rho, volume: 0 };
  h.volume = headBelow(h, 0);
  return h;
}

export function head(id: HeadId, D: number): Head {
  const R = D / 2;
  const t = HEADS.find((h) => h.id === id)!;
  if (t.fd !== undefined && t.fk !== undefined) return torispherical(D, t.fd, t.fk, id);
  const depth = id === 'ell21' ? D / 4 : id === 'hemi' ? R : 0;
  const rho = (z: number) => (depth === 0 ? 0 : R * Math.sqrt(Math.max(0, 1 - (z / depth) ** 2)));
  return { id, D, depth, rho, volume: (2 / 3) * PI * R * R * depth };
}

// ── numerical integration ──
const GX = [-0.9602898564975363, -0.7966664774136267, -0.5255324099163290, -0.1834346424956498,
  0.1834346424956498, 0.5255324099163290, 0.7966664774136267, 0.9602898564975363];
const GW = [0.1012285362903763, 0.2223810344533745, 0.3137066458778873, 0.3626837833783620,
  0.3626837833783620, 0.3137066458778873, 0.2223810344533745, 0.1012285362903763];
function integrate(f: (x: number) => number, a: number, b: number, panels = 24): number {
  if (!(b > a)) return 0;
  let s = 0;
  const h = (b - a) / panels;
  for (let p = 0; p < panels; p++) {
    const m = a + (p + 0.5) * h;
    for (let i = 0; i < 8; i++) s += GW[i] * f(m + GX[i] * h / 2);
  }
  return s * h / 2;
}
/** integrate over [a, b], split at the given interior points */
const integrateSplit = (f: (x: number) => number, a: number, b: number, at: number[]) => {
  const pts = [a, ...at.filter((x) => x > a && x < b).sort((x, y) => x - y), b];
  let s = 0;
  for (let i = 0; i + 1 < pts.length; i++) s += integrate(f, pts[i], pts[i + 1]);
  return s;
};

/** Volume of the head between the plane at distance s from the tangent plane and its apex (vertical drum). */
export function headBelow(h: Head, s: number): number {
  if (h.depth === 0 || s >= h.depth) return 0;
  s = Math.max(0, s);
  if (h.zt === undefined) {   // ellipsoid of revolution: ∫ π·R²·(1 − z²/a²) dz
    const R = h.D / 2, a = h.depth, F = (z: number) => PI * R * R * (z - z ** 3 / (3 * a * a));
    return F(a) - F(s);
  }
  return integrateSplit((z) => PI * h.rho(z) ** 2, s, h.depth, [h.zt]);
}

/** Area of a circle of radius r below a horizontal line at height y above its centre. */
export function segment(r: number, y: number): number {
  if (r <= 0 || y <= -r) return 0;
  if (y >= r) return PI * r * r;
  return r * r * Math.acos(-y / r) + y * Math.sqrt(r * r - y * y);
}

/** Liquid volume in ONE head of a horizontal drum, liquid depth x above the bottom of the shell. */
export function headHorizontal(h: Head, x: number): number {
  if (h.depth === 0 || x <= 0) return 0;
  const R = h.D / 2;
  if (x >= h.D) return h.volume;
  if (h.zt === undefined) {   // half of an ellipsoid with semi-axes R, R, a: (π·a/R)·x²·(3R − x)/3 for both heads
    return PI * (h.depth / R) * x * x * (3 * R - x) / 6;
  }
  const y = x - R;
  // ρ(z) falls from R to 0; beyond ρ(z*) = |y| the slice is empty (y < 0) or full (y > 0): split there
  let lo = 0, hi = h.depth;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (h.rho(m) > Math.abs(y)) lo = m; else hi = m; }
  return integrateSplit((z) => segment(h.rho(z), y), 0, h.depth, [h.zt, lo]);
}

export type Orientation = 'horizontal' | 'vertical';
/** Vertical drum: levels from the bottom tangent line ('tangent', as the sheet) or from the bottom of the head ('bottom'). */
export type Datum = 'tangent' | 'bottom';

export interface Drum { orient: Orientation; head: HeadId; D: number; L: number; datum?: Datum }

export interface Geometry {
  head: Head;
  /** volume of the cylindrical shell */
  shell: number;
  total: number;
  /** overall length or height, tangent-to-tangent length plus both head depths */
  overall: number;
  /** highest valid level in the chosen datum */
  hMax: number;
  /** lowest valid level in the chosen datum */
  hMin: number;
}

export function geometry(d: Drum): Geometry {
  const hd = head(d.head, d.D);
  const shell = PI * d.D * d.D / 4 * d.L;
  const vert = d.orient === 'vertical', bottom = vert && d.datum === 'bottom';
  return {
    head: hd, shell, total: shell + 2 * hd.volume, overall: d.L + 2 * hd.depth,
    hMax: vert ? (bottom ? d.L + 2 * hd.depth : d.L + hd.depth) : d.D,
    hMin: vert && !bottom ? -hd.depth : 0,
  };
}

export interface Level {
  /** liquid volume up to this level */
  volume: number;
  /** horizontal: liquid cross section in the end view (segment area); vertical: liquid surface area */
  section: number;
  /** liquid surface area: horizontal = chord·L (shell only), vertical = π·ρ² at the level */
  surface: number;
  /** level is outside the drum (result clamped) */
  outside: boolean;
}

/** Liquid at level h (m): horizontal from the bottom of the shell; vertical per the datum. */
export function level(d: Drum, g: Geometry, h: number): Level {
  const outside = h < g.hMin - 1e-12 || h > g.hMax + 1e-12;
  h = Math.min(g.hMax, Math.max(g.hMin, h));
  const R = d.D / 2, hd = g.head;
  if (d.orient === 'horizontal') {
    const section = segment(R, h - R);
    const volume = d.L * section + 2 * headHorizontal(hd, h);
    return { volume, section, surface: 2 * Math.sqrt(Math.max(0, h * (d.D - h))) * d.L, outside };
  }
  const ht = d.datum === 'bottom' ? h - hd.depth : h;   // height above the bottom tangent line
  let volume: number, r: number;
  if (ht < 0) { volume = headBelow(hd, -ht); r = hd.rho(-ht); }
  else if (ht <= d.L) { volume = hd.volume + PI * R * R * ht; r = R; }
  else { volume = hd.volume + g.shell + hd.volume - headBelow(hd, ht - d.L); r = hd.rho(ht - d.L); }
  const surface = PI * r * r;
  return { volume, section: surface, surface, outside };
}

/** Level-to-level times: surge (rising, outlet blocked) uses the inflow, hold-up (falling, inflow lost) the outflow. */
export const surgeTime = (dv: number, qin: number) => dv / qin;
export const holdupTime = (dv: number, qout: number) => dv / qout;

/** Head profile points (z, ρ) from the tangent plane to the apex, for drawing. */
export function profile(h: Head, n = 48): [number, number][] {
  if (h.depth === 0) return [[0, h.D / 2], [0, 0]];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const z = h.depth * Math.sin((i / n) * PI / 2);   // denser near the apex, where ρ changes fastest
    pts.push([z, h.rho(z)]);
  }
  pts[n] = [h.depth, 0];
  return pts;
}
