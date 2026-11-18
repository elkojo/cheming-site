// Shared shape of a native calculator: groups of yellow inputs and green outputs.
// Pure data + pure functions, so the same definition drives the page and the tests.

export type Values = Record<string, number>;

export interface Input {
  key: string;     // unique inside the group
  label: string;   // e.g. "Diameter"
  sym: string;     // symbol shown in the formula column, e.g. "D"
  unit: string;
  value: number;   // default (the Zoho sheet's default)
}

export interface Output {
  key: string;
  label: string;
  formula: string; // shown as written, e.g. "A = π·r²"
  unit: string;
  calc: (v: Values) => number;
}

export interface Group {
  id: string;
  title: string;
  sketch: string;  // inline SVG markup, viewBox 0 0 120 100
  note?: string;
  inputs: Input[];
  outputs: Output[];
}

/** Runs one group: returns every output, or NaN where an input is missing or invalid. */
export function evaluate(group: Group, values: Values): Values {
  const ok = group.inputs.every((i) => Number.isFinite(values[i.key]) && values[i.key] >= 0);
  const out: Values = {};
  for (const o of group.outputs) out[o.key] = ok ? o.calc(values) : NaN;
  return out;
}

export function defaults(group: Group): Values {
  return Object.fromEntries(group.inputs.map((i) => [i.key, i.value]));
}

/** Parses what a visitor typed: accepts a decimal comma and spaces as thousands separators. */
export function parseNumber(text: string): number {
  const t = text.trim().replace(/\s+/g, '').replace(',', '.');
  if (t === '' || !/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return NaN;
  return Number(t);
}

/** Formats an output like the Zoho sheets: up to 10 significant digits, no trailing zeros. */
export function formatNumber(x: number): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const abs = Math.abs(x);
  if (abs >= 1e12 || abs < 1e-6) return x.toExponential(6).replace(/\.?0+e/, 'e');
  return String(Number(x.toPrecision(10)));
}
