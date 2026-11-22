// Acceptance tests for the native Control Valve (CV) calculator (ROADMAP Phase 7).
// 1. Zoho defaults (9000 kg/h, 41.16 → 8.34 bar a, water 980 kg/m³, FL 0.9; steam 18.02 kg/kmol, 672 K, Z 0.942):
//    the sheet's liquid and gas results reproduced with its own constants, then the IEC 60534-2-1 / OZ1000 values.
// 2. Independent check against fluids 1.3.1 size_control_valve_l / _g (IEC 60534-2-1). 3. Valve pick, Kv, inverse flow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liquidCv, gasCv, liquidFlow, gasFlow, pickValve, STYLES, kvFromCv, gasVolume, gasVolumeStd } from '../src/lib/calc/cv.ts';

const close = (got: number, want: number, rel: number, what = '') =>
  assert.ok(Math.abs(got - want) <= rel * Math.abs(want), `${what}: got ${got}, want ${want}`);

const liq = { w: 9000, p1: 41.16, p2: 8.34, rho: 980, pv: 0, pc: 220.4831033758 };
const gas = { w: 9000, p1: 41.16, p2: 8.34, mw: 18.02, t: 672, z: 0.942, k: 1.37 };

test('Zoho defaults: liquid (sheet constant 1.16·10^−1.5 = 1/27.26, OZ1000 N6 = 27.3)', () => {
  close(1.16 * 10 ** -1.5 * 9000 / Math.sqrt(980 * 32.82), 1.84084902767931, 1e-12, 'sheet subcritical Cv');
  const r = liquidCv(liq, 0.9);
  assert.equal(r.choked, false);
  close(r.dpChoked, 0.81 * 41.16, 1e-12, 'FL²·(p1 − FF·pv) with pv = 0');
  close(r.cv, 1.84084902767931 / (1.16 * 10 ** -1.5 * 27.3), 1e-12, 'Cv with N6 = 27.3');
  close(r.cv, 1.83822, 1e-5, 'Cv');
});

test('Zoho defaults: gas, sheet Cf method reproduced, IEC method within 0.5 %', () => {
  const Gf = 18.02 / 28.96 * 288 / 672, y = Math.min(1.5, 1.63 / 0.9 * Math.sqrt(32.82 / 41.16));
  close(54.5e-3 * 9000 * Math.sqrt(0.942) / 0.9 / 41.16 / Math.sqrt(Gf) / (y - 0.148 * y ** 3), 24.8736645287031, 1e-12, 'sheet Cv');
  const r = gasCv(gas, 0.69);
  assert.equal(r.choked, true);
  close(r.y, 2 / 3, 1e-15, 'Y at choking');
  close(r.cv, 24.8736645287031, 0.005, 'IEC vs sheet (globe, xT 0.69, k 1.37)');
});

test('liquid equals fluids.size_control_valve_l (IEC; ρ0 and constant rounding: 0.3 %)', () => {
  for (const [fl, pv, p2, cv, choked] of [[0.9, 1e-5, 8.34, 1.8354818730868376, false], [0.9, 1e-5, 30, 3.1476562004144575, false],
    [0.85, 2, 1, 1.9735176411899535, true], [0.6, 0.5, 5, 2.7475277073902133, true]] as const) {
    const r = liquidCv({ ...liq, pv, p2 }, fl);
    assert.equal(r.choked, choked, `choked fl ${fl}`);
    close(r.cv, cv, 3e-3, `fl ${fl} p2 ${p2}`);
  }
});

test('gas equals fluids.size_control_valve_g (IEC; OZ1000 rounds N8 to 94.8: 0.2 %)', () => {
  for (const [xt, p2, k, cv, choked] of [[0.69, 8.34, 1.37, 24.920059079764158, true], [0.69, 35, 1.37, 38.1030663157486, false],
    [0.42, 20, 1.37, 31.94103375685927, true], [0.81, 30, 1.3, 29.79761486435711, false]] as const) {
    const r = gasCv({ ...gas, p2, k }, xt);
    assert.equal(r.choked, choked, `choked xT ${xt}`);
    close(r.cv, cv, 2e-3, `xT ${xt} p2 ${p2}`);
  }
});

test('choking, flashing, FF', () => {
  const r = liquidCv({ ...liq, p2: 1, pv: 2, pc: 220.64 }, 0.9);
  assert.equal(r.choked, true); assert.equal(r.flashing, true);
  close(r.ff, 0.96 - 0.28 * Math.sqrt(2 / 220.64), 1e-15, 'FF');
  // Cv is continuous at the choking limit
  const lim = liquidCv({ ...liq, p2: 41.16 - 0.81 * 41.16 }, 0.9);
  close(lim.cv, 9000 / (27.3 * 0.9 * Math.sqrt(41.16 * 980)), 1e-12, 'at the limit');
});

test('inverse: maximum flow through a given Cv (failed open) round-trips', () => {
  const r = liquidCv({ ...liq, p2: 30 }, 0.9);
  close(liquidFlow({ ...liq, p2: 30 }, 0.9, r.cv), 9000, 1e-12, 'liquid');
  const g = gasCv(gas, 0.69);
  close(gasFlow(gas, 0.69, g.cv), 9000, 1e-12, 'gas choked');
  const g2 = gasCv({ ...gas, p2: 35 }, 0.69);
  close(gasFlow({ ...gas, p2: 35 }, 0.69, g2.cv), 9000, 1e-12, 'gas subcritical');
});

test('valve pick: smallest size within 80 % of rated Cv, with its own FL/xT', () => {
  const globe = STYLES.find((s) => s.id === 'globe-eq')!;
  const pl = pickValve(globe, (s) => liquidCv(liq, s.fl))!;
  assert.equal(pl.size.size, '1/2'); close(pl.fraction, 1.83822 / 2.41, 1e-5, '½″ at 76 %');
  const pg = pickValve(globe, (s) => gasCv(gas, s.xt))!;
  assert.equal(pg.size.size, '1 1/2');
  assert.ok(pg.result.cv <= 0.8 * 35.8 && gasCv(gas, 0.67).cv > 0.8 * 17.2);
  assert.equal(pickValve(globe, (s) => liquidCv({ ...liq, w: 1e7 }, s.fl)), undefined, 'beyond the table');
  for (const s of STYLES) for (let i = 1; i < s.sizes.length; i++) assert.ok(s.sizes[i].cv > s.sizes[i - 1].cv, `${s.id} Cv ascending`);
});

test('Kv and gas volumes as on the sheet', () => {
  close(kvFromCv(1), 0.865, 1e-15, 'Kv = 0.865·Cv (the sheet note said 0.856)');
  close(gasVolume(9000, 18.02, 672, 0.942, 41.16), 0.17739445967066 * 8.314462618 / 8.314, 1e-12, 'V1 (exact R)');
  close(gasVolumeStd(9000, 18.02), 3.14354318624506 / 0.942 * 8.314462618 / 8.314, 1e-12, 'V std (Z = 1, exact R)');
});
