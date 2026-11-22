// Acceptance tests for the native Pressure Loss: Single Phase calculator (ROADMAP Phase 7).
// 1. Every Zoho default result is reproduced with the sheet's own friction correlation (and R = 8.314 where the
//    sheet used it); then the corrected values (exact Colebrook, exact R, Z = 1 at standard conditions).
// 2. Colebrook against 40-digit solutions (mpmath; the fluids 1.3.1 Colebrook agrees to 1e-10), laminar
//    branch, fittings, gas, API RP 14E against fluids.erosional_velocity.
// 3. Pipe table: ASME B36.10M/B36.19M fixes of the sheet's table (PIP-1, PIP-2). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve, colebrook, goudarSonnadSheet, friction, regime, gasDensity, sonic, erosional, FITTINGS, R } from '../src/lib/calc/pressure1p.ts';
import { pipe, id, schedulesFor, SIZES, CS_STD, SS_10S } from '../src/lib/calc/pipes.ts';

const close = (got: number, want: number, rel: number, what = '') =>
  assert.ok(Math.abs(got - want) <= rel * Math.abs(want), `${what}: got ${got}, want ${want}`);

// Zoho defaults: NPS 8 Sch 40, ε = 4.57e-5 m, 36.5 kg/s, 862.68 kg/m³, 0.6503 cP, Le = 100 m
const p8 = pipe('8', '40')!;
const d8 = id(p8) * 0.0254;
const base = { d: d8, eps: 4.57e-5, w: 36.5, rho: 862.68, mu: 0.6503e-3, la: 100 };

test('Zoho defaults: pipe and flow', () => {
  close(d8, 0.2027174, 1e-12, 'ID, m');
  close(p8.od * 0.0254, 0.219075, 1e-12, 'OD, m');
  close(p8.wall * 0.0254, 0.0081788, 1e-9, 'wall, m');
  const r = solve(base);
  close(r.area, 0.0322754225099941, 1e-12, 'Ai');
  close(r.rr, 0.0002254369876488155, 1e-12, 'ε/ID');
  close(r.q, 0.042310010664441, 1e-12, 'V');
  close(r.v, 1.31090493552298, 1e-12, 'v');
  close(r.rhoV2, 1482.49120927145, 1e-12, 'ρv²');
  close(r.re, 352531.721413753, 1e-12, 'Re');
  assert.equal(r.regime, 'turbulent');
  assert.equal(r.le, 100);
});

test('Zoho defaults: friction factor and Δp with the sheet correlation', () => {
  const r = solve(base);
  const fs = goudarSonnadSheet(r.re, r.rr);
  close(fs, 0.0162032092859232, 1e-12, 'sheet f');
  close(fs * r.le / d8 * 0.5 * 862.68 * r.v ** 2, 5924.77886169778, 1e-12, 'sheet Δp, Pa');
});

test('exact Colebrook instead of the sheet approximation changes Δp by −0.09 %', () => {
  const r = solve(base);
  close(r.f, 0.016169242570509, 1e-9, 'Colebrook f');
  close(r.dp, 5924.77886169778 * r.f / 0.0162032092859232, 1e-12, 'Δp');
  close(r.dp / 1e5, 0.0591236, 1e-6, 'Δp, bar');
  close(r.dpPer100, r.dp, 1e-12, 'per 100 m');
});

test('Zoho defaults: gas block (sheet R = 8.314; corrected with exact R and Z = 1 at standard)', () => {
  const g = { mw: 18, z: 1, t: 643.15, p: 150000, k: 1.31 };
  close(150 * 18 / 8.314 / 643.15, 0.504941969918137, 1e-12, 'sheet ρ formula');
  close(gasDensity(g), 0.504941969918137 * 8.314 / R, 1e-12, 'ρ, exact R');
  close(Math.sqrt(1.31 * 8314 / 18 * 643.15), 623.821792617446, 1e-12, 'sheet c formula');
  close(sonic(g), 623.821792617446 * Math.sqrt(R / 8.314), 1e-12, 'c, exact R');
  const r = solve({ ...base, rho: undefined, gas: g });
  close(r.gas!.qStd, 48.7757173835571 * R / 8.314, 1e-12, 'Std m³/s');
  close(r.rho, gasDensity(g), 0, 'gas density drives the flow (1P-4)');
  close(r.v, 36.5 / gasDensity(g) / r.area, 1e-12, 'gas velocity');
  close(r.gas!.mach, r.v / sonic(g), 1e-12, 'Mach');
  const rz = solve({ ...base, rho: undefined, gas: { ...g, z: 0.9 } });
  close(rz.gas!.qStd, r.gas!.qStd, 1e-12, 'standard volume independent of the actual Z (1P-5)');
  close(rz.rho, r.rho / 0.9, 1e-12, 'actual density ∝ 1/Z');
});

test('page gas example: steam 370 °C, 1.5 bar a, 0.5 kg/s in NPS 8 Sch 40 is a valid incompressible case', () => {
  const g = { mw: 18.015, z: 0.9977, t: 643.15, p: 150000, k: 1.295 };
  close(gasDensity(g), 0.5065167, 2e-4, 'ρ vs IAPWS-IF97 (0.5065 kg/m³)');
  const r = solve({ ...base, w: 0.5, mu: 0.0232e-3, rho: undefined, gas: g });
  assert.ok(r.v > 20 && r.v < 40, `v ${r.v}`);
  assert.ok(r.gas!.mach < 0.1 && r.gas!.dpRatio < 0.1, 'no warnings');
});

const COLEBROOK: [number, number, number][] = [
  [2500, 0, 0.046053830365857348], [2500, 1e-6, 0.046054666365403055], [2500, 0.0001, 0.046137373253512998], [2500, 0.001, 0.046884156446720969],
  [2500, 0.01, 0.053919466488887826], [2500, 0.05, 0.079985119738139464], [4000, 0, 0.039907014055634898], [4000, 1e-6, 0.039908029446170663],
  [4000, 0.0001, 0.040008431233555499], [4000, 0.001, 0.040910389862846133], [4000, 0.01, 0.049082269447899731], [4000, 0.05, 0.076986834889224868],
  [10000, 0, 0.030882950353487691], [10000, 1e-6, 0.030884498091421111], [10000, 0.0001, 0.031037212200998626], [10000, 0.001, 0.032381806363092721],
  [10000, 0.01, 0.043126584706811694], [10000, 0.05, 0.073801275638538284], [100000, 0, 0.017989773084273838], [100000, 1e-6, 0.01799519319334717],
  [100000, 0.0001, 0.018513866077471643], [100000, 0.001, 0.022174535944515075], [100000, 0.01, 0.038503543527335095], [100000, 0.05, 0.071780929441140336],
  [1e6, 0, 0.011645040997991623], [1e6, 1e-6, 0.011668155513485805], [1e6, 0.0001, 0.013441437692508493], [1e6, 0.001, 0.019943465840476866],
  [1e6, 0.01, 0.037964741876160063], [1e6, 0.05, 0.071573753859857871], [1e7, 0, 0.0081026694308749133], [1e7, 1e-6, 0.0082131804042593886],
  [1e7, 0.0001, 0.012166080958896584], [1e7, 0.001, 0.019667052432096763], [1e7, 0.01, 0.0379098257518066], [1e7, 0.05, 0.071552981840866774],
  [1e8, 0, 0.0059404663516367614], [1e8, 1e-6, 0.0064325565196922799], [1e8, 0.0001, 0.011999050555369488], [1e8, 0.001, 0.019638632837385287],
  [1e8, 0.01, 0.03790432338735433], [1e8, 0.05, 0.071550904091083257],
];

test('Colebrook equals the 40-digit solution (42 cases, 1e-13; fluids 1.3.1 agrees to 1e-10)', () => {
  for (const [re, rr, f] of COLEBROOK) close(colebrook(re, rr), f, 1e-13, `Re ${re}, ε/D ${rr}`);
});

test('the sheet correlation (Goudar–Sonnad Eq. 3) is up to 1 % high, as its authors state', () => {
  close(goudarSonnadSheet(4000, 0) / colebrook(4000, 0) - 1, 0.0099, 0.02, 'Re 4000 smooth');
});

test('laminar branch 64/Re and regimes (1P-2)', () => {
  assert.equal(friction(100, 1e-3), 0.64);
  assert.equal(friction(2000, 1e-3), 0.032);
  close(friction(2001, 1e-3), colebrook(2001, 1e-3), 0, 'above 2000: Colebrook');
  assert.deepEqual([regime(2000), regime(2001), regime(3999), regime(4000)], ['laminar', 'transitional', 'transitional', 'turbulent']);
  // Hagen–Poiseuille: Δp = 128·μ·L·Q/(π·d⁴)
  const r = solve({ d: 0.05, eps: 4.57e-5, w: 0.05, rho: 900, mu: 0.1, la: 10 });
  assert.equal(r.regime, 'laminar');
  close(r.dp, 128 * 0.1 * 10 * r.q / (Math.PI * 0.05 ** 4), 1e-12, 'Hagen–Poiseuille');
});

test('fittings: Le = La + d·Σ n·Le/D feeds Δp (1P-3)', () => {
  const leD = FITTINGS.find((x) => x[0] === 'Elbow 90°, long radius')![1] * 4 + FITTINGS.find((x) => x[0] === 'Gate valve, full bore')![1] * 2;
  assert.equal(leD, 76);
  const r = solve({ ...base, nLeD: leD });
  close(r.le, 100 + d8 * 76, 1e-12, 'Le');
  close(r.dp, solve(base).dp * r.le / 100, 1e-12, 'Δp ∝ Le');
  assert.equal(FITTINGS.length, 28);
});

test('API RP 14E erosional velocity equals fluids.erosional_velocity', () => {
  close(erosional(1000, 100), 3.857672800497152, 1e-12, 'ρ 1000, C 100');
  close(erosional(862.68, 150), 6.230053600913792, 1e-12, 'ρ 862.68, C 150');
});

test('pipe table: ASME B36.10M/B36.19M walls, sheet errors fixed (PIP-1, PIP-2)', () => {
  const w = (n: string, s: Parameters<typeof pipe>[1]) => pipe(n, s)?.wall;
  // PIP-1: stainless rotated in the sheet
  assert.deepEqual([w('14', '5S'), w('14', '10S'), w('14', '40S')], [0.156, 0.188, 0.375]);
  assert.deepEqual([w('10', '5S'), w('10', '10S'), w('10', '40S')], [0.134, 0.165, 0.365]);
  // PIP-2
  assert.equal(w('2 1/2', '160'), 0.375);
  assert.equal(w('12', '5'), 0.156);
  assert.equal(w('12', '60'), 0.562);
  assert.equal(w('34', '10'), 0.312);
  assert.equal(w('5', '10S'), 0.134);
  assert.equal(w('1 1/4', 'XS'), 0.191);
  assert.equal(w('2', '120'), undefined, 'not in B36.10M');
  // unchanged sheet values
  assert.deepEqual([w('8', '40'), w('8', 'XXS'), w('24', '60'), w('36', '40')], [0.322, 0.875, 0.968, 0.75]);
  assert.deepEqual(schedulesFor('48'), ['STD', 'XS']);
  assert.equal(SIZES.length, 36);
  for (const s of SIZES) for (const v of Object.values(s.walls)) assert.ok(v! > 0 && 2 * v! < s.od, `${s.nps}`);
  // the Pipe Size tool's lists are unchanged
  assert.equal(CS_STD.length, 32); assert.equal(SS_10S.length, 25);
});
