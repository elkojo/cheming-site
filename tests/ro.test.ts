// Acceptance tests for the native Restriction Orifice (RO) calculator (ROADMAP Phase 7).
// 1. Zoho defaults (steam 500 kg/h, 12 → 1.5 bar a, 370 °C, M 18.02, Z 0.99759, κ 1.29, 3″ Sch 40): critical flow,
//    sizing d = 11.9354 mm and rating 11.94 mm → 500.386 kg/h reproduced (sheet constants), then exact.
// 2. Unchoked gas and liquid (ε = 1, i.e. κ → ∞ in fluids) against the fluids 1.3.1 ISO 5167 functions (Reader–Harris/Gallagher C, 2003 expansibility,
//    permanent-loss Eq. 7), solved independently for the tap pressure. 3. Sizing ↔ rating round trip; choked liquid;
//    critical ratio; limits; side notes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rate, size, cRHG, epsilon2003, lossRatio, criticalRatio, cdChoked, critFlowFunction, limits, cdThickness, cdRounded, gasDensity, R } from '../src/lib/calc/ro.ts';
import { pipe, id } from '../src/lib/calc/pipes.ts';

const close = (got: number, want: number, rel: number, what = '') =>
  assert.ok(Math.abs(got - want) <= rel * Math.abs(want), `${what}: got ${got}, want ${want}`);

const D = id(pipe('3', '40')!) * 0.0254;
const steam = { D, p1: 12e5, p2: 1.5e5, mu: 0.023e-3, gas: { mw: 18.02, t: 643.15, z: 0.99759, k: 1.29 } };

test('Zoho defaults: critical steam flow, sheet numbers', () => {
  close(D * 1000, 77.9272, 1e-12, 'D');
  // the sheet: ρ with R = 0.08314 bar·m³/(kmol·K), P1 + 1.013 in the choked formula
  const rhoS = 12 * 18.02 / (0.08314 * 0.99759 * 643.15);
  close(rhoS, 4.05379377540978, 1e-12, 'sheet ρ1');
  close(cdChoked(0.125), 0.8458095703125, 1e-12, 'Cd(choked)');
  close(critFlowFunction(1.29), 0.66544868555958, 1e-12, 'critical flow function');
  const wSheet = 2.483647e-4 * 11.94 ** 2 * cdChoked(0.125) * critFlowFunction(1.29) * Math.sqrt(rhoS * (12 - 1.01325 + 1.013)) * 3600;
  close(wSheet, 500.385959690511, 1e-12, 'sheet rating 11.94 mm');
  const bS = 0.2 * Math.sqrt(500 / (2.483647e-4 * (77.9272 * 0.2) ** 2 * cdChoked(0.125) * critFlowFunction(1.29) * Math.sqrt(rhoS * 11.99975) * 3600));
  close(bS * 77.9272, 11.9353943075412, 1e-12, 'sheet sizing d');
});

test('Zoho defaults: native (exact R and pressures) within 0.02 % of the sheet', () => {
  const r = rate(steam, 0.01194);
  assert.equal(r.regime, 'critical');
  close(r.w * 3600, 500.385959690511, 2e-4, 'rating');
  close(r.rho1, 12e5 * 0.01802 / (0.99759 * R * 643.15), 1e-15, 'ρ1');
  const s = size(steam, 500 / 3600)!;
  close(s.d * 1000, 11.9353943075412, 2e-4, 'sizing');
  close(s.w * 3600, 500, 1e-9, 'sizing hits the flow');
  assert.ok(s.rc! > 0.54 && s.rc! < 0.56, 'rc ≈ 0.55 for κ 1.29');
});

test('unchoked gas equals the fluids ISO 5167 solution', () => {
  const g = { ...steam };
  for (const [d, p2, m, p2t] of [[0.03, 10e5, 0.5637489683931226, 960643.5335111181], [0.045, 11e5, 1.0937637528226085, 1046980.8034825783],
    [0.02, 9.5e5, 0.26114900016118864, 929470.966553149]]) {
    const r = rate({ ...g, p2 }, d);
    assert.equal(r.regime, 'unchoked');
    close(r.w, m, 1e-6, `w d ${d}`);
    close(r.pVc, p2t, 1e-6, `tap p2 d ${d}`);
  }
});

test('unchoked liquid equals the fluids ISO 5167 solution (incl. D < 71.12 mm term)', () => {
  const liq = { D, p1: 12e5, p2: 8e5, mu: 0.89e-3, rho: 997, pv: 3170 };
  for (const [d, p2, m] of [[0.025, 8e5, 8.884883057103545], [0.04, 11e5, 13.120944148110544], [0.015, 6e5, 3.7376877532397685]]) {
    const r = rate({ ...liq, p2 }, d);
    assert.equal(r.regime, 'unchoked');
    close(r.w, m, 1e-6, `w d ${d}`);
  }
  const Ds = id(pipe('2', '40')!) * 0.0254;
  close(rate({ ...liq, D: Ds, p2: 10e5 }, 0.02).w, 4.1829281590151774, 1e-6, 'small pipe');
});

test('sizing and rating are inverse', () => {
  for (const d of [0.005, 0.02, 0.05]) {
    const r = rate({ ...steam, p2: 9e5 }, d);
    close(size({ ...steam, p2: 9e5 }, r.w)!.d, d, 1e-9, `gas d ${d}`);
  }
  const liq = { D, p1: 12e5, p2: 8e5, mu: 0.89e-3, rho: 997, pv: 3170 };
  close(size(liq, rate(liq, 0.03).w)!.d, 0.03, 1e-9, 'liquid');
  assert.equal(size(liq, 1e3), undefined, 'impossible flow');
});

test('choked liquid: P1 − Pv with Cd 0.6 when smaller', () => {
  const liq = { D, p1: 5e5, p2: 0.1e5, mu: 0.3e-3, rho: 950, pv: 4e5 };
  const r = rate(liq, 0.01);
  assert.equal(r.regime, 'choked-liquid');
  close(r.w, 0.6 * Math.PI / 4 * 1e-4 / Math.sqrt(1 - r.beta ** 4) * Math.sqrt(2 * 950 * 1e5), 1e-12, 'w');
});

test('building blocks', () => {
  close(criticalRatio(1.4, 0), (2 / 2.4) ** (1.4 / 0.4), 1e-9, 'β → 0: (2/(κ+1))^(κ/(κ−1))');
  assert.ok(criticalRatio(1.4, 0.7) > criticalRatio(1.4, 0.1), 'rc rises with β');
  close(lossRatio(0.5, 0.6), (Math.sqrt(1 - 0.0625 * 0.64) - 0.15) / (Math.sqrt(1 - 0.0625 * 0.64) + 0.15), 1e-15, 'Eq. 7');
  close(epsilon2003(0.5, 10, 10, 1.4), 1, 0, 'ε = 1 at Δp = 0');
  assert.ok(cRHG(0.5, 1e6, 0.1) > 0.6 && cRHG(0.5, 1e6, 0.1) < 0.61);
  close(gasDensity(1e5, { mw: 28.96, t: 293.15, z: 1, k: 1.4 }), 1.18825, 1e-4, 'air density');
  assert.deepEqual(limits(rate(steam, 0.01194), D), ['d below 12.5 mm']);
  close(cdThickness(1), 0.81, 1e-15); assert.equal(cdThickness(0.1), Math.min(1, 0.81 - 0.0347 * Math.log(0.1)));
  close(cdRounded(0), 0.6, 1e-15); assert.equal(cdRounded(0.2), 1);
});
