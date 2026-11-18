// Acceptance tests for the native Geometry calculator (ROADMAP Phase 7).
// Case 1 of each shape = the defaults and results shown in the Zoho sheet (read 2026-11-18).
// Further cases are hand-checked values. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geometry } from '../src/lib/calc/geometry.ts';
import { evaluate, defaults, parseNumber, formatNumber, type Values } from '../src/lib/calc/types.ts';

const group = (id: string) => {
  const g = geometry.find((x) => x.id === id);
  assert.ok(g, `missing group ${id}`);
  return g;
};

function check(id: string, inputs: Values | 'defaults', expected: Values, tol = 1e-9) {
  const g = group(id);
  const out = evaluate(g, inputs === 'defaults' ? defaults(g) : inputs);
  for (const [k, want] of Object.entries(expected)) {
    const got = out[k];
    assert.ok(Math.abs(got - want) <= tol * Math.max(1, Math.abs(want)), `${id}.${k}: got ${got}, want ${want}`);
  }
}

// Zoho shows 9–10 significant digits, so compare its values at 1e-9 relative.
test('Zoho reference: circle', () => check('circle', 'defaults', { r: 0.5, A: 0.785398163, C: 3.141592654 }));
test('Zoho reference: sphere', () => check('sphere', 'defaults', { r: 2.85, V: 96.966828049, S: 102.070345315 }));
test('Zoho reference: cylinder', () => check('cylinder', 'defaults', { r: 0.5, V: 1.570796327, S: 7.853981634 }));
test('Zoho reference: rectangle', () => check('rectangle', 'defaults', { A: 2, P: 6 }));
test('Zoho reference: rectangular solid', () => check('box', 'defaults', { V: 6, S: 22 }));
test('Zoho reference: parallelogram', () => check('parallelogram', 'defaults', { A: 6 }));
test('Zoho reference: trapezoid', () => check('trapezoid', 'defaults', { A: 3, P: 7 }));
test('Zoho reference: triangle area', () => check('triangle', 'defaults', { A: 3 }));
test('Zoho reference: cone', () => check('cone', 'defaults', { r: 0.5, s: 2.061552813, V: 0.523598776, S: 4.023677749 }));
test('Zoho reference: square pyramid', () => check('pyramid', 'defaults', { V: 24, S: 57.836461788 }));
test('Zoho reference: prism surface', () => check('prism', 'defaults', { S: 10 }));

// Deliberate fixes of two Zoho errors (see ROADMAP.md):
// - triangle "circumference" was 2·b + 2·h (10 for b=3, h=2); the perimeter of that triangle is 3 + 2.5 + 2.5 = 8
// - prism volume showed 2 for B=3, h=2; V = B·h = 6
test('fix: triangle perimeter = a + b + c', () => check('triangle', 'defaults', { P: 8 }));
test('fix: prism volume = B·h', () => check('prism', 'defaults', { V: 6 }));

// Hand-checked cases
test('circle D=10', () => check('circle', { D: 10 }, { r: 5, A: 78.53981633974483, C: 31.41592653589793 }));
test('sphere D=2 (unit sphere)', () => check('sphere', { D: 2 }, { V: (4 / 3) * Math.PI, S: 4 * Math.PI }));
test('cylinder D=2 h=5', () => check('cylinder', { D: 2, h: 5 }, { V: 5 * Math.PI, S: 12 * Math.PI }));
test('rectangle 4×2.5', () => check('rectangle', { l: 4, w: 2.5 }, { A: 10, P: 13 }));
test('box 2×3×4', () => check('box', { l: 2, w: 3, h: 4 }, { V: 24, S: 52 }));
test('trapezoid 4/6/3, sides 3.5', () => check('trapezoid', { b1: 4, b2: 6, h: 3, a: 3.5, c: 3.5 }, { A: 15, P: 17 }));
test('triangle 3-4-5', () => check('triangle', { b: 4, h: 3, a: 3, c: 5 }, { A: 6, P: 12 }));
test('cone r=3 h=4 (s=5)', () => check('cone', { D: 6, h: 4 }, { s: 5, V: 12 * Math.PI, S: 24 * Math.PI }));
test('pyramid b=6 h=4 (slant 5)', () => check('pyramid', { b: 6, h: 4 }, { V: 48, S: 96 }));
test('prism: cube as prism', () => check('prism', { B: 4, P: 8, h: 2 }, { V: 8, S: 24 }));

test('invalid or negative input gives no result', () => {
  const out = evaluate(group('circle'), { D: -1 });
  assert.ok(Number.isNaN(out.A));
  assert.ok(Number.isNaN(evaluate(group('rectangle'), { l: NaN, w: 1 }).A));
});

test('parseNumber accepts comma decimals and rejects junk', () => {
  assert.equal(parseNumber('2,5'), 2.5);
  assert.equal(parseNumber(' 1 000.5 '), 1000.5);
  assert.equal(parseNumber('1e3'), 1000);
  assert.ok(Number.isNaN(parseNumber('')));
  assert.ok(Number.isNaN(parseNumber('abc')));
  assert.ok(Number.isNaN(parseNumber('1.2.3')));
});

test('formatNumber matches Zoho-style display', () => {
  assert.equal(formatNumber(Math.PI / 4), '0.7853981634');
  assert.equal(formatNumber(6), '6');
  assert.equal(formatNumber(NaN), '—');
});
