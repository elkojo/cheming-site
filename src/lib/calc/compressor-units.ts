// Unit lists of the Compressor calculator: one selector per category (as Drum and Pump), factors from units.ts (exact).
import { quantity, DEFAULT_SETTINGS, G, type Unit } from './units.ts';

export type CompCat = 'p' | 'temp' | 'mflow' | 'vflow' | 'vstd' | 'head' | 'power';
const pick = (q: string, labels: string[]): Unit[] => {
  const all = quantity(q).units(DEFAULT_SETTINGS);
  return labels.map((l) => all.find((u) => u.label === l)!).filter(Boolean);
};
const P = ['Pa', 'kPa', 'MPa', 'bar', 'atm', 'psi', 'kg/cm²'];
const V = ['m³/h', 'm³/min', 'm³/s', 'm³/day', 'L/s', 'ft³/h', 'ft³/min', 'ft³/s'];
const FT = 0.3048;

export const COMP_UNITS: Record<CompCat, Unit[]> = {
  p: pick('pressure', [...P.map((l) => `${l} (G)`), ...P.map((l) => `${l} (A)`)]),
  temp: [{ label: '°C', f: 1, off: 273.15 }, { label: 'K', f: 1, off: 0 }, { label: '°F', f: 1 / 1.8, off: 459.67 }, { label: '°R', f: 1 / 1.8, off: 0 }],
  mflow: pick('mflow', ['kg/s', 'kg/min', 'kg/h', 'lbm/s', 'lbm/min', 'lbm/h']),
  vflow: pick('vflow', V),
  vstd: [...pick('vflow', V), { label: '10⁶ ft³/day', f: 1e6 * FT ** 3 / 86400 }],
  // head as specific energy (J/kg) or as a height of gas (÷ g)
  head: [{ label: 'm', f: G }, { label: 'ft', f: FT * G }, { label: 'kJ/kg', f: 1000 }, { label: 'J/kg', f: 1 }],
  power: pick('power', ['W', 'kW', 'MW', 'HP']),
};
export const COMP_DEFAULT_UNITS: Record<CompCat, string> = {
  p: 'bar (G)', temp: '°C', mflow: 'kg/s', vflow: 'm³/s', vstd: 'm³/s', head: 'm', power: 'kW',
};

/** Standard reference temperatures offered (all at 101.325 kPa), K */
export const STD_TEMPS: Record<string, number> = { '0': 273.15, '15': 288.15, '20': 293.15, '60F': (60 + 459.67) / 1.8 };
