// Acceptance tests for the native KOD calculator (ROADMAP Phase 7).
// 1. Zoho defaults (US inputs: 100 psia, MW 122.24, 110 °F, Z 1, 50 lb/ft³, 0.01 cP, 500 µm; D 78 in, L 120 in,
//    LLL/NLL/HLL 10/30/50 in, 300 000 lb/h, 1 pass; draw-off 15 000 lb/h, surge 3 000 lb/h; nozzles 18 in Sch 20,
//    14 in Sch 30): the sheet's drag fit, dropout velocity, vapour area, utilization, volumes, times, Mach numbers
//    and Tan's diameter reproduced with the sheet's constants; then the corrected values.
// 2. Standard drag curve vs the fluids library (v_terminal, Clift) on six cases; API RP 521's worked example.
// 3. GPSA K derating interpolated (KOD-4); level/volume inverse; diameter search is the smallest passing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settling, dragSheetFit, dragClift, cRe2, gasDensity, sonic, rate, liquidVolume, levelOfVolume, vapourArea, kDerate, tanDiameter, designSearch, nozzle, type Drum } from '../src/lib/calc/kod.ts';
import { pipe, id as pipeId } from '../src/lib/calc/pipes.ts';

const close = (got: number, want: number, tol: number, what = '') =>
  assert.ok(Math.abs(got - want) <= tol * Math.abs(want), `${what}: got ${got}, want ${want}`);
const IN = 0.0254, LB = 0.45359237;
const drum: Drum = { head: 'ell21', D: 78 * IN, L: 120 * IN };

test('Zoho defaults with the sheet constants', () => {
  const rhoG = 32.0312958919743, rhoL = 800.9231685, X = 0.13e8 * rhoG * (500e-6) ** 3 * (rhoL - rhoG) / 0.01 ** 2;
  close(X, 400214.800057185, 1e-12, 'C·Re² (API constant)');
  const C = dragSheetFit(X);
  close(C, 0.477614043557658, 1e-12, 'sheet drag fit');
  const Ut = Math.sqrt(4 / 3 * 9.81 * 500e-6 * (rhoL - rhoG) / rhoG / C);
  close(Ut, 0.573318176149874, 1e-12, 'Ut');
  close(vapourArea(drum.D, 50 * IN), 0.995286425271142, 1e-12, 'CSA');
  const W = 136077.711 / 3600;
  const r = rate({ drum, LLL: 10 * IN, NLL: 30 * IN, HLL: 50 * IN, W, rhoG, Ut, n: 1, Ls: 120 * IN });
  close(r.Q, 1.18007601984463, 1e-12, 'Q'); close(r.Uh, 1.1856647391962, 1e-12, 'Uh');
  close(r.Th, 2.57070982988524, 1e-12, 'Th'); close(r.Tt, 1.24049791125771, 1e-12, 'Tt');
  close(r.util, 2.072320966086, 1e-12, 'utilization = 207 % (KOD-3: the sheet shows 2.07 "%")');
  const hold = liquidVolume(drum, 30 * IN) - liquidVolume(drum, 10 * IN), surge = liquidVolume(drum, 50 * IN) - liquidVolume(drum, 30 * IN);
  close(hold, 3.20670851766989, 1e-12, 'holding volume (2:1 heads)'); close(surge, 3.79801883368387, 1e-12, 'surge volume');
  close(hold / (6803.88554999995 / rhoL) * 60, 22.648768509295, 1e-10, 'holding time, min');
  close(surge / (1360.77711 / rhoL) * 60, 134.125769280323, 1e-10, 'surge time, min');
  const c = Math.sqrt(1.3 * 8314 / 122.24 * (43.331111111111 + 273.15));
  close(c, 167.279958839989, 1e-12, 'sonic (sheet R, °F offset 459.666)');
  close(nozzle(r.Q, pipeId(pipe('18', '20')!) * IN, c, rhoG).mach, 0.046111488518471, 1e-12, 'inlet Mach');
  close(nozzle(r.Q, pipeId(pipe('14', '30')!) * IN, c, rhoG).mach, 0.0793006963836599, 1e-12, 'outlet Mach');
});

test('corrected values: exact constants, standard drag curve, Tan in consistent units (KOD-1, KOD-2)', () => {
  const p = 100 * 6894.757293168, T = (110 + 459.67) / 1.8, rhoL = 50 * LB / 0.3048 ** 3;
  const rhoG = gasDensity(p, T, 122.24, 1);
  close(rhoG, 32.0292887677220, 1e-9, 'ρg');
  const s = settling(rhoG, rhoL, 500e-6, 1e-5);
  close(s.Ut, 0.572305303542462, 1e-6, 'Ut');
  close(sonic(1.3, T, 122.24), 167.2852000823953, 1e-9, 'c');
  // Tan (Perry 26-36) with P in kg/cm² a: the sheet constant 1234; the sheet's (bar g + 1.033) gives 1 559.96 mm
  const sheetD = (Pkg: number) => Math.sqrt((136077.711 / 1234) / Math.sqrt((800.9231685 - 32.0312958919743) * 122.24 * Pkg / (43.331111111111 + 273.15))) * 1000;
  close(sheetD(5.881507293 + 1.033), 1559.95799337957, 1e-12, 'sheet D75');
  const ours = tanDiameter(136077.711 / 3600, rhoL, rhoG, 122.24, p, T) * 1000;
  close(ours, sheetD(p / 98066.5), 5e-4, 'Tan in SI = sheet formula with kg/cm² a (sheet constant 1234 rounded from 1234.5, its ρg with R = 8.314)');
  close(ours / 25.4, 61.15, 2e-3, 'in inches (the sheet showed 39 623 "in", KOD-1)');
});

test('standard drag curve: settling velocity vs the fluids library (Clift)', () => {
  const cases: [number, number, number, number, number][] = [
    [0.0003, 496.6, 2.9, 1e-05, 0.683327928319253],
    [0.0005, 800.9231685, 32.0312958919743, 1e-05, 0.57228854757247],
    [1e-05, 1000, 1.2, 1.8e-05, 0.0030231117345679],
    [0.00015, 700, 10, 1.2e-05, 0.258198074335667],
    [0.002, 900, 1.5, 1.1e-05, 6.00167032335523],
    [0.0006, 650, 60, 1.5e-05, 0.403424302278822],
  ];
  // the 10 µm case is in the Stokes range, where fluids returns Stokes' law and Clift adds 3/16 (Oseen): 1.6e-5
  for (const [Dp, rl, rg, mu, v] of cases) close(settling(rg, rl, Dp, mu).Ut, v, Dp < 2e-5 ? 2e-5 : 1e-6, `Dp=${Dp}`);
  close(dragClift(200), 0.7756342422322543, 1e-12, 'Clift(200)');
  // Stokes limit
  const st = settling(1.2, 1000, 5e-6, 1.8e-5);
  close(st.Ut, 9.80665 * (5e-6) ** 2 * (1000 - 1.2) / (18 * 1.8e-5), 2e-3, 'Stokes');
});

test("API RP 521 worked example (300 µm, 496.6 / 2.9 kg/m³, 0.01 cP)", () => {
  close(0.13e8 * 2.9 * (300e-6) ** 3 * (496.6 - 2.9) / 0.01 ** 2, 5025, 1e-3, 'API C(Re)² = 5 025');
  close(cRe2(2.9, 496.6, 300e-6, 1e-5), 5054.571, 1e-6, 'exact constant');
  close(1.15 * Math.sqrt(9.8 * 300e-6 * (496.6 - 2.9) / (2.9 * 1.3)), 0.71, 0.01, 'API Uc with C = 1.3 read from Fig. 20');
  const s = settling(2.9, 496.6, 300e-6, 1e-5);
  close(s.C, 1.43, 0.01, 'standard curve C at Re = 59 (API read 1.3 from its chart)');
  close(s.Ut, 0.6833, 1e-3, 'Ut');
});

test('GPSA Fig. 7-13 derating interpolated; volumes; diameter search', () => {
  close(kDerate(0), 1, 1e-12, 'atm'); close(kDerate(1034e3), 0.9, 1e-12, '1034');
  close(kDerate(588150.7293), 0.9431188, 1e-6, 'sheet pressure (the sheet regression gave 0.928)');
  close(kDerate(3102e3), 0.825, 1e-12, 'between'); close(kDerate(9e6), 0.75, 1e-12, 'beyond');
  for (const h of [0.1, 0.9, 1.7]) close(levelOfVolume(drum, liquidVolume(drum, h)), h, 1e-9, `inverse ${h}`);
  const base = { head: 'ell21' as const, ratio: 3, fLLL: 10 / 78, fNLL: 30 / 78, fHLL: 50 / 78, fH1: 0.2, H1min: 0.3, W: 37.8, rhoG: 32.03, Ut: 0.5723, n: 1,
    surgeQ: 1360.78 / 3600 / 800.92, surgeMin: 1800, drawQ: 6803.89 / 3600 / 800.92, holdMin: 300, step: 0.05, Dmax: 6 };
  const d = designSearch(base);
  assert.ok(d.ok);
  const fails = (D: number) => {
    const dr: Drum = { head: 'ell21', D, L: 3 * D }, HLL = base.fHLL * D, NLL = base.fNLL * D, LLL = base.fLLL * D;
    const r = rate({ drum: dr, LLL, NLL, HLL, W: base.W, rhoG: base.rhoG, Ut: base.Ut, n: 1 });
    const surgeT = (liquidVolume(dr, HLL) - liquidVolume(dr, NLL)) / base.surgeQ, holdT = (liquidVolume(dr, NLL) - liquidVolume(dr, LLL)) / base.drawQ;
    return r.util < 1 || r.H1 < Math.max(0.2 * D, 0.3) || surgeT < 1800 || holdT < 300;
  };
  assert.ok(!fails(d.D), 'found drum passes');
  assert.ok(fails(d.D - 0.05), 'one step smaller fails');
});
