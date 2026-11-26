// Acceptance tests for the native Pressurizing & Depressurizing calculator (ROADMAP Phase 7).
// 1. Zoho default (M 16, Z 1, 25 °C, V 1 767 m³, 800 → 15 psig, P2 0 psig, Masoneilan eq. with the sheet's Cv 48 /
//    FL 0.9): the sheet's 99-step result 6.802 h reproduced with its own stepping, and the exact integral 6.527 h (PRS-1).
// 2. New example (Fisher 2″ globe Cv 59.7, xT 0.69, k 1.31, IEC 60534): isothermal and adiabatic depressurizing and
//    pressurizing against an independent time-domain ODE solution (scipy DOP853, rtol 1e-11).
// 3. Closed forms: choked filling at constant flow; adiabatic temperatures; sizing inverts the rating; API 521 targets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, flow, timeAt, sample, cvForTime, boreForTime, stdFlow, api521Target, mass, tempOf, STD_T, PATM, type Case, type Device } from '../src/lib/calc/prs.ts';

const close = (got: number, want: number, tol: number, what = '', abs = false) =>
  assert.ok(Math.abs(got - want) <= (abs ? tol : tol * Math.abs(want)), `${what}: got ${got}, want ${want}`);
const PSI = 6894.757293168;
const base: Case = { mode: 'depress', thermo: 'isothermal', gas: { M: 16, Z: 1, k: 1.31, mu: 1.1e-5 }, V: 1767,
  P0: 800 * PSI + PATM, Pend: 15 * PSI + PATM, T0: 298.15, Pext: PATM, Ts: 298.15 };
const zoho: Device = { kind: 'masoneilan', cv: 48, fl: 0.9 };
const fisher: Device = { kind: 'valve', cv: 59.7, xt: 0.69 };

test('Zoho default: the sheet\'s stepping (6.802 h) and the exact integral (PRS-1)', () => {
  // first-step flow (sheet G29 32 543.06 kg/h)
  close(flow(zoho, base.gas, base.P0, 298.15, PATM) * 3600, 32543.062982237, 2e-5, 'W0');
  // the sheet: 99 linear steps in psig, each timed with the flow at its lower end, R = 8.314, psi factor 6894.757293
  const psi = 6894.757293, Pa = (p: number) => (p + 14.6959487758723) * psi;
  let tSheet = 0;
  for (let i = 1; i <= 99; i++) {
    const p = 800 + (15 - 800) * i / 99, pPrev = 800 + (15 - 800) * (i - 1) / 99;
    const dm = Math.abs(p - pPrev) * psi * 1767 * 16e-3 / 8.314 / 298.15;
    tSheet += dm / flow(zoho, base.gas, Pa(p), 298.15, PATM);
  }
  close(tSheet / 3600, 6.80236602082882, 1e-6, 'sheet J128');
  const r = run(base, zoho);
  close(r.t / 3600, 6.527041649757447, 1e-6, 'exact (scipy quad)');
  close(r.dm, mass(base, base.P0, 298.15) - mass(base, base.Pend, 298.15), 1e-12, 'mass vented');
});

test('New example (Fisher 2″ globe, IEC 60534) vs an independent ODE solution', () => {
  const iso = run(base, fisher);
  close(iso.t / 3600, 5.381176015263876, 1e-6, 'isothermal');
  const adi = run({ ...base, thermo: 'adiabatic' }, fisher);
  close(adi.t / 3600, 5.029461822769406, 1e-6, 'adiabatic');
  close(adi.Tend, 136.16771042328494, 1e-6, 'adiabatic end T');
  close(adi.Tend, 298.15 * (base.Pend / base.P0) ** (0.31 / 1.31), 1e-9, 'isentrope');
  const fill: Case = { ...base, mode: 'press', V: 10, P0: 1e5, Pend: 30e5, Pext: 50e5 };
  close(run(fill, fisher).t, 19.359469435733956, 1e-6, 'pressurize isothermal');
  const fa = run({ ...fill, thermo: 'adiabatic' }, fisher);
  close(fa.t, 14.778220939389783, 1e-6, 'pressurize adiabatic');
  close(fa.Tend, 386.58182118112836, 1e-6, 'pressurize adiabatic end T');
});

test('Closed forms, sizing, sampling, API 521', () => {
  // choked filling from a fixed supply: constant flow, t = Δm/W
  const fill: Case = { ...base, mode: 'press', V: 5, P0: 1e5, Pend: 10e5, Pext: 60e5 };
  const W = flow(fisher, base.gas, 60e5, 298.15, 10e5);
  close(W, flow(fisher, base.gas, 60e5, 298.15, 1e5), 1e-12, 'choked throughout');
  close(run(fill, fisher).t, (mass(fill, 10e5, 298.15) - mass(fill, 1e5, 298.15)) / W, 1e-9, 'constant-flow fill');
  // adiabatic filling from (almost) vacuum tends to k·Ts
  const c0: Case = { ...fill, thermo: 'adiabatic', P0: 1 };
  close(tempOf(c0, 1e-12, 1), 1.31 * 298.15, 1e-6, 'k·Ts');
  // sizing: Cv for the isothermal time of the example gives back 59.7 (flow ∝ Cv)
  const t = run(base, fisher).t;
  close(cvForTime(base, 0.69, t), 59.7, 1e-6, 'Cv for time');
  // orifice: bore for a time, then the rating gives that time
  const ori = { ...base, V: 20, P0: 20e5, Pend: 5e5 };
  const b = boreForTime(ori, 0.1, 900);
  assert.ok(b.reachable);
  close(run(ori, { kind: 'orifice', d: b.d, D: 0.1 }, 400).t, 900, 1e-6, 'orifice inverse');
  // time at a pressure and evenly timed samples
  const r = run(base, fisher);
  const tm = timeAt(r, 400 * PSI + PATM);
  assert.ok(tm > 0 && tm < r.t);
  const s = sample(r, 20);
  assert.equal(s.length, 21); close(s[20].t, r.t, 1e-12, 'last sample'); close(s[0].P, base.P0, 1e-12, 'first sample');
  // standard flow and API 521 targets
  close(stdFlow(16 / 3600, 16, STD_T['20C']) * 3600, 8314.462618 * 293.15 / PATM, 1e-12, 'std m³ per kmol (24.055 at 20 °C)');
  const a = api521Target(20e5 + PATM);
  close(a.half, 10e5 + PATM, 1e-12, '50 %'); close(a.fire, 690e3 + PATM, 1e-12, '690 kPa g');
  close(api521Target(10e5 + PATM).fire, 5e5 + PATM, 1e-12, 'whichever lower');
  // invalid
  assert.equal(run({ ...base, Pend: 0.5e5 }, fisher).ok, false);
});
