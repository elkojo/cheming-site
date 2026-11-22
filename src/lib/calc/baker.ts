// Baker (1954) flow-pattern map for horizontal gas–liquid flow (Perry's Handbook, 7th ed., Fig. 6-25, p. 6-26).
// x = (G_L/G_G)·λ·ψ, y = G_G/λ in lb/(ft²·s); λ = [(ρ_G/1.20)(ρ_L/1000)]^½, ψ = (0.073/σ)·[(μ_L/0.001)(1000/ρ_L)²]^⅓
// with Perry's reference values (eq. 6-129, 6-130; water 1000 kg/m³, air 1.20 kg/m³, 0.001 Pa·s, 0.073 N/m: Baker's
// 0.075 lb/ft³ and 73 dyn/cm). The sheet used Thome's rounded 1.23 kg/m³ and 0.072 N/m (2P-3, about 1 % per axis).
// Boundary points: the sheet's "Graph Data" (W3:AA38); checked by overlay on Perry's Fig. 6-25 and on Baker's chart in
// E. G. Keshock, "Experimental and analytical investigation of 0-g condensation in a mechanical refrigeration system
// application", Old Dominion University TR 75-T6 for NASA (1975, NTRS 19750022396), Fig. 8 (y in lb/(h·ft²) =
// 3600 × lb/(ft²·s)): they coincide.

export type Pattern = 'dispersed' | 'annular' | 'wavy' | 'stratified' | 'slug' | 'plug' | 'bubble';
export const PATTERNS: [Pattern, string, string][] = [
  ['bubble', 'Bubble or froth', 'Gas bubbles dispersed in the liquid, gathering near the top of the pipe.'],
  ['plug', 'Plug', 'Elongated gas plugs moving along the top of the pipe.'],
  ['stratified', 'Stratified', 'Liquid along the bottom, gas above, smooth interface.'],
  ['wavy', 'Wavy', 'Stratified flow with waves on the interface.'],
  ['slug', 'Slug', 'Waves grow to fill the pipe: frothy liquid slugs travel at high speed.'],
  ['annular', 'Annular', 'Liquid film around the wall (thicker at the bottom), gas core.'],
  ['dispersed', 'Dispersed (spray, mist)', 'Liquid entrained as droplets in the gas.'],
];

type Pts = [number, number][];
export const BOUNDARIES: Record<string, Pts> = {
  // wavy/stratified/plug below, annular/slug above
  diagonal: [[0.1, 23], [1, 4.9], [10, 1.06], [100, 0.237], [1000, 0.047], [1955, 0.0292]],
  wavyStratified: [[0.1, 2], [0.8, 1.95], [1.5, 1.78], [3, 1.49], [7, 1.11], [23, 0.62]],
  // bubble/froth to the right (listed top to bottom)
  bubble: [[173, 27.3], [131, 17], [125, 11], [130, 7], [155, 4], [200, 2.55], [1000, 0.53], [10000, 0.056]],
  dispersedAnnular: [[0.82, 27], [1.15, 20], [2, 14.2], [3, 12], [5, 9.8], [10, 8.8], [30, 7.95], [80, 7.65], [130, 7.55]],
  annularSlug: [[2.9, 2.4], [6, 1.75], [10, 1.46], [15, 1.3], [20, 1.22], [25, 1.2], [35, 1.27], [45, 1.4], [60, 1.65], [80, 2.1], [110, 3.2], [142, 5.2]],
  slugPlug: [[92, 0.25], [4880, 0.113]],
};
/** Map frame, lb/(ft²·s) and dimensionless. */
export const FRAME = { x: [0.1, 1e4], y: [0.01, 100] } as const;

/** log–log interpolation of y(x) along a polyline sorted by x; extrapolates the end segments. */
function yAt(p: Pts, x: number): number {
  const lx = Math.log(x);
  let i = 0;
  while (i < p.length - 2 && x > p[i + 1][0]) i++;
  const [x0, y0] = p[i], [x1, y1] = p[i + 1];
  const t = (lx - Math.log(x0)) / (Math.log(x1) - Math.log(x0));
  return Math.exp(Math.log(y0) + t * (Math.log(y1) - Math.log(y0)));
}
/** x on the bubble boundary at height y (the curve is monotonic in y). */
function xBubble(y: number): number {
  const p = BOUNDARIES.bubble;
  const ly = Math.log(y);
  let i = 0;
  while (i < p.length - 2 && y < p[i + 1][1]) i++;
  const [x0, y0] = p[i], [x1, y1] = p[i + 1];
  const t = (ly - Math.log(y0)) / (Math.log(y1) - Math.log(y0));
  return Math.exp(Math.log(x0) + t * (Math.log(x1) - Math.log(x0)));
}

/** Flow pattern at map coordinates (x, y); `outside` when the point lies off the published chart. */
export function classify(x: number, y: number): { pattern: Pattern; outside: boolean } {
  const outside = x < FRAME.x[0] || x > FRAME.x[1] || y < 0.0278 || y > 27.8;
  if (x >= xBubble(y)) return { pattern: 'bubble', outside };
  const B = BOUNDARIES;
  if (x >= 0.82 && y >= yAt(B.dispersedAnnular, Math.min(x, 130))) return { pattern: 'dispersed', outside };
  if (y >= yAt(B.diagonal, x)) {
    if (x <= 2.9 || y >= yAt(B.annularSlug, Math.min(x, 142))) return { pattern: 'annular', outside };
    if (x <= 92 || y >= yAt(B.slugPlug, x)) return { pattern: 'slug', outside };
    return { pattern: 'plug', outside };
  }
  if (x <= 23 && y >= yAt(B.wavyStratified, x)) return { pattern: 'wavy', outside };
  return { pattern: 'stratified', outside };
}

/** Baker's λ and ψ and the map coordinates, SI inputs (kg/s, kg/m³, Pa·s, N/m, m²). */
export function bakerPoint(wl: number, wg: number, rhol: number, rhog: number, mul: number, sigma: number, area: number) {
  const lambda = Math.sqrt((rhog / 1.2) * (rhol / 1000));
  const psi = (0.073 / sigma) * ((mul / 0.001) * (1000 / rhol) ** 2) ** (1 / 3);
  const LBFT2S = 0.45359237 / 0.3048 ** 2;      // kg/(m²·s) per lb/(ft²·s)
  const x = wl / wg * lambda * psi;
  const y = wg / area / LBFT2S / lambda;
  return { lambda, psi, x, y, ...classify(x, y) };
}
