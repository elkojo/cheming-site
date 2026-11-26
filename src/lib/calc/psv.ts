// PSV (Phase 7): relief valve sizing for several cases per API 520 Part I, one valve for all of them (the case
// needing the largest area governs). Pure functions; SI inside (Pa abs, K, kg/s, m², kg/m³, Pa·s, m³/kg).
// Owner's choices 2026-11-26: MAWP + accumulation per case; vapour, liquid (certified or not), steam (Napier with
// KN and KSH) and two-phase (omega method, the original sheet's sum of areas shown beside it); Kb (10 % curve) and
// Kp refitted to API 520 Figs 30 and 37 (PSV-11); disk alone Kc = 1 (PSV-1); non-certified liquid Kd 0.62 (PSV-2);
// Kv per valve (PSV-3) by the API 520 10th-edition (2020) curve (owner 2026-11-26, PSV-12); reaction force of an open discharge (API 520 Part II).
import { coefC, pCritical, coefF2, napierKn, pickOrifice, API526, IN2 } from './psvl.ts';

export const PATM = 101325;
const R = 8314.462618;          // J/(kmol·K)
const RHO_W = 999.0;            // water at 15.6 °C (60 °F), kg/m³: reference of the specific gravity G

export type Phase = 'vapour' | 'liquid' | 'steam' | 'twophase';
export type Device = 'valve' | 'combo' | 'disk';
export type Valve = 'conventional' | 'bellows' | 'pilot';
export type OmegaMode = 'v9' | 'frozen' | 'typed';

// ── relief scenarios (the original sheet's list, API RP 521 causes); fire presets 21 % accumulation ──
export const SCENARIOS: { id: string; label: string; fire?: boolean }[] = [
  { id: 'fire', label: 'External fire', fire: true },
  { id: 'blocked', label: 'Blocked outlet' },
  { id: 'reflux', label: 'Reflux failure' },
  { id: 'power', label: 'Power failure' },
  { id: 'cw', label: 'Cooling-water failure' },
  { id: 'glycol', label: 'Glycol/water failure' },
  { id: 'steam', label: 'Steam failure' },
  { id: 'fuel', label: 'Fuel-gas failure' },
  { id: 'n2', label: 'Nitrogen (blanketing) overflow' },
  { id: 'thermal', label: 'Thermal expansion' },
  { id: 'cooling', label: 'Loss of cooling' },
  { id: 'pumping', label: 'Overpumping' },
  { id: 'cv', label: 'Control-valve failure' },
  { id: 'tube', label: 'Heat-exchanger tube rupture' },
  { id: 'breath', label: 'Pumping in / breathing' },
  { id: 'runaway', label: 'Runaway reaction' },
  { id: 'heat', label: 'Abnormal heat input' },
  { id: 'pw-power', label: 'Plant-wide power failure' },
  { id: 'pw-cw', label: 'Plant-wide cooling-water failure' },
  { id: 'pw-glycol', label: 'Plant-wide glycol/water failure' },
  { id: 'pw-steam', label: 'Plant-wide steam failure' },
  { id: 'pw-fuel', label: 'Plant-wide fuel-gas failure' },
  { id: 'other', label: 'Other' },
];
/** Allowable accumulation above MAWP, %: fire 21; several valves 16; otherwise 10 (API 520 Part I, ASME VIII). */
export const presetAccum = (scenario: string, nValves: number) =>
  SCENARIOS.find((s) => s.id === scenario)?.fire ? 21 : nValves > 1 ? 16 : 10;
/** Relieving pressure P1 = MAWP + accumulation, Pa abs. */
export const relievingP = (mawp: number, accum: number) => (mawp - PATM) * (1 + accum / 100) + PATM;

// ── coefficients ──
/** Discharge coefficient for preliminary sizing (API 520 Part I): vapour 0.975, liquid 0.65 (certified) / 0.62
 *  (not certified, 3.9), two-phase 0.85 (Appendix D); rupture disk alone 0.62 (3.11.1.2). */
export function kdDefault(phase: Phase, device: Device, certified: boolean): number {
  if (device === 'disk') return 0.62;
  if (phase === 'liquid') return certified ? 0.65 : 0.62;
  if (phase === 'twophase') return 0.85;
  return 0.975;
}
/** Combination factor: 0.9 for a valve with a rupture disk upstream (no certified value), otherwise 1 (PSV-1). */
export const kcDefault = (device: Device) => (device === 'combo' ? 0.9 : 1);

/** Kb, balanced bellows, vapour (API 520 Part I Fig. 30, refitted to the chart digitized at 300 dpi, PSV-11).
 *  x = back pressure as % of set pressure (gauge), op = overpressure %. 10 % curve: 1 up to 30 %, then a cubic in
 *  (x − 30), within 0.002 of the chart; 16 % curve: 1.285 − 0.0076·x (the sheet's line, within 0.002); 21 %: 1 up to
 *  50 %. Between curves linear in the overpressure. */
export function kb10(x: number): number {
  if (x <= 30) return 1;
  const u = x - 30;
  return 1 - 8.1187e-3 * u - 6.2605e-4 * u * u + 1.26898e-5 * u * u * u;
}
export const kb16 = (x: number) => Math.min(1, 1.285 - 0.0076 * x);
export function kbBellows(x: number, op: number): number {
  if (op <= 10) return kb10(x);
  if (op < 16) { const t = (op - 10) / 6; return kb10(x) * (1 - t) + kb16(x) * t; }
  if (op < 21) { const t = (op - 16) / 5; return kb16(x) * (1 - t) + t; }
  return 1;
}
/** Kw, balanced bellows, liquid (Fig. 31; the sheet's lines, within 0.005 of the chart). x in %. */
export function kwBellows(x: number): number {
  if (x <= 15) return 1;
  if (x <= 20) return 1.075 - 0.005 * x;
  return 1.175 - 0.01 * x;
}
/** Kp, liquid valves without capacity certification (Fig. 37, refitted, PSV-11): cubic 10–25 % (within 0.003),
 *  then 1 + 0.00377·(op − 25) (within 0.002 up to 50 %). */
export function kpOver(op: number): number {
  if (op >= 25) return 1 + 0.00377 * (op - 25);
  return ((2.35747515e-5 * op - 2.31202902e-3) * op + 8.46034832e-2) * op - 3.85959937e-2;
}
/** Kv from the Reynolds number, API 520 Part I 10th ed. (2020): Kv = (1 + 170/Re)^−0.5, valid for Re > 80; tends to 1
 *  as Re grows (the 2000 curve (0.9935 + 2.878/Re^0.5 + 342.75/Re^1.5)^−1 of the original sheet is replaced, PSV-12).
 *  Always computed: the edition's allowance Kv = 1 up to 100 cP is not used (owner 2026-11-26). */
export const kvRe = (Re: number) => 1 / Math.sqrt(1 + 170 / Re);

// ── superheated steam: KSH (GPSA 12th SI Fig. 5-13, adapted from API 520); rows set pressure kPa g, columns °C ──
const KSH_T = [149, 204, 260, 316, 371, 427, 482, 538, 593, 649];
// blank cells (steam cannot be superheated there) are taken as 1
const KSH: [number, number[]][] = [
  [100, [1, 0.98, 0.93, 0.88, 0.84, 0.80, 0.77, 0.74, 0.72, 0.70]],
  [140, [1, 0.98, 0.93, 0.88, 0.84, 0.80, 0.77, 0.74, 0.72, 0.70]],
  [275, [1, 0.99, 0.93, 0.88, 0.84, 0.81, 0.77, 0.74, 0.72, 0.70]],
  [415, [1, 0.99, 0.93, 0.88, 0.84, 0.81, 0.77, 0.75, 0.72, 0.70]],
  [550, [1, 0.99, 0.94, 0.88, 0.84, 0.81, 0.77, 0.75, 0.72, 0.70]],
  [690, [1, 0.99, 0.94, 0.89, 0.84, 0.81, 0.77, 0.75, 0.72, 0.70]],
  [830, [1, 0.99, 0.94, 0.89, 0.84, 0.81, 0.78, 0.75, 0.72, 0.70]],
  [970, [1, 0.99, 0.94, 0.89, 0.85, 0.81, 0.78, 0.75, 0.72, 0.70]],
  [1100, [1, 0.99, 0.94, 0.89, 0.85, 0.81, 0.78, 0.75, 0.72, 0.70]],
  [1250, [1, 0.99, 0.94, 0.89, 0.85, 0.81, 0.78, 0.75, 0.72, 0.70]],
  [1380, [1, 0.99, 0.95, 0.89, 0.85, 0.81, 0.78, 0.75, 0.72, 0.70]],
  [1520, [1, 0.99, 0.95, 0.89, 0.85, 0.81, 0.78, 0.75, 0.72, 0.70]],
  [1660, [1, 1, 0.95, 0.90, 0.85, 0.81, 0.78, 0.75, 0.72, 0.70]],
  [1790, [1, 1, 0.95, 0.90, 0.85, 0.81, 0.78, 0.75, 0.72, 0.70]],
  [1930, [1, 1, 0.96, 0.90, 0.85, 0.81, 0.78, 0.75, 0.72, 0.70]],
  [2070, [1, 1, 0.96, 0.90, 0.85, 0.81, 0.78, 0.75, 0.72, 0.70]],
  [2410, [1, 1, 0.96, 0.90, 0.86, 0.82, 0.78, 0.75, 0.72, 0.70]],
  [2760, [1, 1, 0.96, 0.91, 0.86, 0.82, 0.78, 0.75, 0.72, 0.70]],
  [3450, [1, 1, 0.96, 0.92, 0.86, 0.82, 0.78, 0.75, 0.73, 0.70]],
  [4140, [1, 1, 0.97, 0.92, 0.87, 0.82, 0.79, 0.75, 0.73, 0.70]],
  [5520, [1, 1, 1, 0.95, 0.88, 0.83, 0.79, 0.76, 0.73, 0.70]],
  [6900, [1, 1, 1, 0.96, 0.89, 0.84, 0.78, 0.76, 0.73, 0.71]],
  [8620, [1, 1, 1, 0.97, 0.91, 0.85, 0.80, 0.77, 0.74, 0.71]],
  [10350, [1, 1, 1, 1, 0.93, 0.86, 0.81, 0.77, 0.74, 0.71]],
  [12070, [1, 1, 1, 1, 0.94, 0.86, 0.81, 0.77, 0.73, 0.70]],
  [13790, [1, 1, 1, 1, 0.95, 0.86, 0.80, 0.76, 0.72, 0.69]],
  [17240, [1, 1, 1, 1, 0.95, 0.85, 0.78, 0.73, 0.69, 0.66]],
  [20690, [1, 1, 1, 1, 1, 0.82, 0.74, 0.69, 0.65, 0.62]],
];
export const KSH_RANGE = { pMin: 100, pMax: 20690, tMax: 649 };
const lerp1 = (xs: number[], ys: number[], x: number) => {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  const i = xs.findIndex((v) => v >= x);
  return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
};
/** KSH by bilinear interpolation, set pressure kPa g, temperature °C; clamped to the table (flag `out`). */
export function ksh(setKPag: number, TC: number): { K: number; out: boolean } {
  const ps = KSH.map((r) => r[0]);
  const col = KSH_T.map((_, j) => lerp1(ps, KSH.map((r) => r[1][j]), setKPag));
  const out = setKPag < KSH_RANGE.pMin || setKPag > KSH_RANGE.pMax || TC > KSH_RANGE.tMax;
  return { K: TC <= KSH_T[0] ? 1 : lerp1(KSH_T, col, TC), out };
}

// ── omega method (Leung; Perry 7th Eq. 26-90…26-97; API 520 Part I Appendix D) ──
/** Critical pressure ratio ηc: ηc² + (ω² − 2ω)(1 − ηc)² + 2ω²·ln ηc + 2ω²(1 − ηc) = 0. */
export function etaCritical(w: number): number {
  const f = (e: number) => e * e + (w * w - 2 * w) * (1 - e) ** 2 + 2 * w * w * Math.log(e) + 2 * w * w * (1 - e);
  let lo = 1e-9, hi = 1 - 1e-12;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
  return (lo + hi) / 2;
}
/** Two-phase mass flux, kg/(m²·s): critical G = ηc·√(P0/(v0·ω)); subcritical (Pb > ηc·P0)
 *  G = √(−2[ω·ln ηa + (ω − 1)(1 − ηa)])·√(P0/v0)/(ω(1/ηa − 1) + 1). */
export function omegaFlux(w: number, P0: number, v0: number, Pb: number): { G: number; etac: number; critical: boolean } {
  const etac = etaCritical(w);
  if (Pb <= etac * P0) return { G: etac * Math.sqrt(P0 / (v0 * w)), etac, critical: true };
  const ea = Pb / P0;
  const G = Math.sqrt(-2 * (w * Math.log(ea) + (w - 1) * (1 - ea))) * Math.sqrt(P0 / v0) / (w * (1 / ea - 1) + 1);
  return { G, etac, critical: false };
}

// ── one case ──
export interface Design {
  device: Device; valve: Valve; certified: boolean;
  /** operating valves */
  n: number;
  /** set pressure, Pa abs */
  Pset: number;
  /** typed combination factor (valve + disk); default 0.9 */
  Kc?: number;
}
export interface CaseIn {
  phase: Phase;
  /** relief rate, kg/s */
  W: number;
  /** relieving and total back pressure, Pa abs */
  P1: number; Pb: number;
  /** temperature, K (vapour, two-phase; steam: blank = saturated) */
  T: number;
  M: number; Z: number; k: number;
  /** liquid density kg/m³ and viscosity Pa·s */
  rho: number; mu: number;
  /** two-phase: vapour mass fraction (0–1), ω source */
  x: number; omegaMode: OmegaMode; v9: number; omega: number;
  /** typed overrides (NaN = use the default) */
  Kd: number; Kb: number; Kw: number;
  /** steam: saturation temperature at P1, K (from IAPWS-IF97, given by the caller) */
  Tsat?: number;
}
export interface CaseOut {
  ok: boolean;
  /** required effective area, total of all operating valves, m² */
  A: number;
  /** overpressure above the set pressure, %; back pressure as % of set (gauge) */
  op: number; pbPct: number;
  regime?: 'critical' | 'subcritical' | 'liquid';
  Kd: number; Kc: number;
  Kb?: number; Kw?: number; Kv?: number; Kp?: number; Re?: number; Kn?: number; Ksh?: number; kshOut?: boolean;
  Pcf?: number; C?: number; F2?: number;
  /** liquid: volume flow per valve, L/min; certified area at Kv = 1 */
  Q?: number;
  /** two-phase */
  v0?: number; omega?: number; etac?: number; G?: number; Asum?: number;
  /** steam: superheated? */
  superheat?: boolean;
  warn: string[];
}

/** Vapour area (API 520 Part I Eq. 3.2 / 3.5 in SI); balanced bellows use the critical equation with Kb throughout. */
function vapourArea(W: number, P1: number, Pb: number, T: number, M: number, Z: number, k: number, Kd: number, Kb: number, Kc: number, valve: Valve) {
  const Wh = W * 3600, p1 = P1 / 1000, p2 = Pb / 1000;
  const Pcf = pCritical(P1, k), critical = Pb <= Pcf, C = coefC(k);
  if (critical || valve === 'bellows') {
    return { A: Wh / (C * Kd * p1 * Kb * Kc) * Math.sqrt(T * Z / M) * 1e-6, Pcf, critical, C };
  }
  const F2 = coefF2(k, p2 / p1);
  return { A: 17.9 * Wh / (F2 * Kd * Kc) * Math.sqrt(T * Z / (M * p1 * (p1 - p2))) * 1e-6, Pcf, critical, C, F2 };
}

/** Liquid area, total for n valves (API 520 Part I Eq. 3.9 certified, 3.12 not certified; Q L/min, kPa, mm²), with
 *  Kv by the API iteration on the next larger API 526 orifice, per valve (PSV-3). */
function liquidArea(W: number, rho: number, mu: number, P1: number, Pb: number, Pset: number, n: number,
  Kd: number, Kw: number, Kc: number, certified: boolean, op: number) {
  const G = rho / RHO_W;
  const Qv = W / rho * 60000 / n;                               // L/min per valve
  const Kp = certified ? 1 : kpOver(op);
  const dp = certified ? (P1 - Pb) / 1000 : (1.25 * (Pset - PATM) - (Pb - PATM)) / 1000;   // kPa
  const A1 = 11.78 * Qv / (Kd * Kw * Kc * Kp) * Math.sqrt(G / dp);   // mm² per valve at Kv = 1
  let Kv = 1, Re = NaN, A = A1;
  if (mu > 0) {
    let i = pickOrifice(A1 * 1e-6).i;
    for (let it = 0; it < 20; it++) {
      const Ao = API526[i].a * IN2 * 1e6;                       // mm²
      Re = Qv * 18800 * G / (mu * 1000 * Math.sqrt(Ao));
      Kv = kvRe(Re); A = A1 / Kv;
      if (A <= Ao * (1 + 1e-12) || i === API526.length - 1) break;
      i++;
    }
  }
  return { A: A * 1e-6 * n, Kv, Re, Kp, Q: Qv, dp };
}

export function sizeCase(d: Design, c: CaseIn): CaseOut {
  const warn: string[] = [];
  const setG = d.Pset - PATM;
  const op = (c.P1 - d.Pset) / setG * 100, pbPct = (c.Pb - PATM) / setG * 100;
  const Kc = d.device === 'combo' && d.Kc !== undefined && d.Kc > 0 ? d.Kc : kcDefault(d.device);
  const Kd = Number.isFinite(c.Kd) ? c.Kd : kdDefault(c.phase, d.device, d.certified);
  const base = { op, pbPct, Kd, Kc, warn };
  const bad = (A = NaN): CaseOut => ({ ok: false, A, ...base });
  if (!(c.W > 0) || !(c.P1 > PATM) || !(c.Pb >= 0) || !(d.Pset > PATM) || !(d.n >= 1)) return bad();
  if (c.Pb >= c.P1) { warn.push('Back pressure must be below the relieving pressure.'); return bad(); }
  const bellows = d.valve === 'bellows';
  const kbAuto = bellows ? kbBellows(Math.max(0, pbPct), op) : 1;
  if (bellows && pbPct > 50) warn.push('Back pressure above 50 % of the set pressure: beyond API\'s K<sub>b</sub>/K<sub>w</sub> charts; check the bellows limit and the factor with the manufacturer.');

  if (c.phase === 'vapour') {
    if (![c.T, c.M, c.Z, c.k].every((v) => v > 0)) return bad();
    const Kb = Number.isFinite(c.Kb) ? c.Kb : kbAuto;
    const r = vapourArea(c.W, c.P1, c.Pb, c.T, c.M, c.Z, c.k, Kd, Kb, Kc, d.valve);
    if (bellows && !r.critical) warn.push('Balanced bellows below the critical pressure: K<sub>b</sub> from the manufacturer (API Fig. 30 is limited to critical flow).');
    return { ok: true, A: r.A, ...base, regime: r.critical ? 'critical' : 'subcritical', Kb, Pcf: r.Pcf, C: r.C, F2: r.F2 };
  }
  if (c.phase === 'steam') {
    const Kb = Number.isFinite(c.Kb) ? c.Kb : kbAuto;
    const p1 = c.P1 / 1000, Kn = napierKn(p1);
    const superheat = Number.isFinite(c.T) && c.Tsat !== undefined && c.T > c.Tsat + 0.05;
    const sh = superheat ? ksh(setG / 1000, c.T - 273.15) : { K: 1, out: false };
    if (sh.out) warn.push('Outside the K<sub>SH</sub> table (set pressure 100–20 690 kPa g, up to 649 °C): value at the nearest edge.');
    if (p1 > 22057) warn.push('Above 22 057 kPa a the Napier equation does not apply.');
    const critical = c.Pb <= c.P1 / 2;
    if (!critical) warn.push('Back pressure above about half the relieving pressure: subcritical, where the Napier equation does not apply; use the vapour phase with M, Z and k of steam.');
    const A = 190.4 * c.W * 3600 / (p1 * Kd * Kb * Kc * Kn * sh.K) * 1e-6;
    return { ok: true, A, ...base, regime: critical ? 'critical' : 'subcritical', Kb, Kn, Ksh: sh.K, kshOut: sh.out, superheat };
  }
  if (c.phase === 'liquid') {
    if (!(c.rho > 0) || !(c.mu > 0)) return bad();
    const Kw = Number.isFinite(c.Kw) ? c.Kw : bellows ? kwBellows(Math.max(0, pbPct)) : 1;
    if (!d.certified && op < 10 - 1e-9) warn.push('Valves without capacity certification at less than 10 % overpressure tend to chatter (API Fig. 37); K<sub>p</sub> is extrapolated.');
    const r = liquidArea(c.W, c.rho, c.mu, c.P1, c.Pb, d.Pset, d.n, Kd, Kw, Kc, d.certified, op);
    if (!(r.dp > 0)) { warn.push('No pressure difference across the valve.'); return bad(); }
    if (r.Re < 80) warn.push('Reynolds number below 80: outside the range of the API K<sub>v</sub> equation; very viscous liquid, consult the manufacturer.');
    return { ok: true, A: r.A, ...base, regime: 'liquid', Kw, Kv: r.Kv, Re: r.Re, Kp: d.certified ? undefined : r.Kp, Q: r.Q };
  }
  // two-phase
  if (![c.T, c.M, c.Z, c.k, c.rho].every((v) => v > 0) || !(c.x >= 0 && c.x <= 1)) return bad();
  const vg = c.Z * R * c.T / (c.M * c.P1), v0 = c.x * vg + (1 - c.x) / c.rho;
  let w: number;
  if (c.omegaMode === 'v9') w = c.v9 > 0 ? 9 * (c.v9 / v0 - 1) : NaN;
  else if (c.omegaMode === 'frozen') w = c.x * vg / (v0 * c.k);
  else w = c.omega;
  // sum of areas (the original sheet): vapour part with Kd 0.975, liquid part with the liquid Kd
  let Asum = NaN;
  const kdV = d.device === 'disk' ? 0.62 : 0.975, kdL = kdDefault('liquid', d.device, d.certified);
  const Av = c.x > 0 ? vapourArea(c.W * c.x, c.P1, c.Pb, c.T, c.M, c.Z, c.k, kdV, kbAuto, Kc, d.valve).A : 0;
  if (c.x >= 1) Asum = Av;
  else if (c.mu > 0) {
    const Kw = bellows ? kwBellows(Math.max(0, pbPct)) : 1;
    const l = liquidArea(c.W * (1 - c.x), c.rho, c.mu, c.P1, c.Pb, d.Pset, d.n, kdL, Kw, Kc, d.certified, op);
    if (l.dp > 0) Asum = Av + l.A;
  }
  if (!(w > 0)) { if (c.omegaMode === 'v9' && c.v9 > 0 && c.v9 <= v0) warn.push('v₉ must be larger than v₀ (the mixture expands as the pressure falls).'); return { ...bad(), v0, omega: w, Asum }; }
  const Kb = Number.isFinite(c.Kb) ? c.Kb : 1;
  if (bellows && !Number.isFinite(c.Kb)) warn.push('Two-phase, balanced bellows: K<sub>b</sub> = 1 used; take it from the manufacturer (API Appendix D).');
  const f = omegaFlux(w, c.P1, v0, c.Pb);
  const A = c.W / (Kd * Kb * Kc * f.G);
  if (Number.isFinite(Asum) && Asum < A) warn.push(`The sum of separate vapour and liquid areas (original sheet) is ${Math.round((1 - Asum / A) * 100)} % smaller than the omega-method area.`);
  return { ok: true, A, ...base, regime: f.critical ? 'critical' : 'subcritical', Kb, v0, omega: w, etac: f.etac, G: f.G, Asum };
}

/** Rated flow of one installed valve when relieving this case: W·(A_installed)/(A_required per valve). */
export const ratedFlow = (W: number, Areq: number, n: number, Aorif: number) => W / n * Aorif / (Areq / n);

/** Reaction force at an open discharge to atmosphere (API 520 Part II, 1994, 2.4.1; critical flow of a gas):
 *  F = W·√(2R·k·T/((k + 1)·M)) + A·(P − Patm), the API constant 129 = √(2R) in SI (W kg/s, T K, N). The static
 *  exit pressure P of the choked outlet: P = (W/A)·√(R·Tₛ/(k·M)), Tₛ = 2T/(k + 1) (ideal gas); not below
 *  atmospheric. Outlet inside diameter d, m. */
export function reactionForce(W: number, T: number, M: number, k: number, d: number): { F: number; Pexit: number; Fm: number } {
  const A = Math.PI * d * d / 4;
  const Fm = W * Math.sqrt(2 * R * k * T / ((k + 1) * M));
  const Ts = 2 * T / (k + 1), Pexit = Math.max(PATM, W / A * Math.sqrt(R * Ts / (k * M)));
  return { F: Fm + A * (Pexit - PATM), Pexit, Fm };
}
