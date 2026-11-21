// Display helpers for the Properties tool, shared by the server render and the browser script of PropertiesCalc.astro.
import {
  atT, CONST_ROWS, SOURCE_LABEL, temperature, pressure, viscosity, density, molarVolume, energy, heatCap, MW_UNITS,
  showMolar, type Compound, type ConstRow, type AtT,
} from './properties.ts';
import { fromSI, formatSig, type Unit } from './units.ts';
import { sources } from '../../data/sources.ts';
import { mathHtml } from './types.ts';

export const fmt = (x: number) => formatSig(x, 6, false);

/** unit lists per kind of row */
export const UNIT_LISTS: Record<string, Unit[]> = {
  T: temperature, p: pressure, Vm: molarVolume, E: energy, one: [{ label: '–', f: 1 }], MW: MW_UNITS,
  D: [{ label: 'debye', f: 1 }], cp: heatCap, mu: viscosity, rho: density,
};

/** temperature-dependent rows: key, label, symbol, unit list, default unit (the sheet's) */
export interface TempRow { key: 'cp' | 'ps' | 'har' | 'mu' | 'rho'; label: string; sym: string; kind: string; def: string }
export const TEMP_ROWS: TempRow[] = [
  { key: 'cp', label: 'Ideal-gas heat capacity', sym: 'c_p°', kind: 'cp', def: 'kcal/mol/K' },
  { key: 'ps', label: 'Vapour pressure', sym: 'p_sat', kind: 'p', def: 'atm (A)' },
  { key: 'har', label: 'Vapour pressure, Harlacher (1977)', sym: 'p_sat', kind: 'p', def: 'atm (A)' },
  { key: 'mu', label: 'Liquid viscosity', sym: 'μ_L', kind: 'mu', def: 'cP' },
  { key: 'rho', label: 'Liquid density', sym: 'ρ_L', kind: 'rho', def: 'kg/m³' },
];
export { CONST_ROWS, type ConstRow };

const unitIn = (kind: string, label: string) => UNIT_LISTS[kind].find((u) => u.label === label) ?? UNIT_LISTS[kind][0];

/** "CH4" → "CH<sub>4</sub>" */
export const formulaHtml = (f?: string) => (f ?? '').replace(/(\d+)/g, '<sub>$1</sub>');

/** short label and full reference of a source id */
export function sourceOf(id: string): { label: string; title: string } {
  const label = SOURCE_LABEL[id] ?? id;
  const ref = (k: string) => { const s = sources.find((x) => x.id === k); return s ? `${s.by}, ${s.title}${s.year ? ` (${s.year})` : ''}` : ''; };
  if (id === 'calc') return { label, title: 'Calculated from the values above: Z_c = p_c·V_c/(R·T_c)' };
  if (id.startsWith('calc-s0:')) return { label, title: `Calculated: Δg_f° = Δh_f° − T·(S° − ΣS° of the elements); S° from ${ref(id.slice(8))}; element entropies from CODATA Key Values` };
  return { label, title: ref(id) };
}

/** note: HTML (equation in maths style, then plain text) */
export interface Out { v: string; src?: { label: string; title: string }; note?: string; warn?: boolean }

/** a constant in the chosen unit */
export function constOut(c: Compound | undefined, row: ConstRow, unit: string): Out {
  const val = c?.c[row.key];
  if (!c) return { v: '' };
  if (!val) return { v: '—', note: 'no data' };
  const [x, src] = val;
  const u = unitIn(row.kind, unit);
  let y: number;
  if (row.kind === 'E') y = showMolar(u, x, c.c.MW?.[0]);
  else if (row.kind === 'T' || row.kind === 'p' || row.kind === 'Vm') y = fromSI(u, x);
  else y = x;
  return { v: fmt(y), src: sourceOf(src) };
}

/** a temperature in the visitor's unit, for notes */
const tIn = (K: number, tUnit: string) => `${fmt(fromSI(unitIn('T', tUnit), K))} ${tUnit}`;

/** a temperature-dependent property at T (K) in the chosen unit, with its equation and any warning as a note */
export function tempOut(c: Compound | undefined, r: AtT | undefined, row: TempRow, unit: string, tUnit: string): Out {
  if (!c) return { v: '' };
  if (!r) return { v: '—', note: 'no data' };
  const u = unitIn(row.kind, unit);
  const y = row.kind === 'cp' ? showMolar(u, r.v, c.c.MW?.[0]) : fromSI(u, r.v);
  const notes: string[] = [];
  if (r.eq) notes.push(mathHtml(r.eq));
  let warn = false;
  if (r.warn === 'aboveTc') { notes.push(`no value above the critical temperature (${tIn(c.c.Tc![0], tUnit)})`); warn = true; }
  if (r.warn === 'noValue') { notes.push('no value at this temperature'); warn = true; }
  if (r.warn === 'extrapolated' && r.range) { notes.push(`extrapolated: equation fitted from ${tIn(r.range[0], tUnit)} to ${tIn(r.range[1], tUnit)}`); warn = true; }
  else if (r.range && !r.warn) notes.push(`valid ${tIn(r.range[0], tUnit)} to ${tIn(r.range[1], tUnit)}`);
  if (row.key === 'cp' && r.src === 'rps77') notes.push('range assumed (not given in the 1977 table)');
  if (r.warn === 'liquidRange') { notes.push('extrapolated: the 1977 equation is meant for the liquid between freezing and boiling point'); warn = true; }
  if (r.T0 !== undefined) notes.push(`one value only, at ${tIn(r.T0, tUnit)}; no temperature equation for this component`);
  return { v: Number.isFinite(y) ? fmt(y) : '—', src: sourceOf(r.src), note: notes.join(' · '), warn };
}

export { atT };
