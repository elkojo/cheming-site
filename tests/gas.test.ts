// Acceptance tests for the native Gas Equation calculator (ROADMAP Phase 7).
//
// The Zoho sheet (read 2026-11-19, formulas from the owner's source workbook) looked up the temperature
// offset in an empty column, so its "100 °C" was really 100 K (and "20 °C" standard was 20 K), and it used
// R = 8.314. Part 1 reproduces every Zoho default result by entering exactly that: 100 K, 20 K, R = 8.314.
// That proves the flow logic matches the sheet. Part 2 checks the corrected results at real 100 °C,
// and part 3 hand-checked cases and units. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  solve, toSI, fromSI, R_SI, P_ATM, temperature, pressure, massFlow, volumeFlow, stdVolumeFlow, molarFlow, density,
  type State, type Given,
} from '../src/lib/calc/gas.ts';

const close = (got: number, want: number, rel = 1e-9, what = '') =>
  assert.ok(Math.abs(got - want) <= rel * Math.abs(want), `${what}: got ${got}, want ${want}`);

// the Zoho sheet's defaults, with its temperatures in kelvin (as it effectively computed them)
const zoho = (given: Given, flow: number): State => ({
  T: 100, p: 1.01325e5, Z: 1, Mw: 50, Tstd: 20, pstd: 1.01325e5, given, flow,
});
const h = (x: number) => x / 3600;
// The sheet's volume-flow factor for m³/h is rounded (0.0002777777778 instead of 1/3600), so flows that pass
// through it agree to ~1e-10, not 1e-12. Everything else matches to 1e-12.
const FLOW = 1e-9;

test('Zoho reference, column Volume: M = 1000 kg/h', () => {
  const r = solve(zoho('M', h(1000)), 8.314);
  close(r.uv, 8.20528003947701, 1e-12, 'U.V.');
  close(r.rho, 6.093637238393, 1e-12, 'ρ');
  close(r.v, 0.164105600789571, 1e-12, '1/ρ');
  close(r.V * 3600, 164.10560077641, FLOW, 'V m³/h');
  close(r.N, 0.005555555555556, 1e-12, 'N kmol/s');
  close(r.Vstd * 3600, 32.8211201552852, FLOW, 'Vstd');
});

test('Zoho reference, column Mass: V = 164.11 m³/h', () => {
  const r = solve(zoho('V', h(164.11)), 8.314);
  close(r.M * 3600, 1000.02680727268, FLOW, 'M kg/h');
  close(r.N, 0.005555704484847, FLOW, 'N');
  close(r.Vstd * 3600, 32.8220000000262, FLOW, 'Vstd');
});

test('Zoho reference, column Volume & Mass: N = 0.0055556 kmol/s', () => {
  const r = solve(zoho('N', 0.00555555555555556), 8.314);
  close(r.M * 3600, 1000, 1e-12, 'M');
  close(r.V * 3600, 164.105600776411, FLOW, 'V');
  close(r.Vstd * 3600, 32.8211201552852, FLOW, 'Vstd');
});

test('Zoho reference, column Rates: Vstd = 32.82 Std m³/h', () => {
  const r = solve(zoho('Vstd', h(32.8211201552852)), 8.314);
  close(r.M * 3600, 999.999999999997, FLOW, 'M');
  close(r.V * 3600, 164.10560077629, FLOW, 'V');
});

test('Zoho reference, columns Density and Unit Volume (no flow, no Mw)', () => {
  close(solve(zoho('M', NaN), 8.314).rho, 6.093637238393, 1e-12, 'ρ');
  const r = solve({ ...zoho('M', NaN), Mw: NaN }, 8.314);
  close(r.uv, 8.20528003947701, 1e-12, 'U.V.');
  assert.ok(Number.isNaN(r.rho) && Number.isNaN(r.M));
});

test("Zoho note 2: unit volumes at 0/15/20 °C, 0 bar g and 1 bar a (sheet's R = 8.314)", () => {
  const uv = (tC: number, pPa: number) => solve({ ...zoho('M', NaN), T: tC + 273.15, p: pPa }, 8.314).uv;
  close(uv(20, P_ATM), 24.0537784357266, 1e-12, '20 °C 0 barg');
  close(uv(0, P_ATM), 22.4127224278312, 1e-12, '0 °C 0 barg');
  close(uv(15, P_ATM), 23.6435144337528, 1e-12, '15 °C 0 barg');
  close(uv(20, 1e5), 24.372491, 1e-12, '20 °C 1 bara');
  close(uv(0, 1e5), 22.709691, 1e-12, '0 °C 1 bara');
  close(uv(15, 1e5), 23.956791, 1e-12, '15 °C 1 bara');
});

// --- Part 2: the same defaults with the temperature fix (real 100 °C, standard 20 °C) and exact R
const fixed = (given: Given, flow: number): State => ({
  T: toSI(temperature, '°C', 100), p: toSI(pressure, 'bar a', 1.01325), Z: 1, Mw: 50,
  Tstd: toSI(temperature, '°C', 20), pstd: toSI(pressure, 'bar a', 1.01325), given, flow,
});

test('fix: 100 °C is 373.15 K, so M = 1000 kg/h of Mw 50 at 1 atm is 612.4 m³/h', () => {
  const r = solve(fixed('M', toSI(massFlow, 'kg/h', 1000)));
  close(r.uv, 30.619706152545767, 1e-12, 'U.V.');
  close(r.rho, 1.632935330956562, 1e-12, 'ρ');
  close(fromSI(volumeFlow, 'm³/h', r.V), 612.3941230509154, 1e-12, 'V');
  close(fromSI(molarFlow, 'kmol/h', r.N), 20, 1e-12, 'N');
  close(fromSI(stdVolumeFlow, 'Std m³/h', r.Vstd), 481.10233732379965, 1e-12, 'Vstd');
});

test('fix: gauge pressure adds the atmosphere (0 bar g = 1.01325 bar a)', () => {
  close(toSI(pressure, 'bar g', 0), 101325, 1e-12, '0 bar g');
  close(toSI(pressure, 'psi g', 0), 101325, 1e-12, '0 psi g');
  close(toSI(pressure, 'kPa g', 100), 201325, 1e-12, '100 kPa g');
  close(toSI(pressure, 'atm g', 1), 2 * 101325, 1e-12, '1 atm g');
  const a = solve({ ...fixed('M', 1), p: toSI(pressure, 'bar g', 5) });
  const b = solve({ ...fixed('M', 1), p: toSI(pressure, 'bar a', 6.01325) });
  close(a.rho, b.rho, 1e-12, 'ρ at 5 bar g');
});

// --- Part 3: hand-checked cases and units
test('molar volume of an ideal gas at 0 °C, 1 atm is 22.414 m³/kmol', () => {
  const r = solve({ ...fixed('N', 1), T: toSI(temperature, '°C', 0), p: toSI(pressure, 'atm a', 1) });
  close(r.uv, 22.41396954, 1e-9, 'U.V.');
});

test('1 MMSCFD at 60 °F, 14.696 psia is about 49.8 kmol/h (379.5 scf/lbmol)', () => {
  const s: State = {
    ...fixed('Vstd', toSI(stdVolumeFlow, 'Std 10⁶ ft³/d', 1)),
    Tstd: toSI(temperature, '°F', 60), pstd: toSI(pressure, 'psi a', 14.696),
  };
  const r = solve(s);
  close(fromSI(molarFlow, 'lbmol/h', r.N), 1e6 / 379.48 / 24, 1e-3, 'lbmol/h');
  close(fromSI(molarFlow, 'kmol/h', r.N), 49.8, 2e-3, 'kmol/h');
});

test('air at 20 °C, 1 atm: density 1.204 kg/m³ = 0.0752 lb/ft³', () => {
  const r = solve({ ...fixed('M', NaN), T: toSI(temperature, '°C', 20), p: toSI(pressure, 'atm a', 1), Mw: 28.9647 });
  close(r.rho, 1.2041, 1e-4, 'kg/m³');
  close(fromSI(density, 'lb/ft³', r.rho), 0.07517, 1e-3, 'lb/ft³');
});

test('compressibility scales the volume: Z = 0.9 gives 90 % of the ideal volume', () => {
  const ideal = solve(fixed('M', 1)), real = solve({ ...fixed('M', 1), Z: 0.9 });
  close(real.V, 0.9 * ideal.V, 1e-12, 'V');
  close(real.rho, ideal.rho / 0.9, 1e-12, 'ρ');
});

test('round trip: any flow given gives back the same state', () => {
  const base = solve(fixed('M', 0.3));
  for (const g of ['V', 'N', 'Vstd'] as Given[]) {
    const r = solve(fixed(g, base[g]));
    close(r.M, 0.3, 1e-12, `M from ${g}`);
  }
});

test('without Mw: volume, molar and standard flows still convert; mass and density stay empty', () => {
  const r = solve({ ...fixed('V', 1), Mw: NaN });
  assert.ok(Number.isFinite(r.N) && Number.isFinite(r.Vstd));
  assert.ok(Number.isNaN(r.M) && Number.isNaN(r.rho));
  assert.ok(Number.isNaN(solve({ ...fixed('M', 1), Mw: NaN }).V), 'mass given needs Mw');
});

test('invalid conditions give no result', () => {
  assert.ok(Number.isNaN(solve({ ...fixed('M', 1), T: toSI(temperature, '°C', -300) }).uv), 'below absolute zero');
  assert.ok(Number.isNaN(solve({ ...fixed('M', 1), p: 0 }).V), 'zero pressure');
  assert.ok(Number.isNaN(solve({ ...fixed('M', 1), Z: 0 }).V), 'zero Z');
  assert.ok(Number.isNaN(solve(fixed('M', -1)).V), 'negative flow');
});

test('unit conversions', () => {
  close(toSI(temperature, '°F', 32), 273.15, 1e-12, '32 °F');
  close(toSI(temperature, '°F', 212), 373.15, 1e-12, '212 °F');
  close(toSI(temperature, '°R', 491.67), 273.15, 1e-12, '491.67 °R');
  close(toSI(pressure, 'psi a', 14.6959487755), 101325, 1e-9, 'psi');
  close(toSI(massFlow, 'lb/h', 1), 0.45359237 / 3600, 1e-12, 'lb/h');
  close(toSI(volumeFlow, 'US gal/min', 1), 6.30901964e-5, 1e-9, 'gpm');
  close(toSI(volumeFlow, 'ft³/min', 1), 4.719474432e-4, 1e-9, 'cfm');
  close(toSI(density, 'lb/ft³', 1), 16.01846337, 1e-9, 'lb/ft³');
  for (const list of [temperature, pressure, massFlow, volumeFlow, stdVolumeFlow, molarFlow, density]) {
    assert.equal(new Set(list.map((u) => u.label)).size, list.length, 'unique labels');
    for (const u of list) close(fromSI(list, u.label, toSI(list, u.label, 123.4)), 123.4, 1e-12, u.label);
  }
  assert.equal(R_SI, 8.314462618);
});

// --- Part 4: mixed units. Reference values computed independently (plain Python, own NIST constants,
// none of this site's code) on 2026-11-19; the same four cases were also entered on the page itself.
// Note: Z applies at standard conditions too (the sheet's note 1), so Vstd is not the ideal-gas scf.
const F = (f: number) => toSI(temperature, '°F', f);
const mixed: { name: string; s: State; want: [list: typeof massFlow | null, key: keyof ReturnType<typeof solve>, unit: string, value: number][] }[] = [
  {
    name: 'A imperial: 140 °F, 250 psi g, Z 0.92, Mw 18.5, M = 5000 lb/h; std 60 °F, 14.696 psi a',
    s: { T: F(140), p: toSI(pressure, 'psi g', 250), Z: 0.92, Mw: 18.5, Tstd: F(60), pstd: toSI(pressure, 'psi a', 14.696), given: 'M', flow: toSI(massFlow, 'lb/h', 5000) },
    want: [[volumeFlow, 'V', 'ft³/min', 100.75426305779106], [molarFlow, 'N', 'lbmol/h', 270.27027027027026],
      [stdVolumeFlow, 'Vstd', 'Std 10⁶ ft³/d', 2.2645890210919406], [density, 'rho', 'lb/ft³', 0.8270948623338611],
      [null, 'uv', '', 1.3963540619751633], [null, 'uvStd', '', 21.795108095025885]],
  },
  {
    name: 'B: 300 K, 25 kg/cm² g, Z 0.85, CO₂, Vstd = 2500 Std m³/h; std 0 °C, 1 atm a',
    s: { T: toSI(temperature, 'K', 300), p: toSI(pressure, 'kg/cm² g', 25), Z: 0.85, Mw: 44.01, Tstd: toSI(temperature, '°C', 0), pstd: toSI(pressure, 'atm a', 1), given: 'Vstd', flow: toSI(stdVolumeFlow, 'Std m³/h', 2500) },
    want: [[massFlow, 'M', 'kg/min', 96.25037353975183], [volumeFlow, 'V', 'l/s', 30.270910343391893],
      [molarFlow, 'N', 'mol/s', 36.45019069141552], [density, 'rho', 'g/cm³', 0.052993876765896016],
      [null, 'uv', '', 0.8304733053295403], [null, 'uvStd', '', 19.051874112910877]],
  },
  {
    name: 'C: 600 °R, 1500 torr a, Z 1.02, H₂, N = 120 mol/min; std 15 °C, 0 MPa g',
    s: { T: toSI(temperature, '°R', 600), p: toSI(pressure, 'torr a', 1500), Z: 1.02, Mw: 2.016, Tstd: toSI(temperature, '°C', 15), pstd: toSI(pressure, 'MPa g', 0), given: 'N', flow: toSI(molarFlow, 'mol/min', 120) },
    want: [[massFlow, 'M', 'lb/d', 768.0129187358244], [volumeFlow, 'V', 'UK gal/h', 22387.896477117727],
      [stdVolumeFlow, 'Vstd', 'Std m³/d', 4167.543162788687], [density, 'rho', 'lb/US gal', 0.001190197665411362],
      [null, 'uv', '', 14.135748929952793], [null, 'uvStd', '', 24.117726636508603]],
  },
  {
    name: 'D: 50 °C, 3 bar g, Z 0.97, air, V = 800 US gal/min; std 20 °C, 0 bar g',
    s: { T: toSI(temperature, '°C', 50), p: toSI(pressure, 'bar g', 3), Z: 0.97, Mw: 28.96, Tstd: toSI(temperature, '°C', 20), pstd: toSI(pressure, 'bar g', 0), given: 'V', flow: toSI(volumeFlow, 'US gal/min', 800) },
    want: [[massFlow, 'M', 'lb/s', 0.49621606232387117], [molarFlow, 'N', 'kmol/min', 0.46632559338719426],
      [stdVolumeFlow, 'Vstd', 'Std ft³/h', 23055.514557824423], [density, 'rho', 'oz/US gal', 0.5954592747886455],
      [null, 'uv', '', 6.494023639585123], [null, 'uvStd', '', 23.33346336020428]],
  },
];
for (const c of mixed) {
  test(`mixed units ${c.name}`, () => {
    const r = solve(c.s);
    for (const [list, key, u, want] of c.want) close(list ? fromSI(list, u, r[key]) : r[key], want, 1e-12, `${key} [${u || 'm³/kmol'}]`);
  });
}
