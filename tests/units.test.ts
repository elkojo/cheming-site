// Acceptance tests for the native Unit Conversion (ROADMAP Phase 7).
//
// The Zoho sheet has no example values (its input column is empty), so there are no Zoho results to
// reproduce. Instead every quantity is checked against values from independent sources (NIST SP 811
// appendix B, textbook equivalences). Each test also checks the round trip. Corrections against the
// sheet have their own tests at the end. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUANTITIES, DEFAULT_SETTINGS, convert, relation, formatSig, ATM_UNITS, type Settings } from '../src/lib/calc/units.ts';

const close = (got: number, want: number, rel = 1e-9, what = '') =>
  assert.ok(Math.abs(got - want) <= rel * Math.abs(want) + 1e-300, `${what}: got ${got}, want ${want}`);

/** [quantity, value, from, to, expected] from NIST SP 811 / exact definitions */
const CASES: [string, number, string, string, number, number?][] = [
  ['acc', 1, 'free fall (g)', 'ft/s²', 32.17404855643],
  ['acc', 60, 'mile/h/s', 'm/s²', 26.8224],
  ['amount', 1, 'kmol', 'std m³ (0 °C, 1 atm)', 22.41396954, 1e-8],   // CODATA molar volume, 273.15 K, 101.325 kPa
  ['amount', 1, 'lbm.mol', 'mol', 453.59237],
  ['angle', Math.PI, 'rad', '° (degree)', 180],
  ['angle', 400, 'grad', 'rev (revolution)', 1],
  ['area', 1, 'acre', 'm²', 4046.8564224],
  ['area', 1, 'mi²', 'acre', 640],
  ['density', 1, 'lbm/ft³', 'kg/m³', 16.01846337],
  ['density', 1, 'g/cm³', 'lbm/US gal', 8.345404452],
  ['energy', 1, 'kW·h', 'MJ', 3.6],
  ['energy', 1, 'BTU', 'J', 1055.05585262],
  ['energy', 1, 'kcal', 'BTU', 3.968320719],
  ['force', 1, 'lbf', 'N', 4.4482216152605],
  ['force', 1, 'kgf', 'dyn', 980665],
  ['cp', 1, 'BTU/lbm/°F', 'kJ/kg/K', 4.1868],
  ['cp', 1, 'kcal/kg/°C', 'J/kg/K', 4186.8],
  ['cp', 1, 'kcal/kg/°C', 'BTU/lbm/°F', 1],                     // IT calorie and IT BTU agree exactly
  ['k', 1, 'BTU·ft/h/ft²/°F', 'W/m/K', 1.730734666],
  ['k', 12, 'BTU·in/h/ft²/°F', 'BTU·ft/h/ft²/°F', 1],
  ['h', 1, 'BTU/lbm', 'kJ/kg', 2.326],
  ['flux', 1, 'BTU/ft²/h', 'W/m²', 3.154590745],
  ['fouling', 1, 'h·ft²·°F/BTU', 'm²·K/W', 0.1761101838],
  ['htc', 1, 'BTU/h/ft²/°F', 'W/m²/K', 5.678263341],
  ['htc', 1, 'kcal/m²/h/°C', 'W/m²/K', 1.163],
  ['length', 1, 'in', 'mm', 25.4],
  ['length', 1, 'nmi (nautical mile)', 'ft', 6076.115485564],
  ['length', 1, 'mi', 'nm', 1.609344e12],                    // nm as output (the sheet's #N/A, UC-1)
  ['light', 1, 'fc (foot-candle)', 'lx (lux)', 10.76391042],
  ['mass', 1, 'lbm', 'kg', 0.45359237],
  ['mass', 1, 'US tn (short ton)', 'lbm', 2000],
  ['mass', 1, 'st (stone)', 'lbm', 14],
  ['mflow', 1000, 'kg/h', 'lbm/h', 2204.622621849],
  ['power', 1, 'HP', 'W', 745.6998715823],
  ['power', 12000, 'BTU/h', 'kW', 3.516852842],                // 1 ton of refrigeration
  ['pressure', 1, 'atm (A)', 'psi (A)', 14.69594877551],
  ['pressure', 1, 'bar (G)', 'bar (A)', 2.01325],
  ['pressure', 0, 'psi (G)', 'kPa (A)', 101.325],
  ['pressure', 760, 'Torr (A)', 'Pa (A)', 101325],
  ['pressure', 10, 'm column (A)', 'kPa (A)', 98.0665],         // 1000 kg/m³
  ['pressure', 0, 'm column (G)', 'Pa (A)', 101325],            // the sheet gave 101 290 (UC-8)
  ['dpl', 1, 'psi/100 ft', 'kPa/100 m', 22.62059479],
  ['surfden', 1, 'US gal/min/ft²', 'L/min/m²', 40.74583333],
  ['sigma', 1, 'dyn/cm', 'mN/m', 1],
  ['sigma', 1, 'lbf/in', 'N/m', 175.1268352],
  ['temp', 100, '°C (Celsius)', '°F (Fahrenheit)', 212],
  ['temp', -40, '°F (Fahrenheit)', '°C (Celsius)', -40],
  ['temp', 0, '°F (Fahrenheit)', '°R (Rankine)', 459.67],
  ['temp', 80, '°Re (Réaumur)', '°C (Celsius)', 100],
  ['temp', 300, 'K (Kelvin)', '°Re (Réaumur)', 21.48],
  ['dtemp', 10, 'Δ°C', 'Δ°F', 18],
  ['dtemp', 8, 'Δ°Re (Réaumur)', 'ΔK', 10],
  ['time', 1, 'year (365 days)', 'h', 8760],
  ['velocity', 1, 'kn (knot)', 'km/h', 1.852],
  ['velocity', 100, 'km/h', 'mi/h', 62.13711922],
  ['mu', 1, 'cP', 'Pa·s', 0.001],
  ['mu', 1, 'lbm/ft·s', 'Pa·s', 1.488163944],
  ['nu', 1, 'cSt', 'mm²/s', 1],
  ['nu', 1, 'ft²/s', 'cSt', 92903.04],
  ['volume', 1, 'US gal', 'L', 3.785411784],
  ['volume', 1, 'bbl', 'US gal', 42],
  ['volume', 1, 'UK gal', 'L', 4.54609],
  ['volume', 1, 'bu (bushel)', 'L', 35.23907017],
  ['vflow', 1, 'm³/h', 'US gal/min', 4.402867539],
  ['vflow', 1000, 'bpd (barrel per day)', 'm³/h', 6.624470622],
];

test('independent reference values (NIST SP 811, exact definitions)', () => {
  for (const [q, x, from, to, want, rel] of CASES) {
    const what = `${q}: ${x} ${from} → ${to}`;
    close(convert(q, from, to, x), want, rel ?? 1e-9, what);
    close(convert(q, to, from, want), x === 0 ? 0 : x, rel ?? 1e-9, `${what} (back)`);
  }
});

test('every unit of every quantity: round trip and self-conversion', () => {
  for (const q of QUANTITIES) {
    const units = q.units(DEFAULT_SETTINGS);
    assert.ok(units.length >= 3, `${q.name} has units`);
    assert.equal(new Set(units.map((u) => u.label)).size, units.length, `${q.name}: duplicate labels`);
    const [x, a, b] = q.example;
    assert.ok(units.some((u) => u.label === a) && units.some((u) => u.label === b), `${q.name}: example units exist`);
    for (const u of units) {
      assert.ok(Number.isFinite(u.f) && u.f > 0, `${q.name} ${u.label}: factor`);
      close(convert(q.id, u.label, u.label, 123.456), 123.456, 1e-12, `${q.name} ${u.label} → itself`);
      close(convert(q.id, b, u.label, convert(q.id, u.label, b, x)), x, 1e-12, `${q.name} ${u.label} round trip`);
    }
  }
});

test('the 30 quantities of the Zoho sheet, in its order', () => {
  assert.equal(QUANTITIES.length, 30);
  assert.equal(QUANTITIES[0].name, 'Acceleration');
  assert.equal(QUANTITIES[29].name, 'Volume Flow');
});

test('settings: atmospheric pressure and column density', () => {
  const s: Settings = { pAtm: 95000, rhoCol: 13595.1 };          // site at altitude; mercury at 0 °C
  close(convert('pressure', 'bar (G)', 'Pa (A)', 1, s), 195000, 1e-12, 'gauge with 95 kPa atmosphere');
  close(convert('pressure', 'kPa (A)', 'kPa (G)', 95, s), 0, 1e-12, 'atmosphere = 0 gauge');
  close(convert('pressure', 'mm column (A)', 'Pa (A)', 760, s), 101325, 1e-5, '760 mm Hg column');
  close(convert('dpl', 'm column/100 m', 'Pa/100 m', 1, s), 13595.1 * 9.80665, 1e-12, 'column per length');
  assert.equal(ATM_UNITS.length, 11);
  assert.ok(ATM_UNITS.every((u) => u.label.endsWith('(A)') && !/column/.test(u.label)), 'atmosphere only in absolute units (UC-10)');
});

test('invalid: below absolute zero or vacuum, non-numbers', () => {
  assert.ok(Number.isNaN(convert('temp', '°C (Celsius)', 'K (Kelvin)', -300)));
  assert.ok(Number.isNaN(convert('pressure', 'bar (G)', 'bar (A)', -1.5)));
  assert.equal(convert('pressure', 'bar (G)', 'bar (A)', -1.01325), 0);
  assert.ok(Number.isNaN(convert('length', 'm', 'ft', NaN)));
  close(convert('dtemp', 'Δ°C', 'Δ°F', -5), -9, 1e-12, 'negative differences are fine');
});

// ── corrections against the Zoho sheet (ORIGINAL-ERRORS UC-1…UC-9, approved 2026-11-20) ──
test('corrections against the sheet', () => {
  close(convert('k', 'cal·cm/s/cm²/°C', 'W/m/K', 1), 418.68, 1e-12, 'UC-2: sheet gave 4.184 (100× too small)');
  close(convert('nu', 'cSt', 'm²/s', 1), 1e-6, 1e-12, 'UC-3: sheet gave 1');
  close(convert('volume', 'tsp', 'mL', 1), 4.92892159375, 1e-12, 'UC-4: sheet gave 14.79');
  close(convert('volume', 'tbsp', 'tsp', 1), 3, 1e-12, 'UC-4: tablespoon = 3 teaspoons');
  close(convert('volume', 'drop (0.05 mL)', 'mL', 1), 0.05, 1e-12, 'UC-5');
  close(convert('power', '10⁶·kcal/h', 'kcal/h', 1), 1e6, 1e-12, 'UC-7: consistent with kcal/h');
  close(convert('acc', 'ft/s²', 'm/s²', 1), 0.3048, 1e-12, 'UC-9');
  const names = (id: string) => QUANTITIES.find((q) => q.id === id)!.units(DEFAULT_SETTINGS).map((u) => u.label);
  assert.ok(!names('density').includes('t/yd³'), 't/yd³ removed (UC-6)');
  for (const l of ['SSU', '°E (Engler)', 's Redwood']) assert.ok(!names('nu').includes(l), `${l} removed (UC-3)`);
});

test('result formatting: significant digits, ×10ⁿ, thousands comma', () => {
  assert.equal(formatSig(3.280839895), '3.28084');
  assert.equal(formatSig(2204.622621849), '2,204.62');
  assert.equal(formatSig(2204.622621849, 6, false), '2204.62');
  assert.equal(formatSig(8760), '8,760');
  assert.equal(formatSig(1234567.89), '1,234,570');
  assert.equal(formatSig(0.001), '0.001');
  assert.equal(formatSig(1e-6), '1×10⁻⁶');                     // the sheet showed 0.0
  assert.equal(formatSig(1.609344e12), '1.60934×10¹²');
  assert.equal(formatSig(-40), '−40');
  assert.equal(formatSig(0), '0');
  assert.equal(formatSig(2 / 3, 3), '0.667');
  assert.equal(formatSig(NaN), '—');
});

test('formula line: factor, or slope and offset', () => {
  const f = (x: number) => formatSig(x, 6, true);
  assert.equal(relation('length', 'm', 'ft', DEFAULT_SETTINGS, f), '1 m = 3.28084 ft');
  assert.equal(relation('temp', '°C (Celsius)', '°F (Fahrenheit)', DEFAULT_SETTINGS, f), '°F = 1.8·°C + 32');
  assert.equal(relation('temp', '°F (Fahrenheit)', '°C (Celsius)', DEFAULT_SETTINGS, f), '°C = 0.555556·°F − 17.7778');
  assert.equal(relation('pressure', 'bar (G)', 'bar (A)', DEFAULT_SETTINGS, f), 'bar (A) = 1·bar (G) + 1.01325');
});
