// Acceptance tests for the native Prime Numbers calculator (ROADMAP Phase 7).
// Case 1 = the defaults and results shown in the Zoho sheet (read 2026-11-19):
//   375/225 = 5/3 = 1 150/225 = 1 2/3
// Further cases are hand-checked, including two the Zoho sheet could not do (beyond its first 500 primes
// and beyond the 10th power of a prime). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gcd, factorize, formatFactors, factorsHtml, gcdHtml, parseWhole, simplify, summary, valid, DEFAULTS, MAX } from '../src/lib/calc/primes.ts';

const run = (a: number, b: number) => {
  const x = simplify(a, b);
  assert.ok(x, `no result for ${a}/${b}`);
  return x;
};

test('Zoho reference: 375/225', () => {
  const x = run(DEFAULTS.a, DEFAULTS.b);
  assert.deepEqual({ a1: x.a1, b1: x.b1 }, { a1: 5, b1: 3 }); // lowest terms
  assert.deepEqual({ n: x.n, r: x.r }, { n: 1, r: 150 });     // 1 150/225
  assert.deepEqual({ r1: x.r1, b1: x.b1 }, { r1: 2, b1: 3 }); // 1 2/3
  assert.equal(x.g, 75);
  assert.equal(formatFactors(factorize(x.g)), '3 · 5²');
});

test('proper fraction: 12/18 = 2/3, no whole-number part', () => {
  const x = run(12, 18);
  assert.deepEqual(x, { g: 6, a1: 2, b1: 3, n: 0, r: 12, r1: 2 });
  assert.equal(summary(12, 18, x), '12/18 in lowest terms is 2/3; it is less than 1, so there is no whole-number part.');
});

test('exact division: 96/12 = 8', () => {
  const x = run(96, 12);
  assert.deepEqual({ a1: x.a1, b1: x.b1, n: x.n, r: x.r }, { a1: 8, b1: 1, n: 8, r: 0 });
  assert.equal(summary(96, 12, x), '96/12 = 8, a whole number.');
});

test('already in lowest terms: 22/7 = 3 1/7', () => {
  const x = run(22, 7);
  assert.deepEqual(x, { g: 1, a1: 22, b1: 7, n: 3, r: 1, r1: 1 });
  assert.equal(summary(22, 7, x), '22/7 is already in lowest terms, or 3 1/7 as a mixed number.');
});

test('beyond the Zoho limit: 11th power, 2048/4096 = 1/2', () => {
  assert.deepEqual(run(2 ** 11, 2 ** 12), { g: 2048, a1: 1, b1: 2, n: 0, r: 2048, r1: 1 });
});

test('beyond the Zoho limit: 501st prime 3581, 7162/10743 = 2/3', () => {
  assert.deepEqual(factorize(3581), [[3581, 1]]);
  assert.deepEqual(run(2 * 3581, 3 * 3581), { g: 3581, a1: 2, b1: 3, n: 0, r: 7162, r1: 2 });
});

test('large numbers up to 10¹²', () => {
  // 999 999 999 989 is the largest prime below 10¹²
  assert.deepEqual(run(999_999_999_989, 3), { g: 1, a1: 999_999_999_989, b1: 3, n: 333_333_333_329, r: 2, r1: 2 });
  assert.deepEqual(run(1e12, 999_999_999_989), { g: 1, a1: 1e12, b1: 999_999_999_989, n: 1, r: 11, r1: 11 });
});

test('gcd and factorize', () => {
  assert.equal(gcd(375, 225), 75);
  assert.equal(gcd(17, 5), 1);
  assert.equal(formatFactors(factorize(375)), '3 · 5³');
  assert.equal(formatFactors(factorize(225)), '3² · 5²');
  assert.equal(formatFactors(factorize(1)), '1');
  assert.equal(factorsHtml(factorize(375)), '3 · 5<sup>3</sup>');
  assert.equal(gcdHtml(75), '75 = 3 · 5<sup>2</sup>');
  assert.equal(gcdHtml(3581), '3581');
  assert.equal(gcdHtml(1), '1');
  assert.equal(formatFactors(factorize(1024)), '2¹⁰');
  assert.equal(formatFactors(factorize(999_999_999_989)), '999999999989');
  assert.equal(formatFactors(factorize(1e12)), '2¹² · 5¹²');
  // product of the factors gives the number back
  for (const n of [2, 97, 360, 3571 * 3581, 600851475143]) {
    assert.equal(factorize(n).reduce((p, [q, e]) => p * q ** e, 1), n);
  }
});

test('input: whole numbers from 1 to 10¹² only', () => {
  assert.equal(parseWhole(' 1 000 '), 1000);
  assert.equal(parseWhole('375'), 375);
  for (const bad of ['', '2,5', '2.5', '1,000', '-3', '+3', '1e3', 'abc']) assert.ok(Number.isNaN(parseWhole(bad)), bad);
  assert.ok(!valid(0));
  assert.ok(valid(MAX) && !valid(MAX + 1));
  assert.equal(simplify(0, 5), null);
  assert.equal(simplify(5, 0), null);
  assert.equal(simplify(NaN, 5), null);
});
