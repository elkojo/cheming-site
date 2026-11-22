// Pressure Loss: Non-Circular — channel shapes: area, wetted perimeter, hydraulic diameter and the laminar
// friction constant (Darcy f·Re) for fully developed flow. Turbulent flow uses the hydraulic diameter D_h = 4·A/P with
// Colebrook (Perry's Chemical Engineers' Handbook, 7th ed., p. 6-12); laminar flow needs the shape's own f·Re
// (owner's choice 2026-11-22), from Shah & London (1971, Stanford Tech. Rep. 75): rectangle Eq. 148–149 (exact
// series; their Table 13 to 7 digits), equilateral triangle Eq. 155, ellipse Eq. 172, concentric annulus Eq. 187.
// Their values are Fanning (f·Re = 16 for a circle); here Darcy = 4 × Fanning (64 for a circle).
// Note: Table 33 of the 1971 report (ellipse) evaluates E at the modulus instead of the parameter; Eq. 172 itself is
// right (it reduces to the exact flow rate Q = π·a³·b³·Δp/(4·μ·L·(a² + b²))), and is used here.
// Lengths in m.

export type Shape = 'any' | 'rect' | 'annulus' | 'triangle' | 'ellipse';
export const SHAPES: [Shape, string][] = [
  ['any', 'Any shape (area and wetted perimeter)'], ['rect', 'Rectangle'], ['annulus', 'Concentric annulus'],
  ['triangle', 'Equilateral triangle'], ['ellipse', 'Ellipse'],
];

/** Complete elliptic integral of the second kind E(m), parameter m = k² (arithmetic–geometric mean). */
export function ellipE(m: number): number {
  if (m === 1) return 1;
  let a = 1, b = Math.sqrt(1 - m), c2 = m, sum = c2 / 2, p = 0.5;
  for (let i = 0; i < 30 && c2 > 1e-32; i++) {
    const an = (a + b) / 2;
    const cn = (a - b) / 2;
    b = Math.sqrt(a * b); a = an;
    p *= 2; c2 = cn * cn; sum += p * c2;
  }
  return Math.PI / (2 * a) * (1 - sum);
}

/** Darcy f·Re of a rectangle with aspect ratio α = short/long side (exact series). */
export function fReRect(alpha: number): number {
  const a = Math.min(alpha, 1 / alpha);
  if (a === 0) return 96;
  let s = 0;
  for (let n = 1; n < 400; n += 2) {
    const t = Math.tanh(n * Math.PI / (2 * a)) / n ** 5;
    s += t;
    if (t < 1e-18) break;
  }
  return 96 / ((1 + a) ** 2 * (1 - 192 * a / Math.PI ** 5 * s));
}

/** Darcy f·Re of a concentric annulus with r = inner/outer diameter (0 ≤ r < 1). */
export function fReAnnulus(r: number): number {
  if (r === 0) return 64;
  return 64 * (1 - r) ** 2 / (1 + r * r + (1 - r * r) / Math.log(r));
}

/** Darcy f·Re of an ellipse with α = minor/major axis. */
export const fReEllipse = (alpha: number) => {
  const a = Math.min(alpha, 1 / alpha);
  return 8 * Math.PI ** 2 * (1 + a * a) / ellipE(1 - a * a) ** 2;
};
export const FRE_TRIANGLE = 4 * 40 / 3;

export interface Section { area: number; perimeter: number; dh: number; fRe: number }

/** Geometry of a shape: rect (width, height), annulus (outer, inner diameter), triangle (side),
 *  ellipse (major, minor axis), any (area, perimeter, f·Re). Undefined where the dimensions are impossible. */
export function section(shape: Shape, x: number, y = NaN, fRe = 64): Section | undefined {
  let area: number, perimeter: number, k: number;
  switch (shape) {
    case 'rect':
      if (!(x > 0 && y > 0)) return undefined;
      area = x * y; perimeter = 2 * (x + y); k = fReRect(y / x); break;
    case 'annulus':
      if (!(x > 0 && y >= 0 && y < x)) return undefined;
      area = Math.PI * (x * x - y * y) / 4; perimeter = Math.PI * (x + y); k = fReAnnulus(y / x); break;
    case 'triangle':
      if (!(x > 0)) return undefined;
      area = Math.sqrt(3) / 4 * x * x; perimeter = 3 * x; k = FRE_TRIANGLE; break;
    case 'ellipse': {
      if (!(x > 0 && y > 0)) return undefined;
      const A = Math.max(x, y) / 2, B = Math.min(x, y) / 2;
      area = Math.PI * A * B; perimeter = 4 * A * ellipE(1 - (B / A) ** 2); k = fReEllipse(B / A); break;
    }
    default:
      if (!(x > 0 && y > 0 && fRe > 0)) return undefined;
      area = x; perimeter = y; k = fRe;
  }
  return { area, perimeter, dh: 4 * area / perimeter, fRe: k };
}
