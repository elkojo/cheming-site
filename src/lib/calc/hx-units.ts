// Unit lists of the Heat Exchanger calculator: one selector per category (as Drum, Pump, Compressor). Exact factors;
// calorie = International Table calorie 4.1868 J (site rule), BTU = IT BTU.
import { quantity, DEFAULT_SETTINGS, type Unit } from './units.ts';
import { BTU_HFT2F } from './hx-data.ts';

export type HxCat = 'temp' | 'dt' | 'mflow' | 'cp' | 'lam' | 'power' | 'area' | 'htc' | 'foul' | 'dia' | 'len' | 'rho' | 'vel';
const pick = (q: string, labels: string[]): Unit[] => {
  const all = quantity(q).units(DEFAULT_SETTINGS);
  return labels.map((l) => all.find((u) => u.label === l)!).filter(Boolean);
};
const KCAL = 4186.8, BTU = 1055.05585262, LB = 0.45359237, FT = 0.3048, IN = 0.0254;

export const HX_UNITS: Record<HxCat, Unit[]> = {
  temp: [{ label: '°C', f: 1, off: 273.15 }, { label: 'K', f: 1, off: 0 }, { label: '°F', f: 1 / 1.8, off: 459.67 }, { label: '°R', f: 1 / 1.8, off: 0 }],
  dt: [{ label: 'K', f: 1 }, { label: '°C', f: 1 }, { label: '°F', f: 1 / 1.8 }],
  mflow: [...pick('mflow', ['kg/s', 'kg/min', 'kg/h']), { label: 't/h', f: 1000 / 3600 }, ...pick('mflow', ['lbm/s', 'lbm/min', 'lbm/h'])],
  cp: [{ label: 'kJ/(kg·K)', f: 1000 }, { label: 'J/(kg·K)', f: 1 }, { label: 'kcal/(kg·°C)', f: KCAL }, { label: 'BTU/(lbm·°F)', f: KCAL }],
  lam: [{ label: 'kJ/kg', f: 1000 }, { label: 'J/kg', f: 1 }, { label: 'kcal/kg', f: KCAL }, { label: 'BTU/lbm', f: BTU / LB }],
  power: [{ label: 'W', f: 1 }, { label: 'kW', f: 1000 }, { label: 'MW', f: 1e6 }, { label: 'kcal/h', f: KCAL / 3600 }, { label: '10⁶ kcal/h', f: KCAL * 1e6 / 3600 },
    { label: 'BTU/h', f: BTU / 3600 }, { label: '10⁶ BTU/h', f: BTU * 1e6 / 3600 }],
  area: [{ label: 'm²', f: 1 }, { label: 'ft²', f: FT * FT }],
  htc: [{ label: 'W/(m²·K)', f: 1 }, { label: 'kW/(m²·K)', f: 1000 }, { label: 'kcal/(m²·h·°C)', f: KCAL / 3600 }, { label: 'BTU/(h·ft²·°F)', f: BTU_HFT2F }],
  foul: [{ label: 'm²·K/W', f: 1 }, { label: 'm²·h·°C/kcal', f: 3600 / KCAL }, { label: 'h·ft²·°F/BTU', f: 1 / BTU_HFT2F }],
  dia: [{ label: 'mm', f: 0.001 }, { label: 'in', f: IN }],
  len: [{ label: 'm', f: 1 }, { label: 'ft', f: FT }],
  rho: [{ label: 'kg/m³', f: 1 }, { label: 'lbm/ft³', f: LB / FT ** 3 }],
  vel: [{ label: 'm/s', f: 1 }, { label: 'ft/s', f: FT }],
};
export const HX_DEFAULT_UNITS: Record<HxCat, string> = {
  temp: '°C', dt: 'K', mflow: 'kg/h', cp: 'kcal/(kg·°C)', lam: 'kJ/kg', power: 'kW', area: 'm²', htc: 'kcal/(m²·h·°C)',
  foul: 'm²·h·°C/kcal', dia: 'mm', len: 'm', rho: 'kg/m³', vel: 'm/s',
};
