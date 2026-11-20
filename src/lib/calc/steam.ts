// Steam: properties of saturated water and steam, and of subcooled water / superheated steam.
// Native rebuild of the Zoho sheet "Properties of Saturated Steam" (Phase 7). The sheet interpolated a table
// generated from IAPWS-IF97; here IF97 is evaluated directly (if97.ts), so there is no interpolation error and
// the range reaches the critical point. Viscosity and thermal conductivity follow the current IAPWS releases
// (2008, 2011); the sheet's table used the older 1985-based correlations (differences up to a few %).
// Unit lists are the sheet's own, with its factor errors fixed (BTU/lb/°F, BTU/lb, °F, gauge offset).
import { satP, satT, stateAt, phaseAt, tsat, R, PC, TC, P_TRIPLE, T_TRIPLE, T_MIN, T_MAX, P_MAX, type State, type Phase } from './if97.ts';
import { quantity, pressureAbs, DEFAULT_SETTINGS, toSI, fromSI, type Unit } from './units.ts';

export { toSI, fromSI, type Unit };

const BTU_LB = 2.326;           // kJ/kg, exact (IT)
const KCAL_IT = 4.1868;         // kJ, International Table kilocalorie (steam-table convention)

/** Pressure units: absolute (A) and gauge (G, + 101.325 kPa); SI base Pa. */
export const pressure: Unit[] = (() => {
  const abs = pressureAbs(DEFAULT_SETTINGS).slice(0, 11);
  return [...abs.map(([l, f]) => ({ label: `${l} (A)`, f, off: 0 })), ...abs.map(([l, f]) => ({ label: `${l} (G)`, f, off: 101325 / f }))];
})();
/** Temperature units; SI base K. */
export const temperature: Unit[] = quantity('temp').units(DEFAULT_SETTINGS).slice(0, 4)
  .map((u) => ({ ...u, label: u.label.replace(/ \(.*\)$/, '') }));

/** Property unit lists, factor to the calculation unit given in `base`. */
export const UNITS: Record<string, { base: string; units: Unit[] }> = {
  rho: { base: 'kg/m³', units: quantity('density').units(DEFAULT_SETTINGS) },
  v: { base: 'm³/kg', units: [{ label: 'm³/kg', f: 1 }, { label: 'L/kg', f: 1e-3 }, { label: 'cm³/g', f: 1e-3 }, { label: 'ft³/lbm', f: 0.028316846592 / 0.45359237 }] },
  h: { base: 'kJ/kg', units: [{ label: 'kJ/kg', f: 1 }, { label: 'kcal/kg', f: KCAL_IT }, { label: 'BTU/lbm', f: BTU_LB }] },
  s: { base: 'kJ/kg/K', units: [{ label: 'kJ/kg/K', f: 1 }, { label: 'kcal/kg/°C', f: KCAL_IT }, { label: 'BTU/lbm/°F', f: KCAL_IT }] },
  mu: { base: 'Pa·s', units: quantity('mu').units(DEFAULT_SETTINGS) },
  k: { base: 'W/m/K', units: quantity('k').units(DEFAULT_SETTINGS) },
  beta: { base: '1/K', units: [{ label: '1/K', f: 1 }, { label: '1/°C', f: 1 }, { label: '1/°F', f: 5 / 9 }] },
  one: { base: '–', units: [{ label: '–', f: 1 }] },
};

/** The properties shown, in order. `unit` is the list in UNITS; `evap` = show the steam − water difference. */
export interface Prop { key: keyof Props; label: string; sym: string; unit: keyof typeof UNITS; def: string; evap?: boolean }
export const PROPS: Prop[] = [
  { key: 'rho', label: 'Density', sym: 'ρ', unit: 'rho', def: 'kg/m³' },
  { key: 'v', label: 'Specific volume', sym: 'v = 1/ρ', unit: 'v', def: 'm³/kg' },
  { key: 'h', label: 'Specific enthalpy', sym: 'h', unit: 'h', def: 'kJ/kg', evap: true },
  { key: 'u', label: 'Specific internal energy', sym: 'u', unit: 'h', def: 'kJ/kg', evap: true },
  { key: 's', label: 'Specific entropy', sym: 's', unit: 's', def: 'kJ/kg/K', evap: true },
  { key: 'cp', label: 'Isobaric heat capacity', sym: 'c_p', unit: 's', def: 'kJ/kg/K' },
  { key: 'cv', label: 'Isochoric heat capacity', sym: 'c_v', unit: 's', def: 'kJ/kg/K' },
  { key: 'kappa', label: 'Isentropic coefficient', sym: 'κ = c_p/c_v', unit: 'one', def: '–' },
  { key: 'Z', label: 'Compressibility', sym: 'Z = p·v/(R·T)', unit: 'one', def: '–' },
  { key: 'beta', label: 'Expansion coefficient', sym: 'β = (1/v)·(∂v/∂T)', unit: 'beta', def: '1/K' },
  { key: 'mu', label: 'Dynamic viscosity', sym: 'μ', unit: 'mu', def: 'cP' },
  { key: 'k', label: 'Thermal conductivity', sym: 'k', unit: 'k', def: 'W/m/K' },
];

export interface Props { rho: number; v: number; h: number; u: number; s: number; cp: number; cv: number; kappa: number; Z: number; beta: number; mu: number; k: number }

export function props(st: State): Props {
  return {
    rho: st.rho, v: 1 / st.rho, h: st.h, u: st.u, s: st.s, cp: st.cp, cv: st.cv, kappa: st.cp / st.cv,
    Z: (st.p * 1000) / (st.rho * R * st.T), beta: st.alpha, mu: st.mu, k: st.k,
  };
}

/** Converts a property from its calculation unit to the chosen display unit. */
export const show = (p: Prop, unit: string, x: number) =>
  fromSI(UNITS[p.unit].units.find((u) => u.label === unit)!, x * UNITS[p.unit].units.find((u) => u.label === UNITS[p.unit].base)!.f);

// ── Saturation: give p or t ─────────────────────────────────────────────────────
export const SAT_P_MIN = P_TRIPLE * 1e6, SAT_P_MAX = PC * 1e6;   // Pa
export const SAT_T_MIN = T_TRIPLE, SAT_T_MAX = TC;               // K

export interface SatResult { p: number; T: number; water: Props; steam: Props }

/** Saturated water and steam from the pressure (Pa abs) or the temperature (K). Throws RangeError outside
 *  the triple point … critical point. */
export function saturated(given: 'p' | 'T', x: number): SatResult {
  const s = given === 'p' ? satP(x / 1e6) : satT(x);
  return { p: s.p * 1e6, T: s.T, water: props(s.liquid), steam: props(s.vapour) };
}

// ── Single phase: give p and t ──────────────────────────────────────────────────
export const PT_P_MAX = P_MAX * 1e6, PT_T_MIN = T_MIN, PT_T_MAX = T_MAX;

export interface PTResult { phase: Phase; tsat: number; props: Props }

/** Subcooled water, superheated steam or supercritical fluid at p (Pa abs) and T (K). Throws RangeError outside
 *  0 °C … 800 °C, p ≤ 100 MPa. tsat is NaN above the critical pressure or below the triple-point pressure. */
export function atPT(p: number, T: number): PTResult {
  const pm = p / 1e6;
  const st = stateAt(pm, T);
  const ts = pm >= P_TRIPLE && pm <= PC ? tsat(pm) : NaN;
  return { phase: phaseAt(pm, T), tsat: ts, props: props(st) };
}

export const PHASE_NAME: Record<Phase, string> = { liquid: 'Subcooled (compressed) water', vapour: 'Superheated steam', supercritical: 'Supercritical fluid' };
