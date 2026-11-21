// Acceptance tests for the native Properties tool (ROADMAP Phase 7).
//
// 1. The Zoho sheet's default (Methane, reference temperature −170 °C, read 2026-11-21), computed with the sheet's
//    own 1977 coefficients through the same equations: every number on the sheet is reproduced.
// 2. The newer correlations against values computed independently with the chemicals library (tests/properties.ref.ts).
// 3. Data integrity: names, CAS numbers, sources, critical compressibility.
// 4. Errors of the sheet that are fixed (ORIGINAL-ERRORS PROP-*), and published reference values.
// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPOUNDS, search, byName, evaluate, atT, harlacher, showMolar, energy, heatCap, temperature, pressure,
  SOURCE_LABEL, R, type Corr,
} from '../src/lib/calc/properties.ts';
import { toSI, fromSI } from '../src/lib/calc/units.ts';
import { sources } from '../src/data/sources.ts';
import { REF } from './properties.ref.ts';

const close = (got: number, want: number, rel: number, what = '') =>
  assert.ok(Math.abs(got - want) <= rel * Math.abs(want), `${what}: got ${got}, want ${want}`);
const unit = <T extends { label: string }>(list: T[], l: string) => list.find((u) => u.label === l)!;
const C = (k: string) => toSI(unit(temperature, '°C'), Number(k));

test('Zoho default: Methane at −170 °C with the 1977 coefficients of the sheet', () => {
  // sheet row 62 (Methane): MW 16.043, Tf 90.7, Tb 111.7, Tc 190.6, Pc 45.4 atm, Vc 99 cm³/mol, Zc 0.288, ω 0.008,
  // ρL 0.425 g/cm³ at 111.7 K, Cp A–D, VISB/VISC, ΔHf −17.89, ΔGf −12.15 kcal/mol, Antoine, ΔHv 1955 cal/mol
  const MW = 16.043, T = C('-170');
  close(T, 103.15, 1e-12, 'T');
  const tc = (K: number) => fromSI(unit(temperature, '°C'), K);
  close(tc(90.7), -182.45, 1e-12, 'freeze point °C');
  close(tc(111.7), -161.45, 1e-12, 'boiling point °C');
  close(tc(190.6), -82.55, 1e-12, 'critical temperature °C');
  close(fromSI(unit(pressure, 'atm (A)'), 45.4 * 101325), 45.4, 1e-12, 'critical pressure atm');
  // energies: 1977 data in thermochemical calories (4.184 J), shown per kg as on the sheet
  const perKg = (calPerMol: number) => showMolar(unit(energy, 'kJ/kg'), calPerMol * 4.184, MW);
  close(perKg(1955), 509.862245215983, 1e-12, 'heat of vaporization kJ/kg');
  close(perKg(-17890), -4665.69594215546, 1e-12, 'heat of formation kJ/kg');
  close(perKg(-12150), -3168.70909430904, 1e-12, 'Gibbs energy of formation kJ/kg');
  // vapour heat capacity: sheet 0.0059096811142101 kcal/(mol·K) (thermochemical) = 24.7261 J/(mol·K)
  const cp = evaluate({ f: 'rps', a: [4.598, 0.01245, 2.86e-6, -2.703e-9], s: 'rps77' }, T, 'cp');
  close(cp, 0.0059096811142101 * 4184, 1e-12, 'Cp');
  // liquid viscosity 0.133335761607237 cP
  close(evaluate({ f: 'rps', a: [114.14, 57.6], s: 'rps77' }, T, 'mu') * 1e3, 0.133335761607237, 1e-12, 'viscosity cP');
  // Antoine: sheet 0.466500259368433 atm; it raised 2.71828 instead of e to the power (1e-5 relative here)
  const ps = evaluate({ f: 'rps', a: [15.2243, 897.84, -7.16], s: 'rps77' }, T, 'ps');
  close(ps / 101325, 0.466500259368433, 2e-5, 'Antoine atm');
  // the native tool shows newer data for methane; the 1977 Cp polynomial was far outside its range at 103 K
  const m = atT(byName('Methane')!, T);
  assert.equal(m.cp!.src, 'poling');
  close(m.cp!.v, 33.19, 0.005, 'Poling Cp at 103 K');
  assert.equal(m.cp!.warn, undefined);
  close(m.ps!.v / 101325, 0.4664, 0.01, 'Wagner vapour pressure ≈ the sheet\'s Antoine');
});

test('newer correlations match the chemicals library (independent implementation)', () => {
  assert.ok(REF.length > 50);
  for (const r of REF) {
    const c = byName(r.n)!;
    assert.ok(c, r.n);
    for (const w of ['cp', 'ps', 'mu', 'rho'] as const) {
      if (r[w] === undefined) continue;
      close(evaluate(c.k![w]!, r.T, w), r[w]!, 1e-9, `${r.n} ${w} at ${r.T} K`);
    }
  }
});

test('data integrity: names, CAS, sources, Zc', () => {
  assert.equal(COMPOUNDS.length, 469);
  const names = new Set<string>(), cas = new Set<string>();
  const ids = new Set(sources.filter((s) => s.use.properties).map((s) => s.id));
  for (const c of COMPOUNDS) {
    assert.ok(!names.has(c.n.toLowerCase()), `duplicate name ${c.n}`); names.add(c.n.toLowerCase());
    if (c.cas) { assert.match(c.cas, /^\d{2,7}-\d\d-\d$/); assert.ok(!cas.has(c.cas), `duplicate CAS ${c.cas}`); cas.add(c.cas); }
    assert.ok(c.c.MW && c.c.MW[0] > 2, `${c.n}: molar mass`);
    const used = [...Object.values(c.c).map((v) => v![1]), ...Object.values(c.k ?? {}).map((k) => k!.s)];
    for (const s of used) {
      assert.ok(SOURCE_LABEL[s], `${c.n}: unknown source ${s}`);
      for (const id of s === 'calc' ? [] : s.startsWith('calc-s0:') ? [s.slice(8), 'codata-kv'] : [s]) {
        assert.ok(ids.has(id), `${c.n}: source ${id} is not in the sources register for this tool`);
      }
    }
    const { Tc, Pc, Vc, Zc } = c.c;
    if (Zc?.[1] === 'calc') close(Zc[0], Pc![0] * Vc![0] / (R * Tc![0]), 1e-6, `${c.n} Zc`);
    if (c.c.Tb && c.c.Tc) assert.ok(c.c.Tb[0] < c.c.Tc[0], `${c.n}: Tb < Tc`);
    if (c.c.Tf && c.c.Tc) assert.ok(c.c.Tf[0] < c.c.Tc[0], `${c.n}: Tf < Tc`);
  }
  // every 1977 vapour-pressure equation still in use gives about 1 atm at the boiling point (others were dropped)
  for (const c of COMPOUNDS) {
    const Tb = c.c.Tb?.[0];
    for (const w of ['ps', 'har'] as const) {
      const k = c.k?.[w];
      if (!k || k.s !== 'rps77' || !Tb) continue;
      const p = evaluate(k, Tb, w);
      assert.ok(Math.abs(p / 101325 - 1) < 0.1, `${c.n} ${w} at Tb: ${p / 101325} atm`);
    }
  }
});

test('sheet errors fixed (PROP-*)', () => {
  const v = (n: string, k: keyof typeof COMPOUNDS[0]['c']) => byName(n)!.c[k]![0];
  close(v('Carbon Monoxide', 'Tc'), 132.86, 0.001, 'CO critical temperature (sheet 32.9 K)');
  close(v('Carbon Dioxide', 'dHf'), -393474, 0.001, 'CO2 heat of formation (sheet +94.03 kcal/mol)');
  close(v('2,2,4 Trimethylpentane', 'dHf'), -223700, 0.01, 'isooctane heat of formation (sheet −5357 kcal/mol)');
  close(v('Trichlorofluoromethane', 'MW'), 137.37, 0.001, 'CFC-11 molar mass (sheet 37.368)');
  close(v('Nitrosyl Chloride', 'Tb'), 267.65, 0.001, 'NOCl boiling point (sheet 2667.7 K)');
  close(v('Diphenylmethane', 'Tb'), 537.4, 0.002, 'diphenylmethane (row shifted on the sheet)');
  // duplicate / wrong names on the sheet, identified by their data
  for (const [name, aka] of [['Tetrafluoroethylene', 'Perfluoroethane'], ['Dimethylamine', 'Diethyl Amine'], ['n-Dodecane', 'N-Dodecene'],
    ['n-Undecane', 'N-Undecene'], ['Decanenitrile (caprinitrile)', 'Caprylonitrile'], ['2,2,3,3-Tetramethylhexane', '2,2,3,3-Tetramethylheptane']]) {
    assert.equal(byName(name)?.aka, aka, name);
  }
  // rows 436–452: heat capacity split into mantissa and exponent cells, later columns shifted; re-aligned
  const trid = atT(byName('N-Tridecane')!, 298.15);
  close(trid.cp!.v, 301.9, 0.01, 'tridecane Cp at 25 °C (sheet gave −1.8·10⁸)');
  const ant = byName('Anthracene')!.k!.ps!;
  close(evaluate(ant, 615, 'ps') / 101325, 1, 0.05, 'anthracene vapour pressure at its boiling point');
  // sign errors in 1977 Gibbs energies (still the source used)
  assert.ok(v('Chlorodifluoromethane', 'dGf') < 0 && v('Dichloromonofluoromethane', 'dGf') < 0);
  // °F: the sheet divided by 1.8 instead of multiplying (100 K showed as −403.1 °F instead of −279.67 °F)
  close(fromSI(unit(temperature, '°F'), 100), -279.67, 1e-12, '100 K in °F');
  close(fromSI(unit(temperature, '°R'), 100), 180, 1e-12, '100 K in °R');
  // missing data: no value instead of 0 (sheet showed 0 °C... i.e. −273.15 °C, 0 kcal, 1 cP)
  const bt = byName('Boron Trichloride')!;
  assert.equal(bt.k?.mu, undefined);
});

test('published reference values', () => {
  const w = byName('Water')!;
  close(w.c.Tc![0], 647.096, 1e-6, 'water Tc (IAPWS)');
  close(w.c.Pc![0], 22.064e6, 1e-6, 'water pc (IAPWS)');
  close(atT(w, 373.124).ps!.v, 101325, 0.005, 'water boils at 99.974 °C (Poling Antoine, ±0.4 %)');
  close(atT(w, 298.15).rho!.v, 997.05, 0.003, 'water density 25 °C');
  close(atT(w, 298.15).mu!.v, 0.8900e-3, 0.03, 'water viscosity 25 °C (IAPWS 2008: 0.8900 mPa·s; DIPPR equation +2.5 %)');
  close(atT(byName('Nitrogen')!, 300).cp!.v, 29.12, 0.003, 'N2 ideal-gas Cp 300 K (JANAF 29.125)');
  close(atT(byName('Benzene')!, 353.2).ps!.v, 101325, 0.01, 'benzene boils at 80.1 °C');
  close(byName('Ethanol')!.c.Tb![0], 351.4, 0.002, 'ethanol Tb');
  close(byName('Benzene')!.c.dHf![0], 82900, 0.01, 'benzene ΔHf gas 82.9 kJ/mol');
});

test('units, search, warnings', () => {
  close(showMolar(unit(energy, 'BTU/lbm'), 2.326 * 18.01528, 18.01528), 1, 1e-12, '1 BTU/lbm = 2.326 kJ/kg');
  close(showMolar(unit(energy, 'kcal/kg'), 4.1868 * 18.01528, 18.01528), 1, 1e-12, 'IT kcal');
  close(showMolar(unit(heatCap, 'BTU/lbm/°F'), 4.1868 * 18.01528, 18.01528), 1, 1e-12, '1 BTU/(lbm·°F) = 1 kcal/(kg·°C)');
  close(showMolar(unit(heatCap, 'kcal/mol/K'), 4186.8, 1), 1, 1e-12, 'kcal/mol/K');
  assert.ok(Number.isNaN(showMolar(unit(energy, 'kJ/kg'), 1)), 'per mass needs a molar mass');
  assert.equal(search('methane')[0].n, 'Methane');
  assert.equal(search('CH4')[0].n, 'Methane');
  assert.equal(search('74-82-8')[0].n, 'Methane');
  assert.equal(search('caprylonitrile')[0].n, 'Decanenitrile (caprinitrile)');
  assert.ok(search('chloro').length > 20);
  // above Tc: no vapour pressure or liquid properties
  const m = atT(byName('Methane')!, 200);
  assert.ok(Number.isNaN(m.ps!.v) && m.ps!.warn === 'aboveTc');
  // outside the equation range: value with a warning
  const e = atT(byName('Methane')!, 40);
  assert.equal(e.cp!.warn, 'extrapolated');
  assert.deepEqual(e.cp!.range, [50, 1000]);
  // Harlacher (1977) where its coefficients are consistent: about 1 atm at the boiling point
  const h = byName('Ethylene')!.k!.har as Corr;
  close(harlacher(h.a!, byName('Ethylene')!.c.Tb![0]) / 101325, 1, 0.08, 'ethylene Harlacher at Tb');
});
