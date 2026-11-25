// PSV: Liquid Filled Vessel — native rebuild of the Zoho sheet "PSV Sizing for Fire Case in a Liquid Filled Vessel"
// (Phase 7). Wetted area in the fire zone → fire heat input (API 521) → relief load → required orifice (API 520-1)
// → API 526 orifice letter and valve bodies.
// Owner's choices 2026-11-25: the Drum tool's six exact heads (drum.ts) plus a sphere; exact wetted areas (the sheet
// approximated partly wetted 2:1 heads, PSVL-3); vapour properties typed or water/steam from IAPWS-IF97 at the
// relieving pressure (fixes the inconsistent example, PSVL-2); environmental factor typed, from API 521 Table 5 or from
// the insulation equation (API RP 521 4th ed. 1997, Eq. 9); valve type, rupture disk, drainage switch; full API 526
// table. SI throughout: m, m², W, kg/s, Pa (abs), K, J/kg.
import { head as drumHead, HEADS, segment, type Head, type HeadId } from './drum.ts';
import { LIMITS526, T526, type Mat526, type Row526 } from './psvl-api526.ts';

const PI = Math.PI;

// ── numerical integration (Gauss–Legendre, 8 points per panel) ──
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
function integrateSplit(f: (x: number) => number, a: number, b: number, at: number[]): number {
  const pts = [a, ...at.filter((x) => x > a && x < b).sort((x, y) => x - y), b];
  let s = 0;
  for (let i = 0; i + 1 < pts.length; i++) s += integrate(f, pts[i], pts[i + 1]);
  return s;
}

// ── head surfaces ──
/** Head with its surface element: dA = g(z)·dφ·dz, g = √(ρ² + (ρ·dρ/dz)²) (smooth up to the apex). */
export interface SurfHead extends Head { g: (z: number) => number; area: number }

export function surfHead(id: HeadId, D: number): SurfHead {
  const h = drumHead(id, D), R = D / 2, t = HEADS.find((x) => x.id === id)!;
  let g: (z: number) => number;
  if (h.depth === 0) g = () => 0;
  else if (t.fd !== undefined && t.fk !== undefined) {
    const Rc = t.fd * D, rk = t.fk * D, zt = h.zt!;
    g = (z) => {
      if (z <= zt) { const q = Math.sqrt(Math.max(1e-300, rk * rk - z * z)), rho = R - rk + q; return rho * Math.sqrt(1 + (z / q) ** 2); }
      return Rc;   // spherical crown: √(ρ² + (z + zc)²) = Rc
    };
  } else {
    const a = h.depth;   // ellipsoid of revolution (hemisphere: a = R): ρ² = R²(1 − z²/a²), ρ·ρ′ = −R²·z/a²
    g = (z) => Math.sqrt(Math.max(0, R * R * (1 - (z / a) ** 2)) + (R * R * z / (a * a)) ** 2);
  }
  const sh: SurfHead = { ...h, g, area: 0 };
  sh.area = h.depth === 0 ? PI * R * R : integrateSplit((z) => 2 * PI * g(z), 0, h.depth, h.zt ? [h.zt] : []);
  return sh;
}

/** Closed-form total head areas (tests): ellipsoid half-surface; torispherical knuckle zone + crown cap. */
export function headAreaExact(id: HeadId, D: number): number {
  const R = D / 2, t = HEADS.find((x) => x.id === id)!;
  if (id === 'flat') return PI * R * R;
  if (id === 'hemi') return 2 * PI * R * R;
  if (id === 'ell21') {
    const a = R, b = D / 4, e = Math.sqrt(1 - (b / a) ** 2);
    return PI * a * a + (PI * b * b / e) * Math.log((1 + e) / (1 - e)) / 2;
  }
  const Rc = t.fd! * D, rk = t.fk! * D, zc = Math.sqrt((Rc - rk) ** 2 - (R - rk) ** 2);
  const th = Math.atan2(zc, R - rk);   // knuckle angle: from the tangent plane to the crown
  const zt = rk * Math.sin(th), depth = Rc - zc;
  return 2 * PI * rk * ((R - rk) * th + rk * Math.sin(th)) + 2 * PI * Rc * (depth - zt);
}

/** Vertical axis: head surface between distances z1 < z2 from the tangent plane. */
const headBand = (h: SurfHead, z1: number, z2: number) => {
  if (h.depth === 0) return 0;
  z1 = Math.max(0, z1); z2 = Math.min(h.depth, z2);
  return z2 > z1 ? integrateSplit((z) => 2 * PI * h.g(z), z1, z2, h.zt ? [h.zt] : []) : 0;
};

/** Horizontal axis: surface of ONE head below the height y above the bottom of the shell. */
export function headWetH(h: SurfHead, y: number): number {
  const R = h.D / 2;
  if (y <= 0) return 0;
  if (h.depth === 0) return segment(R, y - R);
  if (y >= h.D) return h.area;
  const c = R - y;
  let lo = 0, hi = h.depth;   // z where ρ(z) = |R − y|: beyond it the circle is fully dry (y < R) or wet (y > R)
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (h.rho(m) > Math.abs(c)) lo = m; else hi = m; }
  const f = (z: number) => {
    const rho = h.rho(z);
    const arg = rho > 0 ? Math.min(1, Math.max(-1, c / rho)) : (c > 0 ? 1 : -1);
    return 2 * Math.acos(arg) * h.g(z);
  };
  // the arc angle has a square-root kink at z = lo: substitute z = lo − w² on the part just before it
  const a = h.zt !== undefined && h.zt < lo ? h.zt : 0;
  const before = integrateSplit(f, 0, a, []) + integrate((w) => f(lo - w * w) * 2 * w, 0, Math.sqrt(lo - a));
  const after = c > 0 ? 0 : integrateSplit((z) => 2 * PI * h.g(z), lo, h.depth, h.zt !== undefined ? [h.zt] : []);
  return before + after;
}

// ── vessel and wetted area ──
export type Kind = 'horizontal' | 'vertical' | 'sphere';
export type Datum = 'tangent' | 'bottom';
export interface Vessel {
  kind: Kind;
  head: HeadId;
  /** inside diameter */
  D: number;
  /** tangent-to-tangent length (not used for a sphere) */
  L: number;
  /** vertical: levels and elevation from the bottom tangent line ('tangent') or the bottom of the head ('bottom') */
  datum: Datum;
  /** elevation of the datum above grade: horizontal and sphere = vessel bottom */
  El: number;
  /** liquid level above the datum during the fire */
  level: number;
  /** fire-zone height above grade (API 521: 7.6 m) */
  Hf: number;
  /** vertical: bottom head inside a support skirt (API 521: normally not counted) */
  skirt?: boolean;
}
export type Limit = 'level' | 'fire' | 'equator' | 'none';
export interface Wetted {
  /** wetted area in the fire zone */
  A: number;
  /** total (inside) surface of the vessel */
  total: number;
  shell: number; bottom: number; top: number;
  /** elevation above grade up to which the surface counts */
  zw: number;
  /** what limits the wetted height */
  limit: Limit;
  /** level above the vessel (clamped), part below grade (clipped) */
  levelOutside: boolean; belowGrade: boolean;
  /** elevations above grade: vessel bottom and top, liquid surface */
  zBottom: number; zTop: number; zLevel: number;
  depth: number;
}

export function wetted(v: Vessel): Wetted {
  const R = v.D / 2;
  if (v.kind === 'sphere') {
    const zB = v.El, zT = v.El + v.D, zL = v.El + v.level;
    const fireTop = Math.max(v.Hf, v.El + R);   // API 521: up to the maximum horizontal diameter or 7.6 m, whichever is greater
    const zw = Math.min(zL, fireTop, zT);
    const lo = Math.max(zB, 0);
    const A = Math.max(0, zw - lo) * PI * v.D;   // Archimedes: zone area = π·D·height
    const limit: Limit = zw <= lo ? 'none' : zL <= fireTop ? 'level' : v.Hf >= v.El + R ? 'fire' : 'equator';
    return { A, total: PI * v.D * v.D, shell: A, bottom: 0, top: 0, zw, limit, levelOutside: v.level < 0 || v.level > v.D,
      belowGrade: zB < 0, zBottom: zB, zTop: zT, zLevel: zL, depth: R };
  }
  const h = surfHead(v.head, v.D);
  const total = PI * v.D * v.L + 2 * h.area;
  if (v.kind === 'horizontal') {
    const zB = v.El, zT = v.El + v.D, zL = v.El + v.level;
    const yw = Math.min(v.level, v.Hf - v.El, v.D), ylo = Math.max(0, -v.El);
    const wet = (y: number) => {
      y = Math.min(v.D, Math.max(0, y));
      return { shell: v.D * Math.acos(1 - 2 * y / v.D) * v.L, head: headWetH(h, y) };
    };
    let shell = 0, hd = 0;
    if (yw > ylo) { const a = wet(yw), b = wet(ylo); shell = a.shell - b.shell; hd = a.head - b.head; }
    const limit: Limit = yw <= ylo ? 'none' : v.level <= v.Hf - v.El ? 'level' : 'fire';
    return { A: shell + 2 * hd, total, shell, bottom: hd, top: hd, zw: v.El + Math.max(ylo, yw), limit,
      levelOutside: v.level < 0 || v.level > v.D, belowGrade: v.El < 0, zBottom: zB, zTop: zT, zLevel: zL, depth: h.depth };
  }
  // vertical: s = height above the bottom tangent line
  const off = v.datum === 'bottom' ? h.depth : 0;
  const elTL = v.El + off, sL = v.level - off;
  const sMin = -h.depth, sMax = v.L + h.depth;
  const sw = Math.min(sL, v.Hf - elTL, sMax), slo = Math.max(sMin, -elTL);
  let bottom = 0, shell = 0, top = 0;
  if (sw > slo) {
    if (!v.skirt && slo < 0) bottom = headBand(h, Math.max(0, -sw), -slo);
    shell = PI * v.D * Math.max(0, Math.min(sw, v.L) - Math.max(slo, 0));
    if (sw > v.L) top = headBand(h, Math.max(0, slo - v.L), sw - v.L);
  }
  const limit: Limit = sw <= slo ? 'none' : sL <= v.Hf - elTL ? 'level' : 'fire';
  return { A: bottom + shell + top, total, shell, bottom, top, zw: elTL + Math.max(slo, sw), limit,
    levelOutside: sL < sMin - 1e-12 || sL > sMax + 1e-12, belowGrade: elTL - h.depth < -1e-12,
    zBottom: elTL - h.depth, zTop: elTL + v.L + h.depth, zLevel: elTL + sL, depth: h.depth };
}

// ── fire heat input, API 521 ──
/** Q = C·F·A^0.82, W with A in m²: C = 43 200 (adequate drainage and firefighting) or 70 900 (not). */
export const C_FIRE = { adequate: 43200, inadequate: 70900 } as const;
export const heatInput = (C: number, F: number, A: number) => C * F * A ** 0.82;

/** API RP 521 (1997) Eq. 9, US units: F = k·(1660 − T_f)/(21 000·t), k Btu·in/(h·ft²·°F), T_f °F, t in.
 *  Here in SI: k W/(m·K), t m, T_f K; converted exactly (= k·(904.4 °C − T_f)/(66 246 W/m²·t)). */
export const BTU_IN = 1055.05585262 / 3600 * 0.0254 / (0.3048 ** 2) / (5 / 9);   // 1 Btu·in/(h·ft²·°F) in W/(m·K)
export const FLUX_21000 = 21000 * 1055.05585262 / 3600 / 0.3048 ** 2;             // W/m²
export const T_FIRE = (1660 + 459.67) * 5 / 9;                                      // K (904.44 °C)
export function fInsulation(k: number, t: number, Tf: number): number {
  return k * (T_FIRE - Tf) / (FLUX_21000 * t);
}
/** API RP 521 (1997) Table 5 / GPSA Fig. 5-16. Insulation rows: conductance k/t for k = 4 Btu·in/(h·ft²·°F), t = 1…12 in. */
export const F_TABLE: { label: string; mm?: number; F: number; gpsa?: number }[] = [
  { label: 'Bare vessel', F: 1.0 },
  { label: 'Insulated, 25 mm (1 in)', mm: 25, F: 0.3 },
  { label: 'Insulated, 50 mm (2 in)', mm: 50, F: 0.15 },
  { label: 'Insulated, 100 mm (4 in)', mm: 100, F: 0.075 },
  { label: 'Insulated, 150 mm (6 in)', mm: 150, F: 0.05 },
  { label: 'Insulated, 200 mm (8 in)', mm: 200, F: 0.0376, gpsa: 0.037 },
  { label: 'Insulated, 250 mm (10 in)', mm: 250, F: 0.03 },
  { label: 'Insulated, 300 mm (12 in) or more', mm: 300, F: 0.026, gpsa: 0.025 },
  { label: 'Water-application facilities, bare vessel', F: 1.0 },
  { label: 'Depressuring and emptying facilities', F: 1.0 },
  { label: 'Earth-covered storage', F: 0.03 },
  { label: 'Below-grade storage', F: 0.0 },
];

// ── relief sizing, API 520 Part I (SI: W kg/h, P kPa abs, T K, A mm²) ──
export function coefC(k: number): number {
  if (Math.abs(k - 1) < 1e-9) return 0.03948 * Math.sqrt(1 / Math.E);
  return 0.03948 * Math.sqrt(k * (2 / (k + 1)) ** ((k + 1) / (k - 1)));
}
export const pCritical = (P1: number, k: number) => (Math.abs(k - 1) < 1e-9 ? P1 / Math.sqrt(Math.E) : P1 * (2 / (k + 1)) ** (k / (k - 1)));
export function coefF2(k: number, r: number): number {
  return Math.sqrt((k / (k - 1)) * r ** (2 / k) * (1 - r ** ((k - 1) / k)) / (1 - r));
}
/** Napier correction (API 520 Part I; GPSA Eq. 5-7), P1 kPa abs. */
export function napierKn(P1: number): number {
  if (P1 <= 10339) return 1;
  return (0.02764 * P1 - 1000) / (0.03324 * P1 - 1061);
}

export type ValveType = 'conventional' | 'bellows' | 'pilot';
export interface SizeIn {
  /** relief load, kg/s */
  W: number;
  /** relieving and back pressure, Pa abs */
  P1: number; P2: number;
  /** vapour: T K, M kg/kmol, Z, k; steam: Napier instead */
  T: number; M: number; Z: number; k: number;
  steam?: boolean;
  Kd: number; Kb: number; Kc: number;
  valve: ValveType;
}
export interface SizeOut {
  /** required effective area, m² */
  A: number;
  Pcf: number; critical: boolean;
  C?: number; F2?: number; Kn?: number;
  /** equation used */
  eq: 'critical' | 'subcritical' | 'napier';
}
export function size(s: SizeIn): SizeOut {
  const Wh = s.W * 3600, P1 = s.P1 / 1000, P2 = s.P2 / 1000;
  if (s.steam) {
    const Kn = napierKn(P1);
    const A = 190.4 * Wh / (P1 * s.Kd * s.Kb * s.Kc * Kn);
    return { A: A * 1e-6, Pcf: s.P1 / 2, critical: s.P2 <= s.P1 / 2, Kn, eq: 'napier' };
  }
  const Pcf = pCritical(s.P1, s.k), critical = s.P2 <= Pcf;
  const C = coefC(s.k);
  // balanced bellows: the critical-flow equation with Kb also below the critical pressure (API 520 Part I)
  if (critical || s.valve === 'bellows') {
    const A = Wh / (C * s.Kd * P1 * s.Kb * s.Kc) * Math.sqrt(s.T * s.Z / s.M);
    return { A: A * 1e-6, Pcf, critical, C, eq: 'critical' };
  }
  const F2 = coefF2(s.k, P2 / P1);
  const A = 17.9 * Wh / (F2 * s.Kd * s.Kc) * Math.sqrt(s.T * s.Z / (s.M * P1 * (P1 - P2)));
  return { A: A * 1e-6, Pcf, critical, C, F2, eq: 'subcritical' };
}

// ── API 526 (5th ed., 2002) ──
export const IN2 = 0.0254 ** 2;
/** Orifice letters and effective areas (in², Table 1). */
export const API526: { d: string; a: number }[] = [
  { d: 'D', a: 0.110 }, { d: 'E', a: 0.196 }, { d: 'F', a: 0.307 }, { d: 'G', a: 0.503 }, { d: 'H', a: 0.785 },
  { d: 'J', a: 1.287 }, { d: 'K', a: 1.838 }, { d: 'L', a: 2.853 }, { d: 'M', a: 3.60 }, { d: 'N', a: 4.34 },
  { d: 'P', a: 6.38 }, { d: 'Q', a: 11.05 }, { d: 'R', a: 16.00 }, { d: 'T', a: 26.00 },
];
/** Smallest API 526 orifice with an effective area ≥ A (m²); above T: the number of T orifices needed. */
export function pickOrifice(A: number): { i: number; n: number } {
  const ain = A / IN2;
  const i = API526.findIndex((o) => o.a >= ain * (1 - 1e-12));
  if (i >= 0) return { i, n: 1 };
  return { i: API526.length - 1, n: Math.ceil(ain / API526[API526.length - 1].a - 1e-12) };
}

// ── valve body by material and flange class (API 526 Tables 2–29) ──
export const PSI = 6894.757293168;   // Pa per psi
export const toF = (T: number) => T * 9 / 5 - 459.67;
/** inlet size in inches, for ordering bodies: '1½E2' → 1.5 */
const inletIn = (b: string) => { const m = /^(\d+)(½)?/.exec(b)!; return +m[1] + (m[2] ? 0.5 : 0); };
export interface BodyRow { r: Row526; /** set-pressure limit at the temperature column, psig (null: not offered) */ limit: number | null; out: number; fits: boolean }
export interface BodyPick {
  /** temperature column used (index into T526), −1 = outside the tables */
  col: number;
  range?: readonly [number, number];
  rows: BodyRow[];
  chosen?: BodyRow;
  /** why nothing fits */
  why?: 'material' | 'temperature' | 'pressure' | 'outlet';
}
/** Lowest inlet flange class (then smallest body) whose set-pressure limit at the relieving temperature covers the
 *  set pressure and whose outlet limit covers the back pressure. Temperature: the column whose range contains it,
 *  between ranges the next hotter one (owner 2026-11-25). Pressures in Pa gauge, T in K. */
export function pickBody(letter: string, kind: 's' | 'p', mat: Mat526, setG: number, T: number, backG: number, bellows: boolean): BodyPick {
  const list = LIMITS526[letter]?.[kind]?.[mat];
  if (!list) return { col: -1, rows: [], why: 'material' };
  const cols = T526[kind], TF = toF(T);
  const col = TF < cols[0][0] - 1e-9 ? -1 : cols.findIndex((c) => TF <= c[1] + 1e-9);
  const setP = setG / PSI, back = Math.max(0, backG) / PSI;
  const rows: BodyRow[] = [...list].sort((x, y) => x.ci - y.ci || inletIn(x.b) - inletIn(y.b)).map((r) => {
    const limit = col >= 0 ? r.p[col] : null, out = kind === 's' ? r.o[bellows ? 1 : 0] : r.o[0];
    return { r, limit, out, fits: limit !== null && setP <= limit * (1 + 1e-12) && back <= out * (1 + 1e-12) };
  });
  const chosen = rows.find((x) => x.fits);
  let why: BodyPick['why'];
  if (!chosen) {
    if (col < 0 || rows.every((x) => x.limit === null)) why = 'temperature';
    else if (rows.some((x) => x.limit !== null && setP <= x.limit)) why = 'outlet';
    else why = 'pressure';
  }
  return { col, range: col >= 0 ? cols[col] : undefined, rows, chosen, why };
}
