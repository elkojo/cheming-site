// Acceptance tests for the native PED calculator (ROADMAP Phase 7).
// 1. Zoho default (piping, gas, group 2, 40 bar g, DN 80 → Table 7, category I).
// 2. Every table vs the original sheet's own category formulas (H61:L69, first TRUE from the left as its HLOOKUP),
//    ported literally, on random and boundary points — the sheet was checked against the directive's tables.
// 3. Article 4(1) limits (SEP below), demarcation lines = upper limit of the lower category, exceptions, accessories,
//    module lists (Article 14(2)).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, categoryOf, tableFor, MODULES_FOR, MODULES, LINES, type Cat } from '../src/lib/calc/ped.ts';

/** the sheet's formulas, row 61 … 69 (C8 = PS, C14 = V, C15 = PS·V, C18 = DN, C19 = PS·DN) */
function sheet(table: number, ps: number, x: number): Cat {
  if (!(ps > 0.5)) return 'out';
  const v = x, dn = x, pv = ps * x;
  const rows: Record<number, boolean[]> = {
    1: [(ps > 0.5 && pv <= 25) || (v <= 1 && ps <= 200), ps > 0.5 && pv > 25 && pv <= 50 && v > 1, ps > 0.5 && pv > 50 && pv <= 200 && v > 1,
      (ps > 0.5 && pv > 200 && pv <= 1000 && ps <= 1000) || (ps > 200 && ps <= 1000 && pv <= 1000), (ps > 0.5 && pv > 1000) || ps > 1000],
    2: [(ps > 0.5 && pv <= 50) || (v <= 1 && ps <= 1000), ps > 0.5 && pv > 50 && pv <= 200 && v > 1, ps > 0.5 && pv > 200 && pv <= 1000 && v > 1,
      (ps > 0.5 && pv > 1000 && ps <= 4) || (ps > 0.5 && ps <= 1000 && pv > 1000 && pv <= 3000) || (ps > 1000 && ps <= 3000 && pv <= 3000),
      (ps > 4 && pv > 3000) || ps > 3000],
    3: [(ps > 0.5 && pv <= 200 && ps <= 500) || (ps > 0.5 && ps <= 500 && v <= 1), ps > 0.5 && ps <= 10 && pv > 200,
      (ps > 500 && v <= 1) || (ps > 10 && ps <= 500 && pv > 200 && v > 1), ps > 500 && v > 1, false],
    4: [(ps > 0.5 && ps <= 10) || (ps > 10 && ps <= 1000 && pv <= 10000), (ps > 1000 && v <= 10) || (ps > 10 && ps <= 500 && pv > 10000),
      ps > 500 && v > 10 && pv > 10000, false, false],
    5: [ps > 0.5 && v <= 2, ps > 0.5 && v > 2 && pv <= 50, ps > 0.5 && ps <= 32 && pv > 50 && pv <= 200, ps > 0.5 && ps <= 32 && pv > 200 && pv <= 3000 && v <= 1000,
      (ps > 0.5 && v > 1000) || (pv > 3000 && v > 2) || (ps > 32 && v > 2)],
    6: [ps > 0.5 && dn <= 25, ps > 0.5 && dn > 25 && dn <= 100 && pv <= 1000,
      (dn > 100 && dn <= 350 && ps > 0.5 && pv <= 3500) || (pv > 1000 && pv <= 3500 && dn > 25 && dn <= 350) || (dn > 25 && dn <= 100 && pv > 1000),
      (dn > 350 && ps > 0.5) || (pv > 3500 && dn > 100), false],
    7: [(ps > 0.5 && dn <= 32) || (ps > 0.5 && pv <= 1000), (ps > 0.5 && pv > 1000 && pv <= 3500 && dn > 32) || (dn > 32 && dn <= 100 && pv > 1000),
      (ps > 0.5 && pv > 3500 && pv <= 5000 && dn > 100) || (dn > 100 && dn <= 250 && pv > 3500), ps > 0.5 && pv > 5000 && dn > 250, false],
    8: [(ps > 0.5 && pv <= 2000) || (ps > 0.5 && dn <= 25), ps > 0.5 && pv > 2000 && ps <= 10, ps > 10 && pv > 2000 && dn > 25 && ps <= 500, ps > 500 && dn > 25, false],
    9: [(ps > 0.5 && ps <= 10) || (ps > 10 && pv <= 5000) || dn <= 200, ps > 10 && pv > 5000 && dn > 200 && ps <= 500, ps > 500 && dn > 200, false, false],
  };
  const i = rows[table].indexOf(true);
  return i < 0 ? 'out' : (['SEP', 'I', 'II', 'III', 'IV'] as Cat[])[i];
}

test('Zoho default: piping, gas, group 2, 40 bar g, DN 80 → Table 7, category I, module A', () => {
  const r = classify({ equip: 'piping', phase: 'gas', group: 2, ps: 40, v: 7000, dn: 80, exception: false });
  assert.equal(r.tables[0].table, 7);
  assert.equal(r.cat, 'I');
  assert.deepEqual(MODULES_FOR.I, ['A']);
});

test('all nine tables agree with the original sheet (random log-uniform points)', () => {
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let t = 1; t <= 9; t++) {
    for (let i = 0; i < 20000; i++) {
      const ps = 10 ** (-0.5 + rnd() * 4.5), x = 10 ** (-1 + rnd() * 6);
      // PED-6: the sheet's SEP test "PS·V ≤ 25 (50)" also catches V ≤ 1 L above 200 (1 000) bar — category III there
      const sheetWrong = (t === 1 && x <= 1 && ps > 200 && ps * x <= 25) || (t === 2 && x <= 1 && ps > 1000 && ps * x <= 50);
      if (sheetWrong) { assert.equal(categoryOf(t, ps, x), ps > (t === 1 ? 1000 : 3000) ? 'IV' : 'III'); continue; }
      assert.equal(categoryOf(t, ps, x), sheet(t, ps, x), `table ${t}, PS ${ps}, x ${x}`);
    }
  }
});

test('demarcation lines belong to the lower category; points on every drawn line', () => {
  for (let t = 1; t <= 9; t++) {
    for (const [x1, y1, x2, y2] of LINES[t]) {
      for (const f of [0, 0.25, 0.5, 0.75, 1]) {
        // geometric interpolation (lines are straight on log scales)
        const x = x1 * (x2 / x1) ** f, y = y1 * (y2 / y1) ** f;
        if ((t === 1 && x <= 1 && y > 200 && x * y <= 25) || (t === 2 && x <= 1 && y > 1000 && x * y <= 50)) continue;   // PED-6
        assert.equal(categoryOf(t, y, x), sheet(t, y, x), `on line, table ${t} (${x}, ${y})`);
      }
    }
  }
  // exact limits of Article 4(1)
  assert.equal(categoryOf(1, 25, 1), 'SEP'); assert.equal(categoryOf(1, 25.0001, 1.0001), 'I');
  assert.equal(categoryOf(1, 200, 0.5), 'SEP'); assert.equal(categoryOf(1, 200.0001, 0.5), 'III');
  assert.equal(categoryOf(2, 50, 1.0), 'SEP'); assert.equal(categoryOf(3, 500, 0.4), 'SEP'); assert.equal(categoryOf(3, 500.1, 0.4), 'II');
  assert.equal(categoryOf(4, 10, 5000), 'SEP'); assert.equal(categoryOf(4, 11, 1000), 'I');
  assert.equal(categoryOf(5, 100, 2), 'SEP'); assert.equal(categoryOf(5, 1, 2.1), 'I');
  assert.equal(categoryOf(6, 100, 25), 'SEP'); assert.equal(categoryOf(7, 31.25, 32), 'SEP'); assert.equal(categoryOf(7, 31, 33), 'I');
  assert.equal(categoryOf(8, 80, 25), 'SEP'); assert.equal(categoryOf(9, 25, 200), 'SEP'); assert.equal(categoryOf(9, 25.1, 201), 'I');
  assert.equal(categoryOf(1, 0.5, 1e6), 'out', 'PS ≤ 0.5 bar: outside the directive');
  // PED-6: small vessels at high pressure are in scope (Art. 4(1)(a)(i)), the sheet called them SEP
  assert.equal(sheet(1, 205, 0.1), 'SEP'); assert.equal(categoryOf(1, 205, 0.1), 'III');
  assert.equal(sheet(2, 1200, 0.04), 'SEP'); assert.equal(categoryOf(2, 1200, 0.04), 'III');
});

test('tables, exceptions, accessories', () => {
  assert.equal(tableFor('vessel', 'gas', 1), 1); assert.equal(tableFor('vessel', 'liquid', 2), 4);
  assert.equal(tableFor('steam', 'gas', 1), 5); assert.equal(tableFor('piping', 'liquid', 1), 8);
  const base = { phase: 'gas' as const, group: 1 as const, v: 30, dn: NaN, exception: false };
  assert.equal(classify({ ...base, equip: 'vessel', ps: 1.5 }).cat, 'I');
  assert.equal(classify({ ...base, equip: 'vessel', ps: 1.5, exception: true }).cat, 'III', 'unstable gas');
  assert.equal(classify({ ...base, equip: 'vessel', ps: 20, exception: true }).cat, 'III', 'category III stays III');
  const ext = classify({ ...base, group: 2, equip: 'vessel', ps: 10, v: 3, exception: true });
  assert.equal(ext.base, 'SEP'); assert.equal(ext.cat, 'III', 'extinguisher at least III');
  const hot = classify({ equip: 'piping', phase: 'gas', group: 2, ps: 40, v: NaN, dn: 150, exception: true });
  assert.equal(hot.base, 'II'); assert.equal(hot.cat, 'III', '> 350 °C, category II → III');
  assert.equal(classify({ equip: 'piping', phase: 'gas', group: 2, ps: 40, v: NaN, dn: 80, exception: true }).cat, 'I', '> 350 °C only lifts II');
  // pressure accessory: higher of the vessel table on V and the piping table on DN
  const acc = classify({ equip: 'pressAcc', phase: 'liquid', group: 1, ps: 50, v: 2, dn: 100, exception: false });
  assert.deepEqual(acc.tables.map((t) => [t.table, t.cat]), [[3, 'SEP'], [8, 'II']]);
  assert.equal(acc.cat, 'II');
  assert.equal(classify({ equip: 'pressAcc', phase: 'liquid', group: 1, ps: 50, v: 20, dn: NaN, exception: false }).cat, 'II');
  assert.equal(classify({ equip: 'safetyAcc', phase: 'gas', group: 2, ps: 1, v: NaN, dn: NaN, exception: false }).cat, 'IV');
});

test('modules per category (Article 14(2), 2014 names)', () => {
  assert.deepEqual(MODULES_FOR.II.map((m) => MODULES[m].id), ['A2', 'D1', 'E1']);
  assert.deepEqual(MODULES_FOR.III.map((m) => MODULES[m].id), ['B (design type) + D', 'B (design type) + F', 'B (production type) + E', 'B (production type) + C2', 'H']);
  assert.deepEqual(MODULES_FOR.IV.map((m) => MODULES[m].id), ['B (production type) + D', 'B (production type) + F', 'G', 'H1']);
});
