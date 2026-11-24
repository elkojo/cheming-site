// Acceptance tests for the native Pump calculator (ROADMAP Phase 7).
// 1. Zoho defaults (rated case = the sheet's sizing column F/D, 120 % of a normal 126 875 kg/h): suction and discharge
//    pressures, head, NPSH, Ns, shut-off head, design pressure, power, GPSA efficiency — the sheet's cached values.
// 2. Reduced-flow cases on the parabolic curve (the sheet's flat curve is error PUMP-1): hand-checked values.
// 3. Branan (2002) efficiency equation at a hand-computed point; Evans' NPSH relation in US units = SI result.
// 4. API 610 Table 11 motor ratings; unit factors.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pump, curves, brananEfficiency, motorRating, curveHead, type PumpInput } from '../src/lib/calc/pump.ts';
import { SS_US, GPM } from '../src/lib/calc/pump-units.ts';

const close = (got: number, want: number, tol: number, what = '', abs = false) =>
  assert.ok(Math.abs(got - want) <= (abs ? tol : tol * Math.abs(want)), `${what}: got ${got}, want ${want}`);

const BAR = 1e5;
// the sheet's default mass flow is 152250.00001218 kg/h (round-off, PUMP-10): flow-dependent values agree to ~1e-10
export const zoho: PumpInput = {
  m: 126875 / 3600, rho: 870, pv: 0.1 * BAR, n: 1, pct: [120, 100, 50],
  pos: 1.09 * BAR, elsg: 0, lll: 1, elclg: 0.75, dpSeq: 0, dpSfr: 0,
  pt: 9 * BAR, elclt: 1.7, dpDeq: 1.5 * BAR, dpDfe: 1.5 * BAR, dpDfr: 0, dpCv: 0,
  rso: 0.3, N: 2950, eyes: 1, stages: 1, nss: 245.5, margin: 0.6,
  pds: 2.4 * BAR + 101325, hll: 0, driver: 'motor', trip: 1.1,
  eff: [0.7234, 0.7234, 0.7234], effDrv: 1,
};

test('Zoho defaults, rated case: pressures, head, NPSH, design, power', () => {
  const r = pump(zoho), c = r.cases[0];
  close(c.m * 3600, 152250, 1e-12, 'rated mass flow');
  close(c.q * 3600, 175, 1e-9, 'Q per pump m³/h');
  close(c.pstat, 2132.946375, 1e-12, 'static LLL → centreline');
  close(c.ps / BAR, 1.11132946375, 1e-12, 'Ps');
  close(c.pclt, 14504.03535, 1e-12, 'Pclt');
  close(c.pd / BAR, 12.1450403535, 1e-12, 'Pd');
  close(c.dp / BAR, 11.03371088975, 1e-12, 'ΔP');
  close(r.hr, 129.324757282633, 1e-12, 'Hr');
  close(r.ns, 16.9601049731441, 1e-9, 'Ns');
  close(r.u, 50.3635310717137, 1e-9, 'tip speed');
  close(r.dImp, 0.325792292692038 * (60 / Math.PI) / 19.083, 1e-12, 'D with 60/π (sheet 19.083, PUMP-9)');
  // the sheet writes NPSHr via (2πN/60)·52.9190320558675 ≈ N·g^0.75: identical to (N√Q/Nss)^(4/3) within 10 ppm
  close(r.npshrCl, 3.66593192126402, 1e-5, 'NPSHr at centreline');
  close(r.npshr, 4.26593192126402, 1e-5, 'NPSHr total');
  close(r.hvp, 11.603667251128, 1e-12, 'Hvp');
  close(c.npsha, 11.853667251128, 1e-9, 'NPSHa');
  close(c.elsMin, -7.58773532986398, 1e-5, 'min. suction vessel elevation');
  close(r.hso, 168.122184467422, 1e-12, 'shut-off head');
  close((r.pdd - 101325) / BAR, 16.7438241566747, 1e-12, 'discharge design pressure bar g');
  close(c.whp / 1000, 53.6360946072416, 1e-9, 'WHP kW');
  close(c.bhp / 1000, 74.1444492773591, 1e-9, 'BHP kW');
  close(r.effEst, 73.6378204152162, 1e-9, 'GPSA efficiency (sheet G86)');
  assert.equal(r.effEstInRange, false, 'default 424 ft is outside 50–300 ft');
  assert.ok(c.npshOk);
});

test('turbine driver: shut-off head at trip speed (sheet: (1 + 10 %)²)', () => {
  const r = pump({ ...zoho, driver: 'turbine' });
  close(r.hso, 1.1 ** 2 * 1.3 * 129.324757282633, 1e-12, 'Hso turbine');
  close(r.drvRating, 1.1 * r.cases[0].bhp, 1e-12, 'turbine 110 % (API 610 6.1.8)');
});

test('reduced-flow cases on the parabolic curve (PUMP-1)', () => {
  const r = pump(zoho), [rt, nm, mn] = r.cases;
  close(r.hso0, 1.3 * r.hr, 1e-12, 'operating shut-off head');
  close(nm.h, r.hr * (1.3 - 0.3 * (100 / 120) ** 2), 1e-12, 'H at 100 %');
  close(mn.h, r.hr * (1.3 - 0.3 * (50 / 120) ** 2), 1e-12, 'H at 50 %');
  // control valve takes what the curve gives above the system: ≈1.93 bar (flat curve: 0.917) and ≈5.21 bar (2.479)
  const sys = (s: number) => 9 + 0.1450403535 + 3 * s - 1.11132946375;
  close(nm.dpCv / BAR, nm.dp / BAR - sys((100 / 120) ** 2), 1e-12, 'CV Δp 100 %');
  close(nm.dpCv / BAR, 1.92809, 1e-5, 'CV Δp 100 % value');
  close(mn.dpCv / BAR, 5.21458, 1e-5, 'CV Δp 50 % value');
  close(rt.dpCv, 0, 0, 'rated CV Δp = input', true);
  // power: Q·ΔP per case
  close(nm.whp, nm.q * nm.dp, 1e-12, 'WHP 100 %');
  // the system curve plus the CV gap equals the pump curve at each case
  for (const c of r.cases) close(c.h, c.hsys + c.dpCv / (870 * 9.80665), 1e-12, `gap ${c.pct}`);
  const pts = curves(zoho, r, 2 * r.qr, 4);
  close(pts[2].pump, r.hr, 1e-12, 'curve through the rated point');
  close(pts[0].pump, r.hso0, 1e-12, 'curve at zero flow');
  close(curveHead(r.qr, r.qr, r.hr, r.hso0), r.hr, 1e-12, 'curveHead');
});

test('suction losses scale with (Q/Qr)² in NPSHa and Ps', () => {
  const x = { ...zoho, dpSfr: 0.2 * BAR };
  const r = pump(x), nm = r.cases[1], s = (100 / 120) ** 2;
  close(nm.dpSfr, 0.2 * BAR * s, 1e-12, 'scaled loss');
  close(nm.npsha, 11.853667251128 - 0.2 * BAR * s / (870 * 9.80665), 1e-12, 'NPSHa 100 %');
});

test('double suction and stages', () => {
  const r1 = pump(zoho), r2 = pump({ ...zoho, eyes: 2, stages: 2 });
  close(r2.npshrCl, r1.npshrCl / 2 ** (2 / 3), 1e-12, 'NPSHr with Q/2 per eye');
  close(r2.ns, r1.ns * 2 ** 0.75, 1e-12, 'Ns with head per stage');
  close(r2.dImp, r1.dImp / Math.SQRT2, 1e-12, 'impeller per stage');
});

test('Evans relation in US units (C = 9000) equals the SI result', () => {
  const nssSI = 9000 * SS_US;
  close(nssSI, 174.2658, 1e-6, 'Nss 9000 US in SI');
  close(SS_US, 0.0193628694657723, 1e-12, 'sheet factor C188');
  const r = pump({ ...zoho, nss: nssSI });
  const npshFt = (2950 * Math.sqrt(r.qr / GPM) / 9000) ** (4 / 3);
  close(r.npshrCl, npshFt * 0.3048, 1e-12, 'NPSHr');
});

test('Branan efficiency equation at F = 100 ft, G = 500 gpm', () => {
  close(brananEfficiency(100, 500), 67.595, 1e-12, 'hand calculation');
});

test('API 610 Table 11 motor ratings', () => {
  assert.deepEqual(motorRating(10e3), { rating: 12.5e3, pct: 125 });
  assert.deepEqual(motorRating(18e3), { rating: 22e3, pct: 115 });    // 125 % = 22.5 kW is not < 22
  close(motorRating(40e3).rating, 46e3, 1e-12, '40 kW → 115 %');
  close(motorRating(50e3).rating, 55e3, 1e-12, '50 kW → 110 %'); assert.equal(motorRating(50e3).pct, 110);   // 115 % = 57.5 > 55
  close(motorRating(74.1444492773591e3).rating, 81.5588942e3, 1e-8, 'default → 110 %');
});
