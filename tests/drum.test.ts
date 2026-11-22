// Acceptance tests for the native Drum calculator (ROADMAP Phase 7).
// 1. Zoho defaults (horizontal, 2:1 elliptical, D 3 m, L 12 m, HLL/NLL/LLL 1.5/1.0/0.5 m, 200 m³/h): the sheet's
//    volumes, cross sections and times (formulas exact for 2:1 heads). 2. Crookston & Crookston, Chem. Eng. Sept 2011:
//    Table 3 head capacities and the Table 4/5 strapping tables (100-in tank, 120 in overall, ASME F&D heads).
//    3. Closed forms: numerical integration vs. ellipsoid, sphere, flat; vertical levels in the heads.
//    4. DIN 28011/28013 profiles per the De Plaatijzerindustrie data sheets (dish heights, outside-diameter reference).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { head, torispherical, headBelow, headHorizontal, geometry, level, segment, HEADS, type Drum } from '../src/lib/calc/drum.ts';

const close = (got: number, want: number, tol: number, what = '', abs = false) =>
  assert.ok(Math.abs(got - want) <= (abs ? tol : tol * Math.abs(want)), `${what}: got ${got}, want ${want}`);

const zoho: Drum = { orient: 'horizontal', head: 'ell21', D: 3, L: 12 };

test('Zoho defaults: total and level volumes, cross sections, times', () => {
  const g = geometry(zoho);
  close(g.total, 91.8915851175012, 1e-12, 'total');
  const want = [[1.5, 45.9457925587265, 3.53429173528448], [1.0, 26.5832186085569, 2.06255190783021], [0.5, 9.81604501593358, 0.774370520027947]];
  const v: number[] = [];
  for (const [h, V, A] of want) {
    const l = level(zoho, g, h);
    close(l.volume, V, 1e-11, `V(${h})`); close(l.section, A, 1e-11, `A(${h})`); v.push(l.volume);
  }
  const q = 200 / 3600;
  close((v[0] - v[1]) / q, 348.52633110305, 1e-10, 'surge time NLL–HLL');
  close((v[1] - v[2]) / q, 301.809124667217, 1e-10, 'hold-up time LLL–NLL');
  close(level(zoho, g, 1.5).surface, 3 * 12, 1e-12, 'surface at half = D·L');
});

test('Zoho vertical case: cylinder + full bottom head', () => {
  const d: Drum = { orient: 'vertical', head: 'ell21', D: 3, L: 12, datum: 'tangent' };
  const g = geometry(d);
  close(level(d, g, 1.5).volume, Math.PI * 9 / 4 * 1.5 + (Math.PI / 6) * 0.25 * 27, 1e-12, 'V(1.5)');
  close(level(d, g, 1.5).surface, Math.PI * 9 / 4, 1e-12, 'surface');
});

test('Crookston 2011 Table 3: head capacity / D³', () => {
  close(torispherical(1, 1, 0.06).volume, 0.0809990, 2e-6, 'ASME F&D');
  close(torispherical(1, 0.8, 0.1).volume, 0.1098840, 2e-6, 'ASME 80/10');
  close(torispherical(1, 0.8, 0.06).volume, 0.0945365, 2e-6, 'ASME 80/6');
  close(torispherical(1, 1, 0.06).depth, 0.1693376137, 1e-9, 'F&D depth α2');
  close(torispherical(1, 0.8, 0.1).depth, 0.2255437353, 1e-9, '80/10 depth');
  close(head('tori10', 1).volume, 0.189 * Math.PI / 6, 2e-4, '10 % dish ≈ sheet k = 0.189');
});

const GAL = 0.003785411784, IN = 0.0254;
const fdD = 100 * IN, fdL = 120 * IN - 2 * torispherical(fdD, 1, 0.06).depth;

test('Crookston 2011 Table 4: vertical strapping table (levels from the bottom of the head)', () => {
  const d: Drum = { orient: 'vertical', head: 'asmefd', D: fdD, L: fdL, datum: 'bottom' };
  const g = geometry(d);
  close(g.head.volume / GAL, 176.9 + 173.8, 0.15, 'V1 + V2', true);
  close(g.total / GAL, 3629.8, 0.1, 'VT', true);
  close(level(d, g, 12 * IN).volume / GAL, 187.99, 0.01, 'calculator 12 in', true);
  for (const [x, v] of [[1, 1], [4, 21], [10, 131], [40, 1135], [64, 1951], [106, 3378], [110, 3498], [118, 3624], [120, 3630]])
    close(level(d, g, x * IN).volume / GAL, v, 0.5, `${x} in`, true);
});

test('Crookston 2011 Table 5: horizontal strapping table', () => {
  const d: Drum = { orient: 'horizontal', head: 'asmefd', D: fdD, L: fdL };
  const g = geometry(d);
  for (const [x, v] of [[1, 5], [5, 60], [10, 171], [24, 638], [50, 1815], [75, 2952], [90, 3459], [99, 3625], [100, 3630]])
    close(level(d, g, x * IN).volume / GAL, v, 0.5, `${x} in`, true);
});

test('numerical head integration agrees with closed forms', () => {
  // a torispherical head with fd = fk = 0.5 is a hemisphere
  const hs = torispherical(2, 0.5, 0.5), sp = head('hemi', 2);
  close(hs.volume, sp.volume, 1e-10, 'hemisphere volume');
  for (const x of [0.01, 0.3, 1, 1.7, 1.99]) close(headHorizontal(hs, x), headHorizontal(sp, x), 1e-7, `hemi horizontal ${x}`);
  for (const s of [0, 0.2, 0.7, 0.99]) close(headBelow(hs, s), headBelow(sp, s), 1e-9, `hemi vertical ${s}`);
  // brute-force check of a torispherical horizontal partial volume
  const h = head('tori10', 1);
  for (const x of [0.05, 0.2, 0.5, 0.9]) {
    let v = 0; const n = 200000, dz = h.depth / n;
    for (let i = 0; i < n; i++) v += segment(h.rho((i + 0.5) * dz), x - 0.5) * dz;
    close(headHorizontal(h, x), v, 1e-6, `tori10 at ${x}`);
  }
  for (const id of HEADS.map((t) => t.id)) {
    const k = head(id, 1.3);
    close(headHorizontal(k, 0.65), k.volume / 2, 1e-9, `${id} half full`, true);
    close(headHorizontal(k, 1.3), k.volume, 1e-12, `${id} full`, true);
  }
});

test('vertical levels into the heads, both datums', () => {
  const t: Drum = { orient: 'vertical', head: 'korb', D: 2, L: 5, datum: 'tangent' };
  const b: Drum = { ...t, datum: 'bottom' };
  const gt = geometry(t), gb = geometry(b), hd = gt.head.depth;
  close(gt.hMin, -hd, 1e-15, 'lowest level'); close(gt.hMax, 5 + hd, 1e-15, 'highest');
  for (const h of [-hd, -0.2, 0, 2, 5, 5.3, 5 + hd]) close(level(t, gt, h).volume, level(b, gb, h + hd).volume, 1e-12, `datum shift ${h}`, true);
  close(level(t, gt, 5 + hd).volume, gt.total, 1e-10, 'full');
  close(level(t, gt, -hd).volume, 0, 1e-12, 'empty', true);
  // symmetry: liquid above the top tangent line mirrors the empty part of the bottom head
  close(gt.total - level(t, gt, 5 + 0.2).volume, headBelow(gt.head, 0.2), 1e-10, 'top head');
  assert.equal(level(t, gt, 6 + hd).outside, true);
  assert.equal(level(zoho, geometry(zoho), 3.2).outside, true);
});

test('DIN 28011 / 28013 profiles (De Plaatijzerindustrie data sheets): dish heights 0.192·D and 0.251·D', () => {
  // data sheets: H = 0.192·D + s + h (DIN 28011), 0.251·D + s + h (DIN 28013), D outside; for a thin wall the inside
  // dish depth ≈ that fraction of D
  close(head('tori10', 1).depth, 0.192, 0.012, 'Klöpper depth');
  close(head('korb', 1).depth, 0.251, 0.015, 'Korbbogen depth');
  // radii referred to the outside diameter: with s/D = 1 % the head volume differs by under 0.3 %
  const Di = 1, D = 1 / 0.98;
  close(head('tori10', Di).volume, torispherical(Di, D, 0.1 * D).volume, 0.003, 'Klöpper inside vs outside reference');
  close(head('korb', Di).volume, torispherical(Di, 0.8 * D, 0.154 * D).volume, 0.003, 'Korbbogen inside vs outside reference');
});
