// Acceptance tests for the native Pressure Loss: Non-Circular calculator (ROADMAP Phase 7).
// 1. The Zoho defaults (A = 32 275.423 mm², P = 638 mm, the Single Phase fluid, Le = 100 m) are reproduced with
//    the sheet's own friction correlation; then the corrected value with exact Colebrook.
// 2. Laminar f·Re per shape against Shah & London (1971): rectangle Table 13 (7 digits), triangle Eq. 155,
//    ellipse Eq. 172 checked against the exact flow rate, annulus limits; all four within 1.5 % of an independent
//    finite-difference solution (801×801 grid, run by the owner's private script, values below).
// 3. Geometry (A, P, D_h) of every shape. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { section, fReRect, fReAnnulus, fReEllipse, ellipE, FRE_TRIANGLE } from '../src/lib/calc/noncircular.ts';
import { solve, goudarSonnadSheet } from '../src/lib/calc/pressure1p.ts';

const close = (got: number, want: number, rel: number, what = '') =>
  assert.ok(Math.abs(got - want) <= rel * Math.abs(want), `${what}: got ${got}, want ${want}`);

const zoho = section('any', 32275.423e-6, 0.638)!;
const base = { d: zoho.dh, area: zoho.area, fRe: zoho.fRe, eps: 4.57e-5, w: 36.5, rho: 862.68, mu: 0.6503e-3, la: 100 };

test('Zoho defaults reproduced with the sheet correlation', () => {
  close(zoho.dh, 0.2023537492163, 1e-12, 'D_h');
  const r = solve(base);
  close(r.q, 0.042310010664441, 1e-12, 'V');
  close(r.v, 1.31090491562081, 1e-12, 'v');
  close(r.rhoV2, 1482.49116425707, 1e-12, 'ρv²');
  close(r.rr, 0.0002258421214185181, 1e-12, 'ε/D_h');
  close(r.re, 351899.31630301, 1e-12, 'Re');
  const fs = goudarSonnadSheet(r.re, r.rr);
  close(fs, 0.0162093247680874, 1e-12, 'sheet f');
  close(fs * 100 / zoho.dh * 0.5 * 862.68 * r.v ** 2, 5937.66629981649, 1e-12, 'sheet Δp, Pa');
});

test('corrected: exact Colebrook', () => {
  const r = solve(base);
  assert.equal(r.regime, 'turbulent');
  close(r.dp, 5937.66629981649 * r.f / 0.0162093247680874, 1e-12, 'Δp');
  assert.ok(r.f < 0.0162093247680874 && r.f > 0.0161);
});

test('rectangle f·Re equals Shah & London Table 13 (Fanning × 4), 7 digits', () => {
  const T13: [number, number][] = [[1, 14.22708], [0.9, 14.26098], [1 / 1.2, 14.32808], [0.8, 14.3778], [1 / 1.4, 14.56482],
    [0.7, 14.60538], [2 / 3, 14.71184], [0.6, 14.97996], [0.5, 15.54806], [0.4, 16.3681], [1 / 3, 17.08967], [0.3, 17.51209],
    [0.25, 18.23278], [0.2, 19.0705], [1 / 6, 19.7022], [1 / 7, 20.1931], [0.125, 20.58464], [1 / 9, 20.90385], [0.1, 21.16888],
    [0.05, 22.47701], [0, 24]];
  for (const [a, f] of T13) close(fReRect(a) / 4, f, 6e-7, `α ${a}`);
  close(fReRect(2), fReRect(0.5), 1e-15, 'orientation does not matter');
});

test('triangle, ellipse, annulus', () => {
  close(FRE_TRIANGLE, 160 / 3, 1e-15, 'triangle 4·40/3');
  // ellipse: Eq. 172 equals the exact flow rate Q = π·a³·b³·Δp/(4·μ·L·(a² + b²)) through f = 2·D_h·Δp/(L·ρ·v²)
  for (const al of [1, 0.8, 0.5, 0.2, 0.05]) {
    const a = 1, b = al, P = 4 * a * ellipE(1 - al * al), A = Math.PI * a * b, Dh = 4 * A / P;
    const v = a ** 3 * b ** 3 / (4 * (a * a + b * b)) / (a * b);   // mean velocity for Δp/(μL) = 1
    close(fReEllipse(al), 2 * Dh * Dh / v, 1e-12, `ellipse α ${al}`);
  }
  close(fReEllipse(1), 64, 1e-13, 'circle');
  close(fReEllipse(1e-9), 2 * 4 * Math.PI ** 2, 1e-6, 'α → 0: 8π²');
  close(fReEllipse(0.5), 4 * 16.8233, 1e-5, 'α 0.5');
  // complete elliptic integral E(m)
  close(ellipE(0), Math.PI / 2, 1e-15, 'E(0)'); close(ellipE(0.75), 1.2110560275684594, 1e-14, 'E(0.75)'); close(ellipE(1), 1, 0, 'E(1)');
  // annulus: limits circle (r → 0) and parallel plates (r → 1)
  close(fReAnnulus(1e-12), 64, 0.05, 'r → 0 (slowly, as 1/ln r)'); assert.equal(fReAnnulus(0), 64);
  close(fReAnnulus(0.999), 96, 1e-6, 'r → 1');
  close(fReAnnulus(0.5), 4 * 23.81254, 1e-6, 'r 0.5');
});

test('all four shapes within 1.5 % of an independent finite-difference solution', () => {
  // f·Re = 2·D_h²/u_m with ∇²u = −1, 801×801 grid (staircase walls make every value ≈ 1 % low)
  const FD: [number, number][] = [[fReRect(0.5), 61.5749], [fReEllipse(0.5), 66.8658], [fReAnnulus(0.5), 94.1996], [FRE_TRIANGLE, 52.8634]];
  for (const [exact, fd] of FD) assert.ok(fd < exact && fd > exact * 0.985, `${exact} vs FD ${fd}`);
});

test('geometry of each shape', () => {
  const r = section('rect', 0.3, 0.1)!;
  close(r.area, 0.03, 1e-15); close(r.perimeter, 0.8, 1e-15); close(r.dh, 0.15, 1e-15); close(r.fRe, fReRect(1 / 3), 1e-15);
  const an = section('annulus', 0.2, 0.1)!;
  close(an.dh, 0.1, 1e-14, 'annulus D_h = Do − Di'); close(an.fRe, fReAnnulus(0.5), 1e-15);
  const t = section('triangle', 0.3)!;
  close(t.dh, 0.3 / Math.sqrt(3), 1e-14, 'triangle D_h = s/√3');
  const e = section('ellipse', 0.3, 0.3)!;
  close(e.dh, 0.3, 1e-14, 'circle as ellipse'); close(e.fRe, 64, 1e-13);
  assert.equal(section('annulus', 0.1, 0.2), undefined);
  assert.equal(section('rect', 0, 0.1), undefined);
  assert.equal(section('any', 1, 2, 70)!.fRe, 70);
});

test('laminar flow uses the shape constant', () => {
  const s = section('rect', 0.1, 0.01)!;
  const r = solve({ d: s.dh, area: s.area, fRe: s.fRe, eps: 0, w: 0.01, rho: 900, mu: 0.1, la: 10 });
  assert.equal(r.regime, 'laminar');
  close(r.f, s.fRe / r.re, 1e-15, 'f = fRe/Re');
  // exact Δp from the series: Δp = f·Re·μ·v·L/(2·D_h²)
  close(r.dp, s.fRe * 0.1 * r.v * 10 / (2 * s.dh ** 2), 1e-12, 'Δp');
});
