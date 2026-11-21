// Properties: physical properties of pure components (native rebuild of the Zoho sheet "Physical Properties of
// Pure Components", Phase 7).
//
// The sheet held the property table of Reid, Prausnitz & Sherwood, The Properties of Gases and Liquids, 3rd ed.
// (1977), Appendix A, with many typing errors (ORIGINAL-ERRORS PROP-*). By the owner's decision (2026-11-21) each
// value now comes from the best evaluated source available, and the 1977 value (errors fixed) is used only where
// nothing newer exists. Every value carries its source id (`SOURCE_LABEL`, full references in src/data/sources.ts).
//
// Data (properties-data.ts) are in SI: K, Pa, m³/mol, J/mol, J/(mol·K), Pa·s, kg/m³, debye. The 1977 energies were
// converted with the thermochemical calorie of the book (4.184 J); output in cal/kcal uses the International Table
// calorie (4.1868 J), as everywhere on the site (owner, 2026-11-21).
import { quantity, DEFAULT_SETTINGS, pressureAbs, type Unit } from './units.ts';
import { COMPOUNDS } from './properties-data.ts';

export { COMPOUNDS };

export const R = 8.314462618;             // J/(mol·K)
const MMHG = 133.322387415;               // Pa
const CAL_IT = 4.1868;                    // J
const BTU = 1055.05585262;                // J (IT)
const LB = 0.45359237;                    // kg
const FT3 = 0.3048 ** 3;                  // m³
const R_F = 5 / 9;

// ── data model ─────────────────────────────────────────────────────────────────
export type ConstKey = 'MW' | 'Tf' | 'Tb' | 'Tc' | 'Pc' | 'Vc' | 'Zc' | 'omega' | 'dipole' | 'dHvb' | 'dHf' | 'dGf';
/** value (SI) and source id */
export type Sourced = [number, string];

/** Temperature-dependent correlation. `a` = coefficients, `T` = validity range [K], `s` = source id. */
export interface Corr {
  f: 'poling' | 'rps' | 'wagner' | 'antoine10' | 'antoineE' | 'harlacher' | 'dippr101' | 'ppds9' | 'dippr105' | 'ppds' | 'point';
  a?: number[]; T?: [number, number]; s: string;
  Tc?: number; Pc?: number; MW?: number; rc?: number;   // equation constants (Wagner, PPDS density, DIPPR 105)
  v?: number; T0?: number;                              // 'point': a single liquid density at T0
}
export interface Compound {
  n: string; f?: string; cas?: string;
  /** name on the original sheet, when it was misspelt or wrong */
  aka?: string;
  c: Partial<Record<ConstKey, Sourced>>;
  k?: Partial<Record<'cp' | 'ps' | 'har' | 'mu' | 'rho', Corr>>;
}

/** Short source labels shown beside each value; full references are in sources.ts (same ids). */
export const SOURCE_LABEL: Record<string, string> = {
  rps77: 'RPS 1977', coolprop: 'CoolProp', 'iupac-crit': 'IUPAC', mathews72: 'Mathews 1972', crc: 'CRC',
  psrk: 'PSRK', pinamartines: 'DIPPR', yaws: 'Yaws', pd: 'Passut–Danner', webbook: 'NIST WebBook', 'cas-cc': 'CAS',
  atct: 'ATcT', 'api-tdb': 'API TDB', trc: 'TRC', poling: 'Poling 2001', muller: 'Müller 2012', cccbdb: 'NIST CCCBDB',
  landolt: 'Landolt-Börnstein', perry: 'Perry (DIPPR)', vdi: 'VDI Heat Atlas', 'iupac-aw': 'IUPAC', 'lemmon-air': 'Lemmon 2000',
  calc: 'calculated', 'calc-s0:crc': 'calc. (Δh_f, S° CRC)', 'calc-s0:yaws': 'calc. (Δh_f, S° Yaws)',
};

// ── search ────────────────────────────────────────────────────────────────────
const norm = (s: string) => s.toLowerCase().replace(/[\s,()'-]+/g, '');

/** Components matching a query (part of the name, the old sheet name, the formula or the CAS number),
 *  best matches first: name starts with the query, then a word of the name, then anywhere; formula and CAS exact. */
export function search(q: string, limit = 50): Compound[] {
  const t = norm(q);
  if (!t) return COMPOUNDS.slice(0, limit);
  const scored: [number, Compound][] = [];
  for (const c of COMPOUNDS) {
    const n = norm(c.n), raw = c.n.toLowerCase();
    let s = 0;
    if (c.cas === q.trim() || (c.f && c.f.toLowerCase() === q.trim().toLowerCase())) s = 5;
    else if (n.startsWith(t)) s = 4;
    else if (raw.split(/[\s,()-]+/).some((w) => w.startsWith(q.trim().toLowerCase()))) s = 3;
    else if (n.includes(t)) s = 2;
    else if (c.aka && norm(c.aka).includes(t)) s = 1;
    if (s) scored.push([s, c]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].n.localeCompare(b[1].n)).slice(0, limit).map((x) => x[1]);
}
export const byName = (name: string) => COMPOUNDS.find((c) => c.n === name);

// ── correlations ──────────────────────────────────────────────────────────────
/** Harlacher (RPS 1977): ln P = A + B/T + C·ln T + D·P/T², P in mmHg; lowest root, found by scanning ln P and bisection. */
export function harlacher(a: number[], T: number): number {
  const [A, B, C, D] = a;
  const f = (y: number) => y - (A + B / T + C * Math.log(T) + D * Math.exp(y) / (T * T));
  let y0 = -20, f0 = f(y0);
  for (let i = 1; i <= 140; i++) {
    const y1 = -20 + 0.25 * i, f1 = f(y1);
    if (f0 * f1 <= 0) {
      let lo = y0, hi = y1;
      for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; }
      return Math.exp((lo + hi) / 2) * MMHG;
    }
    y0 = y1; f0 = f1;
  }
  return NaN;
}

/** Evaluates a correlation at T [K]; SI result (J/(mol·K), Pa, Pa·s or kg/m³). NaN where the equation has no value. */
export function evaluate(k: Corr, T: number, which: 'cp' | 'ps' | 'har' | 'mu' | 'rho'): number {
  const a = k.a ?? [];
  switch (k.f) {
    case 'poling': return R * (a[0] + T * (a[1] + T * (a[2] + T * (a[3] + T * a[4]))));
    case 'rps':
      if (which === 'cp') return 4.184 * (a[0] + T * (a[1] + T * (a[2] + T * a[3])));    // cal/(mol·K), thermochemical
      if (which === 'ps') return Math.exp(a[0] - a[1] / (T + a[2])) * MMHG;              // Antoine, ln P[mmHg]
      if (which === 'mu') return 10 ** (a[0] * (1 / T - 1 / a[1])) * 1e-3;               // log10 μ[cP] = B(1/T − 1/C)
      return NaN;
    case 'wagner': {
      if (T >= k.Tc!) return NaN;
      const tau = 1 - T / k.Tc!;
      return k.Pc! * Math.exp((a[0] * tau + a[1] * tau ** 1.5 + a[2] * tau ** 2.5 + a[3] * tau ** 5) * k.Tc! / T);
    }
    case 'antoine10': return 10 ** (a[0] - a[1] / (T + a[2]));
    case 'antoineE': return Math.exp(a[0] - a[1] / (T + a[2]));
    case 'harlacher': return harlacher(a, T);
    case 'dippr101': return Math.exp(a[0] + a[1] / T + a[2] * Math.log(T) + a[3] * T ** a[4]);
    case 'ppds9': {
      const z = (a[2] - T) / (T - a[3]);
      return z < 0 ? NaN : a[4] * Math.exp(a[0] * Math.cbrt(z) + a[1] * z ** (4 / 3));
    }
    case 'dippr105': return T > a[2] ? NaN : (a[0] / a[1] ** (1 + (1 - T / a[2]) ** a[3])) * k.MW! / 1000;
    case 'ppds': {
      if (T >= k.Tc!) return NaN;
      const tau = 1 - T / k.Tc!;
      return k.rc! + a[0] * tau ** 0.35 + a[1] * tau ** (2 / 3) + a[2] * tau + a[3] * tau ** (4 / 3);
    }
    case 'point': return k.v!;
  }
}

/** Equation shown under each temperature-dependent row, per correlation form. */
export const EQUATION: Record<Corr['f'], string> = {
  poling: 'c_p/R = a0 + a1·T + a2·T² + a3·T³ + a4·T⁴',
  rps: '',
  wagner: 'ln(p/p_c) = (a·τ + b·τ^1.5 + c·τ^2.5 + d·τ^5)/T_r, τ = 1 − T_r',
  antoine10: 'log p = A − B/(T + C)',
  antoineE: 'ln p = A − B/(T + C)',
  harlacher: 'ln p = A + B/T + C·ln T + D·p/T²',
  dippr101: 'ln μ = A + B/T + C·ln T + D·T^E',
  ppds9: 'μ = E·exp(A·z^(1/3) + B·z^(4/3)), z = (C − T)/(T − D)',
  dippr105: 'ρ = A/B^(1 + (1 − T/C)^D)',
  ppds: 'ρ = ρ_c + A·τ^0.35 + B·τ^(2/3) + C·τ + D·τ^(4/3)',
  point: '',
};
const RPS_EQ: Record<string, string> = {
  cp: 'c_p = A + B·T + C·T² + D·T³',
  ps: 'ln p = A − B/(T + C)',
  mu: 'log μ = B·(1/T − 1/C)',
};
export const equationOf = (k: Corr, which: string) => (k.f === 'rps' ? RPS_EQ[which] : EQUATION[k.f]);

/** Assumed range of the 1977 heat-capacity polynomials (not given on the sheet). */
export const RPS_CP_RANGE: [number, number] = [273, 1500];

export interface AtT {
  /** SI value, NaN when there is none at this temperature */
  v: number;
  src: string;
  eq: string;
  /** why there is no value, or a warning: above Tc, outside the equation, extrapolated beyond `range`,
   *  or the 1977 viscosity equation used outside freezing … boiling point */
  warn?: 'aboveTc' | 'noValue' | 'extrapolated' | 'liquidRange';
  /** validity range of the equation, K */
  range?: [number, number];
  /** liquid density given at one temperature only (K) */
  T0?: number;
}

/** Temperature-dependent properties of a component at T [K]. Liquid properties and vapour pressure have no value
 *  above the critical temperature. Each result says which equation and source it used and warns outside the range. */
export function atT(c: Compound, T: number): Partial<Record<'cp' | 'ps' | 'har' | 'mu' | 'rho', AtT>> {
  const out: Partial<Record<'cp' | 'ps' | 'har' | 'mu' | 'rho', AtT>> = {};
  const Tc = c.c.Tc?.[0];
  for (const which of ['cp', 'ps', 'har', 'mu', 'rho'] as const) {
    const k = c.k?.[which];
    if (!k) continue;
    const r: AtT = { v: NaN, src: k.s, eq: equationOf(k, which) };
    const range = k.T ?? (which === 'cp' && k.f === 'rps' ? RPS_CP_RANGE : undefined);
    if (range) r.range = range;
    if (which !== 'cp' && Tc && T >= Tc && k.f !== 'point') {
      r.warn = 'aboveTc';
    } else {
      r.v = evaluate(k, T, which);
      if (k.f === 'point') {
        r.T0 = k.T0;
      } else if (!Number.isFinite(r.v) || r.v <= 0) {
        r.v = NaN; r.warn = 'noValue';
      } else if (range && (T < range[0] - 1e-9 || T > range[1] + 1e-9)) {
        r.warn = 'extrapolated';
      } else if (which === 'mu' && k.f === 'rps') {
        const Tf = c.c.Tf?.[0], Tb = c.c.Tb?.[0];
        if ((Tf && T < Tf) || (Tb && T > Tb)) r.warn = 'liquidRange';
      }
    }
    out[which] = r;
  }
  return out;
}

// ── units ─────────────────────────────────────────────────────────────────────
export const temperature: Unit[] = quantity('temp').units(DEFAULT_SETTINGS).slice(0, 4)
  .map((u) => ({ ...u, label: u.label.replace(/ \(.*\)$/, '') }));
/** absolute pressure units (A) and gauge units (G, + 101.325 kPa), as on the sheet */
export const pressure: Unit[] = (() => {
  const abs = pressureAbs(DEFAULT_SETTINGS).slice(0, 11);
  return [...abs.map(([l, f]) => ({ label: `${l} (A)`, f, off: 0 })), ...abs.map(([l, f]) => ({ label: `${l} (G)`, f, off: 101325 / f }))];
})();
export const viscosity: Unit[] = quantity('mu').units(DEFAULT_SETTINGS);
export const density: Unit[] = quantity('density').units(DEFAULT_SETTINGS);
export const molarVolume: Unit[] = [
  { label: 'm³/kmol', f: 1e-3 }, { label: 'm³/mol', f: 1 }, { label: 'cm³/mol', f: 1e-6 }, { label: 'L/mol', f: 1e-3 },
  { label: 'ft³/lbmol', f: FT3 / (LB * 1000) },
];
/** Unit for a molar quantity that may be shown per mass: `m` = per mass (divide by the molar mass). */
export interface MolarUnit extends Unit { m?: boolean }
// energy per amount; SI base J/mol. Per mass: J/mol ÷ (g/mol) = J/g = kJ/kg.
export const energy: MolarUnit[] = [
  { label: 'kJ/kg', f: 1, m: true }, { label: 'J/g', f: 1, m: true }, { label: 'kcal/kg', f: CAL_IT, m: true },
  { label: 'BTU/lbm', f: BTU / LB / 1000, m: true },
  { label: 'J/mol', f: 1 }, { label: 'kJ/mol', f: 1000 }, { label: 'kJ/kmol', f: 1 }, { label: 'MJ/kmol', f: 1000 },
  { label: 'kcal/mol', f: CAL_IT * 1000 }, { label: 'kcal/kmol', f: CAL_IT }, { label: 'BTU/lbmol', f: BTU / LB / 1000 },
];
// heat capacity; SI base J/(mol·K)
export const heatCap: MolarUnit[] = [
  { label: 'kJ/kg/K', f: 1, m: true }, { label: 'J/g/K', f: 1, m: true }, { label: 'kcal/kg/°C', f: CAL_IT, m: true },
  { label: 'BTU/lbm/°F', f: BTU / LB / 1000 / R_F, m: true },
  { label: 'J/mol/K', f: 1 }, { label: 'kJ/kmol/K', f: 1 }, { label: 'kcal/mol/K', f: CAL_IT * 1000 }, { label: 'kcal/kmol/K', f: CAL_IT },
  { label: 'BTU/lbmol/°F', f: BTU / LB / 1000 / R_F },
];

/** SI value → display unit; molar units per mass need the molar mass (g/mol). */
export function showMolar(u: MolarUnit, si: number, MW?: number): number {
  if (u.m) return MW ? si / MW / u.f : NaN;
  return si / u.f;
}

/** The rows of the constants table, in order: key, label, symbol/formula, unit list, default unit (the sheet's). */
export interface ConstRow { key: ConstKey; label: string; sym: string; kind: 'T' | 'p' | 'Vm' | 'E' | 'one' | 'MW' | 'D'; def: string }
export const CONST_ROWS: ConstRow[] = [
  { key: 'MW', label: 'Molar mass', sym: 'M', kind: 'MW', def: 'kg/kmol' },
  { key: 'Tf', label: 'Freezing point', sym: 'T_f', kind: 'T', def: '°C' },
  { key: 'Tb', label: 'Normal boiling point (1 atm)', sym: 'T_b', kind: 'T', def: '°C' },
  { key: 'dHvb', label: 'Heat of vaporization at T_b', sym: 'Δh_v', kind: 'E', def: 'kJ/kg' },
  { key: 'dHf', label: 'Std. heat of formation (ideal gas, 25 °C)', sym: 'Δh_f°', kind: 'E', def: 'kJ/kg' },
  { key: 'dGf', label: 'Std. Gibbs energy of formation (ideal gas, 25 °C)', sym: 'Δg_f°', kind: 'E', def: 'kJ/kg' },
  { key: 'Tc', label: 'Critical temperature', sym: 'T_c', kind: 'T', def: '°C' },
  { key: 'Pc', label: 'Critical pressure', sym: 'p_c', kind: 'p', def: 'atm (A)' },
  { key: 'Vc', label: 'Critical volume', sym: 'V_c', kind: 'Vm', def: 'm³/kmol' },
  { key: 'Zc', label: 'Critical compressibility', sym: 'Z_c = p_c·V_c/(R·T_c)', kind: 'one', def: '–' },
  { key: 'omega', label: 'Acentric factor', sym: 'ω', kind: 'one', def: '–' },
  { key: 'dipole', label: 'Dipole moment', sym: 'μ_D', kind: 'D', def: 'debye' },
];
export const MW_UNITS: Unit[] = [{ label: 'kg/kmol', f: 1 }, { label: 'g/mol', f: 1 }, { label: 'lbm/lbmol', f: 1 }];
