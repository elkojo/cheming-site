// Unit lists of the Pump calculator: one selector per category (as the Drum tool), factors from units.ts (exact).
import { quantity, pressureAbs, DEFAULT_SETTINGS, type Unit } from './units.ts';

export type PumpCat = 'p' | 'pg' | 'dp' | 'len' | 'dia' | 'rho' | 'mflow' | 'vflow' | 'power' | 'vel' | 'ss';
const pick = (q: string, labels: string[]): Unit[] => {
  const all = quantity(q).units(DEFAULT_SETTINGS);
  return labels.map((l) => all.find((u) => u.label === l)!).filter(Boolean);
};
const P = ['Pa', 'kPa', 'MPa', 'bar', 'atm', 'psi', 'kg/cm²', 'mm Hg'];
const dpAll = pressureAbs(DEFAULT_SETTINGS).filter(([l]) => P.includes(l));
/** US gallon per minute in m³/s (exact) */
export const GPM = 0.003785411784 / 60;
/** 1 rpm·USgpm^0.5/ft^0.75 expressed in rpm·(m³/s)^0.5/m^0.75 */
export const SS_US = Math.sqrt(GPM) / 0.3048 ** 0.75;

export const PUMP_UNITS: Record<PumpCat, Unit[]> = {
  p: pick('pressure', [...P.map((l) => `${l} (A)`), ...P.map((l) => `${l} (G)`)]),
  pg: pick('pressure', [...P.map((l) => `${l} (G)`), ...P.map((l) => `${l} (A)`)]),
  dp: dpAll.map(([label, f]) => ({ label, f })),
  len: pick('length', ['mm', 'cm', 'm', 'in', 'ft']),
  dia: pick('length', ['mm', 'cm', 'm', 'in']),
  rho: pick('density', ['kg/m³', 'g/cm³', 'lbm/ft³', 'lbm/US gal']),
  mflow: pick('mflow', ['kg/s', 'kg/min', 'kg/h', 'lbm/s', 'lbm/min', 'lbm/h']),
  vflow: pick('vflow', ['m³/h', 'm³/min', 'm³/s', 'L/min', 'L/s', 'ft³/min', 'US gal/min', 'UK gal/min']),
  power: pick('power', ['W', 'kW', 'MW', 'HP']),
  vel: pick('velocity', ['m/s', 'ft/s']),
  ss: [{ label: 'rpm·(m³/s)⁰·⁵/m⁰·⁷⁵', f: 1 }, { label: 'rpm·(US gpm)⁰·⁵/ft⁰·⁷⁵', f: SS_US }],
};
export const PUMP_DEFAULT_UNITS: Record<PumpCat, string> = {
  p: 'bar (A)', pg: 'bar (G)', dp: 'bar', len: 'm', dia: 'mm', rho: 'kg/m³', mflow: 'kg/h', vflow: 'm³/h', power: 'kW', vel: 'm/s', ss: 'rpm·(m³/s)⁰·⁵/m⁰·⁷⁵',
};
