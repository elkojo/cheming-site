// Unit lists of the KOD calculator: one selector per category (as the Drum tool), factors from units.ts (exact).
import { quantity, DEFAULT_SETTINGS, type Unit } from './units.ts';

export type KodCat = 'p' | 'temp' | 'rho' | 'mu' | 'dp' | 'len' | 'mflow' | 'vflow' | 'vol' | 'time' | 'ts' | 'vel' | 'area' | 'mom';
const pick = (q: string, labels: string[]): Unit[] => {
  const all = quantity(q).units(DEFAULT_SETTINGS);
  return labels.map((l) => all.find((u) => u.label === l)!).filter(Boolean);
};
const P = ['kPa', 'MPa', 'bar', 'atm', 'psi', 'kg/cm²'];
export const KOD_UNITS: Record<KodCat, Unit[]> = {
  p: pick('pressure', [...P.map((l) => `${l} (A)`), ...P.map((l) => `${l} (G)`)]),
  temp: pick('temp', ['°C (Celsius)', '°F (Fahrenheit)', 'K (Kelvin)', '°R (Rankine)']),
  rho: pick('density', ['kg/m³', 'g/cm³', 'lbm/ft³']),
  mu: pick('mu', ['cP', 'Pa·s', 'lbm/ft·h']),
  dp: pick('length', ['µm', 'mm', 'in']),
  len: pick('length', ['mm', 'm', 'in', 'ft']),
  mflow: pick('mflow', ['kg/s', 'kg/h', 'lbm/s', 'lbm/h']),
  vflow: pick('vflow', ['m³/s', 'm³/h', 'ft³/s', 'ft³/min']),
  vol: pick('volume', ['m³', 'L', 'ft³', 'US gal', 'bbl']),
  time: pick('time', ['s', 'min', 'h']),
  ts: pick('time', ['s', 'min']),
  vel: pick('velocity', ['m/s', 'ft/s']),
  area: pick('area', ['m²', 'ft²']),
  mom: [{ label: 'Pa', f: 1 }, { label: 'lbm/(ft·s²)', f: 0.45359237 / 0.3048 }],
};
export const KOD_DEFAULT_UNITS: Record<KodCat, string> = {
  p: 'bar (A)', temp: '°C (Celsius)', rho: 'kg/m³', mu: 'cP', dp: 'µm', len: 'mm', mflow: 'kg/h', vflow: 'm³/s', vol: 'm³', time: 'min', ts: 's', vel: 'm/s', area: 'm²', mom: 'Pa',
};
export const shortUnit = (label: string) => label.replace(/ \(.*\)$/, (m) => (/\((A|G)\)$/.test(m) ? m : ''));
