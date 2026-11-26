// Unit lists of the Pressurizing & Depressurizing tool: one selector per category, factors from units.ts.
import { quantity, DEFAULT_SETTINGS, type Unit } from './units.ts';

export type PrsCat = 'p' | 'temp' | 'vol' | 'mflow' | 'qstd' | 'mass' | 'time' | 'len' | 'mu';
const pick = (q: string, labels: string[]): Unit[] => {
  const all = quantity(q).units(DEFAULT_SETTINGS);
  return labels.map((l) => all.find((u) => u.label === l)!).filter(Boolean);
};
const P = ['kPa', 'MPa', 'bar', 'atm', 'psi', 'kg/cm²'];
const FT3 = 0.3048 ** 3;

export const PRS_UNITS: Record<PrsCat, Unit[]> = {
  p: pick('pressure', [...P.map((l) => `${l} (G)`), ...P.map((l) => `${l} (A)`)]),
  temp: pick('temp', ['°C (Celsius)', '°F (Fahrenheit)', 'K (Kelvin)', '°R (Rankine)']),
  vol: pick('volume', ['m³', 'L', 'ft³', 'US gal', 'bbl']),
  mflow: pick('mflow', ['kg/s', 'kg/h', 'lbm/s', 'lbm/h']),
  // standard volume flow, SI m³/s at the chosen standard conditions
  qstd: [{ label: 'm³/h', f: 1 / 3600 }, { label: 'm³/d', f: 1 / 86400 }, { label: '10⁶ m³/d', f: 1e6 / 86400 }, { label: 'ft³/h', f: FT3 / 3600 }, { label: 'MMSCFD', f: 1e6 * FT3 / 86400 }],
  mass: pick('mass', ['kg', 't (tonne)', 'lbm']),
  time: pick('time', ['s', 'min', 'h']),
  len: pick('length', ['mm', 'in']),
  mu: pick('mu', ['cP', 'Pa·s']),
};
export const PRS_DEFAULT_UNITS: Record<PrsCat, string> = {
  p: 'psi (G)', temp: '°C (Celsius)', vol: 'm³', mflow: 'kg/h', qstd: 'm³/h', mass: 'kg', time: 'h', len: 'mm', mu: 'cP',
};
export const shortUnit = (label: string) => label.replace(/ \(.*\)$/, (m) => (/\((A|G)\)$/.test(m) ? m : ''));
