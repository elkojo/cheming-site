// Acceptance tests for the native Heat Exchanger calculator (ROADMAP Phase 7).
// 1. Zoho default (cold 40 → 60 °C, 140 000 kg/h; hot 104 → 85.11 °C; counter-current; U 717 kcal/(m²·h·°C) clean,
//    fouling 0.0005/0.0004 m²·h·°C/kcal; margin 20 %) reproduced with the sheet's 4.184 J calorie.
// 2. F for one shell pass vs Bowman, Mueller & Nagle's closed form (Perry 7th Fig. 11-4a equation).
// 3. Cross-flow effectiveness vs an independent finite-difference solution (both unmixed, one mixed) and vs
//    Lienhard's approximation; N-shell limits.
// 4. Sizing ↔ rating round trips for every arrangement; phase change; LMTD edge cases; tube count.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  size, rate, thermal, lmtd, effectiveness, epsCrossUnmixed, ntuFor, shellsNeeded, designU, tubes,
  type StreamIn, type Geometry, type Arr, type Mix,
} from '../src/lib/calc/hx.ts';
import { PERRY_11_3, ETB_U, ETB_FOULING, BTU_HFT2F } from '../src/lib/calc/hx-data.ts';

const close = (got: number, want: number, tol: number, what = '') =>
  assert.ok(Math.abs(got - want) <= tol * Math.abs(want), `${what}: got ${got}, want ${want}`);

const K = 273.15, KCAL = 4184;   // the sheet's calorie
const counter: Geometry = { arr: 'counter', shells: 1, mix: 'none' };
const zHot: StreamIn = { latent: false, tin: 104 + K, tout: 85.11 + K, m: NaN, cp: 0.63 * KCAL, lam: NaN };
const zCold: StreamIn = { latent: false, tin: 40 + K, tout: 60 + K, m: 140000 / 3600, cp: 0.51 * KCAL, lam: NaN };
const zU = designU(717 * KCAL / 3600, 0.0005 * 3600 / KCAL, 0.0004 * 3600 / KCAL);

test('Zoho default reproduced (sheet calorie 4.184 J)', () => {
  const r = size(zHot, zCold, 'mh', counter, zU, 0.2);
  assert.equal(r.error, undefined);
  close(r.th.q, 1659653.33333333, 1e-12, 'Q W');
  close(r.th.q / (KCAL / 3600), 1428000, 1e-12, 'Q kcal/h');
  close(r.hot.m, 33.3313726643533, 1e-12, 'hot flow kg/s');
  close(r.hot.m * 3600, 119992.941591671, 1e-12, 'hot flow kg/h');
  close(r.th.lmtd, 44.5526954494692, 1e-12, 'LMTD');
  close(zU, 506.481087542297, 1e-12, 'Ud');
  assert.equal(r.th.F, 1);
  close(r.area, 73.549574635269, 1e-12, 'A');
  close(r.areaD, 88.2594895623228, 1e-12, 'A′');
});

test('any one unknown: the six sizing choices agree', () => {
  const base = size(zHot, zCold, 'mh', counter, zU, 0.2);
  const hot = { ...zHot, m: base.hot.m };
  close(size(hot, zCold, 'th', counter, zU, 0.2).hot.tout, zHot.tout, 1e-12, 'hot outlet');
  close(size(hot, zCold, 'mc', counter, zU, 0.2).cold.m, zCold.m, 1e-12, 'cold flow');
  close(size(hot, zCold, 'tc', counter, zU, 0.2).cold.tout, zCold.tout, 1e-12, 'cold outlet');
  close(size(hot, zCold, 'tih', counter, zU, 0.2).hot.tin, zHot.tin, 1e-12, 'hot inlet');
  close(size(hot, zCold, 'tic', counter, zU, 0.2).cold.tin, zCold.tin, 1e-12, 'cold inlet');
  close(size(hot, zCold, 'tic', counter, zU, 0.2).area, base.area, 1e-12, 'same area');
});

/** Bowman, Mueller & Nagle (1940), one shell pass, even tube passes (Perry Fig. 11-4a). */
function bowman12(R: number, S: number): number {
  const r = Math.sqrt(R * R + 1);
  if (Math.abs(R - 1) < 1e-9) return (S * Math.SQRT2 / (1 - S)) / Math.log((2 - S * (2 - Math.SQRT2)) / (2 - S * (2 + Math.SQRT2)));
  return (r / (R - 1)) * Math.log((1 - S) / (1 - R * S)) / Math.log((2 - S * (R + 1 - r)) / (2 - S * (R + 1 + r)));
}

test('F, one shell pass: equals the Bowman closed form', () => {
  const g: Geometry = { arr: 'shell', shells: 1, mix: 'none' };
  for (const [thi, tho, tci, tco] of [[104, 85.11, 40, 60], [150, 90, 40, 70], [200, 100, 20, 80], [120, 70, 30, 80], [100, 70, 20, 60], [90, 60, 20, 50]]) {
    const ch = 1000, cc = ch * (thi - tho) / (tco - tci);
    const t = thermal({ tin: thi, tout: tho, m: 1, C: ch }, { tin: tci, tout: tco, m: 1, C: cc }, g, ch * (thi - tho));
    const R = (thi - tho) / (tco - tci), S = (tco - tci) / (thi - tci);
    close(t.F, bowman12(R, S), 1e-9, `F R=${R} S=${S}`);
  }
  // the Zoho case as a 1-2 exchanger
  const r = size(zHot, zCold, 'mh', g, zU, 0.2);
  close(r.th.F, 0.9674289520564963, 1e-9, 'Zoho case, 1-2');
  // R = 1 limit
  const t = thermal({ tin: 100, tout: 70, m: 1, C: 1 }, { tin: 20, tout: 50, m: 1, C: 1 }, g, 30);
  close(t.F, bowman12(1, 30 / 80), 1e-7, 'R = 1');
});

test('N shells: F rises towards counter-current, infeasible 1-2 detected, shell count', () => {
  const h = { tin: 150, tout: 60, m: 1, C: 1000 }, c = { tin: 40, tout: 120, m: 1, C: 1000 * 90 / 80 };
  const q = 90000;
  const F = [1, 2, 3, 4, 8].map((n) => thermal(h, c, { arr: 'shell', shells: n, mix: 'none' }, q));
  assert.ok(F[0].infeasible, 'deep temperature cross: one shell cannot do it');
  const ok = F.filter((t) => !t.infeasible);
  assert.ok(ok.length >= 3, 'feasible with more shells');
  for (let i = 1; i < ok.length; i++) assert.ok(ok[i].F > ok[i - 1].F, `F increases with shells ${i}`);
  assert.ok(F[4].F > 0.95 && F[4].F < 1, 'many shells → counter-current');
  const n = shellsNeeded(h, c, q);
  assert.ok(thermal(h, c, { arr: 'shell', shells: n, mix: 'none' }, q).F >= 0.8);
  assert.ok(!(thermal(h, c, { arr: 'shell', shells: n - 1, mix: 'none' }, q).F >= 0.8));
  assert.ok(thermal(h, c, { arr: 'shell', shells: 1, mix: 'none' }, q).cross, 'temperature cross flagged');
});

/** Finite-difference cross-flow: hot along x, cold along y; exact exponential update per cell. */
function crossFD(ntuH: number, ntuC: number, mix: Mix, n = 600): number {
  // returns Q/(Ch·(Thi − Tci)) with Thi = 1, Tci = 0
  const th = new Float64Array(n).fill(1);        // hot temperature per row (y) entering column x
  const tc = new Float64Array(n).fill(0);        // cold temperature per column (x) entering row y
  const a = ntuH / n, b = ntuC / n;              // per-cell NTU for a hot row cell / cold column cell
  for (let i = 0; i < n; i++) {                  // columns x
    for (let j = 0; j < n; j++) {                // rows y
      const dT = th[j] - tc[i];
      // simultaneous cell exchange (small cells): q per cell = UA_cell·ΔT_mean
      const k = (1 - Math.exp(-(a + b))) / (a + b);
      const qc = dT * k;                         // per unit UA_cell
      th[j] -= a * qc; tc[i] += b * qc;
    }
    if (mix === 'hot') { const m = th.reduce((s, v) => s + v, 0) / n; th.fill(m); }
    if (mix === 'cold') { /* cold mixed across x at each row: handled by transposed run */ }
  }
  return 1 - th.reduce((s, v) => s + v, 0) / n;
}

test('cross-flow effectiveness vs finite differences and Lienhard', () => {
  for (const [ntu, cr] of [[0.5, 0.25], [1, 0.5], [2, 0.75], [3, 1], [1.5, 1]]) {
    // hot = Cmin: NTU_h = ntu, NTU_c = ntu·cr
    const fd = crossFD(ntu, ntu * cr, 'none');
    close(epsCrossUnmixed(ntu, cr), fd, 2e-3, `unmixed NTU ${ntu} Cr ${cr}`);
    const fdHotMixed = crossFD(ntu, ntu * cr, 'hot');
    const g: Geometry = { arr: 'cross', shells: 1, mix: 'hot' };
    close(effectiveness(ntu, cr, g, true), fdHotMixed, 3e-3, `Cmin (hot) mixed NTU ${ntu} Cr ${cr}`);
    // Lienhard Table 3.1 approximation for neither mixed (R > 0.3 and NTU > 1, else the second form)
    const lien = cr > 0.3 && ntu > 1
      ? (1 + 0.44 * (1 - cr)) * (1 - (0.92 + (Math.PI * cr ** 0.15 * ntu) ** 1.25) ** -0.4)
      : 1 - Math.exp((Math.exp(-(cr ** 1.15) * ntu) - 1) / cr ** 1.15);
    close(epsCrossUnmixed(ntu, cr), lien, 0.03, `Lienhard approx. NTU ${ntu} Cr ${cr}`);
  }
  // Cmax mixed formula: hot = Cmax mixed when cold is Cmin
  const g: Geometry = { arr: 'cross', shells: 1, mix: 'hot' };
  const ntu = 1.2, cr = 0.6;
  const fd = crossFD(ntu * cr, ntu, 'hot') * (1 / cr);   // ε based on Cmin (cold): Q/(Cc·ΔT) = (Ch/Cc)·(Q/(Ch·ΔT))
  close(effectiveness(ntu, cr, g, false), fd, 3e-3, 'Cmax (hot) mixed');
  // limits
  close(epsCrossUnmixed(2, 0), 1 - Math.exp(-2), 1e-15, 'Cr = 0');
  close(epsCrossUnmixed(0.01, 1), 0.01 * (1 - 0.01), 1e-3, 'small NTU: NTU·(1 − NTU·(1 + Cr)/2)');
});

test('sizing → rating round trip, every arrangement', () => {
  const geos: Geometry[] = [
    counter, { arr: 'co', shells: 1, mix: 'none' }, { arr: 'shell', shells: 1, mix: 'none' }, { arr: 'shell', shells: 2, mix: 'none' },
    { arr: 'cross', shells: 1, mix: 'none' }, { arr: 'cross', shells: 1, mix: 'hot' }, { arr: 'cross', shells: 1, mix: 'cold' },
  ];
  const hot: StreamIn = { latent: false, tin: 150 + K, tout: 100 + K, m: 2, cp: 2200, lam: NaN };
  const cold: StreamIn = { latent: false, tin: 30 + K, tout: NaN, m: 3, cp: 4180, lam: NaN };
  for (const g of geos) {
    const s = size(hot, cold, 'tc', g, 400, 0);
    assert.equal(s.error, undefined, g.arr);
    const r = rate(hot, cold, g, 400, s.area);
    close(r.q, s.th.q, 1e-8, `Q ${g.arr} ${g.shells} ${g.mix}`);
    close(r.hot.tout, hot.tout, 1e-9, `hot out ${g.arr} ${g.mix}`);
    close(r.cold.tout, s.cold.tout, 1e-9, `cold out ${g.arr} ${g.mix}`);
    // ΔTm = Q/(U·A) in rating as well
    close(r.th.dtm, r.q / (400 * s.area), 1e-8, `ΔTm ${g.arr} ${g.mix}`);
  }
});

test('phase change: condensing steam heats water; both latent', () => {
  const steam: StreamIn = { latent: true, tin: 150 + K, tout: NaN, m: NaN, cp: NaN, lam: 2113.7e3 };
  const water: StreamIn = { latent: false, tin: 20 + K, tout: 80 + K, m: 10, cp: 4180, lam: NaN };
  for (const arr of ['counter', 'shell', 'cross'] as Arr[]) {
    const r = size(steam, water, 'mh', { arr, shells: 1, mix: 'none' }, 1500, 0.2);
    close(r.th.q, 10 * 4180 * 60, 1e-12, 'Q');
    close(r.hot.m, 10 * 4180 * 60 / 2113.7e3, 1e-12, 'steam flow');
    close(r.th.lmtd, (130 - 70) / Math.log(130 / 70), 1e-12, 'LMTD');
    close(r.th.F, 1, 1e-12, `F = 1 with one isothermal stream (${arr})`);
  }
  const bad = size(steam, water, 'th', counter, 1500, 0.2);
  assert.ok(bad.error, 'condensing outlet cannot be the unknown');
  const both = rate(steam, { latent: true, tin: 100 + K, tout: NaN, m: NaN, cp: NaN, lam: 2257e3 }, counter, 1000, 10);
  close(both.q, 1000 * 10 * 50, 1e-12, 'Q = U·A·ΔT when both change phase');
});

test('LMTD edge cases (HE-3)', () => {
  close(lmtd(20, 20), 20, 1e-15, 'equal ends');
  assert.ok(Number.isNaN(lmtd(20, -5)), 'cross gives NaN, not a number');
  const r = size({ ...zHot, tout: 30 + K }, zCold, 'mh', counter, zU, 0.2);
  assert.ok(r.th.infeasible, 'hot out below cold in, counter-current');
  assert.ok(Number.isNaN(ntuFor(0.99, 1, { arr: 'co', shells: 1, mix: 'none' }, true)), 'co-current ε > 1/(1+Cr)');
});

test('tube-side fouling referred to the outside area (HE-5, Perry Eq. 11-2)', () => {
  const uc = 717 * KCAL / 3600, rfShell = 0.0004 * 3600 / KCAL, rfTube = 0.0005 * 3600 / KCAL, ratio = 19.05 / (19.05 - 2 * 2.11);
  close(ratio, 1.2845583277140928, 1e-15, 'do/di');
  const ud = designU(uc, rfShell, rfTube, ratio);
  close(1 / ud, 1 / uc + rfShell + rfTube * ratio, 1e-15, 'resistances in series');
  assert.ok(ud < zU, 'more resistance than the sheet');
  const a0 = size(zHot, zCold, 'mh', counter, zU, 0.2).area, a1 = size(zHot, zCold, 'mh', counter, ud, 0.2).area;
  close(a1 / a0, zU / ud, 1e-12, 'area ∝ 1/Ud');
  assert.ok(a1 / a0 > 1.05 && a1 / a0 < 1.07, 'about 6 % more area for the example');
});

test('tube count and velocity', () => {
  const t = tubes(88.2594895623228, 1, 0.01905, 0.00211, 6.096, 2, 140000 / 3600, 850);
  assert.equal(t.perShell, Math.ceil(88.2594895623228 / (Math.PI * 0.01905 * 6.096)));
  close(t.di, 0.01483, 1e-12, 'di');
  close(t.v, (140000 / 3600) / (850 * (t.perShell / 2) * Math.PI * 0.01483 ** 2 / 4), 1e-12, 'velocity');
});

test('reference tables', () => {
  close(BTU_HFT2F, 5.678263, 1e-6, 'Btu/(h·ft²·°F) → W/(m²·K)');
  assert.equal(PERRY_11_3.reduce((s, g) => s + g.rows.length, 0), 59);
  for (const g of PERRY_11_3) for (const r of g.rows) assert.ok(r.u[0] < r.u[1] && r.dirt > 0 && r.dirt <= 0.01, r.shell);
  assert.equal(ETB_U.length, 21);
  assert.equal(ETB_FOULING.length, 9);
});
