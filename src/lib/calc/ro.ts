// Restriction Orifice (RO) — native rebuild of the Zoho sheet "Restriction Orifice" (Phase 7).
// Square-edged orifice plate with flange tappings per ISO 5167-2:2003 (owner's choice 2026-11-22; the sheet used the
// 1991 Stolz equation under a 2003 title):
//   qm = C/√(1 − β⁴)·ε·(π/4)·d²·√(2·Δp·ρ1)                                    (ISO 5167-1:2003, Eq. 1)
//   C  Reader–Harris/Gallagher (1998), flange taps L1 = L'2 = 25.4/D (mm)        (ISO 5167-2:2003, Eq. 4)
//   ε  = 1 − (0.351 + 0.256·β⁴ + 0.93·β⁸)·[1 − (p2/p1)^(1/κ)]                    (Eq. 5; 1 for liquids)
//   Δϖ/Δp = (√(1 − β⁴(1 − C²)) − C·β²)/(√(1 − β⁴(1 − C²)) + C·β²)               (Eq. 7, permanent loss)
// A restriction orifice is specified by its permanent loss P1 − P2 (downstream pressure fully recovered), so the tap
// differential is Δp = (P1 − P2)/(Δϖ/Δp), and p2 (tap) = P1 − Δp.
// Choked gas (as the sheet; Perry 7th ed. 10-16, Eq. 10-26): qm = Cd·A·√(κ·ρ1·P1·(2/(κ+1))^((κ+1)/(κ−1))), with Cd rising
// from about 0.75 at the critical ratio to 0.84 at P2/P1 → 0 (sheet fit: Cd = 0.6225·r³ − 1.0476·r² + 0.1989·r + 0.8361,
// r = P2/P1); critical when r ≤ rc from r^((1−κ)/κ) + ((κ−1)/2)·β⁴·r^(2/κ) = (κ+1)/2 (sheet note; ASME fluid meters).
// Choked liquid (as the sheet): qm = 0.6·A/√(1 − β⁴)·√(2·ρ1·(P1 − Pv)) when smaller than the unchoked flow.
// SI throughout: Pa (abs), m, kg/s, kg/m³, Pa·s, K.

export const R = 8.314462618;

/** Reader–Harris/Gallagher discharge coefficient, flange tappings, D in m. */
export function cRHG(beta: number, reD: number, D: number): number {
  const Dmm = D * 1000;
  const L1 = 25.4 / Dmm, L2 = L1;
  const A = (19000 * beta / reD) ** 0.8;
  const M2 = 2 * L2 / (1 - beta);
  let c = 0.5961 + 0.0261 * beta ** 2 - 0.216 * beta ** 8 + 0.000521 * (1e6 * beta / reD) ** 0.7
    + (0.0188 + 0.0063 * A) * beta ** 3.5 * (1e6 / reD) ** 0.3
    + (0.043 + 0.080 * Math.exp(-10 * L1) - 0.123 * Math.exp(-7 * L1)) * (1 - 0.11 * A) * beta ** 4 / (1 - beta ** 4)
    - 0.031 * (M2 - 0.8 * M2 ** 1.1) * beta ** 1.3;
  if (Dmm < 71.12) c += 0.011 * (0.75 - beta) * (2.8 - Dmm / 25.4);
  return c;
}
export const epsilon2003 = (beta: number, p1: number, p2: number, k: number) =>
  1 - (0.351 + 0.256 * beta ** 4 + 0.93 * beta ** 8) * (1 - (p2 / p1) ** (1 / k));
/** Permanent pressure loss / tap differential, ISO 5167-2:2003 Eq. 7. */
export const lossRatio = (beta: number, c: number) => {
  const s = Math.sqrt(1 - beta ** 4 * (1 - c * c));
  return (s - c * beta * beta) / (s + c * beta * beta);
};
/** Critical (choking) pressure ratio for an orifice with diameter ratio β. */
export function criticalRatio(k: number, beta: number): number {
  const f = (r: number) => r ** ((1 - k) / k) + (k - 1) / 2 * beta ** 4 * r ** (2 / k) - (k + 1) / 2;
  let lo = 1e-6, hi = 1;           // f decreasing in r: f(lo) > 0 > f(1) = (k−1)/2·(β⁴ − 1)
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
export const cdChoked = (r: number) => 0.6225 * r ** 3 - 1.0476 * r ** 2 + 0.1989 * r + 0.8361;
export const critFlowFunction = (k: number) => Math.sqrt(k * (2 / (k + 1)) ** ((k + 1) / (k - 1)));

export interface Gas { mw: number; t: number; z: number; k: number }
export interface Input {
  /** pipe inside diameter, m */ D: number;
  /** pressures, Pa abs (P2 = recovered downstream pressure) */ p1: number; p2: number;
  /** viscosity, Pa·s */ mu: number;
  gas?: Gas;
  /** liquid density and vapour pressure (Pa abs) */ rho?: number; pv?: number;
}
export type Regime = 'unchoked' | 'critical' | 'choked-liquid';
export interface Result {
  d: number; beta: number; w: number; rho1: number; regime: Regime;
  c: number; eps: number; dpTap: number; pVc: number; ratio: number; rc?: number;
  reD: number; red: number;
}

const area = (d: number) => Math.PI * d * d / 4;
export const gasDensity = (p: number, g: Gas) => p * g.mw / 1000 / (g.z * R * g.t);

/** Flow through an orifice of bore d (rating). */
export function rate(i: Input, d: number): Result {
  const beta = d / i.D, rho1 = i.gas ? gasDensity(i.p1, i.gas) : i.rho!, A = area(d), E = 1 / Math.sqrt(1 - beta ** 4);
  const r = i.p2 / i.p1;
  // unchoked ISO 5167: iterate C(Re) and the tap differential
  let w = 1, c = 0.6, dpTap = i.p1 - i.p2, eps = 1;
  for (let it = 0; it < 100; it++) {
    const reD = 4 * w / (Math.PI * i.mu * i.D);
    const cn = cRHG(beta, Math.max(reD, 1), i.D);
    dpTap = (i.p1 - i.p2) / lossRatio(beta, cn);
    const p2t = Math.max(i.p1 - dpTap, 1e-9 * i.p1);
    eps = i.gas ? epsilon2003(beta, i.p1, p2t, i.gas.k) : 1;
    const wn = cn * E * eps * A * Math.sqrt(2 * dpTap * rho1);
    const done = Math.abs(wn - w) < 1e-13 * wn && Math.abs(cn - c) < 1e-15;
    w = wn; c = cn;
    if (done) break;
  }
  let regime: Regime = 'unchoked', rc: number | undefined;
  if (i.gas) {
    rc = criticalRatio(i.gas.k, beta);
    if (r <= rc) {
      regime = 'critical';
      c = cdChoked(r); eps = 1;
      w = c * A * critFlowFunction(i.gas.k) * Math.sqrt(rho1 * i.p1);
      dpTap = i.p1 - i.p2;
    }
  } else {
    const wCh = 0.6 * A * E * Math.sqrt(2 * rho1 * Math.max(i.p1 - (i.pv ?? 0), 0));
    if (wCh < w) { regime = 'choked-liquid'; w = wCh; c = 0.6; dpTap = i.p1 - (i.pv ?? 0); }
  }
  const reD = 4 * w / (Math.PI * i.mu * i.D);
  return { d, beta, w, rho1, regime, c, eps, dpTap, pVc: i.p1 - dpTap, ratio: (i.p1 - i.p2) / dpTap, rc, reD, red: reD / beta };
}

/** β at which the flow is largest (the equations stop being meaningful beyond it, at very large β). */
export function betaMax(i: Input): number {
  let best = 0.1, wBest = -Infinity;
  for (let b = 0.1; b <= 0.95 + 1e-9; b += 0.005) {
    const w = rate(i, b * i.D).w;
    if (Number.isFinite(w) && w > wBest) { wBest = w; best = b; } else if (w < wBest) break;
  }
  return best;
}

/** Orifice bore for a mass flow w (sizing): rate() increases with d up to betaMax, solved by bisection on β. */
export function size(i: Input, w: number): Result | undefined {
  let lo = 1e-4, hi = betaMax(i);
  if (rate(i, hi * i.D).w < w) return undefined;          // no bore can pass w at these pressures
  for (let k = 0; k < 200; k++) {
    const m = (lo + hi) / 2;
    if (rate(i, m * i.D).w < w) lo = m; else hi = m;
  }
  return rate(i, (lo + hi) / 2 * i.D);
}

/** ISO 5167-2:2003 limits of use (5.3.1) that the case violates. */
export function limits(r: Result, D: number): string[] {
  const out: string[] = [];
  if (r.beta < 0.1 || r.beta > 0.75) out.push('β outside 0.10–0.75');
  if (r.d < 0.0125) out.push('d below 12.5 mm');
  if (D < 0.05 || D > 1) out.push('D outside 50–1000 mm');
  const reMin = r.beta <= 0.56 ? 5000 : 16000 * r.beta ** 2;
  if (r.reD < reMin) out.push(`Re_D below ${Math.round(reMin)}`);
  if (r.regime === 'unchoked' && r.eps < 1 && r.pVc / (r.pVc + r.dpTap) < 0.75) out.push('tap pressure ratio p₂/p₁ below 0.75 (expansibility equation)');
  return out;
}

// Side notes of the sheet (approximate, shown as information only)
/** Cd of a choked square-edged orifice of thickness t (Ward-Smith 1979, as quoted on the sheet). */
export const cdThickness = (tOverD: number) => (tOverD <= 0 ? 1 : tOverD < 1 ? Math.min(1, 0.81 - 0.0347 * Math.log(tOverD)) : tOverD <= 7 ? 0.81 : NaN);
/** Cd of an orifice with a rounded entry edge of radius r (as on the sheet; ≤ 1). */
export const cdRounded = (rOverD: number) => Math.min(1, 0.6 * (1 + 5.5 * rOverD));
