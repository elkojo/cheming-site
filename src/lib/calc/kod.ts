// KOD — native rebuild of the Zoho sheet "Horizontal Knock Out Drum as per API RP 521, 1997, par. 5.4.2.1" (Phase 7).
// Owner's choices 2026-11-25: rating of a given horizontal drum (the sheet's checks, errors fixed) plus API RP 521
// 5.4.2.1 (liquid holdup and required length, Eq. 30–45) and a search for the smallest diameter; droplet settling with
// the standard drag curve of rigid spheres (Clift, Grace & Weber 1978) solved exactly instead of the sheet's curve fit
// of GPSA Fig. 7-4; the Drum tool's six exact heads for the liquid volumes; nozzle Mach and inlet momentum; optional
// mist-eliminator check with GPSA K factors and pressure derating (Fig. 7-13, interpolated). Rules without a public
// source (vapour space, holding/surge minima, Mach limit) are plain editable limits. SI: m, m², m³, kg/s, Pa, K, Pa·s.
import { geometry, level, segment, type HeadId } from './drum.ts';

export const G = 9.80665;               // m/s²
export const R = 8.314462618;           // J/(mol·K)
const PI = Math.PI;

// ── settling velocity ──
/** Standard drag curve of a rigid sphere, Clift, Grace & Weber (1978) Table 5.2, Re ≤ 10⁶. */
export function dragClift(Re: number): number {
  const l = Math.log10(Re);
  if (Re < 0.01) return 24 / Re + 3 / 16;
  if (Re < 20) return 24 / Re * (1 + 0.1315 * Re ** (0.82 - 0.05 * l));
  if (Re < 260) return 24 / Re * (1 + 0.1935 * Re ** 0.6305);
  if (Re < 1500) return 10 ** (1.6435 - 1.1242 * l + 0.1558 * l * l);
  if (Re < 12000) return 10 ** (-2.4571 + 2.5558 * l - 0.9295 * l * l + 0.1049 * l ** 3);
  if (Re < 44000) return 10 ** (-1.9181 + 0.6370 * l - 0.0636 * l * l);
  if (Re < 338000) return 10 ** (-4.3390 + 1.5809 * l - 0.1546 * l * l);
  if (Re < 400000) return 29.78 - 5.3 * l;
  return 0.19 * l - 0.49;
}
/** C·Re² = 4·g·ρg·(ρl − ρg)·Dp³/(3·μ²) (API Eq. 32 has 0.13·10⁸ with μ in cP and g = 9.8). */
export const cRe2 = (rhoG: number, rhoL: number, Dp: number, mu: number) => 4 * G * rhoG * (rhoL - rhoG) * Dp ** 3 / (3 * mu * mu);
export interface Settling { X: number; Re: number; C: number; Ut: number; K: number; outside: boolean }
/** Terminal (dropout) velocity Ut = √(4·g·Dp·(ρl − ρg)/(3·ρg·C)) (API Eq. 30) with C from the standard curve,
 *  solved for Re from C(Re)·Re² = X (monotonic) by bisection on log Re. K = Ut·√(ρg/(ρl − ρg)) (Souders–Brown). */
export function settling(rhoG: number, rhoL: number, Dp: number, mu: number): Settling {
  const X = cRe2(rhoG, rhoL, Dp, mu);
  let lo = -8, hi = 7;   // log10 Re
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2, Re = 10 ** m; if (dragClift(Re) * Re * Re < X) lo = m; else hi = m; }
  const Re = 10 ** ((lo + hi) / 2), C = dragClift(Re);
  const Ut = Re * mu / (rhoG * Dp);
  return { X, Re, C, Ut, K: Ut * Math.sqrt(rhoG / (rhoL - rhoG)), outside: Re > 1e6 };
}
/** The sheet's curve fit of GPSA Fig. 7-4 (for the reproduction test). */
export const dragSheetFit = (X: number) => {
  const l = Math.log(X);
  return Math.exp(6.4968912583696 - 1.16202783830185 * l + 0.058375113388929 * l * l - 0.000912994041937 * l ** 3);
};

// ── gas ──
export const gasDensity = (p: number, T: number, M: number, Z: number) => p * M / 1000 / (Z * R * T);
/** speed of sound √(k·Z·R·T/M) */
export const sonic = (k: number, T: number, M: number, Z = 1) => Math.sqrt(k * Z * R * T / (M / 1000));

// ── horizontal drum ──
export interface Drum { head: HeadId; D: number; L: number }
/** liquid volume (shell + both heads) up to h from the bottom */
export const liquidVolume = (d: Drum, h: number) => level({ orient: 'horizontal', head: d.head, D: d.D, L: d.L }, geometry({ orient: 'horizontal', head: d.head, D: d.D, L: d.L }), h).volume;
/** vapour cross section above the level h (shell), m² */
export const vapourArea = (D: number, h: number) => PI * D * D / 4 - segment(D / 2, h - D / 2);
/** level reached by a liquid volume (inverse of liquidVolume), m */
export function levelOfVolume(d: Drum, V: number): number {
  let lo = 0, hi = d.D;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (liquidVolume(d, m) < V) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

export interface RateIn {
  drum: Drum;
  LLL: number; NLL: number; HLL: number;
  /** vapour mass flow, kg/s; gas density, kg/m³; settling velocity, m/s */
  W: number; rhoG: number; Ut: number;
  /** vapour passes (1: inlet at one end, outlet at the other; 2: centre inlet or centre outlet) */
  n: number;
  /** inlet-to-outlet distance per pass; default L/n */
  Ls?: number;
}
export interface RateOut {
  H1: number; Av: number; Q: number; Uh: number; Ls: number;
  /** horizontal (residence) time Ls/Uh and dropout time H1/Ut, s; utilization = Th/Tt */
  Th: number; Tt: number; util: number;
  /** API Eq. 44/45: Lmin = Uv·θ·N (θ = H1/Ut) */
  Lmin: number;
  /** horizontal distance the droplet travels while falling H1 */
  xDrop: number;
}
export function rate(r: RateIn): RateOut {
  const H1 = r.drum.D - r.HLL, Av = vapourArea(r.drum.D, r.HLL);
  const Q = r.W / r.rhoG, Uh = Q / r.n / Av;
  const Ls = r.Ls ?? r.drum.L / r.n;
  const Th = Ls / Uh, Tt = H1 / r.Ut;
  return { H1, Av, Q, Uh, Ls, Th, Tt, util: Th / Tt, Lmin: Uh * Tt * r.n, xDrop: Uh * Tt };
}

// ── mist eliminator (GPSA 12th ed., Section 7) ──
/** Fig. 7-13: K for pressure, percent of the design value; pressure in kPa (gauge). Interpolated linearly
 *  (the sheet used a regression line, KOD-4); above 7 929 kPa g the last value. */
export const K_DERATE: [number, number][] = [[0, 100], [1034, 90], [2068, 85], [4136, 80], [7929, 75]];
export function kDerate(pg: number): number {
  const t = K_DERATE, x = Math.max(0, pg / 1000);
  if (x >= t[t.length - 1][0]) return t[t.length - 1][1] / 100;
  for (let i = 1; i < t.length; i++) if (x <= t[i][0]) {
    const [x0, y0] = t[i - 1], [x1, y1] = t[i];
    return (y0 + (y1 - y0) * (x - x0) / (x1 - x0)) / 100;
  }
  return 1;
}
/** GPSA Figs. 7-12, 7-15, 7-18, 7-19: device, K range m/s, note. */
export const K_TABLE: { dev: string; K: [number, number]; note: string }[] = [
  { dev: 'Wire-mesh pad', K: [0.067, 0.12], note: '99–99.5 % removal of 3–10 µm droplets; lower K for the most efficient pads (Fig. 7-12)' },
  { dev: 'Vane pack, horizontal flow', K: [0.27, 0.30], note: '99 % removal of droplets > 10–40 µm (Fig. 7-15)' },
  { dev: 'Vane pack, vertical up-flow', K: [0.12, 0.15], note: '99 % removal of droplets > 10–40 µm (Fig. 7-15)' },
  { dev: 'Vertical separator with a mesh pad, 1.5 m high', K: [0.04, 0.07], note: 'Fig. 7-18' },
  { dev: 'Vertical separator with a mesh pad, 3 m or taller', K: [0.055, 0.11], note: 'Fig. 7-18' },
  { dev: 'Horizontal separator with a mesh pad', K: [0.12, 0.15], note: 'Fig. 7-19 for 3 m; 0.15 m/s normally the upper limit' },
];
/** allowable face velocity V = K·√((ρl − ρg)/ρg) (GPSA Eq. 7-8, Souders–Brown) and required face area */
export const mistVelocity = (K: number, rhoL: number, rhoG: number) => K * Math.sqrt((rhoL - rhoG) / rhoG);

// ── nozzles ──
export const nozzle = (Q: number, ID: number, c: number, rho: number) => {
  const v = Q / (PI * ID * ID / 4);
  return { v, mach: v / c, rv2: rho * v * v };
};

// ── Perry 26-36 (Tan, Hydrocarbon Processing Oct. 1967): W = 360·D²·√((ρL − ρv)·M·P/T), lb/h, ft, lb/ft³, psia, °R ──
const LB = 0.45359237, FT = 0.3048, LBFT3 = LB / FT ** 3, PSI = 6894.757293168;
export function tanDiameter(W: number, rhoL: number, rhoG: number, M: number, P: number, T: number): number {
  const Wl = W * 3600 / LB, dr = (rhoL - rhoG) / LBFT3, Pp = P / PSI, TR = T * 1.8;
  return Math.sqrt(Wl / (360 * Math.sqrt(dr * M * Pp / TR))) * FT;
}

// ── diameter search ──
export interface DesignIn extends Omit<RateIn, 'drum' | 'LLL' | 'NLL' | 'HLL' | 'Ls'> {
  head: HeadId;
  /** L/D */
  ratio: number;
  /** levels as fractions of D */
  fLLL: number; fNLL: number; fHLL: number;
  /** limits: utilization ≥ 1, vapour space ≥ max(fH1·D, H1min), times ≥ given (NaN = no check) */
  fH1: number; H1min: number;
  surgeQ: number; surgeMin: number; drawQ: number; holdMin: number;
  step: number; Dmax: number;
}
export interface DesignOut { D: number; L: number; ok: boolean }
/** Smallest diameter (in steps) for which every check passes with the level fractions and L/D held. */
export function designSearch(d: DesignIn): DesignOut {
  for (let D = d.step; D <= d.Dmax + 1e-9; D += d.step) {
    const drum: Drum = { head: d.head, D, L: d.ratio * D };
    const LLL = d.fLLL * D, NLL = d.fNLL * D, HLL = d.fHLL * D;
    const r = rate({ drum, LLL, NLL, HLL, W: d.W, rhoG: d.rhoG, Ut: d.Ut, n: d.n });
    if (r.util < 1) continue;
    if (r.H1 < Math.max(d.fH1 * D, d.H1min) - 1e-12) continue;
    if (Number.isFinite(d.surgeMin) && d.surgeQ > 0 && (liquidVolume(drum, HLL) - liquidVolume(drum, NLL)) / d.surgeQ < d.surgeMin) continue;
    if (Number.isFinite(d.holdMin) && d.drawQ > 0 && (liquidVolume(drum, NLL) - liquidVolume(drum, LLL)) / d.drawQ < d.holdMin) continue;
    return { D, L: drum.L, ok: true };
  }
  return { D: NaN, L: NaN, ok: false };
}
