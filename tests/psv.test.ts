// Acceptance tests for the native PSV calculator (ROADMAP Phase 7).
// 1. Zoho defaults: case 1 external fire, vapour (35 000 kg/h, M 106.1, 326 °C, Z 1, k 1.1), case 2 blocked outlet,
//    liquid (15 000 kg/h, 997 kg/m³, 1.5 cP), set = MAWP 27.7 bar g, balanced bellows, certified, one valve: the sheet's
//    areas within the documented corrections (PSV-3 Kv ≤ 1, PSV-4 SI constant, G referred to 999 kg/m³), orifice K.
// 2. Independent: the fluids library (C. Bell, MIT) for vapour, liquid and saturated steam; KSH vs fluids' table;
//    Kv of API 520 Part I 10th ed. (2020) (PSV-12).
// 3. Refits vs API 520 Part I Figs 30, 31, 37 digitized at 300 dpi (PSV-11); the sheet's lines and their errors.
// 4. Corrections: disk alone Kc = 1 (PSV-1), non-certified liquid Kd 0.62 (PSV-2), Kv per valve (PSV-3).
// 5. Omega method: API 520 Part I Appendix D example (ω 1.482, ηc 0.66, G 594.1 lb/(s·ft²), 37.8 in²).
// 6. Reaction force (API 520 Part II): constant 129 = √(2R), choked exit pressure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sizeCase, presetAccum, relievingP, kb10, kb16, kbBellows, kwBellows, kpOver, kvRe, ksh, etaCritical, omegaFlux, reactionForce, ratedFlow, kdDefault, PATM, type CaseIn, type Design } from '../src/lib/calc/psv.ts';
import { pickOrifice, API526, IN2 } from '../src/lib/calc/psvl.ts';

const close = (got: number, want: number, tol: number, what = '', abs = false) =>
  assert.ok(Math.abs(got - want) <= (abs ? tol : tol * Math.abs(want)), `${what}: got ${got}, want ${want}`);
const IN2M = 0.00064516;
const blank: CaseIn = { phase: 'vapour', W: NaN, P1: NaN, Pb: PATM, T: NaN, M: NaN, Z: NaN, k: NaN, rho: NaN, mu: NaN, x: NaN, omegaMode: 'v9', v9: NaN, omega: NaN, Kd: NaN, Kb: NaN, Kw: NaN };
const Pset = 27.7e5 + PATM;
const zohoD: Design = { device: 'valve', valve: 'bellows', certified: true, n: 1, Pset };
const fire: CaseIn = { ...blank, W: 35000 / 3600, P1: relievingP(Pset, 21), T: 326 + 273.15, M: 106.1, Z: 1, k: 1.1 };
const blocked: CaseIn = { ...blank, phase: 'liquid', W: 15000 / 3600, P1: relievingP(Pset, 10), rho: 997, mu: 1.5e-3 };

test('Zoho defaults: relieving pressures, areas, governing case and orifice', () => {
  close(fire.P1, 33.517e5 + PATM, 1e-12, 'P1 fire');
  close(blocked.P1, 30.47e5 + PATM, 1e-12, 'P1 blocked');
  assert.equal(presetAccum('fire', 1), 21);
  assert.equal(presetAccum('blocked', 1), 10);
  assert.equal(presetAccum('blocked', 2), 16);
  const a = sizeCase(zohoD, fire), b = sizeCase(zohoD, blocked);
  assert.equal(a.regime, 'critical');
  assert.equal(a.Kb, 1);                                  // 21 % overpressure: Kb = 1
  // sheet E42 1.5422337606391 in² with 13 160/C_US; API SI 0.03948 is 0.085 % larger (PSV-4)
  close(a.A / IN2M, 1.5422337606391 * (1 / 0.03948) / (13160 / 520), 2e-4, 'A fire');
  // sheet F42 0.127281828342533 in² with the 2000 Kv 1.00105 and G = ρ/1000; here the 2020 Kv (PSV-12) and G = ρ/999
  close(b.A / IN2M, 0.127281828342533 * 1.00104660678552 * Math.sqrt(1000 / 999) / b.Kv!, 1e-9, 'A blocked');
  close(b.Kv!, 1 / Math.sqrt(1 + 170 / b.Re!), 1e-12, 'Kv 2020');
  assert.ok(b.Kv! > 0.9996 && b.Kv! < 1);
  const gov = Math.max(a.A, b.A);
  assert.equal(API526[pickOrifice(gov).i].d, 'K');
  // rated flow (sheet E43 41 712 kg/h with its area)
  close(ratedFlow(35000, a.A, 1, 1.838 * IN2M), 35000 * 1.838 / (a.A / IN2M), 1e-12, 'rated');
  close(ratedFlow(35000, 1.5422337606391 * IN2M, 1, 1.838 * IN2M), 41712.2239454422, 1e-9, 'rated sheet');
});

test('Independent: fluids library (vapour critical/subcritical, liquid, saturated steam)', () => {
  const d: Design = { ...zohoD, valve: 'conventional' };
  close(sizeCase(d, fire).A, 0.0009958362919459506, 2e-5, 'vapour critical');
  const sub = sizeCase(d, { ...blank, W: 2, P1: 10e5 + PATM, Pb: 8e5, T: 400, M: 30, Z: 0.95, k: 1.3 });
  assert.equal(sub.regime, 'subcritical');
  close(sub.A, 0.0009840176466720035, 2e-4, 'vapour subcritical');
  const liq = sizeCase(d, { ...blocked, mu: 1e-9 });     // practically inviscid: Kv = 1
  close(liq.A, 8.224377846593214e-05, 1e-4, 'liquid');
  const sd: Design = { ...d, Pset: 10e5 + PATM };
  const st = sizeCase(sd, { ...blank, phase: 'steam', W: 5000 / 3600, P1: relievingP(10e5 + PATM, 10), T: NaN, Tsat: 457.25 });
  close(st.A, 0.0008132046506341554, 1e-3, 'saturated steam (Napier, constant 190.4)');
  assert.equal(st.Ksh, 1);
  // KSH at 1 000 kPa g, 400 °C (GPSA table) vs fluids (P1 = 1 201 kPa a, API 10th ed. table): 0.829 vs 0.8266
  close(ksh(1000, 400).K, 0.8266106, 5e-3, 'KSH');
  close(ksh(1000, 149).K, 1, 0, 'KSH at 149 °C');
  close(ksh(4140, 371).K, 0.87, 1e-12, 'KSH table point');
  assert.ok(ksh(30000, 400).out);
  // API 520 Part I 10th ed. (2020) = fluids edition '10E' (owner 2026-11-26: replaces the 2000 curve, PSV-12);
  // its Example 5 (Re 4 525 → Kv 0.982) as reproduced by fluids
  close(kvRe(1000), 0.9245003270420487, 1e-12, 'Kv(1000)');
  close(kvRe(4525), 0.9817287137013179, 1e-12, 'Kv(4525), API 10th ed. Example 5');
  assert.ok(kvRe(1e6) < 1 && kvRe(1e6) > 0.9999);
});

test('Refits vs API 520 Part I Figs 30, 31, 37 (digitized at 300 dpi)', () => {
  const fig30_10: [number, number][] = [[30.5, 0.996], [32.5, 0.977], [34.5, 0.953], [36.5, 0.9243], [38.5, 0.8933], [41.5, 0.8435], [43.5, 0.8069], [46.5, 0.7536], [48.5, 0.7158], [49.5, 0.6969]];
  for (const [x, y] of fig30_10) close(kb10(x), y, 0.0025, `Kb10 ${x}`, true);
  const fig30_16: [number, number][] = [[38.5, 0.9929], [40.5, 0.977], [44.5, 0.9471], [48.5, 0.917]];
  for (const [x, y] of fig30_16) close(kb16(x), y, 0.0025, `Kb16 ${x}`, true);
  assert.equal(kbBellows(45, 21), 1);
  close(kbBellows(40, 13), (kb10(40) + kb16(40)) / 2, 1e-12, 'Kb interpolated');
  // the sheet's line for 10 %: up to 3.8 % low
  assert.ok((kb10(40) - (1.456 - 1.55 * 0.4)) / kb10(40) > 0.035);
  const fig31: [number, number][] = [[17.5, 0.9925], [20.5, 0.9705], [25.5, 0.9196], [30.5, 0.87], [40.5, 0.7722], [49.5, 0.6791]];
  for (const [x, y] of fig31) close(kwBellows(x), y, 0.0055, `Kw ${x}`, true);   // the sheet's lines, ≤ 0.005 low at the knee
  const fig37: [number, number][] = [[10.5, 0.6211], [12.5, 0.7068], [15.5, 0.8063], [18.5, 0.8847], [21.5, 0.9459], [24.5, 0.9923], [30.5, 1.0205], [40.5, 1.059], [49.5, 1.0923]];
  for (const [x, y] of fig37) close(kpOver(x), y, 0.004, `Kp ${x}`, true);
  close(kpOver(10), 0.6, 0.001, 'Kp 10 %', true);
  close(kpOver(25), 1, 0.001, 'Kp 25 %', true);
  // the sheet's Kp line: 7.9 % low at 15.5 %
  assert.ok((kpOver(15.5) - (2 / 75 * 15.5 + 1 / 3)) / kpOver(15.5) > 0.07);
});

test('Corrections PSV-1, PSV-2, PSV-3', () => {
  // PSV-1: disk alone Kd 0.62, Kc 1
  const disk = sizeCase({ ...zohoD, device: 'disk', valve: 'conventional' }, fire);
  assert.equal(disk.Kc, 1); assert.equal(disk.Kd, 0.62);
  const combo = sizeCase({ ...zohoD, device: 'combo', valve: 'conventional' }, fire);
  assert.equal(combo.Kc, 0.9); assert.equal(combo.Kd, 0.975);
  // PSV-2: non-certified liquid Kd 0.62, 25 % basis, Kp at 10 % = 0.6
  assert.equal(kdDefault('liquid', 'valve', false), 0.62);
  const nc = sizeCase({ ...zohoD, certified: false, valve: 'conventional' }, { ...blocked, mu: 1e-9 });
  close(nc.Kp!, 0.6, 0.002, 'Kp');
  // sheet F40 0.199130692523283 in² with Kd 0.65, Kp 0.6 exactly, Kv 1.0004, G/1000
  close(nc.A / IN2M, 0.199130692523283 * 1.00039746960051 * Math.sqrt(1000 / 999) * 0.65 / 0.62 * 0.6 / nc.Kp!, 1e-6, 'non-certified');
  // PSV-3: Kv per valve; two valves each carry half the flow
  const visc: CaseIn = { ...blocked, W: 2000 / 3600, mu: 0.4 };
  const one = sizeCase({ ...zohoD, valve: 'conventional' }, { ...visc, W: visc.W / 2 });
  const two = sizeCase({ ...zohoD, valve: 'conventional', n: 2 }, visc);
  close(two.A, 2 * one.A, 1e-12, 'n = 2 is twice one valve at half flow');
  close(two.Re!, one.Re!, 1e-12, 'Re per valve');
  assert.ok(one.Kv! < 1);
});

test('Omega method: API 520 Part I Appendix D example', () => {
  const LB = 0.45359237, FT3 = 0.3048 ** 3, PSI = 6894.757293168;
  const P0 = 80.7 * PSI, v0 = 0.3116 * FT3 / LB, v9 = 0.3629 * FT3 / LB;
  const w = 9 * (v9 / v0 - 1);
  close(w, 1.482, 5e-4, 'omega');
  close(etaCritical(w), 0.66, 0.01, 'eta_c');
  const f = omegaFlux(w, P0, v0, 29.7 * PSI);
  assert.ok(f.critical);
  close(f.G / (LB / 0.3048 ** 2), 594.1, 0.01, 'G lb/(s·ft²)');
  const W = 477430 * LB / 3600;
  close(W / (0.85 * f.G) / IN2M, 37.8, 0.01, 'A in²');
  // critical-ratio equation satisfied
  const e = etaCritical(4);
  close(e * e + (16 - 8) * (1 - e) ** 2 + 32 * Math.log(e) + 32 * (1 - e), 0, 1e-9, 'root', true);
  // subcritical flux is continuous at ηc and smaller above it
  const g1 = omegaFlux(w, P0, v0, f.etac * P0 * 1.0001).G;
  close(g1, f.G, 1e-3, 'continuity');
  assert.ok(omegaFlux(w, P0, v0, 0.9 * P0).G < f.G);
  // whole case through sizeCase: frozen mode gives ω = α0/k
  const tp = sizeCase({ ...zohoD, valve: 'conventional' }, { ...blank, phase: 'twophase', W: 5, P1: 20e5, Pb: PATM, T: 350, M: 44, Z: 1, k: 1.3, rho: 800, mu: 1e-3, x: 0.2, omegaMode: 'frozen' });
  assert.ok(tp.ok);
  const vg = 8314.462618 * 350 / (44 * 20e5), v0b = 0.2 * vg + 0.8 / 800;
  close(tp.omega!, 0.2 * vg / (v0b * 1.3), 1e-12, 'frozen omega');
  assert.equal(tp.Kd, 0.85);
  assert.ok(Number.isFinite(tp.Asum!));
});

test('Reaction force (API 520 Part II)', () => {
  close(Math.sqrt(2 * 8314.462618), 129, 0.001, '129 = √(2R)');
  // API metric form with W kg/s, T K, A mm², P bar g
  const W = 10, T = 500, M = 30, k = 1.3, d = 0.15;
  const r = reactionForce(W, T, M, k, d);
  const Amm = Math.PI * 150 * 150 / 4;
  close(r.F, 129 * W * Math.sqrt(k * T / ((k + 1) * M)) + 0.1 * Amm * (r.Pexit - PATM) / 1e5, 1e-3, 'F');
  assert.ok(r.Pexit > PATM);
  // low flow through a large pipe: not choked, no pressure term
  const s = reactionForce(0.01, T, M, k, 0.3);
  assert.equal(s.Pexit, PATM);
  close(s.F, s.Fm, 1e-12, 'momentum only');
});
