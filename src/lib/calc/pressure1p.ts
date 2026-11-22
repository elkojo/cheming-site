// Pressure Loss: Single Phase — frictional pressure drop of a liquid or a gas in circular rough pipe.
// Native rebuild of the Zoho sheet "Pressure Loss of Single Phase Flow in Rough Piping" (Phase 7).
// Darcy–Weisbach: Δp = f·(Le/d)·ρ·v²/2, Le = La + d·Σ(n·Le/D) (fittings, Le/D values as on the sheet).
// Friction factor (owner's choice 2026-11-22): Colebrook–White solved exactly in the turbulent and transitional
// zones, f = 64/Re in laminar flow (Re ≤ 2000). The sheet used the explicit Goudar–Sonnad correlation without its
// −0.31 term (up to 1 % high) and had no laminar branch; `goudarSonnadSheet` keeps it for the reference tests.
// Gas (owner's choice): density from the ideal-gas law with Z, ρ = p·M/(Z·R·T), drives velocity, Re and Δp; sonic
// velocity c = √(k·R·T/M) (ideal gas), Mach = v/c; standard volume at 101.325 kPa, 20 °C with Z = 1 (as the sheet's
// basis). The method assumes constant density, so it is flagged when Δp exceeds 10 % of the inlet pressure.
// Erosional velocity after API RP 14E: v_e = C/√ρ (v_e in ft/s, ρ in lb/ft³).
// All quantities SI: m, m², kg/s, kg/m³, Pa·s, Pa, K, m/s.

export const R = 8.314462618;            // J/(mol·K)
const FT = 0.3048, LBFT3 = 0.45359237 / FT ** 3;
export const STD = { p: 101325, t: 293.15 };

/** Fittings and valves with their equivalent length in pipe diameters, as on the sheet (J8:M35). */
export const FITTINGS: [string, number][] = [
  ['Elbow 45°, short radius', 16], ['Elbow 45°, long radius', 8], ['Elbow 90°, short radius', 22], ['Elbow 90°, long radius', 14],
  ['Bend 90°, R = 4D', 14], ['Bend 90°, R = 5D', 16], ['Mitre bend 90°, 2 mitres', 28], ['Mitre bend 90°, 3 mitres', 20],
  ['Mitre bend 90°, 4 mitres', 18], ['Tee, flow through branch (hard)', 60], ['Tee, flow straight through (soft)', 20],
  ['Globe valve', 375], ['Angle valve', 185], ['Plug cock', 130], ['Gate valve, full bore', 10], ['Ball valve, full bore', 10],
  ['Ball valve, reduced bore', 60], ['Butterfly valve', 35], ['Swing check valve', 100], ['Ball / lift check valve', 375],
  ['Compact lift check valve ¾–1″', 1000], ['Compact lift check valve 1½–2″', 3000], ['Non-slam check valve', 100],
  ['Double-disc check valve 2″', 400], ['Double-disc check valve 3″', 300], ['Double-disc check valve 4–8″', 200],
  ['Double-disc check valve 10–24″', 100], ['Double-disc check valve ≥ 26″', 50],
];

/** Absolute roughness of new commercial pipe after Moody (1944), m. Ranges give two presets. */
export const ROUGHNESS: [string, number][] = [
  ['Drawn tubing, glass, plastic', 1.52e-6], ['Commercial steel', 4.57e-5],
  ['Asphalted cast iron', 1.22e-4], ['Galvanized iron', 1.52e-4], ['Cast iron', 2.59e-4],
  ['Wood stave, smooth', 1.83e-4], ['Wood stave, rough', 9.14e-4], ['Concrete, smooth', 3.05e-4], ['Concrete, rough', 3.05e-3],
  ['Riveted steel, smooth', 9.14e-4], ['Riveted steel, rough', 9.14e-3],
];

/** Darcy friction factor from Colebrook–White, 1/√f = −2·log10(ε/(3.7·d) + 2.51/(Re·√f)), solved by Newton's method. */
export function colebrook(re: number, rr: number): number {
  // x = 1/√f; g(x) = x + 2·log10(a + b·x) = 0
  const a = rr / 3.7, b = 2.51 / re, L = 2 / Math.LN10;
  let x = 8;
  for (let i = 0; i < 100; i++) {
    const g = x + L * Math.log(a + b * x);
    const dg = 1 + L * b / (a + b * x);
    const nx = x - g / dg;
    if (Math.abs(nx - x) < 1e-15 * nx) { x = nx; break; }
    x = nx;
  }
  return 1 / (x * x);
}

/** The sheet's explicit correlation (Goudar–Sonnad without the −0.31 term), for the reference tests only. */
export function goudarSonnadSheet(re: number, rr: number): number {
  const s = 0.124 * rr * re + Math.log(0.4587 * re);
  return 1 / (0.8686 * Math.log(0.4587 * re / s ** (s / (s + 1)))) ** 2;
}

export type Regime = 'laminar' | 'transitional' | 'turbulent';
export const regime = (re: number): Regime => (re <= 2000 ? 'laminar' : re < 4000 ? 'transitional' : 'turbulent');
export const friction = (re: number, rr: number) => (re <= 2000 ? 64 / re : colebrook(re, rr));

export interface Gas { mw: number; z: number; t: number; p: number; k: number }
export interface Input {
  /** inside diameter, m */
  d: number;
  /** absolute roughness, m */
  eps: number;
  /** mass flow, kg/s */
  w: number;
  /** viscosity, Pa·s */
  mu: number;
  /** liquid density (kg/m³), or the gas state from which it is calculated */
  rho?: number;
  gas?: Gas;
  /** straight length, m */
  la: number;
  /** Σ n·(Le/D) of the fittings */
  nLeD?: number;
  /** API RP 14E factor C (√(lb/(ft·s²))) */
  c14e?: number;
}

export interface Result {
  area: number; rr: number; rho: number; q: number; v: number; rhoV2: number; ve: number;
  re: number; regime: Regime; f: number; le: number; dp: number; dpPer100: number;
  gas?: { qStd: number; c: number; mach: number; dpRatio: number };
}

export const gasDensity = (g: Gas) => g.p * g.mw / 1000 / (g.z * R * g.t);
export const sonic = (g: Gas) => Math.sqrt(g.k * R * g.t / (g.mw / 1000));
/** API RP 14E erosional velocity, m/s */
export const erosional = (rho: number, C: number) => C / Math.sqrt(rho / LBFT3) * FT;

export function solve(i: Input): Result {
  const rho = i.gas ? gasDensity(i.gas) : i.rho!;
  const area = Math.PI * i.d * i.d / 4;
  const q = i.w / rho, v = q / area;
  const re = rho * v * i.d / i.mu, rr = i.eps / i.d;
  const f = friction(re, rr);
  const le = i.la + i.d * (i.nLeD ?? 0);
  const dp = f * le / i.d * rho * v * v / 2;
  const res: Result = {
    area, rr, rho, q, v, rhoV2: rho * v * v, ve: erosional(rho, i.c14e ?? 100),
    re, regime: regime(re), f, le, dp, dpPer100: dp / le * 100,
  };
  if (i.gas) {
    const c = sonic(i.gas);
    res.gas = { qStd: i.w / (i.gas.mw / 1000) * R * STD.t / STD.p, c, mach: v / c, dpRatio: dp / i.gas.p };
  }
  return res;
}
