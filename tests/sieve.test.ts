// Acceptance tests for the native Sieve table (ROADMAP Phase 7).
// The Zoho sheet is a reference table (no inputs), so the tests check the data against the published tables
// it was rebuilt from, and the particle-size lookup. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIEVES, lookup, lengthUnit } from '../src/lib/calc/sieve.ts';

const by = (us: string) => SIEVES.find((s) => s.us === us)!;

test('41 sieves, 1 in to No. 400, openings strictly decreasing', () => {
  assert.equal(SIEVES.length, 41);
  assert.equal(SIEVES[0].us, '1 in');
  assert.equal(SIEVES[40].us, 'No. 400');
  for (let i = 1; i < SIEVES.length; i++) {
    assert.ok(SIEVES[i].mm < SIEVES[i - 1].mm, `${SIEVES[i].us} current`);
    assert.ok(SIEVES[i].old < SIEVES[i - 1].old, `${SIEVES[i].us} old`);
  }
});

test('current ASTM E11 / ISO openings (spot checks)', () => {
  const want: [string, number][] = [['1 in', 25.0], ['0.530 in', 13.2], ['No. 3½', 5.6], ['No. 4', 4.75], ['No. 10', 2.0],
    ['No. 20', 0.85], ['No. 40', 0.425], ['No. 100', 0.15], ['No. 140', 0.106], ['No. 200', 0.075], ['No. 400', 0.038]];
  for (const [us, mm] of want) assert.equal(by(us).mm, mm, us);
  // each current opening is within 3 % of the old one (the harmonisation changed them slightly)
  for (const s of SIEVES) assert.ok(Math.abs(s.mm * 1000 / s.old - 1) < 0.03, s.us);
});

test('old openings and Tyler equivalents (Kuo & Acharya 2012, Table D.1)', () => {
  const t: [string, string, number][] = [['5/16 in', '2½', 8000], ['0.265 in', '3', 6730], ['No. 3½', '3½', 5660],
    ['No. 8', '8', 2380], ['No. 10', '9', 2000], ['No. 12', '10', 1680], ['No. 20', '20', 841], ['No. 25', '24', 707],
    ['No. 40', '35', 420], ['No. 45', '42', 354], ['No. 70', '65', 210], ['No. 120', '115', 125], ['No. 140', '150', 105],
    ['No. 230', '250', 63], ['No. 325', '325', 44], ['No. 400', '400', 37]];
  for (const [us, tyler, old] of t) {
    assert.equal(by(us).tyler, tyler, `${us} Tyler`);
    assert.equal(by(us).old, old, `${us} old`);
  }
  assert.equal(by('1/4 in').tyler, undefined, 'no Tyler number for 1/4 in');
  assert.equal(SIEVES.filter((s) => s.tyler).length, 32);
});

test('sheet error SV-1: the No. 3½ row', () => {
  const s = by('No. 3½');
  assert.equal(s.mm, 5.6);
  assert.ok(SIEVES.filter((x) => x.us === '1/2 in').length === 1, 'only one 1/2 in sieve');
});

test('lookup: where a particle stays in a full stack', () => {
  assert.deepEqual(lookup(0.5), { retained: SIEVES.indexOf(by('No. 35')), passes: SIEVES.indexOf(by('No. 30')) }, '0.5 mm: on the 500 µm sieve');
  assert.deepEqual(lookup(0.55), { retained: SIEVES.indexOf(by('No. 35')), passes: SIEVES.indexOf(by('No. 30')) });
  assert.deepEqual(lookup(0.03), { passes: 40 }, '30 µm passes No. 400 into the pan');
  assert.deepEqual(lookup(30), { retained: 0, passes: undefined }, '30 mm stays on the 1 in sieve');
  assert.deepEqual(lookup(1 * lengthUnit('in').f), { retained: 0, passes: undefined }, '1 in = 25.4 mm > 25.0 mm');
  assert.deepEqual(lookup(0.84, true), { retained: SIEVES.indexOf(by('No. 25')), passes: SIEVES.indexOf(by('No. 20')) }, 'old series: 0.84 mm passes 841 µm');
  assert.deepEqual(lookup(0.84), { retained: SIEVES.indexOf(by('No. 25')), passes: SIEVES.indexOf(by('No. 20')) });
});
