// Acceptance tests for the native PSV: Gas Filled Vessel calculator (ROADMAP Phase 7; shared component with the liquid tool).
// 1. Zoho defaults (vertical, hemispherical heads, D 5 m, L 15 m, El 10 m to the bottom tangent line, fire zone 7.62 m;
//    set 10 bar g, 21 %, Pn 5 bar g, Tn 90 °C; k 1.143, Kd 0.975, Tw 593 °C; M 19.7, Z 1): exposed area, T1, C, F′,
//    area with F′ = 0.01 and the sheet's load (= flow through that area) to 1e-12.
// 2. API Eq. 8 load = flow through the area with the unclamped F′ (identity); 0.045 option; Tw ≤ T1.
// 3. Exposed area: whole vessel when engulfed (both heads, GEX-1), sphere without the equator rule, grade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wetted, gasT1, fPrime, areaUnwetted, loadUnwetted, capacityCritical, coefC_US, FP_MIN, FP_UNKNOWN, TW_CS, IN2, pickOrifice, API526, type Vessel } from '../src/lib/calc/psvl.ts';

const close = (got: number, want: number, tol: number, what = '') =>
  assert.ok(Math.abs(got - want) <= tol * Math.abs(want), `${what}: got ${got}, want ${want}`);
const PI = Math.PI;
const zoho: Vessel = { kind: 'vertical', head: 'hemi', D: 5, L: 15, datum: 'tangent', El: 10, level: 0, Hf: 7.62, gas: true };
const P1 = 1e6 * 1.21 + 101325, Pn = 5e5 + 101325, Tn = 363.15, Tw = 866.15;

test('Zoho defaults: exposed area, T1, C, F′, area, load', () => {
  const w = wetted(zoho);
  close(w.A, 1.88495559215388, 1e-12, "A'");
  close(w.total, 314.159265358935, 1e-12, 'total');
  const T1 = gasT1(P1, Pn, Tn);
  close(T1, 791.930609487379, 1e-12, 'T1');
  close(coefC_US(1.143), 331.35603055167, 1e-12, 'C');
  const Fp = fPrime(1.143, 0.975, Tw, T1);
  close(Fp, 0.0017537070529627, 1e-9, 'F′ computed');
  const A = areaUnwetted(Math.max(Fp, FP_MIN), w.A, P1);
  close(A / IN2, 0.0147121288115864, 1e-10, 'A in² (sheet: psi = 6894.757293, exact 6894.757293168)');
  assert.equal(API526[pickOrifice(A).i].d, 'D');
  close(capacityCritical(A, 1.143, 0.975, P1, 1, 1, 19.7, T1, 1) * 3600, 48.204258619317, 1e-10, 'sheet W (flow through A)');
});

test('API Eq. 8 = flow through the area with the unclamped F′; GEX-3 value', () => {
  const w = wetted(zoho), T1 = gasT1(P1, Pn, Tn);
  const W8 = loadUnwetted(19.7, P1, w.A, Tw, T1);
  close(W8 * 3600, 8.45361483232436, 1e-9, 'Eq. 8 kg/h');
  for (const [k, M, Twx] of [[1.143, 19.7, Tw], [1.4, 29, 900], [1.1, 44, 1000]]) {
    const Fp = fPrime(k, 0.975, Twx, T1);
    close(capacityCritical(areaUnwetted(Fp, 10, P1), k, 0.975, P1, 1, 1, M, T1, 1), loadUnwetted(M, P1, 10, Twx, T1), 1e-12, `identity k=${k}`);
  }
  close(areaUnwetted(FP_UNKNOWN, w.A, P1) / areaUnwetted(FP_MIN, w.A, P1), 4.5, 1e-12, '0.045 option');
  close(areaUnwetted(0.01, w.A, P1, 0.8, 0.9), areaUnwetted(0.01, w.A, P1) / 0.72, 1e-12, 'Kb·Kc');
  assert.ok(Number.isNaN(fPrime(1.143, 0.975, 700, 800)), 'Tw ≤ T1 has no F′ (GEX-2)');
  assert.ok(Number.isNaN(loadUnwetted(19.7, P1, 1, 700, 800)));
  close(TW_CS - 273.15, 593.3333333, 1e-9, '1 100 °F');
});

test('exposed area: engulfed vessel counts both heads (GEX-1), sphere and horizontal', () => {
  close(wetted({ ...zoho, Hf: 40 }).A, 314.159265358979, 1e-12, 'engulfed vertical');
  close(wetted({ ...zoho, El: 2.5, Hf: 15 }).A, 2 * PI * 2.5 * 2.5 + PI * 5 * 12.5, 1e-12, 'up to 12.5 m above the TL');
  // sphere: no equator rule for a gas-filled vessel; Archimedes zone up to the fire zone
  const s: Vessel = { kind: 'sphere', head: 'hemi', D: 10, L: 0, datum: 'tangent', El: 1, level: 0, Hf: 3, gas: true };
  close(wetted(s).A, PI * 10 * 2, 1e-12, 'sphere');
  const h: Vessel = { kind: 'horizontal', head: 'ell21', D: 2, L: 2.5, datum: 'tangent', El: 0.25, level: 0, Hf: 7.62, gas: true };
  close(wetted(h).A, wetted(h).total, 1e-12, 'horizontal fully in the fire zone');
  close(wetted({ ...h, El: 6.62 }).A, PI * 2 / 2 * 2.5 + wetted(h).bottom, 1e-12, 'half');
});
