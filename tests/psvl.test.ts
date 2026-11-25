// Acceptance tests for the native PSV: Liquid Filled Vessel calculator (ROADMAP Phase 7).
// 1. Zoho defaults (horizontal, 2:1 heads, D 2 m, L 2.5 m, El 0.25 m, HLL 2 m, fire zone 7.62 m, F 1, C′ 43 200,
//    λ 2 270 kJ/kg, M 18, 100 °C, Z 1, k 1.12, set 16 bar g, 21 %, P2 0 bar g): the sheet's heat input, relief load,
//    critical area and orifice E reproduced from the sheet's wetted area; exact wetted area (PSVL-3).
// 2. Surfaces: numerical head areas vs closed forms, partly wetted heads (hemisphere, symmetry), vertical and sphere
//    cases (Archimedes), the sheet's vertical rule where it is exact, grade and skirt.
// 3. API 521: SI constants vs the US equations, Eq. 9 insulation factor = Table 5 row; water at the relieving pressure.
// 4. API 520 Part I sizing vs the fluids library (C. Bell, MIT): critical and subcritical; Napier KN.
// 5. API 526 pick (PSVL-6: equal area keeps the letter; above T several valves).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surfHead, headAreaExact, headWetH, wetted, heatInput, C_FIRE, fInsulation, BTU_IN, FLUX_21000, T_FIRE, coefC, pCritical, coefF2, napierKn, size, pickOrifice, pickBody, PSI, API526, IN2, type Vessel } from '../src/lib/calc/psvl.ts';
import { LIMITS526, TABLE526 } from '../src/lib/calc/psvl-api526.ts';
import { saturated } from '../src/lib/calc/steam.ts';
import { HEADS } from '../src/lib/calc/drum.ts';

const close = (got: number, want: number, tol: number, what = '', abs = false) =>
  assert.ok(Math.abs(got - want) <= (abs ? tol : tol * Math.abs(want)), `${what}: got ${got}, want ${want}`);
const PI = Math.PI, PATM = 101325;

const zoho: Vessel = { kind: 'horizontal', head: 'ell21', D: 2, L: 2.5, datum: 'tangent', El: 0.25, level: 2, Hf: 7.62 };
const P1z = 16e5 * 1.21 + PATM;

test('Zoho defaults: heat input, relief load, area and orifice from the sheet\'s wetted area', () => {
  const Asheet = 24.395746307949;   // sheet D13 (approximate head formula, PSVL-3)
  const Q = heatInput(C_FIRE.adequate, 1, Asheet);
  close(Q, 593036.3522097, 1e-12, 'Q');
  const W = Q / 2270e3;
  close(W * 3600, 940.498179715823, 1e-12, 'W kg/h');
  close(P1z, 2037325, 1e-12, 'P1');
  const r = size({ W, P1: P1z, P2: PATM, T: 373.15, M: 18, Z: 1, k: 1.12, Kd: 0.975, Kb: 1, Kc: 1, valve: 'conventional' });
  assert.equal(r.eq, 'critical');
  close(r.Pcf, 1182693.57808443, 1e-12, 'Pcf');
  close(r.C!, 0.0249718669393206, 1e-12, 'C');
  close(r.A * 1e6, 86.3271667139989, 1e-12, 'A mm²');
  close(r.A / IN2, 0.13380737602145, 1e-12, 'A in²');
  assert.equal(API526[pickOrifice(r.A).i].d, 'E');
  // the sheet's subcritical coefficient at its default (D50, evaluated with P2 = 1 atm)
  close(coefF2(1.12, PATM / P1z), 0.112729795593078, 1e-12, 'F2');
});

test('Zoho default: exact wetted area = whole vessel (full, below the fire-zone height)', () => {
  const w = wetted(zoho);
  close(w.total, PI * 2 * 2.5 + 2 * 4.33594135167249, 1e-13, 'total');
  close(w.A, w.total, 1e-13, 'A = total');
  assert.equal(w.limit, 'level');
  assert.ok(w.A < 24.395746307949, 'the sheet\'s wetted area exceeded the total surface (PSVL-3)');
});

test('head areas: numerical integration = closed forms, all six heads', () => {
  for (const h of HEADS) for (const D of [0.5, 2, 3.7]) close(surfHead(h.id, D).area, headAreaExact(h.id, D), 1e-12, `${h.id} D=${D}`);
  close(headAreaExact('ell21', 2), 4.33594135167249, 1e-13, 'sheet G62');   // the sheet's exact whole-head formula
});

test('partly wetted heads, horizontal axis', () => {
  const hs = surfHead('hemi', 2);
  for (const y of [0.01, 0.3, 1, 1.7, 1.99]) close(headWetH(hs, y), 0.5 * PI * 2 * y, 1e-12, `hemisphere y=${y}`);   // sheet H80 (exact)
  for (const id of ['ell21', 'tori10', 'asmefd', 'korb', 'flat'] as const) {
    const h = surfHead(id, 2);
    for (const y of [0.13, 0.6, 1]) close(headWetH(h, y) + headWetH(h, 2 - y), h.area, 1e-12, `${id} symmetry y=${y}`);
  }
  const f = surfHead('flat', 2);
  close(headWetH(f, 0.5), (4 / 8) * (2 * Math.acos(0.5) - Math.sin(2 * Math.acos(0.5))), 1e-12, 'flat = sheet I80');
  // 2:1 head, D = 1: the sheet's cubic fit vs exact (PSVL-3); exact values from an independent 30-digit quadrature (mpmath)
  const e = surfHead('ell21', 1);
  const exact: [number, number][] = [[0.1, 0.0883799456162616], [0.25, 0.246409279160699], [0.75, 0.837576058757432], [0.9, 0.99560539230187]];
  for (const [y, a] of exact) close(headWetH(e, y), a, 1e-12, `ell21 y=${y}`);
  const fit = (x: number) => 1.084 * (-1.18498 * x ** 3 + 1.7814 * x ** 2 + 0.4054 * x);
  close(fit(0.1) / headWetH(e, 0.1) - 1, -0.2988, 1e-3, 'sheet fit error at H/D = 0.1');
});

test('horizontal: limited by the fire zone and by the level', () => {
  const v: Vessel = { ...zoho, El: 6.62, level: 2 };   // fire zone ends 1 m above the bottom: half wetted
  const w = wetted(v);
  assert.equal(w.limit, 'fire');
  close(w.A, PI * 2 / 2 * 2.5 + surfHead('ell21', 2).area, 1e-12, 'half');
  const lv = wetted({ ...zoho, level: 0.5 });
  const h = surfHead('ell21', 2);
  close(lv.A, 2 * Math.acos(0.5) * 2.5 + 2 * headWetH(h, 0.5), 1e-13, 'level 0.5');
  assert.equal(wetted({ ...zoho, El: 8 }).limit, 'none');
  assert.equal(wetted({ ...zoho, El: 8 }).A, 0);
});

test('vertical: shell, heads, datum, skirt, grade', () => {
  const h = surfHead('ell21', 2);
  // sheet's vertical rule is exact when the bottom head is above grade and fully in the fire zone
  const v: Vessel = { kind: 'vertical', head: 'ell21', D: 2, L: 2.5, datum: 'tangent', El: 1, level: 2, Hf: 7.62 };
  close(wetted(v).A, PI * 2 * 2 + h.area, 1e-12, 'sheet L72');
  close(wetted({ ...v, datum: 'bottom', El: 0.5, level: 2.5 }).A, wetted(v).A, 1e-12, 'same vessel, other datum');
  close(wetted({ ...v, skirt: true }).A, PI * 2 * 2, 1e-12, 'skirt');
  // full vessel: both heads (the sheet never counted the top head, PSVL-4)
  const full = wetted({ ...v, level: 2.5 + 0.5 });
  close(full.A, full.total, 1e-12, 'full');
  // hemispherical bottom head cut by the fire zone: spherical zone 2πR·h (the sheet counted 2:1 heads fully)
  const hv: Vessel = { kind: 'vertical', head: 'hemi', D: 2, L: 3, datum: 'tangent', El: 2, level: 3, Hf: 1.6 };
  close(wetted(hv).A, 2 * PI * 1 * 0.6, 1e-12, 'hemisphere cap');
  // grade: the tangent line 0.25 m above grade, 2:1 head 0.5 m deep → bottom 0.25 m of the head not counted
  const g = wetted({ ...v, El: 0.25 });
  assert.ok(g.belowGrade);
  close(g.A, PI * 2 * 2 + (h.area - (wetted({ ...v, El: 1, Hf: 0.75, level: 2 }).A)), 1e-12, 'grade clip');
});

test('sphere: Archimedes zone, API rule (equator or 7.6 m, whichever is greater)', () => {
  const s: Vessel = { kind: 'sphere', head: 'ell21', D: 10, L: 0, datum: 'tangent', El: 1, level: 9, Hf: 7.62 };
  close(wetted(s).A, PI * 10 * 6.62, 1e-13, 'fire zone');
  assert.equal(wetted(s).limit, 'fire');
  const s2 = wetted({ ...s, Hf: 3 });
  close(s2.A, PI * 10 * 5, 1e-13, 'up to the equator');
  assert.equal(s2.limit, 'equator');
  close(wetted({ ...s, level: 4 }).A, PI * 10 * 4, 1e-13, 'liquid level');
  close(wetted(s).total, PI * 100, 1e-13, 'total');
});

test('API 521: SI fire constants = the US equations; Eq. 9 = Table 5', () => {
  const f = 1055.05585262 / 3600 * (1 / 0.3048 ** 2) ** 0.82;   // Btu/h with ft² → W with m²
  close(C_FIRE.adequate, 21000 * f, 1e-3, '43 200');
  close(C_FIRE.inadequate, 34500 * f, 1e-3, '70 900');
  close(BTU_IN, 0.144227889, 1e-8, 'Btu·in/(h·ft²·°F)');
  close(FLUX_21000, 66246.4, 1e-5, '21 000 Btu/(h·ft²)');
  close(T_FIRE - 273.15, 904.444, 1e-6, '1660 °F');
  const TfF = 85, Tf = (TfF + 459.67) * 5 / 9;   // ΔT = 1 575 °F: 4·1575/21 000 = 0.3
  close(fInsulation(4 * BTU_IN, 0.0254, Tf), 0.3, 1e-12, 'k = 4, 1 in');
  close(fInsulation(4 * BTU_IN, 12 * 0.0254, Tf), 0.025, 1e-12, '12 in');
});

test('water at the relieving pressure (fixes PSVL-2)', () => {
  const s = saturated('p', P1z);
  close(s.T - 273.15, 213.3214, 1e-6, 'Tsat');
  close(s.steam.h - s.water.h, 1885.8535, 1e-6, 'λ kJ/kg');
  const W = heatInput(C_FIRE.adequate, 1, wetted(zoho).A) / ((s.steam.h - s.water.h) * 1000);
  close(W * 3600, 1131.5, 1e-3, 'W kg/h');
  const r = size({ W, P1: P1z, P2: PATM, T: s.T, M: 18.015, Z: 1, k: 1, steam: true, Kd: 0.975, Kb: 1, Kc: 1, valve: 'conventional' });
  assert.equal(r.eq, 'napier');
  close(r.A * 1e6, 190.4 * W * 3600 / (2037.325 * 0.975), 1e-12, 'Napier');
});

test('API 520 Part I vs the fluids library (API520_A_g)', () => {
  const m = 1.5;
  const cases: [number, number, number, number, number, number, number][] = [
    [400, 0.95, 44, 1.3, 1e6, 101325, 617.846852697],
    [300, 1, 28, 1.4, 5e5, 3.5e5, 1437.91167725],
    [500, 0.9, 60, 1.1, 2e6, 1.5e6, 330.902775381],
    [350, 0.98, 30, 1.25, 1.2e6, 8e5, 619.13975707],
  ];
  for (const [T, Z, M, k, P1, P2, A] of cases) close(size({ W: m, P1, P2, T, M, Z, k, Kd: 0.975, Kb: 1, Kc: 1, valve: 'conventional' }).A * 1e6, A, 1e-9, `T=${T}`);
  close(coefC(1), 0.023945830445454768, 1e-12, 'C at k = 1');
  close(coefC(1 + 1e-7), coefC(1), 1e-6, 'C continuous at k = 1');
  close(pCritical(1e6, 1.4), 528281.787, 1e-8, 'Pcf air');
  // balanced bellows: critical equation with Kb below the critical pressure
  const b = size({ W: m, P1: 1.2e6, P2: 8e5, T: 350, M: 30, Z: 0.98, k: 1.25, Kd: 0.975, Kb: 0.8, Kc: 1, valve: 'bellows' });
  const c = size({ W: m, P1: 1.2e6, P2: 101325, T: 350, M: 30, Z: 0.98, k: 1.25, Kd: 0.975, Kb: 1, Kc: 1, valve: 'conventional' });
  close(b.A, c.A / 0.8, 1e-12, 'bellows');
  close(napierKn(12000), 1.0093638615356733, 1e-12, 'KN 12 MPa');
  close(napierKn(20000), 1.128722867238768, 1e-12, 'KN 20 MPa');
  assert.equal(napierKn(10000), 1);
});

test('API 526 orifice pick', () => {
  const pick = (in2: number) => { const p = pickOrifice(in2 * IN2); return `${p.n > 1 ? p.n + '×' : ''}${API526[p.i].d}`; };
  assert.equal(pick(0.05), 'D');
  assert.equal(pick(0.110), 'D');
  assert.equal(pick(0.196), 'E');   // the sheet gave F (PSVL-6)
  assert.equal(pick(0.1338), 'E');
  assert.equal(pick(25.9), 'T');
  assert.equal(pick(30), '2×T');
  assert.equal(pick(53), '3×T');
  const areas = API526.map((o) => o.a);
  assert.deepEqual(areas, [0.110, 0.196, 0.307, 0.503, 0.785, 1.287, 1.838, 2.853, 3.60, 4.34, 6.38, 11.05, 16.00, 26.00]);
});

test('API 526 valve body by material and flange class (step 5)', () => {
  const psig = (x: number) => x * PSI, K = (F: number) => (F + 459.67) * 5 / 9;
  // owner's case: 16 bar g, steam at 213.3 °C (415.98 °F), carbon steel, conventional, E: 1E2 Class 150 holds 185 psig only
  const a = pickBody('E', 's', 'cs', 16e5, 486.4714, 0, false);
  assert.deepEqual([a.chosen!.r.b, a.chosen!.r.ci, a.chosen!.r.co, a.chosen!.limit, a.chosen!.out], ['1E2', 300, 150, 615, 285]);
  assert.deepEqual(a.range, [101, 450]);
  assert.equal(pickBody('E', 's', 'cs', psig(145), K(212), 0, false).chosen!.r.ci, 150);
  // column at the boundary: 100 °F → −20…100, 100.5 °F → next hotter 101…450
  assert.deepEqual(pickBody('E', 's', 'cs', psig(100), K(100), 0, false).range, [-20, 100]);
  assert.deepEqual(pickBody('E', 's', 'cs', psig(100), K(100.5), 0, false).range, [101, 450]);
  // high pressure: 4000 psig at 400 °F → 1½E3 Class 2500 (5135 psig); 6000 psig: none
  assert.equal(pickBody('E', 's', 'cs', psig(4000), K(400), 0, false).chosen!.r.b, '1½E3');
  assert.equal(pickBody('E', 's', 'cs', psig(6000), K(400), 0, false).why, 'pressure');
  // bellows outlet limits are lower: 250 psig back pressure → Class 900 × 300 body
  const b = pickBody('E', 's', 'cs', psig(100), K(300), psig(250), true);
  assert.deepEqual([b.chosen!.r.b, b.chosen!.r.ci, b.chosen!.out], ['1½E2', 900, 500]);
  assert.equal(pickBody('E', 's', 'cs', psig(100), K(300), psig(250), false).chosen!.r.ci, 150);
  // material and temperature ranges
  assert.equal(pickBody('E', 's', 'crmo', 16e5, 486.47, 0, false).why, 'temperature');   // Cr-Mo: 801–1000 °F only
  assert.equal(pickBody('E', 's', 'crmo', psig(300), K(900), 0, false).chosen!.r.ci, 600);
  assert.equal(pickBody('E', 's', 'cs', psig(100), K(900), 0, false).why, 'temperature');
  assert.equal(pickBody('E', 'p', 'crmo', 16e5, 486.47, 0, false).why, 'material');
  assert.equal(pickBody('E', 'p', 'cs', psig(100), K(600), 0, false).why, 'temperature');   // pilot to 500 °F
  // Table 12 (P orifice) checked against the page image
  const P = LIMITS526.P.s;
  assert.deepEqual(P.cs!.map((r) => [r.ci, ...r.p, ...r.o]), [[150, null, null, 285, 185, 80, null, 285, 80], [300, null, null, 525, 525, 410, null, 285, 150], [600, null, null, 1000, 1000, 825, null, 285, 150], [900, null, null, null, null, 1000, null, 285, 150]]);
  assert.deepEqual(P.ss![0].p, [175, 275, 275, 180, 80, 20]);
  // every letter: spring-loaded CS, Cr-Mo, SS and pilot CS, SS; table numbers
  API526.forEach((o, i) => {
    const t = LIMITS526[o.d];
    for (const m of ['cs', 'crmo', 'ss'] as const) assert.ok(t.s[m]?.length, `${o.d} spring ${m}`);
    for (const m of ['cs', 'ss'] as const) assert.ok(t.p[m]?.length, `${o.d} pilot ${m}`);
    assert.deepEqual(TABLE526[o.d], { s: i + 2, p: i + 16 });
  });
});
