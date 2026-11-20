// Unit Conversion: 30 engineering quantities, each with the Zoho sheet's unit list.
// Native rebuild of the Zoho sheet (Phase 7). Unit lists from the owner's source workbook; factors are the
// exact definitions (SI, international foot/pound, IT BTU, International Table calorie), not the sheet's rounded
// numbers. Corrected against the sheet: cal·cm/(s·cm²·°C) (100× too small), cSt (10⁶× too large),
// teaspoon/tablespoon (swapped), drop (was a grain's mass), 10⁶·kcal/h (used 4.183 instead of the sheet's own 4.184),
// liquid-column gauge offsets (used g = 9.81). Removed: t/yd³ (factor matched no ton), and the empirical
// viscosity scales SSU, °Engler, s Redwood. Approved by the owner 2026-11-20 (layout, format, removals).
//
// A value converts as SI = (x + off)·f and back as x = SI/f − off. `off` is only used for temperature
// scales and gauge pressures; everything else is a plain factor.

export interface Unit { label: string; f: number; off?: number }

export interface Settings {
  /** Atmospheric pressure for gauge units, Pa. */
  pAtm: number;
  /** Density of the fluid in "column" units (m column, mm column …), kg/m³. */
  rhoCol: number;
}
export const DEFAULT_SETTINGS: Settings = { pAtm: 101325, rhoCol: 1000 };

export interface Quantity {
  id: string;
  name: string;
  /** SI (reference) unit, for the record */
  si: string;
  units: (s: Settings) => Unit[];
  /** typical case: value (used by the tests; the page starts empty), and the units each row starts on */
  example: [number, string, string];
  /** lowest valid value in SI (absolute temperature, absolute pressure); none = any number */
  min?: number;
  note?: string;
}

// ── exact base constants ─────────────────────────────────────────────────────────
export const G = 9.80665;                    // standard gravity, m/s²
const IN = 0.0254, FT = 0.3048, YD = 0.9144, MI = 1609.344;
const FT2 = FT * FT, IN2 = IN * IN;
const FT3 = FT * FT * FT, IN3 = IN * IN * IN;
const LB = 0.45359237;                       // kg
const OZ = LB / 16;
const USGAL = 231 * IN3;                     // 0.003785411784 m³
const UKGAL = 0.00454609;
// International Table calorie (5th Int. Conf. on the Properties of Steam, 1956; NIST SP 811): the steam-table and
// process-engineering calorie, consistent with the IT BTU (1 kcal/(kg·°C) = 1 BTU/(lb·°F)). The sheet used the
// thermochemical 4.184 J; changed by the owner's decision 2026-11-20, same value as the Steam tool.
const CAL = 4.1868;                          // J
const BTU = 1055.05585262;                   // IT BTU, J
const LBF = LB * G;                          // N
const PSI = LBF / IN2;                       // Pa
const ATM = 101325;
const TORR = ATM / 760;
const MMHG = 133.322387415;
const R = 8.314462618;                       // J/(mol·K), for standard volumes
const R_F = 5 / 9;                           // 1 °F (or °R) step in K

const u = (label: string, f: number, off?: number): Unit => (off === undefined ? { label, f } : { label, f, off });
const fixed = (list: Unit[]) => () => list;
/** "kg/s, kg/min, kg/h, kg/day"-style rates */
const rates = (unit: string, f: number, per: [string, number][]) => per.map(([t, s]) => u(`${unit}/${t}`, f / s));

// ── the 30 quantities, in the sheet's order ──────────────────────────────────────
export const QUANTITIES: Quantity[] = [
  { id: 'acc', name: 'Acceleration', si: 'm/s²', example: [1, 'free fall (g)', 'm/s²'],
    units: fixed([u('mm/s²', 1e-3), u('cm/s²', 1e-2), u('m/s²', 1), u('free fall (g)', G), u('ft/s²', FT), u('mile/h/s', MI / 3600)]) },
  { id: 'amount', name: 'Amount of Substance', si: 'mol', example: [1, 'kmol', 'std m³ (0 °C, 1 atm)'],
    note: 'Standard volumes of an ideal gas: <i>n</i> = <i>p</i>·<i>V</i>/(<i>R</i>·<i>T</i>), <i>R</i> = 8.314462618 J/(mol·K).',
    units: fixed([u('mol', 1), u('kmol', 1000), u('lbm.mol', LB * 1000),
      u('std m³ (0 °C, 1 atm)', ATM / (R * 273.15)), u('std ft³ (60 °F, 1 atm)', ATM * FT3 / (R * (60 + 459.67) * R_F))]) },
  { id: 'angle', name: 'Angle', si: '°', example: [1, 'rad', '° (degree)'],
    units: fixed([u('° (degree)', 1), u('min', 1 / 60), u('s (second)', 1 / 3600), u('grad', 0.9), u('rad', 180 / Math.PI), u('rev (revolution)', 360)]) },
  { id: 'area', name: 'Area', si: 'm²', example: [1, 'm²', 'ft²'],
    units: fixed([u('mm²', 1e-6), u('cm²', 1e-4), u('dm²', 1e-2), u('m²', 1), u('km²', 1e6), u('ha (hectare)', 1e4),
      u('in²', IN2), u('ft²', FT2), u('yd²', YD * YD), u('mi²', MI * MI), u('acre', 4840 * YD * YD)]) },
  { id: 'density', name: 'Density', si: 'kg/m³', example: [1000, 'kg/m³', 'lbm/ft³'],
    units: fixed([u('g/cm³', 1000), u('g/m³', 1e-3), u('kg/m³', 1), u('oz/US gal', OZ / USGAL), u('lbm/ft³', LB / FT3),
      u('lbm/in³', LB / IN3), u('lbm/US gal', LB / USGAL), u('lbm/UK gal', LB / UKGAL)]) },
  { id: 'energy', name: 'Energy, Work', si: 'J', example: [1, 'kW·h', 'MJ'],
    units: fixed([u('J', 1), u('kJ', 1e3), u('MJ', 1e6), u('M·kJ', 1e9), u('cal', CAL), u('kcal', CAL * 1e3), u('10⁶·kcal', CAL * 1e9),
      u('W·h', 3600), u('kW·h', 3.6e6), u('BTU', BTU), u('eV', 1.602176634e-19), u('erg', 1e-7)]) },
  { id: 'force', name: 'Force', si: 'N', example: [1, 'kgf', 'N'],
    units: fixed([u('dyn', 1e-5), u('gf', G / 1000), u('kgf', G), u('kN', 1e3), u('mN', 1e-3), u('N', 1), u('ozf', LBF / 16), u('lbf', LBF)]) },
  { id: 'cp', name: 'Heat Capacity, Entropy', si: 'J/(kg·K)', example: [1, 'kcal/kg/°C', 'kJ/kg/K'],
    units: fixed([u('J/kg/K', 1), u('kJ/kg/K', 1e3), u('MJ/kg/K', 1e6), u('kcal/kg/K', CAL * 1e3), u('kcal/kg/°C', CAL * 1e3),
      u('cal/g/K', CAL * 1e3), u('kcal/lbm/K', CAL * 1e3 / LB), u('BTU/lbm/°F', BTU / LB / R_F), u('BTU/lbm/°R', BTU / LB / R_F),
      u('kWh/kg/°C', 3.6e6)]) },
  { id: 'k', name: 'Heat Conductivity', si: 'W/(m·K)', example: [1, 'W/m/K', 'BTU·ft/h/ft²/°F'],
    units: fixed([u('W/m/K', 1), u('kW/m/K', 1e3), u('kJ·m/h/m²/K', 1000 / 3600), u('cal·cm/s/cm²/°C', CAL * 100),
      u('cal·cm/h/cm²/°C', CAL * 100 / 3600), u('kcal·m/h/m²/°C', CAL * 1000 / 3600),
      u('BTU·ft/h/ft²/°F', BTU * FT / (3600 * FT2 * R_F)), u('BTU·in/h/ft²/°F', BTU * IN / (3600 * FT2 * R_F))]) },
  { id: 'h', name: 'Heat Exchanged, Enthalpy', si: 'J/kg', example: [1, 'BTU/lbm', 'kJ/kg'],
    units: fixed([u('J/kg', 1), u('kJ/kg', 1e3), u('MJ/kg', 1e6), u('cal/g', CAL * 1e3), u('cal/lbm', CAL / LB),
      u('kcal/kg', CAL * 1e3), u('BTU/lbm', BTU / LB), u('kWh/kg', 3.6e6)]) },
  { id: 'flux', name: 'Heat Transfer, Radiation', si: 'W/m²', example: [1, 'kW/m²', 'BTU/ft²/h'],
    units: fixed([u('J/m²/h', 1 / 3600), u('J/m²/min', 1 / 60), u('J/m²/s', 1), u('kJ/m²/h', 1e3 / 3600), u('kJ/m²/min', 1e3 / 60),
      u('kJ/m²/s', 1e3), u('W/m²', 1), u('kW/m²', 1e3), u('BTU/ft²/h', BTU / FT2 / 3600), u('BTU/ft²/min', BTU / FT2 / 60),
      u('BTU/ft²/s', BTU / FT2), u('cal/cm²/h', CAL / 1e-4 / 3600)]) },
  { id: 'fouling', name: 'Heat Resistance, Fouling', si: 'm²·K/W', example: [0.0002, 'm²·K/W', 'h·ft²·°F/BTU'],
    units: fixed([u('m²·h·K/J', 3600), u('m²·min·K/J', 60), u('m²·s·K/J', 1), u('m²·h·K/kJ', 3.6), u('m²·min·K/kJ', 0.06),
      u('m²·s·K/kJ', 1e-3), u('m²·K/W', 1), u('m²·K/kW', 1e-3),
      u('h·ft²·°F/BTU', 3600 * FT2 * R_F / BTU), u('min·ft²·°F/BTU', 60 * FT2 * R_F / BTU), u('s·ft²·°F/BTU', FT2 * R_F / BTU),
      u('h·ft²·°R/BTU', 3600 * FT2 * R_F / BTU), u('cm²·s·°C/cal', 1e-4 / CAL), u('cm²·h·°C/cal', 3600e-4 / CAL),
      u('m²·h·°C/kcal', 3600 / (CAL * 1e3))]) },
  { id: 'htc', name: 'Heat Transfer', si: 'W/(m²·K)', example: [1000, 'W/m²/K', 'BTU/h/ft²/°F'],
    units: fixed([u('J/m²/h/K', 1 / 3600), u('J/m²/min/K', 1 / 60), u('J/m²/s/K', 1), u('kJ/m²/h/K', 1e3 / 3600),
      u('kJ/m²/min/K', 1e3 / 60), u('kJ/m²/s/K', 1e3), u('W/m²/K', 1), u('kW/m²/K', 1e3),
      u('BTU/h/ft²/°F', BTU / (3600 * FT2 * R_F)), u('BTU/min/ft²/°F', BTU / (60 * FT2 * R_F)), u('BTU/s/ft²/°F', BTU / (FT2 * R_F)),
      u('BTU/h/ft²/°R', BTU / (3600 * FT2 * R_F)), u('cal/cm²/s/°C', CAL / 1e-4), u('cal/cm²/h/°C', CAL / 1e-4 / 3600),
      u('kcal/m²/h/°C', CAL * 1e3 / 3600)]) },
  { id: 'length', name: 'Length', si: 'm', example: [1, 'in', 'mm'],
    units: fixed([u('nm', 1e-9), u('µm', 1e-6), u('mm', 1e-3), u('cm', 1e-2), u('dm', 0.1), u('m', 1), u('hm', 100), u('km', 1e3),
      u('ly', 9460730472580800), u('pc', 3.0856775814913673e16), u('in', IN), u('ft', FT), u('yd', YD), u('mi', MI),
      u('nmi (nautical mile)', 1852), u('fath', 6 * FT), u('mil', IN / 1000), u('AU', 149597870700)]) },
  { id: 'light', name: 'Light', si: 'lx', example: [1, 'fc (foot-candle)', 'lx (lux)'],
    units: fixed([u('flame', 4 / FT2), u('fc (foot-candle)', 1 / FT2), u('lx (lux)', 1), u('mc (meter-candle)', 1)]) },
  { id: 'mass', name: 'Mass', si: 'kg', example: [1, 'lbm', 'kg'],
    units: fixed([u('µg', 1e-9), u('mg', 1e-6), u('g', 1e-3), u('kg', 1), u('t (tonne)', 1e3), u('Mg', 1e3), u('ct (carat)', 2e-4),
      u('st (stone)', 14 * LB), u('lbm', LB), u('lbm (troy)', 0.3732417216), u('oz', OZ), u('oz (troy)', 0.0311034768),
      u('UK t (long ton)', 2240 * LB), u('US tn (short ton)', 2000 * LB)]) },
  { id: 'mflow', name: 'Mass Flow', si: 'kg/s', example: [1000, 'kg/h', 'lbm/h'],
    units: fixed([...rates('kg', 1, [['s', 1], ['min', 60], ['h', 3600], ['day', 86400]]),
      ...rates('lbm', LB, [['s', 1], ['min', 60], ['h', 3600], ['day', 86400]])]) },
  { id: 'power', name: 'Power, Heat Flow, Duty', si: 'W', example: [1, 'MW', 'BTU/h'],
    units: fixed([u('W', 1), u('kW', 1e3), u('MW', 1e6), u('kJ/s', 1e3), u('kJ/min', 1e3 / 60), u('kJ/h', 1e3 / 3600),
      u('10⁶·kJ/h', 1e9 / 3600), u('cal/s', CAL), u('cal/min', CAL / 60), u('cal/h', CAL / 3600), u('kcal/s', CAL * 1e3),
      u('kcal/min', CAL * 1e3 / 60), u('kcal/h', CAL * 1e3 / 3600), u('10⁶·kcal/h', CAL * 1e9 / 3600),
      u('BTU/h', BTU / 3600), u('BTU/min', BTU / 60), u('BTU/s', BTU), u('HP', 550 * LBF * FT),
      u('lbf·ft/min', LBF * FT / 60), u('lbf·ft/s', LBF * FT)]) },
  { id: 'pressure', name: 'Pressure', si: 'Pa (A)', example: [1, 'bar (G)', 'psi (A)'], min: 0,
    note: 'Gauge (G) units add the atmospheric pressure set below; column units use the fluid density set below and <i>g</i> = 9.80665 m/s².',
    units: (s) => {
      const abs = pressureAbs(s);
      return [...abs.map(([l, f]) => u(`${l} (A)`, f, 0)), ...abs.map(([l, f]) => u(`${l} (G)`, f, s.pAtm / f))];
    } },
  { id: 'dpl', name: 'Pressure Drop / Length', si: 'Pa/m', example: [1, 'bar/100 m', 'psi/100 ft'],
    note: 'Column units use the fluid density set below.',
    units: (s) => [
      ...pressureAbs(s).slice(0, 10).map(([l, f]) => u(`${l}/100 m`, f / 100)),
      u('m column/100 m', s.rhoCol * G / 100), u('in column/100 m', s.rhoCol * G * IN / 100),
      u('psi/100 ft', PSI / (100 * FT)), u('psf/100 ft', PSI / 144 / (100 * FT)), u('Torr/100 ft', TORR / (100 * FT)),
    ] },
  { id: 'surfden', name: 'Surface Density', si: 'm³/(s·m²)', example: [1, 'L/min/m²', 'US gal/min/ft²'],
    units: fixed([u('m³/s/m²', 1), u('L/min/m²', 1e-3 / 60), u('US gal/min/ft²', USGAL / 60 / FT2)]) },
  { id: 'sigma', name: 'Surface Tension', si: 'N/m', example: [72, 'mN/m', 'dyn/cm'],
    units: fixed([u('N/m', 1), u('mN/m', 1e-3), u('gf/cm', G / 1000 / 0.01), u('dyn/cm', 1e-3), u('erg/cm²', 1e-3),
      u('erg/mm²', 0.1), u('pdl/in', LB * FT / IN), u('lbf/in', LBF / IN)]) },
  { id: 'temp', name: 'Temperature', si: 'K', example: [100, '°C (Celsius)', '°F (Fahrenheit)'], min: 0,
    units: fixed([u('°C (Celsius)', 1, 273.15), u('°F (Fahrenheit)', R_F, 459.67), u('K (Kelvin)', 1, 0),
      u('°R (Rankine)', R_F, 0), u('°Re (Réaumur)', 1.25, 273.15 / 1.25)]) },
  { id: 'dtemp', name: 'Temperature Difference', si: 'ΔK', example: [10, 'Δ°C', 'Δ°F'],
    units: fixed([u('Δ°C', 1), u('Δ°F', R_F), u('ΔK', 1), u('Δ°R (Rankine)', R_F), u('Δ°Re (Réaumur)', 1.25)]) },
  { id: 'time', name: 'Time', si: 's', example: [1, 'year (365 days)', 'h'],
    units: fixed([u('ns', 1e-9), u('s', 1), u('min', 60), u('h', 3600), u('day (24 h)', 86400), u('week (7 days)', 7 * 86400),
      u('month (28 days)', 28 * 86400), u('month (30 days)', 30 * 86400), u('month (31 days)', 31 * 86400),
      u('year (365 days)', 365 * 86400), u('leap year (366 days)', 366 * 86400),
      u('century (100 years)', 36500 * 86400), u('millennium (1000 years)', 365000 * 86400)]) },
  { id: 'velocity', name: 'Velocity, Speed', si: 'm/s', example: [100, 'km/h', 'mi/h'],
    note: 'Mach: speed of sound in dry air at 0 °C, 331.46 m/s.',
    units: fixed([u('c (speed of light)', 299792458), u('cm/h', 0.01 / 3600), u('cm/min', 0.01 / 60), u('cm/s', 0.01),
      u('ft/h', FT / 3600), u('ft/min', FT / 60), u('ft/s', FT), u('km/h', 1000 / 3600), u('km/min', 1000 / 60), u('km/s', 1000),
      u('kn (knot)', 1852 / 3600), u('Mach', 331.46), u('m/h', 1 / 3600), u('m/min', 1 / 60), u('m/s', 1),
      u('mi/h', MI / 3600), u('mi/min', MI / 60), u('mi/s', MI), u('in/h', IN / 3600), u('in/min', IN / 60), u('in/s', IN)]) },
  { id: 'mu', name: 'Viscosity (Dynamic)', si: 'Pa·s', example: [1, 'cP', 'Pa·s'],
    units: fixed([u('kg/m/s', 1), u('Pa·s', 1), u('cP', 1e-3), u('dyn·s/cm²', 0.1), u('lbm/ft·h', LB / FT / 3600),
      u('lbm/ft·s', LB / FT), u('N·s/m²', 1)]) },
  { id: 'nu', name: 'Viscosity (Kinematic)', si: 'm²/s', example: [1, 'cSt', 'm²/s'],
    units: fixed([u('m²/s', 1), u('m²/h', 1 / 3600), u('mm²/s', 1e-6), u('cSt', 1e-6), u('in²/s', IN2), u('in²/h', IN2 / 3600),
      u('ft²/s', FT2), u('ft²/h', FT2 / 3600)]) },
  { id: 'volume', name: 'Volume', si: 'm³', example: [1, 'US gal', 'L'],
    units: fixed([u('mm³', 1e-9), u('cm³', 1e-6), u('dm³', 1e-3), u('m³', 1), u('km³', 1e9), u('mL', 1e-6), u('cL', 1e-5),
      u('dL', 1e-4), u('L', 1e-3), u('in³', IN3), u('ft³', FT3), u('yd³', YD * YD * YD), u('US gal', USGAL), u('UK gal', UKGAL),
      u('US fl oz', USGAL / 128), u('UK fl oz', UKGAL / 160), u('US pt', USGAL / 8), u('UK pt', UKGAL / 8),
      u('drop (0.05 mL)', 5e-8), u('tsp', USGAL / 768), u('tbsp', USGAL / 256), u('bbl', 42 * USGAL),
      u('bu (bushel)', 2150.42 * IN3), u('pk (peck)', 2150.42 * IN3 / 4), u('US qt', USGAL / 4), u('UK qt', UKGAL / 4)]) },
  { id: 'vflow', name: 'Volume Flow', si: 'm³/s', example: [1, 'm³/h', 'US gal/min'],
    units: fixed([...rates('cm³', 1e-6, [['h', 3600], ['min', 60], ['s', 1]]),
      ...rates('m³', 1, [['day', 86400], ['h', 3600], ['min', 60], ['s', 1]]),
      ...rates('mL', 1e-6, [['h', 3600], ['min', 60], ['s', 1]]),
      ...rates('L', 1e-3, [['day', 86400], ['h', 3600], ['min', 60], ['s', 1]]),
      ...rates('ft³', FT3, [['day', 86400], ['h', 3600], ['min', 60], ['s', 1]]),
      ...rates('UK gal', UKGAL, [['day', 86400], ['h', 3600], ['min', 60], ['s', 1]]),
      ...rates('US gal', USGAL, [['day', 86400], ['h', 3600], ['min', 60], ['s', 1]]),
      ...rates('UK oz', UKGAL / 160, [['h', 3600], ['min', 60], ['s', 1]]),
      u('bpd (barrel per day)', 42 * USGAL / 86400)]) },
];

/** Absolute pressure units (without the (A)/(G) suffix), factor to Pa. Column units depend on the fluid density. */
export function pressureAbs(s: Settings): [string, number][] {
  const col = s.rhoCol * G;
  return [
    ['Pa', 1], ['kPa', 1e3], ['MPa', 1e6], ['bar', 1e5], ['atm', ATM], ['psi', PSI], ['psf', PSI / 144], ['Torr', TORR],
    ['kg/cm²', G * 1e4], ['mm Hg', MMHG], ['in Hg', MMHG * 25.4],
    ['m column', col], ['mm column', col / 1000], ['in column', col * IN], ['ft column', col * FT],
  ];
}

/** Units the atmospheric pressure may be given in (absolute, no columns). */
export const ATM_UNITS: Unit[] = pressureAbs(DEFAULT_SETTINGS).slice(0, 11).map(([l, f]) => u(`${l} (A)`, f));

export const quantity = (id: string): Quantity => {
  const q = QUANTITIES.find((x) => x.id === id);
  if (!q) throw new Error(`unknown quantity ${id}`);
  return q;
};

/** Finds a unit by its label. */
export function findUnit(list: Unit[], label: string): Unit {
  const hit = list.find((x) => x.label === label);
  if (!hit) throw new Error(`unknown unit ${label}`);
  return hit;
}

export const toSI = (unit: Unit, x: number) => (x + (unit.off ?? 0)) * unit.f;
export const fromSI = (unit: Unit, si: number) => si / unit.f - (unit.off ?? 0);

/** Converts x between two units of one quantity. NaN when x is not a number or below the quantity's minimum (0 K, 0 Pa abs). */
export function convert(qid: string, from: string, to: string, x: number, s: Settings = DEFAULT_SETTINGS): number {
  const q = quantity(qid);
  const list = q.units(s);
  const si = toSI(findUnit(list, from), x);
  if (!Number.isFinite(si) || (q.min !== undefined && si < q.min - 1e-12 * Math.abs(si))) return NaN;
  return fromSI(findUnit(list, to), si);
}

/** The relation between two units, for the row's formula line: "1 m = 3.28084 ft", or "°F = 1.8·°C + 32" when there is an offset. */
export function relation(qid: string, from: string, to: string, s: Settings, fmt: (x: number) => string): string {
  const list = quantity(qid).units(s);
  const a = findUnit(list, from), b = findUnit(list, to);
  const k = a.f / b.f;
  const c = fromSI(b, toSI(a, 0));
  const short = (l: string) => l.replace(/ \((?![AG]\)).*\)$/, ''); // drop "(Celsius)", keep "(A)"/"(G)"
  if (Math.abs(c) < 1e-12 * Math.max(1, Math.abs(k))) return `1 ${short(from)} = ${fmt(k)} ${short(to)}`;
  return `${short(to)} = ${fmt(k)}·${short(from)} ${c < 0 ? '−' : '+'} ${fmt(Math.abs(c))}`;
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

/** Formats a result to `digits` significant digits, trailing zeros dropped. Very large or small numbers get ×10ⁿ.
 *  `group` puts a comma between thousands (the Zoho sheet's "Use comma in 1,000", on by default). */
export function formatSig(x: number, digits = 6, group = true): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const abs = Math.abs(x);
  if (abs >= 1e12 || abs < 1e-4) {
    const [m, e] = x.toExponential(digits - 1).split('e');
    const mant = m.includes('.') ? m.replace(/\.?0+$/, '') : m;
    return `${mant.replace('-', '−')}×10${String(Number(e)).replace(/[-\d]/g, (d) => SUP[d])}`;
  }
  let t = Number(x.toPrecision(digits)).toString();
  if (/e/.test(t)) t = Number(x.toPrecision(digits)).toFixed(20).replace(/\.?0+$/, '');
  const neg = t.startsWith('-');
  let [int, dec] = (neg ? t.slice(1) : t).split('.');
  if (group) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${neg ? '−' : ''}${int}${dec ? `.${dec}` : ''}`;
}
