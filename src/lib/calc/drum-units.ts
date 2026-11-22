// Unit lists of the Drum calculator: one selector per category (owner 2026-11-22), factors from units.ts (exact).
import { quantity, DEFAULT_SETTINGS, type Unit } from './units';

export type DrumCat = 'len' | 'vol' | 'area' | 'flow' | 'time';
const pick = (q: string, labels: string[]): Unit[] => {
  const all = quantity(q).units(DEFAULT_SETTINGS);
  return labels.map((l) => all.find((u) => u.label === l)!).filter(Boolean);
};
export const DRUM_UNITS: Record<DrumCat, Unit[]> = {
  len: pick('length', ['mm', 'cm', 'm', 'in', 'ft']),
  vol: pick('volume', ['m³', 'L', 'ft³', 'US gal', 'UK gal', 'bbl']),
  area: pick('area', ['mm²', 'cm²', 'm²', 'in²', 'ft²']),
  flow: pick('vflow', ['m³/h', 'm³/min', 'm³/s', 'L/h', 'L/min', 'L/s', 'ft³/h', 'ft³/min', 'ft³/s', 'US gal/h', 'US gal/min', 'US gal/s', 'UK gal/min', 'bpd (barrel per day)']),
  time: pick('time', ['s', 'min', 'h']),
};
export const DRUM_DEFAULT_UNITS: Record<DrumCat, string> = { len: 'm', vol: 'm³', area: 'm²', flow: 'm³/h', time: 'min' };
