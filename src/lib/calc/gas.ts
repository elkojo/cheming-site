// Gas Equation: real-gas law p·V = n·R·T·Z. Converts between mass, volumetric, molar and standard
// volumetric flow, and gives unit (molar) volume, density and specific volume at the stated conditions.
// Native rebuild of the Zoho sheet (Phase 7). Unit lists are the sheet's own (owner's source workbook).
//
// The source sheet looked up the temperature offset and the gauge-pressure offset in an empty column
// (VLOOKUP column 4 instead of 3), so °C and °F were treated as K and R, and gauge pressures as absolute.
// Here every unit is converted properly; tests/gas.test.ts reproduces the Zoho numbers by entering
// the temperatures in kelvin, as the sheet effectively did, and checks the corrected results separately.

/** Molar gas constant, J/(mol·K) = kJ/(kmol·K), exact since the 2019 SI redefinition. The sheet used 8.314. */
export const R_SI = 8.314462618;

/** Atmospheric pressure for gauge units, Pa (the sheet's value). */
export const P_ATM = 101325;

export interface Unit { label: string; f: number; off?: number }
// value in SI = (value + off) · f, except temperature (see toKelvin)

export const temperature: Unit[] = [
  { label: '°C', f: 1, off: 273.15 },
  { label: '°F', f: 5 / 9, off: 459.67 },
  { label: 'K', f: 1, off: 0 },
  { label: '°R', f: 5 / 9, off: 0 },
];

const psi = 6894.757293168;
const mmHg = 133.322387415;
// absolute units, then the same as gauge (offset = atmosphere in that unit)
const pAbs: [string, number][] = [
  ['Pa', 1], ['kPa', 1e3], ['MPa', 1e6], ['bar', 1e5], ['atm', 101325], ['psi', psi],
  ['psf', psi / 144], ['torr', 101325 / 760], ['kg/cm²', 98066.5], ['mm Hg', mmHg],
];
export const pressure: Unit[] = [
  ...pAbs.map(([u, f]) => ({ label: `${u} a`, f, off: 0 })),
  ...pAbs.map(([u, f]) => ({ label: `${u} g`, f, off: P_ATM / f })),
];

const LB = 0.45359237;
export const massFlow: Unit[] = [
  { label: 'kg/s', f: 1 }, { label: 'kg/min', f: 1 / 60 }, { label: 'kg/h', f: 1 / 3600 }, { label: 'kg/d', f: 1 / 86400 },
  { label: 'lb/s', f: LB }, { label: 'lb/min', f: LB / 60 }, { label: 'lb/h', f: LB / 3600 }, { label: 'lb/d', f: LB / 86400 },
];

const FT3 = 0.028316846592;
const UKGAL = 0.00454609;
const USGAL = 0.003785411784;
const UKOZ = UKGAL / 160;
const per = (u: string, f: number): [string, number][] => [[`${u}/s`, f], [`${u}/min`, f / 60], [`${u}/h`, f / 3600], [`${u}/d`, f / 86400]];
const vol: [string, number][] = [
  ['10⁶ m³/d', 1e6 / 86400], ...per('m³', 1), ...per('l', 1e-3).slice(0, 4), ...per('cm³', 1e-6).slice(0, 3),
  ['10⁶ ft³/d', 1e6 * FT3 / 86400], ...per('ft³', FT3),
  ...per('UK gal', UKGAL), ...per('US gal', USGAL), ...per('UK fl oz', UKOZ).slice(0, 3),
];
export const volumeFlow: Unit[] = vol.map(([label, f]) => ({ label, f }));
export const stdVolumeFlow: Unit[] = vol.map(([label, f]) => ({ label: `Std ${label}`, f }));

export const molarFlow: Unit[] = [
  { label: 'mol/s', f: 1e-3 }, { label: 'mol/min', f: 1e-3 / 60 }, { label: 'mol/h', f: 1e-3 / 3600 },
  { label: 'kmol/s', f: 1 }, { label: 'kmol/min', f: 1 / 60 }, { label: 'kmol/h', f: 1 / 3600 },
  { label: 'lbmol/h', f: LB / 3600 },
];

export const density: Unit[] = [
  { label: 'kg/m³', f: 1 }, { label: 'g/cm³', f: 1000 }, { label: 'g/m³', f: 1e-3 },
  { label: 'lb/ft³', f: LB / FT3 }, { label: 'lb/in³', f: LB / (FT3 / 1728) },
  { label: 'lb/US gal', f: LB / USGAL }, { label: 'lb/UK gal', f: LB / UKGAL }, { label: 'oz/US gal', f: LB / 16 / USGAL },
];

export const unit = (list: Unit[], label: string) => {
  const u = list.find((x) => x.label === label);
  if (!u) throw new Error(`unknown unit ${label}`);
  return u;
};
/** Value in the given unit → SI (K, Pa, kg/s, m³/s, kmol/s, kg/m³). */
export const toSI = (list: Unit[], label: string, x: number) => { const u = unit(list, label); return (x + (u.off ?? 0)) * u.f; };
/** SI → value in the given unit. */
export const fromSI = (list: Unit[], label: string, x: number) => { const u = unit(list, label); return x / u.f - (u.off ?? 0); };

export type Given = 'M' | 'V' | 'N' | 'Vstd';

export interface State {
  T: number; p: number; Z: number; Mw: number;   // K, Pa, -, kg/kmol (Mw may be NaN: no mass results)
  Tstd: number; pstd: number;                    // K, Pa
  given: Given; flow: number;                    // the known flow in SI (kg/s, m³/s, kmol/s, Std m³/s); NaN = none
}

export interface Result {
  uv: number;     // unit (molar) volume at t, p: m³/kmol
  uvStd: number;  // at standard conditions (Z as at t, p: the sheet's note 1)
  rho: number;    // kg/m³
  v: number;      // specific volume m³/kg
  M: number; V: number; N: number; Vstd: number;   // kg/s, m³/s, kmol/s, Std m³/s
}

/** Every result it can compute from the inputs given; the rest NaN. */
export function solve(s: State, R = R_SI): Result {
  const ok = (x: number) => Number.isFinite(x) && x > 0;
  const cond = ok(s.T) && ok(s.p) && ok(s.Z);
  const uv = cond ? (s.Z * R * s.T * 1000) / s.p : NaN;
  const uvStd = ok(s.Z) && ok(s.Tstd) && ok(s.pstd) ? (s.Z * R * s.Tstd * 1000) / s.pstd : NaN;
  const rho = ok(s.Mw) ? s.Mw / uv : NaN;
  const f = Number.isFinite(s.flow) && s.flow >= 0 ? s.flow : NaN;
  const N = s.given === 'N' ? f : s.given === 'M' ? (ok(s.Mw) ? f / s.Mw : NaN) : s.given === 'V' ? f / uv : f / uvStd;
  return {
    uv, uvStd, rho, v: 1 / rho,
    M: s.given === 'M' ? f : ok(s.Mw) ? N * s.Mw : NaN,
    V: s.given === 'V' ? f : N * uv,
    N,
    Vstd: s.given === 'Vstd' ? f : N * uvStd,
  };
}
