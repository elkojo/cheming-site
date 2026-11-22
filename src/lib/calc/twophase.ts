// Pressure Loss: Two-Phase — gas–liquid flow in circular rough pipe (Phase 7).
// Native rebuild of the Zoho sheet "Pressure Loss of Two-Phase Flow in Circular Rough Piping" (basis: S. Haraburda,
// S. Chafin, "Calculating Two-Phase Pressure Drop", Chemical Processing Fluid Flow Annual 2000).
// Single-phase pressure drops with the Churchill (1977) friction factor (all regimes; 64/Re below Re 2100, as the sheet).
// Correlation chosen by Whalley's (1980) recommendation, as the sheet: μL/μG < 1000 → Friedel (1979); otherwise
// G ≥ 100 kg/(m²·s) → Chisholm (1973, "Chisholm–Baroczy"); else Lockhart–Martinelli (1949). All three are reported
// (owner's choice 2026-11-22). Fixed against the sheet: Friedel friction factors for the total flow as liquid / as gas
// (2P-1) and F = x^0.78·(1−x)^0.224 (2P-2), both as in Thome's Engineering Data Book III, ch. 13; Chisholm's B with all
// mass-flux branches (2P-6). Friedel's friction factors stay the smooth-tube ones of the sheet (owner's choice).
// Lockhart–Martinelli: the sheet's curve fits of ln φ against ln X for the four regime pairs (owner's choice).
// Static head (owner's choice): void fraction after Rouhani & Axelsson (1970; Thome eq. 13.2.4b), Δp = ρ_tp·g·L·sin θ.
// SI throughout: m, kg/s, kg/m³, Pa·s, N/m, Pa, Pa/m.
import { G as g } from './units.ts';

/** Darcy friction factor, Churchill (1977); 64/Re below Re 2100 as on the sheet. */
export function churchill(re: number, rr: number): number {
  if (re < 2100) return 64 / re;
  const A = (2.457 * Math.log(1 / ((7 / re) ** 0.9 + 0.27 * rr))) ** 16;
  const B = (37530 / re) ** 16;
  return 8 * ((8 / re) ** 12 + 1 / (A + B) ** 1.5) ** (1 / 12);
}

/** Friedel's smooth-tube friction factor (Darcy), as on the sheet. */
export const xiFriedel = (re: number) => (re < 1055 ? 64 / re : (0.86859 * Math.log(re / (1.964 * Math.log(re) - 3.8215))) ** -2);

/** Pressure gradient of a single-phase flow with mass flux G (kg/(m²·s)), Pa/m. */
const dpdz = (f: number, G: number, rho: number, d: number) => f / d * G * G / (2 * rho);

export type Corr = 'friedel' | 'chisholm' | 'lm';
export type Regime = 'laminar' | 'transition' | 'turbulent';
const regime = (re: number): Regime => (re < 2100 ? 'laminar' : re < 4000 ? 'transition' : 'turbulent');

// Lockhart–Martinelli curve fits from the sheet: ln φ = a + b·ln X + c·ln²X + d·ln³X + e·ln⁴X (liquid-based, gas-based)
const LM: Record<'tt' | 'tv' | 'vt' | 'vv', [number[], number[]]> = {
  tt: [[1.44, -0.508, 0.0579, -0.000376, -0.000444], [1.44, 0.492, 0.0577, -0.000352, -0.000432]],
  tv: [[1.25, -0.458, 0.067, -0.00213, -0.000585], [1.25, 0.542, 0.067, -0.00212, -0.000583]],
  vt: [[1.24, -0.484, 0.072, -0.00127, -0.00071], [1.24, 0.516, 0.072, -0.00126, -0.000706]],
  vv: [[0.979, -0.444, 0.096, -0.00245, -0.00144], [0.979, 0.555, 0.096, -0.00244, -0.00144]],
};
const poly = (c: number[], l: number) => c[0] + l * (c[1] + l * (c[2] + l * (c[3] + l * c[4])));
/** Lockhart–Martinelli φ_L and φ_G (not squared) for a regime pair at Martinelli parameter X, from the curve fits. */
export const lmPhi = (pair: 'tt' | 'tv' | 'vt' | 'vv', X: number): [number, number] =>
  [Math.exp(poly(LM[pair][0], Math.log(X))), Math.exp(poly(LM[pair][1], Math.log(X)))];

/** Chisholm's B (1973; Thome eq. 13.2.33–35), G in kg/(m²·s). */
export function chisholmB(gamma: number, G: number): number {
  if (gamma <= 9.5) return G <= 500 ? 4.8 : G < 1900 ? 2400 / G : 55 / Math.sqrt(G);
  if (gamma <= 28) return G <= 600 ? 520 / (gamma * Math.sqrt(G)) : 21 / gamma;
  return 15000 / (gamma * gamma * Math.sqrt(G));
}

/** Rouhani–Axelsson (1970) void fraction, vertical-flow form (Thome eq. 13.2.4b). */
export function voidRouhani(x: number, rhoL: number, rhoG: number, sigma: number, G: number, d: number): number {
  if (x <= 0) return 0;
  const c0 = 1 + 0.2 * (1 - x) * (g * d * rhoL * rhoL / (G * G)) ** 0.25;
  const vgj = 1.18 * (1 - x) * (g * sigma * (rhoL - rhoG)) ** 0.25 / (G * Math.sqrt(rhoL));
  return x / rhoG / (c0 * (x / rhoG + (1 - x) / rhoL) + vgj);
}

export interface Input {
  /** inside diameter, m */ d: number;
  /** absolute roughness, m */ eps: number;
  /** mass flows, kg/s */ wl: number; wg: number;
  rhol: number; rhog: number;
  /** viscosities, Pa·s */ mul: number; mug: number;
  /** surface tension, N/m */ sigma: number;
  /** straight length, m */ la: number;
  /** Σ n·Le/D of the fittings */ nLeD?: number;
  /** inclination from horizontal, degrees (+ up, − down) */ theta?: number;
  /** API RP 14E factor C */ c14e?: number;
}

export interface Phase { G: number; v: number; re: number; regime: Regime; f: number; dpdz: number; rhoV2: number }

export interface Result {
  area: number; G: number; x: number;
  liq: Phase; gas: Phase;
  /** total flow as liquid / as gas (Chisholm, Friedel) */
  lo: { re: number; f: number; dpdz: number }; go: { re: number; f: number; dpdz: number };
  mix: { rho: number; v: number; mu: number; re: number; rhoV2: number; muRatio: number };
  friedel: { phi2: number; phi2Down: number; fr: number; we: number; dpdz: number; dpdzDown: number };
  chisholm: { gamma: number; B: number; phi2: number; dpdz: number };
  lm: { X: number; pair: 'tt' | 'tv' | 'vt' | 'vv'; phiL2: number; phiG2: number; dpdz: number };
  chosen: Corr; reason: string;
  le: number;
  /** frictional pressure gradient of the chosen correlation for this direction (Friedel down-flow if θ < 0), Pa/m */
  dpdzFric: number; dpFric: number;
  voidFraction: number; rhoTp: number; dz: number; dpStatic: number; dpTotal: number;
  ve: number;
}

const phase = (w: number, A: number, rho: number, mu: number, d: number, rr: number): Phase => {
  const G = w / A, re = G * d / mu, f = churchill(re, rr);
  const v = G / rho;
  return { G, v, re, regime: regime(re), f, dpdz: dpdz(f, G, rho, d), rhoV2: rho * v * v };
};

export function solve(i: Input): Result {
  const { d, rhol: rL, rhog: rG, mul: mL, mug: mG } = i;
  const A = Math.PI * d * d / 4, w = i.wl + i.wg, G = w / A, x = i.wg / w, rr = i.eps / d;
  const liq = phase(i.wl, A, rL, mL, d, rr), gas = phase(i.wg, A, rG, mG, d, rr);
  const reLO = G * d / mL, reGO = G * d / mG;
  const fLO = churchill(reLO, rr), fGO = churchill(reGO, rr);
  const lo = { re: reLO, f: fLO, dpdz: dpdz(fLO, G, rL, d) }, go = { re: reGO, f: fGO, dpdz: dpdz(fGO, G, rG, d) };

  const rhoH = 1 / (x / rG + (1 - x) / rL);
  const muM = 1 / (x / mG + (1 - x) / mL);
  const vM = G / rhoH;
  const mix = { rho: rhoH, v: vM, mu: muM, re: G * d / muM, rhoV2: rhoH * vM * vM, muRatio: mL / mG };

  // Friedel (1979), smooth-tube friction factors for the total flow as liquid and as gas
  const xL = xiFriedel(reLO), xG = xiFriedel(reGO);
  const E = (1 - x) ** 2 + x * x * rL * xG / (rG * xL);
  const fr = G * G / (g * d * rhoH * rhoH), we = G * G * d / (i.sigma * rhoH);
  const m = mG / mL;
  const phi2 = E + 3.24 * x ** 0.78 * (1 - x) ** 0.224 * (rL / rG) ** 0.91 * m ** 0.19 * (1 - m) ** 0.7 / (fr ** 0.045 * we ** 0.035);
  const phi2Down = E + 38.5 * x ** 0.75 * (1 - x) ** 0.314 * (rL / rG) ** 0.86 * m ** 0.73 * (1 - m) ** 6.84 * fr ** -0.0001 * we ** -0.037;
  const dpLOf = dpdz(xL, G, rL, d);
  const friedel = { phi2, phi2Down, fr, we, dpdz: phi2 * dpLOf, dpdzDown: phi2Down * dpLOf };

  // Chisholm (1973)
  const gamma = Math.sqrt(go.dpdz / lo.dpdz), B = chisholmB(gamma, G), n = 0.25;
  const phiC = 1 + (gamma * gamma - 1) * (B * (x * (1 - x)) ** ((2 - n) / 2) + x ** (2 - n));
  const chisholm = { gamma, B, phi2: phiC, dpdz: phiC * lo.dpdz };

  // Lockhart–Martinelli (1949), sheet curve fits
  const X = Math.sqrt(liq.dpdz / gas.dpdz), lX = Math.log(X);
  const pair = (liq.re > 2100 ? 't' : 'v') + (gas.re > 2100 ? 't' : 'v') as 'tt' | 'tv' | 'vt' | 'vv';
  const phiL2 = Math.exp(poly(LM[pair][0], lX)) ** 2, phiG2 = Math.exp(poly(LM[pair][1], lX)) ** 2;
  const lm = { X, pair, phiL2, phiG2, dpdz: Math.max(phiL2 * liq.dpdz, phiG2 * gas.dpdz) };

  const chosen: Corr = mix.muRatio < 1000 ? 'friedel' : G >= 100 ? 'chisholm' : 'lm';
  const reason = chosen === 'friedel' ? 'μL/μG < 1000' : chosen === 'chisholm' ? 'μL/μG ≥ 1000 and G ≥ 100 kg/(m²·s)' : 'μL/μG ≥ 1000 and G < 100 kg/(m²·s)';

  const theta = i.theta ?? 0;
  const le = i.la + d * (i.nLeD ?? 0);
  const dpdzFric = chosen === 'friedel' ? (theta < 0 ? friedel.dpdzDown : friedel.dpdz) : chosen === 'chisholm' ? chisholm.dpdz : lm.dpdz;
  const voidFraction = voidRouhani(x, rL, rG, i.sigma, G, d);
  const rhoTp = rL * (1 - voidFraction) + rG * voidFraction;
  const dz = i.la * Math.sin(theta * Math.PI / 180);
  const dpStatic = rhoTp * g * dz;
  const dpFric = dpdzFric * le;
  const LBFT3 = 0.45359237 / 0.3048 ** 3;
  const ve = (i.c14e ?? 100) / Math.sqrt(rhoH / LBFT3) * 0.3048;
  return {
    area: A, G, x, liq, gas, lo, go, mix, friedel, chisholm, lm, chosen, reason, le,
    dpdzFric, dpFric, voidFraction, rhoTp, dz, dpStatic, dpTotal: dpFric + dpStatic, ve,
  };
}
