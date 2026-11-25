// Unit lists of the Noise calculator: one selector per category, factors from units.ts (exact).
import { quantity, DEFAULT_SETTINGS, type Unit } from './units.ts';

export type NoCat = 'p' | 'temp' | 'mflow' | 'len' | 'vel';
const pick = (q: string, labels: string[]): Unit[] => {
  const all = quantity(q).units(DEFAULT_SETTINGS);
  return labels.map((l) => all.find((u) => u.label === l)!).filter(Boolean);
};
const P = ['kPa', 'MPa', 'bar', 'atm', 'psi', 'kg/cm²'];
export const NO_UNITS: Record<NoCat, Unit[]> = {
  p: pick('pressure', [...P.map((l) => `${l} (A)`), ...P.map((l) => `${l} (G)`)]),
  temp: pick('temp', ['°C (Celsius)', '°F (Fahrenheit)', 'K (Kelvin)', '°R (Rankine)']),
  mflow: pick('mflow', ['kg/s', 'kg/h', 'lbm/s', 'lbm/h']),
  len: pick('length', ['m', 'km', 'ft', 'mi']),
  vel: pick('velocity', ['m/s', 'ft/s']),
};
export const NO_DEFAULT_UNITS: Record<NoCat, string> = { p: 'atm (A)', temp: '°C (Celsius)', mflow: 'kg/s', len: 'km', vel: 'm/s' };
export const shortUnit = (label: string) => label.replace(/ \((Celsius|Fahrenheit|Kelvin|Rankine)\)$/, '');
