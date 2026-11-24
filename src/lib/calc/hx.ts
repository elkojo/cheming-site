// Heat exchanger (native Heat Exchanger tool, Phase 7). Rebuilt from the cheming.site Zoho sheet "Heat Exchanger
// Design" with the owner's decisions of 2026-11-24 (ORIGINAL-ERRORS.md HE-1…6):
// - hot and cold stream, each sensible (M·cp·ΔT) or phase change at constant temperature (M·λ);
// - sizing: any one of hot flow, hot outlet, cold flow, cold outlet is calculated from the heat balance; then
//   ΔTm = F·LMTD and A = Q/(U·ΔTm), plus a design margin;
// - rating: given U and the installed area, both outlets and the duty by the ε-NTU method;
// - arrangements: counter-current, co-current, shell-and-tube with N shell passes (2, 4 … tube passes per shell),
//   cross-flow (both fluids unmixed, or one mixed). F from the ε-NTU relations (identical to Bowman, Mueller &
//   Nagle 1940 / Perry Fig. 11-4), effectiveness per Lienhard, A Heat Transfer Textbook, Table 3.1; cross-flow with
//   both fluids unmixed by the exact series (Mason 1955), not the textbook approximation.
// All quantities SI: K, kg/s, J/(kg·K), J/kg, W, m², W/(m²·K).

export type Arr = 'counter' | 'co' | 'shell' | 'cross';
export type Mix = 'none' | 'hot' | 'cold';
/** the calculated value in sizing: hot/cold inlet temperature, outlet temperature or flow */
export type Unknown = 'tih' | 'th' | 'mh' | 'tic' | 'tc' | 'mc';

export interface StreamIn {
  /** sensible, or phase change at constant temperature (condensing hot / boiling cold) */
  latent: boolean;
  tin: number; tout: number;
  m: number;
  cp: number;
  /** latent heat, J/kg */
  lam: number;
}

export interface Geometry { arr: Arr; shells: number; mix: Mix }

export interface Stream { tin: number; tout: number; m: number; C: number }

// ── effectiveness ε(NTU, Cr) for each arrangement; Cr = Cmin/Cmax ∈ [0, 1] ──

/** Cross-flow, both fluids unmixed: exact series (Mason 1955; Kays & London). */
export function epsCrossUnmixed(ntu: number, cr: number): number {
  if (cr < 1e-12) return 1 - Math.exp(-ntu);
  const a = ntu, b = cr * ntu;
  // Poisson cumulative sums P(n; x) = e^-x Σ_{m≤n} x^m/m!, built incrementally
  let ta = Math.exp(-a), tb = Math.exp(-b), pa = ta, pb = tb, sum = 0;
  for (let n = 0; n < 2000; n++) {
    const term = (1 - pa) * (1 - pb);
    sum += term;
    if (n > a + 10 && term < 1e-16 * sum) break;
    ta *= a / (n + 1); tb *= b / (n + 1); pa += ta; pb += tb;
  }
  return sum / b;
}

/** One shell pass, 2, 4 … tube passes (Lienhard Table 3.1). */
function epsShell1(ntu: number, cr: number): number {
  const s = Math.sqrt(1 + cr * cr), g = ntu * s;
  return 2 / (1 + cr + s * (1 + Math.exp(-g)) / (1 - Math.exp(-g)));
}

export function effectiveness(ntu: number, cr: number, g: Geometry, hotIsMin: boolean): number {
  if (ntu <= 0) return 0;
  if (cr < 1e-12) return 1 - Math.exp(-ntu);
  switch (g.arr) {
    case 'counter': {
      if (Math.abs(1 - cr) < 1e-9) return ntu / (1 + ntu);
      const e = Math.exp(-ntu * (1 - cr));
      return (1 - e) / (1 - cr * e);
    }
    case 'co': return (1 - Math.exp(-ntu * (1 + cr))) / (1 + cr);
    case 'shell': {
      const n = g.shells, ep = epsShell1(ntu / n, cr);
      if (n === 1) return ep;
      if (Math.abs(1 - cr) < 1e-9) return n * ep / (1 + (n - 1) * ep);
      const k = ((1 - ep * cr) / (1 - ep)) ** n;
      return (k - 1) / (k - cr);
    }
    case 'cross': {
      if (g.mix === 'none') return epsCrossUnmixed(ntu, cr);
      const minMixed = (g.mix === 'hot') === hotIsMin;
      return minMixed
        ? 1 - Math.exp(-(1 - Math.exp(-ntu * cr)) / cr)
        : (1 - Math.exp(-cr * (1 - Math.exp(-ntu)))) / cr;
    }
  }
}

const NTU_MAX = 60;
/** NTU for a given effectiveness (bisection; ε rises monotonically with NTU). NaN when ε is out of reach. */
export function ntuFor(eps: number, cr: number, g: Geometry, hotIsMin: boolean): number {
  if (!(eps > 0)) return 0;
  if (eps >= effectiveness(NTU_MAX, cr, g, hotIsMin)) return NaN;
  let lo = 0, hi = NTU_MAX;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (effectiveness(mid, cr, g, hotIsMin) < eps) lo = mid; else hi = mid;
    if (hi - lo < 1e-13 * Math.max(1, hi)) break;
  }
  return (lo + hi) / 2;
}

/** Log-mean of two temperature differences; equal ends give the difference itself (sheet: #DIV/0!, HE-3). */
export function lmtd(d1: number, d2: number): number {
  if (!(d1 > 0 && d2 > 0)) return NaN;
  if (Math.abs(d1 - d2) < 1e-9 * Math.max(d1, d2)) return (d1 + d2) / 2;
  return (d1 - d2) / Math.log(d1 / d2);
}

/** End temperature differences: counter-current basis for everything but co-current. */
export function ends(h: Stream, c: Stream, arr: Arr): [number, number] {
  return arr === 'co' ? [h.tin - c.tin, h.tout - c.tout] : [h.tin - c.tout, h.tout - c.tin];
}

export interface Thermal {
  q: number;
  dt1: number; dt2: number; lmtd: number;
  /** R = (Thi − Tho)/(Tco − Tci), P = (Tco − Tci)/(Thi − Tci) (Perry Fig. 11-4: R and S) */
  R: number; P: number;
  cr: number; eps: number; ntu: number;
  F: number;
  dtm: number;
  /** true when the arrangement cannot reach these temperatures (temperature cross beyond its limit) */
  infeasible: boolean;
  /** temperature cross: cold outlet above hot outlet */
  cross: boolean;
}

const cap = (s: StreamIn, m: number) => (s.latent ? Infinity : m * s.cp);

/** Temperature difference and F for given terminal temperatures and capacity rates. */
export function thermal(h: Stream, c: Stream, g: Geometry, q: number): Thermal {
  const [dt1, dt2] = ends(h, c, g.arr);
  const ctr = lmtd(...ends(h, c, 'counter'));
  const L = g.arr === 'co' ? lmtd(dt1, dt2) : ctr;
  const dTh = h.tin - h.tout, dTc = c.tout - c.tin;
  const R = dTh / dTc, P = dTc / (h.tin - c.tin);
  const hotIsMin = h.C <= c.C;
  const cmin = Math.min(h.C, c.C), cmax = Math.max(h.C, c.C);
  const cr = Number.isFinite(cmax) ? cmin / cmax : 0;
  const eps = Number.isFinite(cmin) ? q / (cmin * (h.tin - c.tin)) : NaN;
  let F = 1, ntu = NaN, infeasible = !(L > 0);
  if (Number.isFinite(cmin)) {
    ntu = ntuFor(eps, cr, g, hotIsMin);
    if (!Number.isFinite(ntu)) infeasible = true;
    else if (g.arr !== 'counter' && g.arr !== 'co' && cr > 1e-12) F = q / (ntu * cmin * ctr);
  }
  if (infeasible) F = NaN;
  return { q, dt1, dt2, lmtd: L, R, P, cr, eps, ntu, F, dtm: F * L, infeasible, cross: c.tout > h.tout + 1e-9 };
}

/** Smallest number of shells (1-2N) giving F ≥ fMin, up to 12; NaN if none. */
export function shellsNeeded(h: Stream, c: Stream, q: number, fMin = 0.8): number {
  for (let n = 1; n <= 12; n++) {
    const t = thermal(h, c, { arr: 'shell', shells: n, mix: 'none' }, q);
    if (!t.infeasible && t.F >= fMin) return n;
  }
  return NaN;
}

// ── sizing ──

export interface SizeResult {
  hot: Stream; cold: Stream;
  th: Thermal;
  /** required (clean of margin) and design area, m² */
  area: number; areaD: number;
  /** what went wrong in the heat balance, if anything */
  error?: string;
}

export function size(hot: StreamIn, cold: StreamIn, solve: Unknown, g: Geometry, U: number, margin: number): SizeResult {
  const h = { ...hot }, c = { ...cold };
  if (h.latent) h.tout = h.tin;
  if (c.latent) c.tout = c.tin;
  let error: string | undefined, q: number;
  const duty = (s: StreamIn, sign: 1 | -1) => (s.latent ? s.m * s.lam : sign * s.m * s.cp * (s.tout - s.tin));
  if (solve === 'mh' || solve === 'th' || solve === 'tih') {
    q = duty(c, 1);
    if (solve === 'mh') h.m = h.latent ? q / h.lam : q / (h.cp * (h.tin - h.tout));
    else if (h.latent) error = 'A condensing stream stays at its saturation temperature: type it and calculate the flow instead.';
    else if (solve === 'th') h.tout = h.tin - q / (h.m * h.cp);
    else h.tin = h.tout + q / (h.m * h.cp);
  } else {
    q = duty(h, -1);
    if (solve === 'mc') c.m = c.latent ? q / c.lam : q / (c.cp * (c.tout - c.tin));
    else if (c.latent) error = 'A boiling stream stays at its saturation temperature: type it and calculate the flow instead.';
    else if (solve === 'tc') c.tout = c.tin + q / (c.m * c.cp);
    else c.tin = c.tout - q / (c.m * c.cp);
  }
  const H: Stream = { tin: h.tin, tout: h.tout, m: h.m, C: cap(h, h.m) };
  const Cs: Stream = { tin: c.tin, tout: c.tout, m: c.m, C: cap(c, c.m) };
  const th = thermal(H, Cs, g, q);
  if (!error && !(H.tin > H.tout || h.latent)) error = 'The hot stream must cool down: its outlet must be below its inlet.';
  if (!error && !(Cs.tout > Cs.tin || c.latent)) error = 'The cold stream must warm up: its outlet must be above its inlet.';
  if (!error && !(H.m > 0 && Cs.m > 0)) error = 'The heat balance gives no positive flow.';
  const area = th.q / (U * th.dtm);
  return { hot: H, cold: Cs, th, area, areaD: area * (1 + margin), error };
}

// ── rating (ε-NTU) ──

export interface RateResult { hot: Stream; cold: Stream; th: Thermal; ntu: number; eps: number; q: number; error?: string }

export function rate(hot: StreamIn, cold: StreamIn, g: Geometry, U: number, A: number): RateResult {
  const Ch = cap(hot, hot.m), Cc = cap(cold, cold.m);
  const ua = U * A, dT = hot.tin - cold.tin;
  let q: number, eps: number, ntu: number;
  const cmin = Math.min(Ch, Cc);
  if (!Number.isFinite(cmin)) { q = ua * dT; eps = NaN; ntu = NaN; }   // both change phase: Q = U·A·ΔT
  else {
    const cmax = Math.max(Ch, Cc), cr = Number.isFinite(cmax) ? cmin / cmax : 0;
    ntu = ua / cmin;
    eps = effectiveness(ntu, cr, g, Ch <= Cc);
    q = eps * cmin * dT;
  }
  const H: Stream = { tin: hot.tin, tout: hot.latent ? hot.tin : hot.tin - q / Ch, m: hot.latent ? q / hot.lam : hot.m, C: Ch };
  const C: Stream = { tin: cold.tin, tout: cold.latent ? cold.tin : cold.tin + q / Cc, m: cold.latent ? q / cold.lam : cold.m, C: Cc };
  const th = thermal(H, C, g, q);
  return { hot: H, cold: C, th, ntu, eps, q, error: dT > 0 ? undefined : 'The hot inlet must be above the cold inlet.' };
}

/** Design U on the outside tube area (Perry Eq. 11-2): clean U (outside basis), shell-side fouling, and tube-side
 *  fouling referred to the outside area by do/di. ratio = 1 adds both as they are (the original sheet, HE-5). */
export const designU = (uClean: number, rfShell: number, rfTube: number, ratio = 1) => 1 / (1 / uClean + rfShell + rfTube * ratio);

/** Tubes for an area: total and per shell (outside area π·do·L per tube), tubes per pass and tube-side velocity. */
export function tubes(area: number, shells: number, d: number, wall: number, L: number, passes: number, m: number, rho: number) {
  const perShell = Math.ceil(area / shells / (Math.PI * d * L) - 1e-9);
  const perPass = perShell / passes;
  const di = d - 2 * wall;
  const v = m / (rho * perPass * Math.PI * di * di / 4);
  return { perShell, total: perShell * shells, perPass, di, v };
}
