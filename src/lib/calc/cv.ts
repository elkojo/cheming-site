// Control Valve (CV) sizing — native rebuild of the Zoho sheet "Control Valve" (Phase 7).
// Equations of the Masoneilan Control Valve Sizing Handbook OZ1000 (7/00), which follow ISA S75.01 / IEC 60534-2-1
// (owner's choice 2026-11-22: IEC method also for gases, replacing the sheet's older Masoneilan Cf method):
//   liquid  Cv = W/(N6·Fp·√(Δp·ρ1)),  choked when Δp ≥ FL²·(p1 − FF·pv): Cv = W/(N6·FL·√((p1 − FF·pv)·ρ1)),
//           FF = 0.96 − 0.28·√(pv/pc)
//   gas     Cv = W/(N8·Fp·p1·Y)·√(T1·Z/(x·M)),  x = Δp/p1 limited to Fk·xT (choked),  Y = 1 − x/(3·Fk·xT),  Fk = k/1.40
//   N6 = 27.3 (kg/h, bar, kg/m³), N8 = 94.8 (kg/h, bar, K); Kv = 0.865·Cv (N1).
// Valve size suggestion (owner's choice): representative Cv, FL and xT at rated travel by size and valve style from the
// Fisher Control Valve Handbook, 3rd ed. (1999), Chapter 5; the smallest size whose rated Cv covers the required Cv
// within the chosen fraction (default 80 %). Fp = 1 (valve size = line size). Units: bar (abs), kg/h, kg/m³, K.

export const N6 = 27.3, N8 = 94.8, N1 = 0.865;
export const kvFromCv = (cv: number) => N1 * cv;

export interface Size { size: string; cv: number; fl: number; xt: number }
export interface Style { id: string; name: string; note: string; sizes: Size[] }
const S = (size: string, cv: number, fl: number, xt: number): Size => ({ size, cv, fl, xt });

/** Representative sizing coefficients at rated travel, Fisher Control Valve Handbook 3rd ed., pp. 125–127. */
export const STYLES: Style[] = [
  { id: 'globe-eq', name: 'Globe, single-port, equal percentage', note: '½–¾″ post-guided, 1–8″ cage-guided',
    sizes: [S('1/2', 2.41, 0.90, 0.54), S('3/4', 5.92, 0.84, 0.61), S('1', 17.2, 0.88, 0.67), S('1 1/2', 35.8, 0.84, 0.68),
      S('2', 59.7, 0.85, 0.69), S('3', 136, 0.82, 0.68), S('4', 224, 0.82, 0.72), S('6', 394, 0.85, 0.78), S('8', 818, 0.86, 0.81)] },
  { id: 'globe-lin', name: 'Globe, single-port, linear', note: 'cage-guided',
    sizes: [S('1', 20.6, 0.84, 0.64), S('1 1/2', 39.2, 0.82, 0.66), S('2', 72.9, 0.77, 0.64), S('3', 148, 0.82, 0.62),
      S('4', 236, 0.82, 0.69), S('6', 433, 0.84, 0.74), S('8', 846, 0.87, 0.81)] },
  { id: 'vball', name: 'V-notch ball, 90° open', note: 'rotary',
    sizes: [S('1', 34.0, 0.86, 0.42), S('1 1/2', 77.3, 0.74, 0.27), S('2', 132, 0.77, 0.41), S('3', 321, 0.74, 0.30),
      S('4', 596, 0.62, 0.22), S('6', 1100, 0.58, 0.20), S('8', 1820, 0.54, 0.18), S('10', 3000, 0.56, 0.19),
      S('12', 3980, 0.63, 0.25), S('16', 8270, 0.37, 0.13)] },
  { id: 'hpbf', name: 'High-performance butterfly, 90° open', note: 'rotary (12″ omitted: no FL, xT given)',
    sizes: [S('2', 80.2, 0.71, 0.44), S('3', 237, 0.64, 0.28), S('4', 499, 0.53, 0.19), S('6', 1260, 0.55, 0.20),
      S('8', 2180, 0.48, 0.19), S('10', 3600, 0.48, 0.17), S('16', 8600, 0.52, 0.23)] },
];

export interface Liquid { w: number; p1: number; p2: number; rho: number; pv: number; pc: number }
export interface Gas { w: number; p1: number; p2: number; mw: number; t: number; z: number; k: number }

export interface LiqResult { dp: number; ff: number; dpChoked: number; choked: boolean; flashing: boolean; cv: number }
export interface GasResult { dp: number; x: number; fk: number; xChoked: number; choked: boolean; y: number; cv: number }

export function liquidCv(l: Liquid, fl: number): LiqResult {
  const dp = l.p1 - l.p2;
  const ff = l.pv > 0 ? 0.96 - 0.28 * Math.sqrt(l.pv / l.pc) : 0.96;
  const dpChoked = fl * fl * (l.p1 - ff * l.pv);
  const choked = dp >= dpChoked;
  const cv = choked ? l.w / (N6 * fl * Math.sqrt((l.p1 - ff * l.pv) * l.rho)) : l.w / (N6 * Math.sqrt(dp * l.rho));
  return { dp, ff, dpChoked, choked, flashing: l.p2 < l.pv, cv };
}

export function gasCv(g: Gas, xt: number): GasResult {
  const dp = g.p1 - g.p2, fk = g.k / 1.4, xChoked = fk * xt;
  const x = dp / g.p1, xs = Math.min(x, xChoked);
  const y = 1 - xs / (3 * xChoked);
  const cv = g.w / (N8 * g.p1 * y) * Math.sqrt(g.t * g.z / (xs * g.mw));
  return { dp, x, fk, xChoked, choked: x >= xChoked, y, cv };
}

/** Maximum flow (kg/h) through a valve of coefficient cv, e.g. fully open after a failure (API 521, 5.10.3). */
export const liquidFlow = (l: Omit<Liquid, 'w'>, fl: number, cv: number) => {
  const ff = l.pv > 0 ? 0.96 - 0.28 * Math.sqrt(l.pv / l.pc) : 0.96;
  return N6 * cv * Math.sqrt(Math.min(l.p1 - l.p2, fl * fl * (l.p1 - ff * l.pv)) * l.rho);
};
export const gasFlow = (g: Omit<Gas, 'w'>, xt: number, cv: number) => {
  const xc = g.k / 1.4 * xt, xs = Math.min((g.p1 - g.p2) / g.p1, xc);
  return N8 * g.p1 * (1 - xs / (3 * xc)) * cv * Math.sqrt(xs * g.mw / (g.t * g.z));
};

export interface Pick<R> { size: Size; result: R; fraction: number }
/** Smallest valve of a style whose rated Cv covers the required Cv (computed with that size's FL / xT) within `maxFrac`. */
export function pickValve<R extends { cv: number }>(style: Style, calc: (s: Size) => R, maxFrac = 0.8): Pick<R> | undefined {
  for (const size of style.sizes) {
    const result = calc(size);
    if (result.cv <= maxFrac * size.cv) return { size, result, fraction: result.cv / size.cv };
  }
  return undefined;
}

/** Ideal-gas volume flows (m³/s): actual at p (bar a) and T (K), and standard at 101.325 kPa, 20 °C with Z = 1. */
export const R = 8.314462618;
export const gasVolume = (w: number, mw: number, t: number, z: number, p: number) => w / 3600 / mw * R * t * z / (p * 100);
export const gasVolumeStd = (w: number, mw: number) => w / 3600 / mw * R * 293.15 / 101.325;
