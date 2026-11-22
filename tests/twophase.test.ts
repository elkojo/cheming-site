// Acceptance tests for the native Pressure Loss: Two-Phase calculator (ROADMAP Phase 7).
// 1. Zoho defaults (NPS 12 Sch 40, 58 174 kg/h liquid 746 kg/m³ 1.05 cP σ 13.5 mN/m, 12 260 kg/h gas 0.9 kg/m³
//    0.01 cP): every sheet number reproduced; the sheet works in US units with rounded constants (2.42, 32.174), so
//    agreement is to ≤ 5e-4. Friedel as typed on the sheet (2P-1, 2P-2) reproduced separately, then corrected.
// 2. Independent checks against the fluids 1.3.1 library: Churchill (1977), Chisholm (1973) with all B branches,
//    Rouhani–Axelsson void fraction, Friedel (smooth). 3. Baker map: sheet coordinates and region; classifier.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve, churchill, xiFriedel, chisholmB, voidRouhani, lmPhi } from '../src/lib/calc/twophase.ts';
import { bakerPoint, classify } from '../src/lib/calc/baker.ts';
import { pipe, id } from '../src/lib/calc/pipes.ts';

const close = (got: number, want: number, rel: number, what = '') =>
  assert.ok(Math.abs(got - want) <= rel * Math.abs(want), `${what}: got ${got}, want ${want}`);
const PSI100 = 6894.757293 / 30.48;   // Pa/m per psi/100 ft
const LBFT3 = 16.01846337;

const d = id(pipe('12', '40')!) * 0.0254;
const base = { d, eps: 4.572055596196049e-05, wl: 58174 / 3600, wg: 12260 / 3600, rhol: 746, rhog: 0.9, mul: 1.05e-3, mug: 1e-5, sigma: 13.5e-3, la: 100 };
const r = solve(base);

test('Zoho defaults: single phases', () => {
  close(d, 0.3032252, 1e-12, 'ID');
  close(r.liq.re, 64597.88680121, 5e-4, 'Re L'); close(r.gas.re, 1429450.60816173, 5e-4, 'Re G');
  close(r.lo.re, 78211.7021170364, 5e-4, 'Re LO'); close(r.go.re, 8212228.72228883, 5e-4, 'Re GO');
  close(r.liq.f, 0.020315307436943, 1e-4, 'f L'); close(r.gas.f, 0.0138932732619173, 1e-4, 'f G');
  close(r.liq.dpdz / PSI100, 0.00994026228694013, 5e-4, 'Δp L'); close(r.gas.dpdz / PSI100, 0.250264026694372, 5e-4, 'Δp G');
  close(r.lo.dpdz / PSI100, 0.014053600568437, 5e-4, 'Δp LO'); close(r.go.dpdz / PSI100, 7.83588286908561, 5e-4, 'Δp GO');
  close(r.liq.v / 0.3048, 0.984129322240422, 1e-9, 'v L'); close(r.gas.v / 0.3048, 171.913520282794, 1e-9, 'v G');
  close(r.x, 0.174063662435759, 1e-12, 'x');
});

test('Zoho defaults: mixture and correlation choice', () => {
  close(r.mix.rho, 5.14109153407473, 1e-9, 'ρ no slip'); close(r.mix.v, 52.6992035996147, 1e-9, 'v mix');
  close(r.mix.mu * 1000, 0.0549662795416326, 1e-12, 'μ mix'); close(r.mix.re, 1494048.49496294, 5e-4, 'Re mix');
  close(r.G * 0.3048 ** 2 / 0.45359237, 55.4911305856339, 1e-9, 'G lb/ft²s');
  close(r.mix.muRatio, 105, 1e-12, 'μL/μG'); assert.equal(r.chosen, 'friedel');
});

test('Zoho defaults: Chisholm–Baroczy and Lockhart–Martinelli', () => {
  close(r.chisholm.gamma, 23.6129455052372, 5e-4, 'Γ'); close(r.chisholm.B, 1.33770384597352, 5e-4, 'B');
  close(r.chisholm.phi2, 163.511633592254, 1e-3, 'φ²'); close(r.chisholm.dpdz / PSI100, 2.29792718679816, 1e-3, 'Δp C-B');
  close(Math.log(r.lm.X), -1.61296153000742, 5e-4, 'ln X'); assert.equal(r.lm.pair, 'tt');
  close(r.lm.dpdz / PSI100, 1.22878109900495, 1e-3, 'Δp L-M');
});

test('Zoho defaults: Friedel as typed on the sheet, then corrected (2P-1, 2P-2)', () => {
  // the sheet: friction factors from the phase-alone Reynolds numbers, (1 − x)^0.24
  const x = r.x, m = 1e-5 / 1.05e-3, xl = xiFriedel(r.liq.re), xg = xiFriedel(r.gas.re);
  const E = (1 - x) ** 2 + x * x * 746 * xg / (0.9 * xl);
  const H = (746 / 0.9) ** 0.91 * m ** 0.19 * (1 - m) ** 0.7;
  const phi = E + 3.24 * x ** 0.78 * (1 - x) ** 0.24 * H / (r.friedel.fr ** 0.045 * r.friedel.we ** 0.035);
  const phiD = E + 38.5 * x ** 0.75 * (1 - x) ** 0.314 * (746 / 0.9) ** 0.86 * m ** 0.73 * (1 - m) ** 6.84 * r.friedel.fr ** -0.0001 * r.friedel.we ** -0.037;
  close(phi, 83.9404767490546, 1e-3, 'sheet φ²'); close(phiD, 76.5467329287659, 1e-3, 'sheet φ² down');
  close(phi * xl / d * r.G ** 2 / (2 * 746) / PSI100, 1.19002699228364, 1e-3, 'sheet Δp F');
  close(phiD * xl / d * r.G ** 2 / (2 * 746) / PSI100, 1.0852056348058, 1e-3, 'sheet Δp F down');
  close(r.friedel.fr, 933.948207518292, 1e-4, 'Fr'); close(r.friedel.we, 320702.443294661, 5e-4, 'We');
  // corrected: −7.1 %; agrees with the fluids Friedel (smooth Clamond friction) to 0.5 %
  close(r.friedel.dpdz / PSI100, 1.1053, 2e-4, 'corrected Δp F');
  close(r.friedel.dpdz, 249.2472118683394, 5e-3, 'fluids Friedel (smooth)');
  assert.equal(r.dpdzFric, r.friedel.dpdz);
});

test('Churchill friction factor equals fluids.Churchill_1977', () => {
  for (const [re, rr, f] of [[64597.88680121, 4.572055596196049e-05 / 0.3032252, 0.020315307436931926], [1429450.6, 1.5e-4, 0.013882799318418695],
    [5000, 1e-3, 0.03913809436402936], [3e7, 0, 0.007015703109256699]]) close(churchill(re, rr), f, 1e-12, `Re ${re}`);
  assert.equal(churchill(1000, 1e-3), 0.064);
});

test('Chisholm with all B branches agrees with fluids.Chisholm (2P-6)', () => {
  // fluids uses the Clamond (≈ Colebrook) friction factor, here Churchill: agreement to 1 %
  close(r.chisholm.dpdz, 519.2598974714183, 5e-3, 'default');
  for (const [w, x, dd, want] of [[5, 0.05, 0.1, 1854.4531619448626], [50, 0.3, 0.1, 406431.58158332953], [1, 0.5, 0.2, 13.043380777718252]]) {
    const s = solve({ d: dd, eps: 4.57e-5, wl: w * (1 - x), wg: w * x, rhol: 900, rhog: 5, mul: 0.02, mug: 1e-5, sigma: 0.02, la: 1 });
    close(s.chisholm.dpdz, want, 1e-2, `w ${w} x ${x}`);
  }
  // the sheet's single branch per Γ range differs where G is outside it
  assert.equal(chisholmB(5, 300), 4.8); close(chisholmB(5, 1000), 2.4, 1e-15); close(chisholmB(5, 2500), 55 / 50, 1e-15);
  close(chisholmB(20, 900), 21 / 20, 1e-15); close(chisholmB(30, 400), 15000 / (900 * 20), 1e-15);
});

test('correlation choice follows Whalley', () => {
  const visc = { ...base, mul: 0.02 };    // μL/μG = 2000
  assert.equal(solve(visc).chosen, 'chisholm');
  assert.equal(solve({ ...visc, wl: 0.5, wg: 0.1 }).chosen, 'lm');
});

test('void fraction and static head (Rouhani–Axelsson = fluids.Rouhani_2)', () => {
  close(r.voidFraction, 0.7299922496632474, 1e-12, 'default');
  close(voidRouhani(0.05, 900, 5, 0.02, 5 / (Math.PI * 0.01 / 4), 0.1), 0.7270295751240771, 1e-12, 'case 2');
  assert.equal(r.dpStatic, 0);
  const up = solve({ ...base, theta: 90 });
  close(up.dz, 100, 1e-15); close(up.dpStatic, up.rhoTp * 9.80665 * 100, 1e-15, 'static');
  close(up.rhoTp, 746 * (1 - r.voidFraction) + 0.9 * r.voidFraction, 1e-12, 'ρ tp');
  const down = solve({ ...base, theta: -30 });
  close(down.dpStatic, -up.dpStatic / 2, 1e-12, 'down 30°');
  close(down.dpdzFric, down.friedel.dpdzDown, 0, 'Friedel down-flow multiplier for downward lines');
  close(up.dpTotal, up.dpFric + up.dpStatic, 1e-15);
});

test('Baker map: sheet coordinates (Thome constants) reproduced, then Perry\'s (2P-3); default = dispersed', () => {
  const A = r.area, LBFT2S = 0.45359237 / 0.3048 ** 2;
  const lamS = Math.sqrt((0.9 / 1.23) * (746 / 1000)), psiS = (0.072 / 13.5e-3) * ((1.05e-3 / 0.001) * (1000 / 746) ** 2) ** (1 / 3);
  close(lamS, 0.738819097300946, 1e-12, 'sheet λ'); close(psiS, 6.5902609184176, 1e-12, 'sheet ψ');
  close(base.wl / base.wg * lamS * psiS, 23.1035745486363, 1e-12, 'sheet x'); close(base.wg / A / LBFT2S / lamS, 13.0735513709954, 1e-9, 'sheet y');
  const b = bakerPoint(base.wl, base.wg, 746, 0.9, 1.05e-3, 13.5e-3, A);
  close(b.lambda, lamS * Math.sqrt(1.23 / 1.2), 1e-12, 'λ Perry'); close(b.psi, psiS * 73 / 72, 1e-12, 'ψ Perry');
  close(b.x / 23.1035745486363, 1.0265, 1e-3, 'x +2.7 %'); close(b.y / 13.0735513709954, 0.9877, 1e-3, 'y −1.2 %');
  assert.equal(b.pattern, 'dispersed'); assert.equal(b.outside, false);
});

test('Baker map: one point in every region', () => {
  const cases: [number, number, string][] = [[23, 13, 'dispersed'], [10, 3, 'annular'], [0.3, 15, 'annular'], [0.3, 5, 'wavy'], [0.3, 0.5, 'stratified'],
    [0.5, 2.5, 'wavy'], [5, 1.3, 'wavy'], [30, 0.8, 'slug'], [300, 0.3, 'slug'], [300, 0.15, 'plug'], [300, 0.1, 'stratified'], [1000, 3, 'bubble'],
    [200, 20, 'bubble'], [3000, 0.05, 'plug'], [50, 0.1, 'stratified']];
  for (const [x, y, p] of cases) assert.equal(classify(x, y).pattern, p, `(${x}, ${y})`);
  assert.equal(classify(3e4, 1).outside, true);
});

test('Lockhart–Martinelli curve fits follow the 1949 table within 3.5 % in φ', () => {
  // the table as tabulated (with the regression that produced the fits) in the basis spreadsheet, Chafin & Haraburda
  // (Chemical Processing 2000), hidden sheet "L-MReg": X, then φL and φG for tt, vt, tv, vv
  const T = [[0.01, 128, 1.28, 120, 1.2, 112, 1.12, 105, 1.05], [0.02, 68.4, 1.37, 64, 1.28, 58, 1.16, 53.5, 1.07], [0.04, 38.5, 1.54, 34, 1.36, 31, 1.24, 28, 1.12],
    [0.07, 24.4, 1.71, 20.7, 1.45, 19.3, 1.35, 17, 1.19], [0.1, 18.5, 1.85, 15.2, 1.52, 14.5, 1.45, 12.4, 1.24], [0.2, 11.2, 2.23, 8.9, 1.78, 8.7, 1.74, 7, 1.4],
    [0.4, 7.05, 2.83, 5.62, 2.25, 5.5, 2.2, 4.25, 1.7], [0.7, 5.04, 3.53, 4.07, 2.85, 4.07, 2.85, 3.08, 2.16], [1, 4.2, 4.2, 3.48, 3.48, 3.48, 3.48, 2.61, 2.61],
    [2, 3.1, 6.2, 2.62, 5.25, 2.62, 5.24, 2.06, 4.12], [4, 2.38, 9.5, 2.05, 8.2, 2.15, 8.6, 1.76, 7], [7, 1.96, 13.7, 1.73, 12.1, 1.83, 12.8, 1.6, 11.2],
    [10, 1.75, 17.5, 1.59, 15.9, 1.66, 16.6, 1.5, 15], [20, 1.48, 29.5, 1.4, 28, 1.44, 28.8, 1.36, 27.3], [40, 1.29, 51.5, 1.25, 50, 1.25, 50, 1.25, 50],
    [70, 1.17, 82, 1.17, 82, 1.17, 82, 1.17, 82], [100, 1.11, 111, 1.11, 111, 1.11, 111, 1.11, 111]];
  let n = 0;
  (['tt', 'vt', 'tv', 'vv'] as const).forEach((pair, i) => {
    for (const row of T) {
      const [pL, pG] = lmPhi(pair, row[0]);
      close(pL, row[1 + 2 * i], 0.036, `${pair} φL at X ${row[0]}`);
      close(pG, row[2 + 2 * i], 0.036, `${pair} φG at X ${row[0]}`);
      n += 2;
    }
  });
  assert.equal(n, 136);
});
