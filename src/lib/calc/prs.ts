// Pressurizing & Depressurizing (Phase 7): gas flowing out of (depressurize) or into (pressurize) a fixed volume through a
// control valve or a restriction orifice, against a constant outside pressure. Owner's choices 2026-11-26: both
// directions; isothermal or adiabatic gas in the vessel; valve by IEC 60534 (as the CV tool, Fisher representative
// Cv/xT) or orifice (as the RO tool); time for a device or device for a time; API RP 521 depressuring check.
// The original sheet stepped the pressure in 99 equal steps timed with the flow at each step's lower end (PRS-1, +4.2 %)
// and could only depressurize (PRS-2); here the mass and energy balances are integrated accurately.
//
// Vessel (ideal gas with constant Z): m = P·V·M/(Z·R·T).
//   isothermal:   T = T0.
//   adiabatic, depressurize: the gas left in the vessel expands isentropically: m·dT = (k − 1)·T·dm → T = T0·(m/m0)^(k−1).
//   adiabatic, pressurize:   inflow enthalpy raises T: m·dT = (k·Ts − T)·dm → m·T = m0·T0 + k·Ts·(m − m0).
// Time: dt = |dm|/W (Simpson), W from the device at the current upstream/downstream state. SI: Pa abs, K, kg, kg/s, m³, s.
import { gasFlow } from './cv.ts';
import { rate as roRate, betaMax as roBetaMax } from './ro.ts';

export const R = 8314.462618;      // J/(kmol·K)
export const PATM = 101325;

export type Mode = 'depress' | 'press';
export type Thermo = 'isothermal' | 'adiabatic';
export interface Gas { M: number; Z: number; k: number; mu?: number }
export type Device =
  | { kind: 'valve'; cv: number; xt: number }
  | { kind: 'masoneilan'; cv: number; fl: number }          // the original sheet's equation (tests only)
  | { kind: 'orifice'; d: number; D: number };
export interface Case {
  mode: Mode; thermo: Thermo; gas: Gas;
  /** vessel volume, m³ */ V: number;
  /** vessel pressure at start and end, Pa abs; temperature at start, K */ P0: number; Pend: number; T0: number;
  /** outside pressure (depressurize: back pressure; pressurize: supply), Pa abs; supply temperature, K */ Pext: number; Ts: number;
}

/** Mass flow, kg/s, from (p1, t1) to p2 through the device. */
export function flow(dev: Device, gas: Gas, p1: number, t1: number, p2: number): number {
  if (!(p1 > p2)) return 0;
  if (dev.kind === 'valve') return gasFlow({ p1: p1 / 1e5, p2: p2 / 1e5, mw: gas.M, t: t1, z: gas.Z, k: gas.k }, dev.xt, dev.cv) / 3600;
  if (dev.kind === 'masoneilan') {
    // Masoneilan OZ1000 metric: Cv = 54.5·W·√Z/(FL·P1·√Gf·(y − 0.148y³)), W in 1000 kg/h, y = 1.63/FL·√(ΔP/P1) ≤ 1.5
    const P1 = p1 / 1e5, Gf = gas.M / 28.96 * 288 / t1;
    const y = Math.min(1.5, 1.63 / dev.fl * Math.sqrt((p1 - p2) / p1));
    return dev.cv / 0.0545 / Math.sqrt(gas.Z) * dev.fl * P1 * Math.sqrt(Gf) * (y - 0.148 * y ** 3) / 3600;
  }
  return roRate({ D: dev.D, p1, p2, mu: gas.mu ?? 1.1e-5, gas: { mw: gas.M, t: t1, z: gas.Z, k: gas.k } }, dev.d).w;
}

export interface Point { t: number; P: number; T: number; W: number; m: number; moved: number }
export interface Result {
  ok: boolean; why?: string;
  /** time to reach Pend, s */ t: number;
  /** mass moved (vented or added), kg */ dm: number;
  m0: number; m1: number; Tend: number; Tmin: number; Tmax: number;
  W0: number; Wend: number;
  pts: Point[];
}
export const mass = (c: Case, P: number, T: number) => P * c.V * c.gas.M / (c.gas.Z * R * T);

/** Gas temperature in the vessel as a function of its mass (closed forms of the energy balance):
 *  isothermal T0; adiabatic venting T = T0·(m/m0)^(k−1); adiabatic filling m·T = m0·T0 + k·Ts·(m − m0). */
export function tempOf(c: Case, m0: number, m: number): number {
  if (c.thermo === 'isothermal') return c.T0;
  if (c.mode === 'depress') return c.T0 * (m / m0) ** (c.gas.k - 1);
  return (m0 * c.T0 + c.gas.k * c.Ts * (m - m0)) / m;
}
/** Vessel mass at pressure P along the process path. */
export function massAt(c: Case, m0: number, P: number): number {
  if (c.thermo === 'isothermal') return mass(c, P, c.T0);
  if (c.mode === 'depress') return m0 * (P / c.P0) ** (1 / c.gas.k);          // isentrope: P ∝ m^k
  return m0 + (P - c.P0) * c.V * c.gas.M / (c.gas.Z * R * c.gas.k * c.Ts);    // m·T ∝ P
}

/** Transient from P0 to Pend: t = ∫ dm/W over the mass, composite Simpson with N steps. */
export function run(c: Case, dev: Device, N = 2000): Result {
  const bad = (why: string): Result => ({ ok: false, why, t: NaN, dm: NaN, m0: NaN, m1: NaN, Tend: NaN, Tmin: NaN, Tmax: NaN, W0: NaN, Wend: NaN, pts: [] });
  const dep = c.mode === 'depress';
  if (![c.V, c.P0, c.Pend, c.Pext, c.T0, c.gas.M, c.gas.Z, c.gas.k].every((x) => x > 0) || (!dep && !(c.Ts > 0))) return bad('Incomplete inputs.');
  if (dep && !(c.P0 > c.Pend && c.Pend > c.Pext)) return bad('Depressurizing needs start pressure > end pressure > back pressure.');
  if (!dep && !(c.P0 < c.Pend && c.Pend < c.Pext)) return bad('Pressurizing needs start pressure < end pressure < supply pressure.');
  const m0 = mass(c, c.P0, c.T0), m1 = massAt(c, m0, c.Pend);
  const Pof = (m: number, T: number) => m * c.gas.Z * R * T / (c.V * c.gas.M);
  const state = (m: number) => { const T = tempOf(c, m0, m), P = Pof(m, T); return { T, P, W: dep ? flow(dev, c.gas, P, T, c.Pext) : flow(dev, c.gas, c.Pext, c.Ts, P) }; };
  const s0 = state(m0);
  if (!(s0.W > 0)) return bad('No flow at the start: check the pressures and the device.');
  if (N % 2) N++;
  const h = (m1 - m0) / N;
  const st = Array.from({ length: N + 1 }, (_, i) => ({ m: m0 + i * h, ...state(m0 + i * h) }));
  if (st.some((x) => !(x.W > 0))) return bad('The flow stops before the end pressure is reached.');
  // cumulative time: Simpson over each pair of intervals, trapezoid-free midpoints for the odd points
  const g = st.map((x) => Math.abs(h) / x.W);
  const pts: Point[] = [{ t: 0, P: st[0].P, T: st[0].T, W: st[0].W, m: m0, moved: 0 }];
  let t = 0;
  for (let i = 1; i <= N; i++) {
    if (i % 2 === 1) {
      // odd point: integrate the first half of the pair with the quadratic through i−1, i, i+1
      const a = g[i - 1], b = g[i], cc = g[i + 1];
      pts.push({ t: t + (5 * a + 8 * b - cc) / 12, P: st[i].P, T: st[i].T, W: st[i].W, m: st[i].m, moved: Math.abs(st[i].m - m0) });
    } else {
      t += (g[i - 2] + 4 * g[i - 1] + g[i]) / 3;
      pts.push({ t, P: st[i].P, T: st[i].T, W: st[i].W, m: st[i].m, moved: Math.abs(st[i].m - m0) });
    }
  }
  const Ts = st.map((x) => x.T);
  return { ok: true, t, dm: Math.abs(m1 - m0), m0, m1, Tend: st[N].T, Tmin: Math.min(...Ts), Tmax: Math.max(...Ts), W0: s0.W, Wend: st[N].W, pts };
}

/** Time at which the vessel pressure passes p (linear between integration points), s; NaN if not reached. */
export function timeAt(r: Result, p: number): number {
  const s = r.pts;
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1], b = s[i];
    if ((a.P - p) * (b.P - p) <= 0 && a.P !== b.P) return a.t + (b.t - a.t) * (p - a.P) / (b.P - a.P);
  }
  return NaN;
}
/** `n` points evenly spaced in time (for the table), from the fine integration. */
export function sample(r: Result, n: number): Point[] {
  const out: Point[] = [];
  for (let j = 0; j <= n; j++) {
    const tt = r.t * j / n;
    let i = r.pts.findIndex((p) => p.t >= tt - 1e-12);
    if (i <= 0) { out.push(r.pts[Math.max(0, i)]); continue; }
    const a = r.pts[i - 1], b = r.pts[i], u = (tt - a.t) / (b.t - a.t || 1);
    out.push({ t: tt, P: a.P + u * (b.P - a.P), T: a.T + u * (b.T - a.T), W: a.W + u * (b.W - a.W), m: a.m + u * (b.m - a.m), moved: a.moved + u * (b.moved - a.moved) });
  }
  return out;
}

/** Valve Cv for a target time: the flow is proportional to Cv, so Cv = Cv_ref·t(Cv_ref)/t_target (same xT). */
export function cvForTime(c: Case, xt: number, tTarget: number): number {
  const r = run(c, { kind: 'valve', cv: 100, xt });
  return r.ok ? 100 * r.t / tTarget : NaN;
}
/** Orifice bore for a target time: bisection on β up to the largest useful β (time falls as d grows). */
export function boreForTime(c: Case, D: number, tTarget: number): { d: number; reachable: boolean } {
  const fn = (d: number) => run(c, { kind: 'orifice', d, D }, 400).t;
  const bm = roBetaMax({ D, p1: Math.max(c.P0, c.Pext), p2: Math.min(c.P0, c.Pext), mu: c.gas.mu ?? 1.1e-5, gas: { mw: c.gas.M, t: c.T0, z: c.gas.Z, k: c.gas.k } });
  if (fn(bm * D) > tTarget) return { d: bm * D, reachable: false };
  let lo = 0.02, hi = bm;
  for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (fn(mid * D) > tTarget) lo = mid; else hi = mid; }
  return { d: hi * D, reachable: true };
}

/** Standard volume flow, m³/s at (Tstd, 1.01325 bar), from a mass flow kg/s. */
export const stdFlow = (W: number, M: number, Tstd: number) => W / M * R * Tstd / PATM;
export const STD_T: Record<string, number> = { '0C': 273.15, '15C': 288.15, '20C': 293.15, '60F': (60 + 459.67) / 1.8 };

/** API RP 521 (1997) 3.19.1: reduce to 50 % of the design pressure (gauge) in about 15 min (walls ≥ 25 mm); where fire
 *  governs, light hydrocarbons: 690 kPa g (100 psig) or 50 % of design, whichever is lower, in 15 min. Pa abs. */
export const api521Target = (Pdesign: number) => ({ half: 0.5 * (Pdesign - PATM) + PATM, fire: Math.min(690e3, 0.5 * (Pdesign - PATM)) + PATM });
