// PED category (native PED tool, Phase 7): Directive 2014/68/EU, Article 4(1) limits, Article 13 (fluid groups),
// Article 14 / Annex II (categories and modules), Annex II Tables 1–9. The table boundaries are unchanged from
// 97/23/EC; the original sheet's category formulas were checked against all nine tables (ORIGINAL-ERRORS.md PED-*).
// The demarcation lines are the upper limit of each category (Annex II point 4): every comparison is "≤ limit".
// Units: PS in bar (gauge, as the directive), V in litres, DN dimensionless.

export type Equip = 'vessel' | 'piping' | 'steam' | 'pressAcc' | 'safetyAcc';
export type Phase = 'gas' | 'liquid';
export type Group = 1 | 2;
export type Cat = 'out' | 'SEP' | 'I' | 'II' | 'III' | 'IV';
export const CATS: Cat[] = ['SEP', 'I', 'II', 'III', 'IV'];
const rank = (c: Cat) => (c === 'out' ? -1 : CATS.indexOf(c));
export const higher = (a: Cat, b: Cat) => (rank(a) >= rank(b) ? a : b);

/** Annex II table number for a vessel, piping or steam generator. */
export function tableFor(eq: 'vessel' | 'piping' | 'steam', phase: Phase, group: Group): number {
  if (eq === 'steam') return 5;
  if (eq === 'vessel') return phase === 'gas' ? group : 2 + group;
  return phase === 'gas' ? 5 + group : 7 + group;
}

export const TABLE_TITLE: Record<number, string> = {
  1: 'Vessels, gas or vapour, group 1', 2: 'Vessels, gas or vapour, group 2', 3: 'Vessels, liquid, group 1', 4: 'Vessels, liquid, group 2',
  5: 'Fired or otherwise heated pressure equipment (steam or water above 110 °C)', 6: 'Piping, gas or vapour, group 1',
  7: 'Piping, gas or vapour, group 2', 8: 'Piping, liquid, group 1', 9: 'Piping, liquid, group 2',
};
/** x axis of a table: volume (L) or nominal size */
export const isDN = (table: number) => table >= 6;

/** Category from one Annex II table. x = V (L) for tables 1–5, DN for 6–9; ps in bar (gauge). */
export function categoryOf(table: number, ps: number, x: number): Cat {
  if (!(ps > 0.5)) return 'out';
  const pv = ps * x;
  switch (table) {
    case 1:
      if (pv > 1000 || ps > 1000) return 'IV';
      if (x <= 1) return ps <= 200 ? 'SEP' : 'III';
      return pv <= 25 ? 'SEP' : pv <= 50 ? 'I' : pv <= 200 ? 'II' : 'III';
    case 2:
      if (ps > 3000 || (pv > 3000 && ps > 4)) return 'IV';
      if (x <= 1) return ps <= 1000 ? 'SEP' : 'III';
      return pv <= 50 ? 'SEP' : pv <= 200 ? 'I' : pv <= 1000 ? 'II' : 'III';
    case 3:
      if (ps > 500) return x <= 1 ? 'II' : 'III';
      if (x <= 1 || pv <= 200) return 'SEP';
      return ps <= 10 ? 'I' : 'II';
    case 4:
      if (ps > 1000) return x <= 10 ? 'I' : 'II';
      if (ps <= 10 || pv <= 10000) return 'SEP';
      return ps <= 500 ? 'I' : 'II';
    case 5:
      if (x <= 2) return 'SEP';
      if (ps > 32 || pv > 3000 || x > 1000) return 'IV';
      return pv <= 50 ? 'I' : pv <= 200 ? 'II' : 'III';
    case 6:
      if (x <= 25) return 'SEP';
      if (x > 350 || (x > 100 && pv > 3500)) return 'III';
      if (x <= 100 && pv <= 1000) return 'I';
      return 'II';
    case 7:
      if (x <= 32 || pv <= 1000) return 'SEP';
      if (x > 250 && pv > 5000) return 'III';
      if (x > 100 && pv > 3500) return 'II';
      return 'I';
    case 8:
      if (x <= 25 || pv <= 2000) return 'SEP';
      return ps > 500 ? 'III' : ps > 10 ? 'II' : 'I';
    case 9:
      if (ps <= 10 || x <= 200 || pv <= 5000) return 'SEP';
      return ps > 500 ? 'II' : 'I';
  }
  return 'out';
}

/** The exception that can apply to a table (Annex II), its question and the category it leads to. */
export const EXCEPTION: Record<number, { q: string; applies: (c: Cat) => boolean; to: Cat } | undefined> = {
  1: { q: 'Contains an unstable gas', applies: (c) => c === 'I' || c === 'II', to: 'III' },
  2: { q: 'Portable extinguisher or bottle for breathing equipment', applies: (c) => c === 'SEP' || c === 'I' || c === 'II', to: 'III' },
  5: { q: 'Pressure cooker', applies: () => false, to: 'III' },   // design to a category III module; category unchanged
  6: { q: 'Intended for an unstable gas', applies: (c) => c === 'I' || c === 'II', to: 'III' },
  7: { q: 'Fluid temperature above 350 °C', applies: (c) => c === 'II', to: 'III' },
};

export interface PedResult {
  cat: Cat;
  /** tables used (two for a pressure accessory with both V and DN) and the category from each */
  tables: { table: number; cat: Cat; x: number }[];
  /** category before an exception */
  base: Cat;
  exceptionApplied: boolean;
}

export interface PedInput {
  equip: Equip; phase: Phase; group: Group;
  ps: number;
  /** volume, L (vessels, steam generators, pressure accessories) */
  v: number;
  /** nominal size (piping, pressure accessories) */
  dn: number;
  /** answer to the table's exception question */
  exception: boolean;
}

export function classify(x: PedInput): PedResult {
  if (x.equip === 'safetyAcc') return { cat: 'IV', tables: [], base: 'IV', exceptionApplied: false };
  const tables: PedResult['tables'] = [];
  const add = (eq: 'vessel' | 'piping' | 'steam', val: number) => {
    const t = tableFor(eq, x.phase, x.group);
    let c = categoryOf(t, x.ps, val);
    tables.push({ table: t, cat: c, x: val });
    return c;
  };
  let base: Cat = 'out';
  if (x.equip === 'vessel') base = add('vessel', x.v);
  else if (x.equip === 'piping') base = add('piping', x.dn);
  else if (x.equip === 'steam') base = add('steam', x.v);
  else {
    // pressure accessory: vessel table on V, piping table on DN, the higher category (Annex II point 3)
    if (Number.isFinite(x.v)) base = higher(base, add('vessel', x.v));
    if (Number.isFinite(x.dn)) base = higher(base, add('piping', x.dn));
  }
  let cat = base, exceptionApplied = false;
  const t = tables.length === 1 ? tables[0].table : NaN;
  const ex = EXCEPTION[t];
  if (x.exception && ex && ex.applies(base)) { cat = ex.to; exceptionApplied = true; }
  return { cat, tables, base, exceptionApplied };
}

export interface Module { id: string; name: string; nb: string }
/** Annex III module titles (2014/68/EU) and the notified body's part, in plain words. */
export const MODULES: Record<string, Module> = {
  A: { id: 'A', name: 'Internal production control', nb: 'None: the manufacturer self-certifies.' },
  A2: { id: 'A2', name: 'Internal production control plus supervised pressure equipment checks at random intervals', nb: 'Monitors the final assessment by unexpected visits.' },
  D1: { id: 'D1', name: 'Quality assurance of the production process', nb: 'Approves and surveys the production quality system.' },
  E1: { id: 'E1', name: 'Quality assurance of final pressure equipment inspection and testing', nb: 'Approves and surveys the inspection and testing quality system.' },
  'Bd+D': { id: 'B (design type) + D', name: 'EU-type examination of the design, then quality assurance of the production process', nb: 'Examines the design; approves and surveys the production quality system.' },
  'Bd+F': { id: 'B (design type) + F', name: 'EU-type examination of the design, then pressure equipment verification', nb: 'Examines the design; verifies every item.' },
  'Bp+E': { id: 'B (production type) + E', name: 'EU-type examination of a specimen, then pressure equipment quality assurance', nb: 'Examines a specimen; approves and surveys the inspection and testing quality system.' },
  'Bp+C2': { id: 'B (production type) + C2', name: 'EU-type examination of a specimen, then internal production control with supervised checks at random intervals', nb: 'Examines a specimen; checks items at random intervals.' },
  H: { id: 'H', name: 'Full quality assurance', nb: 'Approves and surveys the full quality system (design, manufacture, inspection).' },
  'Bp+D': { id: 'B (production type) + D', name: 'EU-type examination of a specimen, then quality assurance of the production process', nb: 'Examines a specimen; approves and surveys the production quality system.' },
  'Bp+F': { id: 'B (production type) + F', name: 'EU-type examination of a specimen, then pressure equipment verification', nb: 'Examines a specimen; verifies every item.' },
  G: { id: 'G', name: 'Unit verification', nb: 'Examines the design and inspects and tests each unit.' },
  H1: { id: 'H1', name: 'Full quality assurance plus design examination', nb: 'Approves the quality system, examines the design and monitors the final assessment.' },
};
/** Article 14(2) / Annex II point 1 */
export const MODULES_FOR: Record<Exclude<Cat, 'out' | 'SEP'>, string[]> = {
  I: ['A'],
  II: ['A2', 'D1', 'E1'],
  III: ['Bd+D', 'Bd+F', 'Bp+E', 'Bp+C2', 'H'],
  IV: ['Bp+D', 'Bp+F', 'G', 'H1'],
};

/** Standard nominal sizes with their NPS (the original sheet's list, ISO 6708 / ASME B36.10M equivalents). */
export const DN_NPS: [number, string][] = [
  [6, '1/8'], [8, '1/4'], [10, '3/8'], [15, '1/2'], [20, '3/4'], [25, '1'], [32, '1 1/4'], [40, '1 1/2'], [50, '2'], [65, '2 1/2'],
  [80, '3'], [90, '3 1/2'], [100, '4'], [125, '5'], [150, '6'], [200, '8'], [250, '10'], [300, '12'], [350, '14'], [400, '16'],
  [450, '18'], [500, '20'], [550, '22'], [600, '24'], [650, '26'], [700, '28'], [750, '30'], [800, '32'], [850, '34'], [900, '36'],
  [950, '38'], [1000, '40'], [1050, '42'], [1100, '44'], [1150, '46'], [1200, '48'], [1400, '56'], [1500, '60'], [1600, '64'],
  [1800, '72'], [2000, '80'],
];

/** Boundary lines of each Annex II table as drawn in the directive: [x1, y1, x2, y2] in (V or DN, PS bar). */
export const LINES: Record<number, [number, number, number, number][]> = {
  1: [[1, 25, 1, 200], [0.1, 200, 1, 200], [0.1, 1000, 1, 1000], [1, 25, 50, 0.5], [1, 50, 100, 0.5], [1, 200, 400, 0.5], [1, 1000, 2000, 0.5]],
  2: [[1, 50, 1, 1000], [0.1, 1000, 1, 1000], [0.1, 3000, 1, 3000], [1, 50, 100, 0.5], [1, 200, 400, 0.5], [1, 1000, 2000, 0.5], [1, 3000, 750, 4], [750, 4, 1e5, 4]],
  3: [[1, 200, 1, 1e4], [0.1, 500, 1e5, 500], [1, 200, 400, 0.5], [20, 10, 1e5, 10]],
  4: [[10, 1000, 10, 1e4], [0.1, 1000, 10, 1000], [10, 1000, 1000, 10], [20, 500, 1e5, 500], [1000, 10, 1e5, 10]],
  5: [[2, 0.5, 2, 1e4], [2, 32, 93.75, 32], [2, 25, 100, 0.5], [6.25, 32, 400, 0.5], [93.75, 32, 1000, 3], [1000, 3, 1000, 0.5]],
  6: [[25, 0.5, 25, 1e4], [25, 40, 100, 10], [100, 10, 100, 0.5], [100, 35, 100, 1e4], [100, 35, 350, 10], [350, 10, 350, 0.5]],
  7: [[32, 31.25, 32, 1e4], [32, 31.25, 2000, 0.5], [100, 35, 100, 1e4], [100, 35, 7000, 0.5], [250, 20, 250, 1e4], [250, 20, 1e4, 0.5]],
  8: [[25, 80, 25, 1e4], [25, 80, 4000, 0.5], [25, 500, 1e5, 500], [200, 10, 1e5, 10]],
  9: [[200, 25, 200, 1e4], [200, 25, 500, 10], [500, 10, 1e5, 10], [200, 500, 1e5, 500]],
};
