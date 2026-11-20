// Acceptance tests for the native Pipe Size calculator (ROADMAP Phase 7).
// 1. The Zoho defaults (500 000 kg/h, 1000 kg/m³, 1 cP), with the sheet's own flow conversion
//    (gpm = 4.4028675396547·m³/h, ft³/s = gpm/448.83), must match its converged results to 1e-8;
//    with exact conversions they agree to ~1e-6.
// 2. The solution satisfies the correlation; trends; standard-pipe selection; pipe table checks. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { econPipe, econFlow } from '../src/lib/calc/pipesize.ts';
import { CS_STD, SS_10S, id, pick } from '../src/lib/calc/pipes.ts';

const close = (got: number, want: number, rel: number, what = '') =>
  assert.ok(Math.abs(got - want) <= rel * Math.abs(want), `${what}: got ${got}, want ${want}`);
const FT3 = 0.3048 ** 3;

test('Zoho defaults reproduced (sheet flow conversion)', () => {
  const q = 500 * 4.4028675396547 / 448.83 * FT3;           // m³/s as the sheet converts 500 m³/h
  const rho = 62.427960591578 * 0.45359237 / FT3;          // the sheet's lb/ft³ back to kg/m³ (1000)
  const cs = econPipe('cs', q, rho, 0.001);
  close(cs.d / 0.0254, 14.6398123707958, 1e-8, 'CS diameter, in');
  close(cs.d * 1000, 371.851234218213, 1e-8, 'CS diameter, mm');
  close(cs.v, 1.27891092883477, 1e-8, 'CS velocity');
  const ss = econPipe('ss', q, rho, 0.001);
  close(ss.d / 0.0254, 8.57000482431914, 1e-8, 'SS diameter, in');
  close(ss.d * 1000, 217.678122537706, 1e-8, 'SS diameter, mm');
  close(ss.v, 3.73206489900789, 1e-8, 'SS velocity');
});

test('exact conversions: same within 2e-6', () => {
  const cs = econPipe('cs', 500 / 3600, 1000, 0.001);
  close(cs.d * 1000, 371.851234218213, 2e-6, 'CS mm');
  const ss = econPipe('ss', 500 / 3600, 1000, 0.001);
  close(ss.d * 1000, 217.678122537706, 2e-6, 'SS mm');
});

test('the solution satisfies the correlation', () => {
  for (const [m, q, rho, mu] of [['cs', 0.01, 800, 0.0005], ['ss', 2, 1.2, 1.8e-5], ['cs', 1e-4, 1000, 0.01]] as const) {
    const r = econPipe(m, q, rho, mu);
    close(econFlow(m, r.d / 0.3048, rho / (0.45359237 / FT3), mu * 1000), q / FT3, 1e-10, `${m} q=${q}`);
    close(r.v, q / (Math.PI * r.d ** 2 / 4), 1e-12, 'v = q/A');
    close(r.re, rho * r.v * r.d / mu, 1e-12, 'Re');
  }
});

test('trends: more flow → larger pipe; stainless smaller and faster than carbon steel', () => {
  const a = econPipe('cs', 0.05, 1000, 0.001), b = econPipe('cs', 0.1, 1000, 0.001);
  assert.ok(b.d > a.d);
  // note: with the (1 + 2.18·D) factor the carbon-steel economic velocity peaks near D ≈ 6 in and then falls
  // slowly (as on the source sheet): 1.318 m/s at 0.05 m³/s, 1.294 m/s at 0.1 m³/s
  close(a.v, 1.31752736, 1e-7, 'v at 0.05 m³/s'); close(b.v, 1.29428938, 1e-7, 'v at 0.1 m³/s');
  const s = econPipe('ss', 0.05, 1000, 0.001);
  assert.ok(s.d < a.d && s.v > a.v);
  // the economic velocity rises with diameter and falls with density (Generaux)
  assert.ok(econPipe('cs', 0.05, 1.2, 1.8e-5).v > a.v, 'gas faster than liquid');
});

test('standard pipe: smallest at or above the economic diameter, and the size below', () => {
  const cs = econPipe('cs', 500 / 3600, 1000, 0.001);
  assert.equal(cs.up!.pipe.nps, '16'); close(cs.up!.d, 0.38735, 1e-12, 'NPS 16 STD ID 15.25 in');
  assert.equal(cs.down!.pipe.nps, '14'); close(cs.down!.d, 13.25 * 0.0254, 1e-12, 'NPS 14 STD ID');
  const ss = econPipe('ss', 500 / 3600, 1000, 0.001);
  assert.equal(ss.up!.pipe.nps, '10'); close(ss.up!.d, 10.42 * 0.0254, 1e-12, 'NPS 10 10S ID');
  assert.equal(ss.down!.pipe.nps, '8'); close(ss.down!.d, 8.329 * 0.0254, 1e-12, 'NPS 8 10S ID');
  assert.deepEqual(pick(CS_STD, 100), { down: CS_STD.at(-1) }, 'larger than NPS 48');
  assert.equal(pick(CS_STD, 0.1).down, undefined, 'smaller than NPS 1/8');
});

test('pipe table (ASME B36.10M STD, B36.19M 10S)', () => {
  const at = (l: typeof CS_STD, n: string) => l.find((p) => p.nps === n)!;
  close(id(at(CS_STD, '2')), 2.067, 1e-12, 'NPS 2 STD'); close(id(at(CS_STD, '6')), 6.065, 1e-12, 'NPS 6 STD');
  close(id(at(CS_STD, '12')), 12.0, 1e-12, 'NPS 12 STD'); close(id(at(CS_STD, '24')), 23.25, 1e-12, 'NPS 24 STD');
  close(id(at(SS_10S, '14')), 13.624, 1e-12, 'NPS 14 10S (the source sheet had this in the 40S column, PIP-1)');
  close(id(at(SS_10S, '24')), 23.5, 1e-12, 'NPS 24 10S'); close(id(at(SS_10S, '30')), 29.376, 1e-12, 'NPS 30 10S');
  assert.equal(SS_10S.find((p) => p.nps === '26'), undefined, 'no 10S for NPS 26');
  for (const l of [CS_STD, SS_10S]) for (let i = 1; i < l.length; i++) assert.ok(id(l[i]) > id(l[i - 1]), l[i].nps);
});
