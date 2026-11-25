// Acceptance tests for the native Noise calculator (ROADMAP Phase 7).
// 1. Zoho default (k 1.29, 370 °C, M 18.015, 12 / 1 atm a, 500 kg/s, 1 km) with the sheet's fit and 91.2.
// 2. API RP 521 (1997) 5.4.4.3 examples (US and SI): PR 3, ½MC² = 9.1·10⁵ W → 54 + 60 = 114 dB.
// 3. New Fig. 23 fit: continuous at the knee, close to the sheet fit's safe side (NOI-1); distance and sums.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sonic, fig23, fig23Sheet, FIG23_KNEE, FIG23, halfWc2, L30, Lp, distanceFor, combine, EU_LIMITS } from '../src/lib/calc/noise.ts';

const close = (got: number, want: number, tol: number, what = '', abs = false) =>
  assert.ok(Math.abs(got - want) <= (abs ? tol : tol * Math.abs(want)), `${what}: got ${got}, want ${want}`);

test('Zoho default with the sheet fit and API 91.2', () => {
  const c = 91.2 * Math.sqrt(1.29 * (273.15 + 370) / 18.015);
  close(c, 618.911706408697, 1e-12, 'c');
  close(fig23Sheet(12), 57.1919455630357, 1e-12, 'L');
  const l30 = fig23Sheet(12) + 10 * Math.log10(0.5 * 500 * c * c);
  close(l30, 137.00391959447, 1e-12, 'L30');
  close(Lp(l30, 1000), 106.546344688863, 1e-12, 'Lp at 1 km');
  close(sonic(1.29, 643.15, 18.015), c, 3e-4, 'exact R vs 91.2');
});

test('API RP 521 (1997) examples: 114 dB at 30 m (100 ft)', () => {
  const c = sonic(1.4, 311, 29);
  close(c, 353, 2e-3, 'c = 353 m/s');
  close(halfWc2(14.6, c), 9.1e5, 0.01, '½MC² = 9.1·10⁵ W');
  close(fig23(3), 54, 0.2, 'Fig. 23 at PR 3 = 54', true);
  close(L30(fig23(3), 14.6, c), 114, 0.6, 'L30 = 114 dB', true);
  // US example: 1 slug/s, 1 159 ft/s → ½MC² in W = ½·14.594 kg/s·(353.3 m/s)²
  close(halfWc2(14.5939, 1159 * 0.3048), 9.1e5, 0.01, 'US: 9.1·10⁵ W');
});

test('Fig. 23 fit: continuous, knee, range; sheet fit higher (NOI-1)', () => {
  close(FIG23.a1 * Math.log(FIG23_KNEE) + FIG23.b1, FIG23.a2 * Math.log(FIG23_KNEE) + FIG23.b2, 1e-12, 'continuous');
  close(FIG23_KNEE, 2.936, 1e-3, 'knee');
  for (const pr of [1.5, 2, 2.5, 2.9, 3, 5, 10]) {
    const d = fig23Sheet(pr) - fig23(pr);
    assert.ok(d > -0.15 && d < 1.0, `sheet − new at PR ${pr}: ${d}`);
  }
  close(fig23Sheet(2.9088) - fig23Sheet(2.9090), 0.41, 0.05, 'sheet step at the knee (PR 2.9089)', true);
});

test('distance, hemispherical, inverse, combination, EU values', () => {
  close(Lp(120, 300) - Lp(120, 30), -20, 1e-12, '20 dB per decade');
  close(Lp(120, 300, true) - Lp(120, 300), 3, 1e-12, 'hemispherical +3 dB');
  close(Lp(130, distanceFor(130, 85)), 85, 1e-12, 'inverse'); close(Lp(130, distanceFor(130, 85, true), true), 85, 1e-12, 'inverse hemi');
  close(combine([90, 90]), 93.0103, 1e-6, 'two equal sources'); close(combine([80]), 80, 1e-12, 'one source');
  assert.deepEqual(EU_LIMITS.map((l) => [l.LEX, l.peakPa, l.peakdB]), [[87, 200, 140], [85, 140, 137], [80, 112, 135]]);
  for (const l of EU_LIMITS) close(20 * Math.log10(l.peakPa / 20e-6), l.peakdB, 0.002, `peak ${l.peakPa} Pa`);
});
