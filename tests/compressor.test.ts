// Acceptance tests for the native Compressor calculator (ROADMAP Phase 7).
// 1. Zoho defaults (air-like gas, 1 → 4.9 bar g, 0.4264 m³/s, k 1.22, 20 °C): the sheet's cached values reproduced
//    with its constants (R 8.314, the COMP-1 factor 0.980665 = 100·g/1000), then the corrected values.
// 2. Independent published values: Walas rule of thumb 7 (air, 100 °F, r = 3: 62 HP per million ft³/day, 306 °F);
//    GPSA Eq. 13-41 statement (30 000 N·m/kg at M = 30, 33 000 at M = 16).
// 3. Multistage power (Perry Eq. 10-80a) = sum of the stages; stage selection keeps the actual Td within the limit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compressor, massFromVol, volFromMass, stdFromMass, massFromStd, hMaxImpeller, scheelLosses, R_GAS, type CompInput,
} from '../src/lib/calc/compressor.ts';

const close = (got: number, want: number, tol: number, what = '') =>
  assert.ok(Math.abs(got - want) <= tol * Math.abs(want), `${what}: got ${got}, want ${want}`);

const BAR = 1e5, ATM = 101325, C0 = 273.15;
const V0 = 0.426404330835614;
const base: CompInput = {
  ps: 1 * BAR + ATM, pd: 4.9 * BAR + ATM, m: massFromVol(V0, 1 * BAR + ATM, 28.97, 1, 20 + C0), mw: 28.97, k: 1.22,
  ts: 20 + C0, zs: 1, zd: 1,
  tdLim: 150 + C0, rcLim: 5, etaIs: 0.8, etaMechR: 1,
  etaP: 1, hMax: 3500, tdLimC: 190 + C0, etaDrv: 1, margin: 1.1,
};
const SHEET = 100 * 9.80665 / 1000;   // COMP-1: ÷ (Mw/100) and × g/1000

test('Zoho defaults reproduced with the sheet constants', () => {
  const x = { ...base, tdLim: 149 + C0, etaIs: 1 };   // sheet: isentropic stage count, 149 °C
  const r = compressor(x);
  close(r.r, 2.93716627343847, 1e-14, 'R');
  close(base.m * R_GAS / 8.314, 1.02039398832961, 1e-13, 'mass flow with R 8.314');
  close(stdFromMass(base.m, 28.97, 20 + C0), 0.847232685965751, 1e-13, 'std volume (20 °C, Z = 1)');
  close(r.recip.nt, 0.532783238548467, 1e-13, 'Nt');
  close(r.recip.nr, 0.669454382582892, 1e-13, 'Nr');
  assert.equal(r.recip.n, 1);
  close(r.recip.tdIs - C0, 82.866768285324, 1e-12, 'Td isentropic');
  close(r.recip.rc, 2.93716627343847, 1e-14, 'Rc');
  // power is independent of R when the flow is a suction volume
  close(compressor(base).recip.gas / 1000 * SHEET, 125.146408443729, 1e-12, 'recip power (sheet, η 0.8)');
  close(r.cent.had * (8.314 / R_GAS) / 10, 10005.0626048813, 1e-12, 'adiabatic head "m" (sheet)');
  close(r.cent.hp * (8.314 / R_GAS) / 10, 10005.0626048812, 1e-12, 'polytropic head, η 1 (sheet)');
  assert.equal(r.cent.nImp, 3, 'stages at 3 500 m');
  close(r.cent.gas / 1000 * SHEET, 100.117126754981, 1e-12, 'centrifugal power (sheet, η 1)');
  // COMP-2: the sheet divides the exponent by the number of stages
  close(x.ts * r.r ** (r.sigma / 3) - C0, 39.613993837186, 1e-12, 'sheet centrifugal Td (wrong)');
});

test('corrected default results', () => {
  const r = compressor(base);
  close(base.m, 1.020337213448566, 1e-12, 'mass flow');
  close(r.cent.had / 1000, 100.05619319104778, 1e-12, 'Had kJ/kg');
  close(r.cent.hadM, 10202.892240576322, 1e-12, 'Had m');
  close(r.recip.gas / 1000, 127.61382168603134, 1e-12, 'recip gas power');
  close(r.recip.td - C0, 20 + (82.866768285324 - 20) / 0.8, 1e-12, 'recip actual Td');
  close(r.cent.gas / 1000, 102.09105734882507, 1e-12, 'centrifugal gas power, η 1');
  close(r.cent.td - C0, 82.866768285324, 1e-12, 'centrifugal Td (COMP-2 fixed)');
  const c = compressor({ ...base, etaP: 0.75 }).cent;
  close(c.hpM, 10551.581748446124, 1e-12, 'Hp m, ηp 0.75');
  close(c.gas / 1000, 140.77343456494006, 1e-12, 'power, ηp 0.75 (COMP-3)');
  close(c.td - C0, 106.68703333422144, 1e-12, 'Td, ηp 0.75');
  close(c.etaIs, c.had / (c.hp / 0.75), 1e-12, 'isentropic efficiency = Had/(Hp/ηp)');
  assert.ok(c.etaIs < 0.75, 'adiabatic efficiency below polytropic for compression');
});

test('flow conversions round trip', () => {
  const m = 1.234;
  close(massFromVol(volFromMass(m, 3e5, 16.04, 0.97, 300), 3e5, 16.04, 0.97, 300), m, 1e-14, 'volume');
  close(massFromStd(stdFromMass(m, 16.04, 288.15), 16.04, 288.15), m, 1e-14, 'standard volume');
  // 1 kmol at 0 °C, 1 atm = 22.414 m³
  close(stdFromMass(28.97, 28.97, C0), 22.41396954, 1e-9, 'molar volume at 0 °C');
});

test('Walas rule of thumb 7: air from 100 °F, k 1.4, r 3 → 62 HP per million ft³/day, 306 °F', () => {
  const tF = (t: number) => (t - C0) * 1.8 + 32;
  const ts = (100 + 459.67) / 1.8, tStd = (60 + 459.67) / 1.8;
  const vStd = 1e6 * 0.3048 ** 3 / 86400;              // 10⁶ ft³/day at 60 °F
  const m = massFromStd(vStd, 28.96, tStd);
  const ps = 14.696 * 6894.757293168;
  const r = compressor({ ...base, ps, pd: 3 * ps, m, mw: 28.96, k: 1.4, ts, etaIs: 1, etaP: 1 });
  close(tF(r.cent.td), 306, 2e-3, 'outlet temperature °F (one stage, isentropic)');
  close(r.cent.gas / 745.6998715822702, 62, 0.01, 'theoretical HP');
});

test('GPSA Eq. 13-41: maximum head per wheel', () => {
  close(hMaxImpeller(30) * 9.80665, 30000, 0.005, 'M = 30');
  close(hMaxImpeller(16) * 9.80665, 33000, 0.005, 'M = 16');
  close(hMaxImpeller(28.97), 0.3048 * (15000 - 1500 * 28.97 ** 0.35), 1e-15, 'IPS-E-PR-750 Eq. 10 in m');
  close(hMaxImpeller(28.97), 4572 - 457.2 * 28.97 ** 0.35, 1e-12, 'IPS constants');
});

test('multistage reciprocating: Perry 10-80a, stage selection by actual Td', () => {
  const x = { ...base, pd: 20 * BAR + ATM };
  const r = compressor(x).recip;
  assert.equal(r.n, 2);
  close(r.gas / 1000, 280.2696, 1e-6, '1 → 20 bar g, N 2');
  // the sum of the stages, each from its own suction pressure at Ts
  const sum = r.stages.reduce((a, st) => a + compressor({ ...x, ps: st.pin, pd: st.pout, rcLim: 1e9, tdLim: 1e9 }).recip.gas, 0);
  close(r.gas, sum, 1e-12, 'sum of stages');
  close(r.stages[1].pout, x.pd, 1e-12, 'last stage reaches Pd');
  // fewest stages: N within both limits, N − 1 not
  for (const pdBar of [3, 8, 20, 60, 150, 300]) {
    for (const etaIs of [0.65, 0.8, 1]) {
      const y = { ...base, pd: pdBar * BAR + ATM, etaIs }, q = compressor(y).recip;
      assert.ok(q.td <= y.tdLim + 1e-9 && q.rc <= y.rcLim + 1e-12, `limits met ${pdBar} ${etaIs}`);
      if (q.n > 1) {
        const rc1 = (y.pd / y.ps) ** (1 / (q.n - 1));
        const td1 = y.ts * (1 + (rc1 ** ((y.k - 1) / y.k) - 1) / etaIs);
        assert.ok(td1 > y.tdLim || rc1 > y.rcLim, `N − 1 fails ${pdBar} ${etaIs}`);
      }
    }
  }
  assert.ok(compressor({ ...base, tdLim: 15 + C0 }).recip.tdImpossible, 'limit below Ts');
});

test('Scheel mechanical losses and driver rating', () => {
  close(scheelLosses(1e6), 1000 * 1000 ** 0.4, 1e-15, '1 MW');
  const r = compressor({ ...base, etaP: 0.75, etaDrv: 0.95 }).cent;
  close(r.shaft, r.gas + scheelLosses(r.gas), 1e-15, 'shaft = gas + losses');
  close(r.drv, r.shaft / 0.95, 1e-15, 'driver input');
  close(r.rating, 1.1 * r.shaft, 1e-15, 'motor 110 % (API 618 3.1.2.2)');
});
