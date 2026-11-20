// Pipe Size: economic inside diameter and velocity for carbon-steel and stainless-steel lines.
// Native rebuild of the Zoho sheet "Pipe Size Optimization for Carbon and Stainless Steel Pipes" (Phase 7).
// Correlation as in the sheet (after the cheresources.com spreadsheet, based on Anaya Durand et al.,
// "Updated Rules for Pipe Sizing", Chemical Engineering, May 1999, pp. 153–156), a Generaux-type optimum:
//   Q^2.84 = a·D^n / (1.9156·(1 + c·D)·0.00483·ρ^0.84·μ^0.16)
// with Q in ft³/s, D in ft, ρ in lb/ft³, μ in cP; carbon steel a = 29.15, n = 6.19, c = 2.18;
// stainless steel a = 460.31, n = 5.6193, c = 2.164. Q(D) increases with D, so for a given flow there is one
// economic D. The sheet found it by fixed-point iteration (D ← D·√(Q/Q(D)), 10 steps); here it is solved exactly.
// Turbulent-flow correlation (friction factor ∝ Re^-0.16).
import { pick, id, CS_STD, SS_10S, type Pipe } from './pipes.ts';

const FT = 0.3048;                       // m
const LBFT3 = 0.45359237 / FT ** 3;      // kg/m³ per lb/ft³

export type Material = 'cs' | 'ss';
const K: Record<Material, { a: number; n: number; c: number; pipes: Pipe[]; sched: string }> = {
  cs: { a: 29.15, n: 6.19, c: 2.18, pipes: CS_STD, sched: 'STD' },
  ss: { a: 460.31, n: 5.6193, c: 2.164, pipes: SS_10S, sched: '10S' },
};

/** Economic volume flow, ft³/s, for an inside diameter D (ft), density ρ (lb/ft³) and viscosity μ (cP). */
export function econFlow(m: Material, D: number, rho: number, mu: number): number {
  const { a, n, c } = K[m];
  return (a * D ** n / (1.9156 * (1 + c * D) * 0.00483 * rho ** 0.84 * mu ** 0.16)) ** (1 / 2.84);
}

export interface PipeResult { pipe: Pipe; sched: string; d: number; v: number }
export interface Result {
  /** economic inside diameter, m */
  d: number;
  /** economic velocity, m/s */
  v: number;
  /** Reynolds number at the economic diameter */
  re: number;
  /** smallest standard pipe at or above d, and the size below */
  up?: PipeResult; down?: PipeResult;
}

/** Economic pipe for a volume flow q (m³/s), density ρ (kg/m³) and viscosity μ (Pa·s). */
export function econPipe(m: Material, q: number, rho: number, mu: number): Result {
  const Q = q / FT ** 3, R = rho / LBFT3, M = mu * 1000;
  // bisection on ln D (D in ft): econFlow increases monotonically with D
  let lo = Math.log(1e-4), hi = Math.log(1e3);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (econFlow(m, Math.exp(mid), R, M) < Q) lo = mid; else hi = mid;
  }
  const d = Math.exp((lo + hi) / 2) * FT;
  const vel = (dd: number) => q / (Math.PI * dd * dd / 4);
  const v = vel(d);
  const { up, down } = pick(K[m].pipes, d / 0.0254);
  const res = (p?: Pipe): PipeResult | undefined => p && { pipe: p, sched: K[m].sched, d: id(p) * 0.0254, v: vel(id(p) * 0.0254) };
  return { d, v, re: rho * v * d / mu, up: res(up), down: res(down) };
}
