// Prime Numbers: simplifies a fraction a/b by its common prime factors and splits off the whole-number part.
// Native rebuild of the Zoho sheet (Phase 7). The Zoho sheet divided by the first 500 primes up to the
// 10th power; here the greatest common divisor comes from Euclid's algorithm, so there is no such limit.
// tests/primes.test.ts checks the results against the values the Zoho sheet shows.

/** Largest input accepted. Factorising up to 10¹² by trial division takes at most ~10⁶ steps (instant). */
export const MAX = 1e12;

/** Zoho sheet defaults: 375/225. */
export const DEFAULTS = { a: 375, b: 225 } as const;

export function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

/** Prime factorisation as [prime, exponent] pairs, smallest prime first. factorize(1) = []. */
export function factorize(n: number): [number, number][] {
  const out: [number, number][] = [];
  const take = (p: number) => {
    let e = 0;
    while (n % p === 0) { n /= p; e++; }
    if (e) out.push([p, e]);
  };
  take(2);
  take(3);
  for (let p = 5; p * p <= n; p += 6) { take(p); take(p + 2); }
  if (n > 1) out.push([n, 1]);
  return out;
}

const SUP: Record<string, string> = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

/** "3 · 5³"; 1 has no prime factors and is shown as "1". */
export function formatFactors(f: [number, number][]): string {
  if (f.length === 0) return '1';
  return f.map(([p, e]) => (e === 1 ? String(p) : p + String(e).replace(/\d/g, (d) => SUP[d]))).join(' · ');
}

/** Same as HTML for display, with real superscripts: "3 · 5<sup>3</sup>". */
export function factorsHtml(f: [number, number][]): string {
  if (f.length === 0) return '1';
  return f.map(([p, e]) => (e === 1 ? String(p) : `${p}<sup>${e}</sup>`)).join(' · ');
}

/** The greatest common divisor with its prime factors, "75 = 3 · 5<sup>2</sup>"; just "7" when it is 1 or a prime. */
export function gcdHtml(g: number): string {
  const f = factorize(g);
  return f.length === 0 || (f.length === 1 && f[0][1] === 1) ? String(g) : `${g} = ${factorsHtml(f)}`;
}

/** Parses a whole number typed by a visitor: digits only, spaces allowed as thousands separators.
 *  Returns NaN for anything else (decimals, signs, letters), 0 included so the caller can reject it. */
export function parseWhole(text: string): number {
  const t = text.trim().replace(/[\s  ]+/g, '');
  return /^\d+$/.test(t) ? Number(t) : NaN;
}

export const valid = (x: number) => Number.isInteger(x) && x >= 1 && x <= MAX;

export interface Result {
  g: number;   // greatest common divisor
  a1: number;  // a/g
  b1: number;  // b/g
  n: number;   // whole-number part ⌊a/b⌋
  r: number;   // remainder a − n·b
  r1: number;  // r/g (gcd(r, b) = gcd(a, b), so the same g simplifies the remainder)
}

/** null when an input is missing or invalid. */
export function simplify(a: number, b: number): Result | null {
  if (!valid(a) || !valid(b)) return null;
  const g = gcd(a, b);
  const n = Math.floor(a / b);
  const r = a - n * b;
  return { g, a1: a / g, b1: b / g, n, r, r1: r / g };
}

/** One plain sentence with the answer, covering the special cases. */
export function summary(a: number, b: number, x: Result): string {
  const low = `${x.a1}/${x.b1}`;
  if (x.r === 0) return `${a}/${b} = ${x.n}, a whole number.`;
  const lowest = x.g === 1 ? `${a}/${b} is already in lowest terms` : `${a}/${b} in lowest terms is ${low}`;
  if (x.n === 0) return `${lowest}; it is less than 1, so there is no whole-number part.`;
  return `${lowest}, or ${x.n} ${x.r1}/${x.b1} as a mixed number.`;
}
