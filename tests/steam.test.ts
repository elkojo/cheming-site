// Acceptance tests for the native Steam calculator (ROADMAP Phase 7).
//
// 1. IAPWS-IF97 against the official verification values of the release (R7-97(2012), Tables 5, 15, 33, 35, 36).
// 2. Viscosity and thermal conductivity against the check values of IAPWS R12-08 (Table 4) and R15-11 (Table 4).
// 3. The Zoho sheet's two default columns (read 2026-11-20): 1.013 bar a and 100 °C. The thermodynamic values
//    must agree within the sheet's interpolation error. Its viscosity/conductivity came from older correlations
//    (ORIGINAL-ERRORS ST-8), so those are checked against IAPWS 2008/2011 in part 2, not against Zoho.
// 4. Corrections against the sheet, units, ranges and single-phase states. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stateAt, psat, tsat, viscosity, conductivityBackground } from '../src/lib/calc/if97.ts';
import { saturated, atPT, show, PROPS, pressure, temperature, toSI, fromSI } from '../src/lib/calc/steam.ts';

const close = (got: number, want: number, rel: number, what = '') =>
  assert.ok(Math.abs(got - want) <= rel * Math.abs(want), `${what}: got ${got}, want ${want}`);
const prop = (k: string) => PROPS.find((p) => p.key === k)!;

test('IF97 official verification values (regions 1–4)', () => {
  const R = 1e-8;   // the release gives 9 significant digits
  let s = stateAt(3, 300);
  close(1 / s.rho, 0.100215168e-2, R, 'R1 v'); close(s.h, 0.115331273e3, R, 'R1 h'); close(s.u, 0.112324818e3, R, 'R1 u');
  close(s.s, 0.392294792, R, 'R1 s'); close(s.cp, 0.417301218e1, R, 'R1 cp');
  s = stateAt(80, 300); close(1 / s.rho, 0.971180894e-3, R, 'R1 v'); close(s.h, 0.184142828e3, R, 'R1 h');
  s = stateAt(3, 500); close(1 / s.rho, 0.120241800e-2, R, 'R1 v'); close(s.h, 0.975542239e3, R, 'R1 h');
  s = stateAt(0.0035, 300); close(1 / s.rho, 0.394913866e2, R, 'R2 v'); close(s.h, 0.254991145e4, R, 'R2 h');
  close(s.s, 0.852238967e1, R, 'R2 s'); close(s.cp, 0.191300162e1, R, 'R2 cp');
  s = stateAt(30, 700); close(1 / s.rho, 0.542946619e-2, R, 'R2 v'); close(s.h, 0.263149474e4, R, 'R2 h');
  // region 3 is given as (ρ, T) → p; here p and T go in, so ρ is solved (agrees to the 9 digits of p)
  s = stateAt(25.5837018, 650); close(s.rho, 500, 1e-7, 'R3 ρ'); close(s.h, 0.186343019e4, 1e-7, 'R3 h'); close(s.cp, 0.138935717e2, 1e-6, 'R3 cp');
  s = stateAt(22.2930643, 650); close(s.rho, 200, 1e-7, 'R3 ρ'); close(s.h, 0.237512401e4, 1e-7, 'R3 h');
  s = stateAt(78.3095639, 750); close(s.rho, 500, 1e-7, 'R3 ρ'); close(s.h, 0.225868845e4, 1e-7, 'R3 h');
  close(psat(300), 0.353658941e-2, R, 'psat 300 K'); close(psat(500), 0.263889776e1, R, 'psat 500 K'); close(psat(600), 0.123443146e2, R, 'psat 600 K');
  close(tsat(0.1), 0.372755919e3, R, 'Tsat 0.1 MPa'); close(tsat(1), 0.453035632e3, R, 'Tsat 1 MPa'); close(tsat(10), 0.584149488e3, R, 'Tsat 10 MPa');
});

test('IAPWS 2008 viscosity and 2011 thermal conductivity check values', () => {
  const MU: [number, number, number][] = [[298.15, 998, 889.7351], [298.15, 1200, 1437.649467], [373.15, 1000, 307.883622],
    [433.15, 1, 14.538324], [873.15, 1, 32.619287], [873.15, 100, 35.802262], [873.15, 600, 77.430195],
    [1173.15, 1, 44.217245], [1173.15, 100, 47.640433], [1173.15, 400, 64.154608]];
  for (const [T, rho, want] of MU) close(viscosity(rho, T) * 1e6, want, 5e-8, `μ(${T} K, ${rho})`);
  const K: [number, number, number][] = [[298.15, 0, 18.4341883], [298.15, 998, 607.712868], [298.15, 1200, 799.038144], [873.15, 0, 79.1034659]];
  for (const [T, rho, want] of K) close(conductivityBackground(rho, T) * 1e3, want, 2e-8, `λ(${T} K, ${rho})`);
});

test('Zoho default, pressure column: 1.013 bar a (its "0 bar (G)")', () => {
  const r = saturated('p', 1.013e5);
  const Z = 1e-6;   // the sheet interpolates linearly between table rows 1.0 and 1.01325 bar
  close(r.T - 273.15, 99.9673494082326, Z, 't');
  close(r.water.rho, 958.377713495326, Z, 'ρ water'); close(r.steam.rho, 0.597485149629646, Z, 'ρ steam');
  close(r.water.h, 418.961392672341, Z, 'h water'); close(r.steam.h, 2675.52048820779, Z, 'h steam');
  close(r.steam.h - r.water.h, 2256.55909553544, Z, 'Δh');
  close(r.water.u, 418.855693212228, Z, 'u water'); close(r.steam.u, 2505.97655809323, Z, 'u steam');
  close(r.water.s, 1.30664541601407, Z, 's water'); close(r.steam.s, 7.35446853867371, Z, 's steam');
  close(r.water.cp, 4.21660394967987, Z, 'cp water'); close(r.steam.cp, 2.07736276961759, Z, 'cp steam');
  close(r.water.cv, 3.76786584401033, Z, 'cv water'); close(r.steam.cv, 1.55361548256533, Z, 'cv steam');
  close(r.steam.kappa, 1.33711513107957, Z, 'κ');
  close(r.steam.Z, 0.984876223062086, 4e-4, 'Z (the sheet used M = 18.02, R = 8.314)');
});

test('Zoho default, temperature column: 100 °C', () => {
  const r = saturated('T', 373.15);
  const Z = 4e-5;   // the sheet interpolates p(t) linearly between rows 1.01325 and 1.1 bar
  close(r.p / 1e5, 1.01421182054243, Z, 'p');
  close(r.water.rho, 958.354143977863, Z, 'ρ water'); close(r.steam.rho, 0.598152252230169, Z, 'ρ steam');
  close(r.water.h, 419.099194804041, Z, 'h water'); close(r.steam.h, 2675.57186626134, Z, 'h steam');
  close(r.water.s, 1.30701353673787, Z, 's water'); close(r.steam.s, 7.35407937442484, Z, 's steam');
  close(r.water.cp, 4.2166457575321, Z, 'cp water'); close(r.steam.cp, 2.07749418467116, Z, 'cp steam');
  close(r.p / 1e5, 1.01417978, 1e-8, 'p exact (IF97)');
});

test('corrections against the sheet', () => {
  // ST-4: 0 bar (G) is 1.01325 bar a → 99.9743 °C (the sheet used 1.013 bar: 99.967 °C)
  const p0 = toSI(pressure.find((u) => u.label === 'bar (G)')!, 0);
  assert.equal(p0, 101325);
  close(saturated('p', p0).T - 273.15, 99.9743, 1e-6, 'boiling point at 1 atm');
  // ST-1: entropy in BTU/(lbm·°F): 1 kJ/(kg·K) = 0.238846 (the sheet showed 0.775)
  close(show(prop('s'), 'BTU/lbm/°F', 1), 0.2388458966, 1e-9, 'BTU/lbm/°F');
  // ST-2: enthalpy in BTU/lbm: 2.326 kJ/kg exactly
  close(show(prop('h'), 'BTU/lbm', 2.326), 1, 1e-12, 'BTU/lbm');
  // ST-3: 100 °C = 212 °F (the sheet showed 211.95)
  close(fromSI(temperature.find((u) => u.label === '°F')!, 373.15), 212, 1e-12, '°F');
  // ST-6: up to the critical point (the sheet stopped below 220 bar)
  const c = saturated('p', 220.64e5);
  close(c.T, 647.096, 1e-6, 'critical temperature'); close(c.water.rho, 322, 1e-9, 'critical density');
  const near = saturated('p', 220e5);
  assert.ok(near.water.rho > near.steam.rho && near.steam.rho > 250, 'two phases just below the critical point');
});

test('saturation range: triple point to critical point', () => {
  assert.throws(() => saturated('p', 500), RangeError);            // below 611.657 Pa
  assert.throws(() => saturated('p', 221e5), RangeError);          // above pc
  assert.throws(() => saturated('T', 272), RangeError);
  assert.throws(() => saturated('T', 648), RangeError);
  close(saturated('T', 273.16).p, 611.657, 1e-6, 'triple point');
  // textbook steam-table values (IAPWS-95 based tables, 5 digits)
  const r = saturated('p', 10e5);
  close(r.T - 273.15, 179.88, 1e-4, 'tsat 10 bar'); close(r.steam.h, 2777.1, 1e-4, 'h″ 10 bar');
});

test('subcooled water and superheated steam (p, t)', () => {
  const sh = atPT(1e6, 573.15);   // 10 bar a, 300 °C (classic steam table: v 0.25799, h 3051.6, s 7.1246)
  assert.equal(sh.phase, 'vapour');
  close(1 / sh.props.rho, 0.25799, 1e-4, 'v'); close(sh.props.h, 3051.6, 1e-4, 'h'); close(sh.props.s, 7.1246, 1e-4, 's');
  close(sh.tsat - 273.15, 179.886, 1e-5, 'tsat');
  const sc = atPT(50e5, 293.15);  // 50 bar a, 20 °C
  assert.equal(sc.phase, 'liquid');
  close(sc.props.rho, 1000.4, 1e-4, 'ρ cold water at 50 bar');
  assert.equal(atPT(250e5, 700).phase, 'supercritical');
  assert.ok(Number.isNaN(atPT(250e5, 700).tsat), 'no saturation above pc');
  assert.throws(() => atPT(1e5, 1100), RangeError);               // above 800 °C
  assert.throws(() => atPT(101e6, 400), RangeError);              // above 100 MPa
  assert.throws(() => atPT(1e5, 270), RangeError);                // below 0 °C
});

test('unit lists', () => {
  for (const p of PROPS) {
    close(show(p, p.def, 1.2345), show(p, p.def, 1.2345), 0, p.key);
    assert.ok(Number.isFinite(show(p, p.def, 1)), `${p.key} default unit ${p.def}`);
  }
  close(show(prop('mu'), 'cP', 0.000281), 0.281, 1e-12, 'Pa·s → cP');
  close(toSI(pressure.find((u) => u.label === 'psi (G)')!, 0), 101325, 1e-12, 'psi (G)');
  assert.ok(!pressure.some((u) => /column/.test(u.label)));
});
