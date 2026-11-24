// Gas compressor (native Compressor tool, Phase 7). Rebuilt from the cheming.site Zoho sheet "Compressor" with the
// owner's decisions of 2026-11-24 (ORIGINAL-ERRORS.md COMP-1…7):
// - ideal-gas isentropic / polytropic relations with an average Z (Perry 7th Eqs. 10-64a, 10-71, 10-80a;
//   GPSA 12th Section 13; IPS-E-PR-750), R = 8.314462618 J/(mol·K), heads in kJ/kg and in metres (÷ g) (COMP-1);
// - reciprocating: η is an isentropic efficiency; N = the fewest stages with equal ratios that keep the ACTUAL
//   discharge temperature Ts·[1 + (r^σ − 1)/η] and the ratio per stage within their limits (COMP-5); power for N
//   stages with intercooling to the suction temperature (Perry Eq. 10-80a, COMP-4); default limit 150 °C (API 618);
// - centrifugal: polytropic head and efficiency, power = M·Hp/ηp (COMP-3), discharge temperature of the uncooled
//   casing Ts·r^(σ/ηp) (COMP-2), impellers from a maximum head per impeller (GPSA Eq. 13-41 = IPS Eq. 10);
// - shaft power: recip ÷ mechanical efficiency, centrifugal + Scheel's mechanical losses (GPSA Eq. 13-38);
//   driver input ÷ driver efficiency; motor rating = margin × shaft power (API 618 3.1.2.2: 110 %).
// All quantities SI: Pa (absolute), K, kg/s, m³/s, J/kg, W.
import { G } from './units.ts';

/** Molar gas constant, J/(mol·K) (CODATA 2018, exact) */
export const R_GAS = 8.314462618;
export const P_STD = 101325;

export interface CompInput {
  /** suction and discharge pressure, Pa (A) */
  ps: number; pd: number;
  /** mass flow, kg/s */
  m: number;
  /** molar mass, kg/kmol */
  mw: number;
  /** ratio of specific heats Cp/Cv */
  k: number;
  /** suction temperature, K */
  ts: number;
  zs: number; zd: number;
  // reciprocating
  /** discharge-temperature limit, K */
  tdLim: number;
  /** maximum compression ratio per stage */
  rcLim: number;
  /** isentropic efficiency, fraction */
  etaIs: number;
  /** mechanical efficiency, fraction */
  etaMechR: number;
  // centrifugal
  /** polytropic efficiency, fraction */
  etaP: number;
  /** maximum polytropic head per impeller, m */
  hMax: number;
  /** discharge-temperature limit (uncooled casing), K */
  tdLimC: number;
  // drivers (both machines)
  etaDrv: number;
  /** motor nameplate margin, fraction (1.10) */
  margin: number;
}

export interface Stage { i: number; pin: number; pout: number; tin: number; tdIs: number; td: number }

export interface Recip {
  /** stages needed for the temperature and the ratio limits (continuous) */
  nt: number; nr: number;
  n: number;
  rc: number;
  tdIs: number; td: number;
  /** isentropic head per stage, J/kg */
  hIsStage: number;
  gas: number; shaft: number; drv: number; rating: number;
  stages: Stage[];
  /** the temperature limit cannot be met by any number of stages (limit ≤ Ts) */
  tdImpossible: boolean;
}

export interface Centrif {
  /** adiabatic (isentropic) head, J/kg; polytropic head, J/kg */
  had: number; hp: number;
  /** heads in metres */
  hadM: number; hpM: number;
  /** (n − 1)/n */
  nExp: number;
  etaIs: number;
  td: number;
  nImp: number; nImpExact: number;
  /** polytropic head per impeller, m */
  hImp: number;
  gas: number; mech: number; shaft: number; drv: number; rating: number;
}

export interface CompResult {
  r: number;
  z: number;
  sigma: number;
  /** actual suction volume flow, m³/s */
  vs: number;
  recip: Recip;
  cent: Centrif;
}

/** Actual suction volume flow ↔ mass flow at suction: M = Ps·V·Mw/(Zs·R·Ts). */
export const massFromVol = (v: number, ps: number, mw: number, zs: number, ts: number) => ps * v * mw / (zs * R_GAS * 1000 * ts);
export const volFromMass = (m: number, ps: number, mw: number, zs: number, ts: number) => m * zs * R_GAS * 1000 * ts / (ps * mw);
/** Standard volume flow (ideal gas, Z = 1 at standard conditions, COMP-6). */
export const stdFromMass = (m: number, mw: number, tStd: number) => m * R_GAS * 1000 * tStd / (mw * P_STD);
export const massFromStd = (v: number, mw: number, tStd: number) => v * mw * P_STD / (R_GAS * 1000 * tStd);

/** Maximum polytropic head per impeller, m: GPSA Eq. 13-41 (ft) = IPS-E-PR-750 Eq. 10 (m). */
export const hMaxImpeller = (mw: number) => 0.3048 * (15000 - 1500 * mw ** 0.35);

/** Scheel's mechanical losses, W (GPSA 12th SI Eq. 13-38, gas power in kW). */
export const scheelLosses = (gas: number) => 1000 * (gas / 1000) ** 0.4;

export function compressor(x: CompInput): CompResult {
  const r = x.pd / x.ps;
  const z = (x.zs + x.zd) / 2;
  const s = (x.k - 1) / x.k;
  const rt = z * R_GAS * 1000 * x.ts / x.mw;      // Z·R·T/Mw, J/kg
  const vs = volFromMass(x.m, x.ps, x.mw, x.zs, x.ts);

  // ── reciprocating ──
  const tRise = 1 + x.etaIs * (x.tdLim / x.ts - 1);   // allowed r_stage^σ
  const tdImpossible = !(tRise > 1);
  const nt = tdImpossible ? Infinity : s * Math.log(r) / Math.log(tRise);
  const nr = Math.log(r) / Math.log(x.rcLim);
  const n = tdImpossible ? NaN : Math.max(1, Math.ceil(Math.max(nt, nr) - 1e-12));
  const rc = r ** (1 / n);
  const tdIs = x.ts * rc ** s;
  const td = x.ts * (1 + (rc ** s - 1) / x.etaIs);
  const hIsStage = rt / s * (rc ** s - 1);
  const gasR = x.m * n * hIsStage / x.etaIs;
  const shaftR = gasR / x.etaMechR;
  const stages: Stage[] = [];
  if (Number.isFinite(n) && n <= 50) for (let i = 1; i <= n; i++) stages.push({ i, pin: x.ps * rc ** (i - 1), pout: x.ps * rc ** i, tin: x.ts, tdIs, td });

  // ── centrifugal ──
  const had = rt / s * (r ** s - 1);
  const nExp = s / x.etaP;
  const hp = rt / nExp * (r ** nExp - 1);
  const etaIsC = (r ** s - 1) / (r ** nExp - 1);
  const tdC = x.ts * r ** nExp;
  const hpM = hp / G;
  const nImpExact = hpM / x.hMax;
  const nImp = Math.max(1, Math.ceil(nImpExact - 1e-12));
  const gasC = x.m * hp / x.etaP;
  const mech = scheelLosses(gasC);
  const shaftC = gasC + mech;

  return {
    r, z, sigma: s, vs,
    recip: {
      nt, nr, n, rc, tdIs, td, hIsStage, gas: gasR, shaft: shaftR, drv: shaftR / x.etaDrv,
      rating: x.margin * shaftR, stages, tdImpossible,
    },
    cent: {
      had, hp, hadM: had / G, hpM, nExp, etaIs: etaIsC, td: tdC, nImp, nImpExact, hImp: hpM / nImp,
      gas: gasC, mech, shaft: shaftC, drv: shaftC / x.etaDrv, rating: x.margin * shaftC,
    },
  };
}
