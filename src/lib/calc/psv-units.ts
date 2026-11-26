// Unit lists of the PSV tool: one selector per category (as the other relief tools), factors from units.ts.
import { quantity, DEFAULT_SETTINGS, type Unit } from './units.ts';

export type PsvCat = 'p' | 'temp' | 'mflow' | 'orif' | 'dens' | 'mu' | 'svol' | 'force' | 'len';
const pick = (q: string, labels: string[]): Unit[] => {
  const all = quantity(q).units(DEFAULT_SETTINGS);
  return labels.map((l) => all.find((u) => u.label === l)!).filter(Boolean);
};
const P = ['kPa', 'MPa', 'bar', 'atm', 'psi', 'kg/cm²'];
const LB = 0.45359237, FT3 = 0.3048 ** 3;

export const PSV_UNITS: Record<PsvCat, Unit[]> = {
  p: pick('pressure', [...P.map((l) => `${l} (G)`), ...P.map((l) => `${l} (A)`)]),
  temp: pick('temp', ['°C (Celsius)', '°F (Fahrenheit)', 'K (Kelvin)', '°R (Rankine)']),
  mflow: pick('mflow', ['kg/s', 'kg/h', 'lbm/s', 'lbm/h']),
  orif: pick('area', ['mm²', 'cm²', 'in²']),
  dens: pick('density', ['kg/m³', 'g/cm³', 'lbm/ft³']),
  mu: pick('mu', ['cP', 'Pa·s', 'lbm/ft·h']),
  svol: [{ label: 'm³/kg', f: 1 }, { label: 'L/kg', f: 1e-3 }, { label: 'ft³/lbm', f: FT3 / LB }],
  force: pick('force', ['N', 'kN', 'lbf', 'kgf']),
  len: pick('length', ['mm', 'in']),
};
export const PSV_DEFAULT_UNITS: Record<PsvCat, string> = {
  p: 'bar (G)', temp: '°C (Celsius)', mflow: 'kg/h', orif: 'in²', dens: 'kg/m³', mu: 'cP', svol: 'm³/kg', force: 'kN', len: 'mm',
};
/** short label beside a value (the temperature list carries the scale names) */
export const shortUnit = (label: string) => label.replace(/ \(.*\)$/, (m) => (/\((A|G)\)$/.test(m) ? m : ''));
