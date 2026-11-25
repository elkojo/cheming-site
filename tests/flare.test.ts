// Acceptance tests for the native Flare Stack calculator (ROADMAP Phase 7).
// 1. Zoho defaults, all three columns, with the sheet's constants and its effective temperature 1 053.15 K (FLR-1):
//    diameter, exit velocity, flame length and distortion, transmittance (30 m, FLR-4), distances, heights, radiation.
// 2. API RP 521 (1997) Appendix C: example 1 (simple method; chart readings ±5 %) and example 2 distances.
// 3. Exact Mach constant vs API's 3.23e-5; B & S closed form consistent; support, steam, purge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { machOf, machAPI, diameterFor, exitVelocity, flame, flameLength, dxL, dyL, distanceFor, heightFor, radiationAt, radiation, tauBS, support, steamRate, purgeFlow, PURGE_V, type Gas, type Rad, type Flame } from '../src/lib/calc/flare.ts';

const close = (got: number, want: number, tol: number, what = '') =>
  assert.ok(Math.abs(got - want) <= tol * Math.abs(want), `${what}: got ${got}, want ${want}`);
const BTU = 11356.5262466652 / 3600;   // W/m² per Btu/(h·ft²) as on the sheet (C270/3600000 kW/m²)
const FT = 0.3048;

// the sheet's own arithmetic: d from Mach with 3.23e-5, volume flow with R = 8.314
const sheetFlame = (W: number, M: number, T: number, d: number, LHVbtu: number, uw: number) => {
  const V = (W / 3600 / M) * 8.314 * T / 101.325, uj = V / (Math.PI * d * d / 4), u = uw / uj;
  const Q = W * LHVbtu * 2.326 / 3600 * 1000, L = flameLength(Q);
  return { f: { L, u, uj, dx: dxL(u) * L, dy: dyL(u) * L } as Flame, Q };
};

test('Zoho DESIGN (d, h): Mach 0.718 → diameter, flame, heights', () => {
  const g: Gas = { W: 209435 / 3600, M: 42.081, T: 1053.15, Z: 1, k: 1.16, p2: 101325 };
  const d = Math.sqrt(3.23e-5 * 209435 / 101.325 / 0.718 * Math.sqrt(1053.15 / 1.16 / 42.081));
  close(d, 0.657191459839664, 1e-12, 'd');
  close(diameterFor(g, 0.718), d, 2e-3, 'exact constant vs 3.23e-5');
  const { f, Q } = sheetFlame(209435, 42.081, 1053.15, d, 19691.25, 23);
  close(f.uj, 352.184829600028, 1e-12, 'uj'); close(f.dx / f.L, 0.700853878835718, 1e-12, 'Δx/L'); close(f.dy / f.L, 0.52667037094653, 1e-12, 'Δy/L');
  close(f.L, 100.587715340147, 1e-12, 'L');
  const rad: Rad = { F: 0.21, Q, RH: 40, tau: 'bs', K0: 325.5 * BTU, c: 30 };
  const a = distanceFor(rad, 1500 * BTU);
  close(a.D, 96.6697203494139, 1e-12, 'D'); close(a.tau, 0.777566902497612, 1e-12, 'τ');
  close(heightFor(f, a.D, f.dx / 2, 0), 70.1814356739834, 1e-12, 'H POI 1');
  close(heightFor(f, a.D, 254.3 * FT, 106.6 * FT), 92.9456671517304, 1e-12, 'H POI 2');
});

test('Zoho DESIGN (h): diameter 2 ft → Mach, heights', () => {
  const g: Gas = { W: 209435 / 3600, M: 42.081, T: 1053.15, Z: 1, k: 1.16, p2: 101325 };
  close(machAPI(g, 0.6096), 0.834484645196443, 1e-12, 'Ma (API constant)');
  close(machOf(g, 0.6096), 0.834484645196443, 2e-3, 'Ma exact');
  const { f, Q } = sheetFlame(209435, 42.081, 1053.15, 0.6096, 19691.25, 23);
  close(f.uj, 409.321493833272, 1e-12, 'uj');
  const a = distanceFor({ F: 0.21, Q, RH: 40, tau: 'bs', K0: 325.5 * BTU, c: 30 }, 1500 * BTU);
  close(heightFor(f, a.D, f.dx / 2, 0), 68.8678921371415, 1e-12, 'H POI 1');
  close(heightFor(f, a.D, 254.3 * FT, 106.6 * FT), 90.7971439304705, 1e-12, 'H POI 2');
});

test('Zoho RATING: radiation for a given stack; FLR-8 (two heights on the sheet)', () => {
  const { f, Q } = sheetFlame(209435, 42.08, 1053.15, 0.6096, 19691, 23);
  const rad: Rad = { F: 0.21, Q, RH: 40, tau: 'bs', K0: 325.5 * BTU, c: 30 };
  close(radiationAt(f, rad, 234.7 * FT, f.dx / 2, 0).K / 1000, 4.52947683746367, 1e-12, 'K POI 1');
  close(radiationAt(f, rad, 311.860048027112 * FT, 254.3 * FT, 106.6 * FT).K / 1000, 4.44781360257441, 1e-12, 'K POI 2 with the sheet\'s second height');
  close(radiationAt(f, rad, 234.7 * FT, 254.3 * FT, 106.6 * FT).K / 1000, 6.50192, 1e-5, 'K POI 2 for the one stack');
});

test('API RP 521 (1997) Appendix C, example 1 (simple method)', () => {
  const g: Gas = { W: 45455 / 3600, M: 46.1, T: 422, Z: 1, k: 1.1, p2: 101300 };
  close(diameterFor(g, 0.2), 0.46, 0.01, 'd at Mach 0.2'); close(diameterFor(g, 0.5), 0.29, 0.01, 'd at Mach 0.5');
  const Q = 6.3e8;   // W (12.6 kg/s × 50 MJ/kg)
  close(flameLength(Q), 52, 0.01, 'L = 52 m (Fig. 9)');
  const rad: Rad = { F: 0.3, Q, RH: 50, tau: 'one', K0: 0 };
  close(distanceFor(rad, 6300).D, 48.9, 0.002, 'D = 48.9 m');
  for (const [Ma, uj, H] of [[0.2, 56.9, 33.7], [0.5, 143.2, 27]] as const) {
    const d = diameterFor(g, Ma), f = flame(g, d, Q, 8.9);
    close(f.uj, uj, 0.02, `uj at Mach ${Ma}`);
    close(heightFor(f, distanceFor(rad, 6300).D, 45.7, 0), H, 0.06, `H at Mach ${Ma} (API reads the charts)`);
  }
});

test('API example 2 distances; B & S closed form; extras', () => {
  close(distanceFor({ F: 0.3, Q: 6.3e9, RH: 50, tau: 'one', K0: 0 }, 9500).D, 126, 0.003, 'D = 126 m at 9.5 kW/m²');
  close(distanceFor({ F: 0.3, Q: 6.3e9, RH: 50, tau: 'one', K0: 0 }, 6300).D, 154.5, 0.003, 'D = 154.5 m at 6.3 kW/m²');
  const rad: Rad = { F: 0.25, Q: 2e9, RH: 60, tau: 'bs', K0: 1000 };
  const a = distanceFor(rad, 5000);
  close(radiation(rad, a.D).K, 5000, 1e-12, 'K(D(K)) = K'); close(a.tau, tauBS(60, a.D), 1e-14, 'τ consistent');
  close(tauBS(100, 30.5), 0.79, 1e-14, 'τ at the reference');
  assert.equal(support(55).kind, 'Self-supported'); assert.equal(support(150).guy, 75);
  close(steamRate(1, 46.1), 0.68 - 10.8 / 46.1, 1e-14, 'steam');
  close(PURGE_V.velocity[1], 0.012192, 1e-12, '0.04 ft/s');
  close(purgeFlow(0.6096, 0.012192) * 3600, 12.81024, 1e-5, 'purge m³/h');
  const g: Gas = { W: 10, M: 30, T: 400, Z: 0.9, k: 1.2, p2: 110000 };
  close(machOf(g, 0.3), exitVelocity(g, 0.3) / Math.sqrt(1.2 * 0.9 * 8.314462618 * 400 / 0.030), 1e-12, 'Ma = uj/a with Z');
});
