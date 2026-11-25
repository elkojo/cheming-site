// Unit lists of the Flare Stack calculator: one selector per category, factors from units.ts (exact, IT calorie and BTU).
import { quantity, DEFAULT_SETTINGS, type Unit } from './units.ts';

export type FlCat = 'mflow' | 'temp' | 'dp' | 'dia' | 'len' | 'lhv' | 'power' | 'vel' | 'flux' | 'vflow';
const pick = (q: string, labels: string[]): Unit[] => {
  const all = quantity(q).units(DEFAULT_SETTINGS);
  return labels.map((l) => all.find((u) => u.label === l)!).filter(Boolean);
};
export const FL_UNITS: Record<FlCat, Unit[]> = {
  mflow: pick('mflow', ['kg/s', 'kg/h', 'lbm/s', 'lbm/h']),
  temp: pick('temp', ['°C (Celsius)', '°F (Fahrenheit)', 'K (Kelvin)', '°R (Rankine)']),
  dp: [{ label: 'kPa', f: 1000 }, { label: 'bar', f: 1e5 }, { label: 'psi', f: 6894.757293168 }, { label: 'mm H₂O', f: 9.80665 }],
  dia: pick('length', ['mm', 'm', 'in', 'ft']),
  len: pick('length', ['m', 'ft']),
  lhv: pick('h', ['kJ/kg', 'MJ/kg', 'kcal/kg', 'BTU/lbm']),
  power: pick('power', ['kW', 'MW', 'BTU/h', '10⁶·kcal/h']),
  vel: pick('velocity', ['m/s', 'km/h', 'ft/s', 'mi/h', 'kn (knot)']),
  flux: pick('flux', ['kW/m²', 'W/m²', 'BTU/ft²/h']),
  vflow: pick('vflow', ['m³/h', 'm³/s', 'ft³/min', 'ft³/h']),
};
export const FL_DEFAULT_UNITS: Record<FlCat, string> = {
  mflow: 'kg/h', temp: '°C (Celsius)', dp: 'kPa', dia: 'mm', len: 'm', lhv: 'kJ/kg', power: 'kW', vel: 'm/s', flux: 'kW/m²', vflow: 'm³/h',
};
export const shortUnit = (label: string) => label.replace(/ \((Celsius|Fahrenheit|Kelvin|Rankine|knot)\)$/, (m, n) => (n === 'knot' ? '' : ''));
