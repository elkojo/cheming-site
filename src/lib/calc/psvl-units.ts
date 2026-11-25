// Unit lists of PSV: Liquid Filled Vessel: one selector per category (as the Drum tool), factors from units.ts (exact,
// International Table calorie and BTU; fixes PSVL-8).
import { quantity, DEFAULT_SETTINGS, type Unit } from './units.ts';

export type PsvlCat = 'len' | 'area' | 'orif' | 'power' | 'lat' | 'mflow' | 'temp' | 'p' | 'k' | 'thk';
const pick = (q: string, labels: string[]): Unit[] => {
  const all = quantity(q).units(DEFAULT_SETTINGS);
  return labels.map((l) => all.find((u) => u.label === l)!).filter(Boolean);
};
const P = ['kPa', 'MPa', 'bar', 'atm', 'psi', 'kg/cm²'];

export const PSVL_UNITS: Record<PsvlCat, Unit[]> = {
  len: pick('length', ['mm', 'm', 'in', 'ft']),
  area: pick('area', ['m²', 'ft²']),
  orif: pick('area', ['mm²', 'cm²', 'in²']),
  power: pick('power', ['W', 'kW', 'MW', 'kcal/h', '10⁶·kcal/h', 'BTU/h', 'HP']),
  lat: pick('h', ['kJ/kg', 'kcal/kg', 'BTU/lbm']),
  mflow: pick('mflow', ['kg/s', 'kg/h', 'lbm/s', 'lbm/h']),
  temp: pick('temp', ['°C (Celsius)', '°F (Fahrenheit)', 'K (Kelvin)', '°R (Rankine)']),
  p: pick('pressure', [...P.map((l) => `${l} (G)`), ...P.map((l) => `${l} (A)`)]),
  k: pick('k', ['W/m/K', 'BTU·in/h/ft²/°F']),
  thk: pick('length', ['mm', 'in']),
};
export const PSVL_DEFAULT_UNITS: Record<PsvlCat, string> = {
  len: 'm', area: 'm²', orif: 'mm²', power: 'kW', lat: 'kJ/kg', mflow: 'kg/h', temp: '°C (Celsius)', p: 'bar (G)', k: 'W/m/K', thk: 'mm',
};
/** short label shown beside a value (the temperature list carries the scale names) */
export const shortUnit = (label: string) => label.replace(/ \(.*\)$/, (m) => (/\((A|G)\)$/.test(m) ? m : ''));
