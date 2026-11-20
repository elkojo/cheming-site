// IAPWS-IF97: the industrial formulation for water and steam (IAPWS R7-97(2012)), regions 1–4,
// with the IAPWS 2008 viscosity (R12-08, industrial use: no critical term) and the IAPWS 2011 thermal
// conductivity (R15-11, with the critical enhancement in its industrial form).
// Units inside: p in MPa, T in K, ρ in kg/m³, h/u in kJ/kg, s/cp/cv in kJ/(kg·K), μ in Pa·s, λ in W/(m·K).
// Valid 273.15 K ≤ T ≤ 1073.15 K, p ≤ 100 MPa (region 5, above 1073.15 K, is not included).
import { R1, R2, R2_IDEAL, R3, R3_N1 } from './if97-coef.ts';

export const R = 0.461526;         // kJ/(kg·K), specific gas constant of IF97
export const TC = 647.096;         // K
export const PC = 22.064;          // MPa
export const RHOC = 322;           // kg/m³
export const T_TRIPLE = 273.16;    // K
export const P_TRIPLE = 0.000611657; // MPa
export const T_MIN = 273.15, T_MAX = 1073.15, P_MAX = 100;

export interface State {
  region: 1 | 2 | 3;
  p: number; T: number; rho: number;
  h: number; u: number; s: number; cp: number; cv: number;
  /** isobaric expansion coefficient (1/v)(∂v/∂T)ₚ, 1/K */
  alpha: number;
  /** (∂ρ/∂p)_T, kg/m³ per MPa */
  drhodp: number;
  mu: number; k: number;
}

// ── Region 4: saturation line ───────────────────────────────────────────────────
const N4 = [0, 0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2, 0.12020824702470e5, -0.32325550322333e7,
  0.14915108613530e2, -0.48232657361591e4, 0.40511340542057e6, -0.23855557567849, 0.65017534844798e3];

/** Saturation pressure, MPa, for 273.15 K ≤ T ≤ Tc. */
export function psat(T: number): number {
  const th = T + N4[9] / (T - N4[10]);
  const A = th * th + N4[1] * th + N4[2];
  const B = N4[3] * th * th + N4[4] * th + N4[5];
  const C = N4[6] * th * th + N4[7] * th + N4[8];
  return (2 * C / (-B + Math.sqrt(B * B - 4 * A * C))) ** 4;
}

/** Saturation temperature, K, for 611.213 Pa ≤ p ≤ pc. */
export function tsat(p: number): number {
  const b = p ** 0.25;
  const E = b * b + N4[3] * b + N4[6];
  const F = N4[1] * b * b + N4[4] * b + N4[7];
  const G = N4[2] * b * b + N4[5] * b + N4[8];
  const D = 2 * G / (-F - Math.sqrt(F * F - 4 * E * G));
  return (N4[10] + D - Math.sqrt((N4[10] + D) ** 2 - 4 * (N4[9] + N4[10] * D))) / 2;
}

// ── B23: boundary between regions 2 and 3 ───────────────────────────────────────
const NB = [0, 0.34805185628969e3, -0.11671859879975e1, 0.10192970039326e-2, 0.57254459862746e3, 0.13918839778870e2];
export const pB23 = (T: number) => NB[1] + NB[2] * T + NB[3] * T * T;
export const tB23 = (p: number) => NB[4] + Math.sqrt((p - NB[5]) / NB[3]);

// ── Region 1: compressed water (Gibbs free energy) ─────────────────────────────
function region1(p: number, T: number): Omit<State, 'mu' | 'k'> {
  const pi = p / 16.53, tau = 1386 / T;
  const a = 7.1 - pi, b = tau - 1.222;
  let g = 0, gp = 0, gpp = 0, gt = 0, gtt = 0, gpt = 0;
  for (let i = 0; i < R1.n.length; i++) {
    const I = R1.I[i], J = R1.J[i], n = R1.n[i];
    const aI = a ** I, bJ = b ** J;
    g += n * aI * bJ;
    if (I) {
      gp -= n * I * a ** (I - 1) * bJ;
      gpp += n * I * (I - 1) * a ** (I - 2) * bJ;
      if (J) gpt -= n * I * J * a ** (I - 1) * b ** (J - 1);
    }
    if (J) {
      gt += n * aI * J * b ** (J - 1);
      gtt += n * aI * J * (J - 1) * b ** (J - 2);
    }
  }
  const v = R * T * pi * gp / (p * 1000);
  return {
    region: 1, p, T, rho: 1 / v,
    h: R * T * tau * gt,
    u: R * T * (tau * gt - pi * gp),
    s: R * (tau * gt - g),
    cp: -R * tau * tau * gtt,
    cv: R * (-tau * tau * gtt + (gp - tau * gpt) ** 2 / gpp),
    alpha: (1 - tau * gpt / gp) / T,
    drhodp: (1 / v) * (-pi * gpp / gp / p),
  };
}

// ── Region 2: steam (ideal-gas part + residual part) ────────────────────────────
function region2(p: number, T: number): Omit<State, 'mu' | 'k'> {
  const pi = p, tau = 540 / T, b = tau - 0.5;
  let g0 = Math.log(pi), g0t = 0, g0tt = 0;
  for (let i = 0; i < R2_IDEAL.n.length; i++) {
    const J = R2_IDEAL.J[i], n = R2_IDEAL.n[i];
    g0 += n * tau ** J;
    g0t += n * J * tau ** (J - 1);
    g0tt += n * J * (J - 1) * tau ** (J - 2);
  }
  const g0p = 1 / pi;
  let gr = 0, grp = 0, grpp = 0, grt = 0, grtt = 0, grpt = 0;
  for (let i = 0; i < R2.n.length; i++) {
    const I = R2.I[i], J = R2.J[i], n = R2.n[i];
    const pI = pi ** I, bJ = b ** J, pI1 = pi ** (I - 1);
    gr += n * pI * bJ;
    grp += n * I * pI1 * bJ;
    grpp += n * I * (I - 1) * pi ** (I - 2) * bJ;
    grt += n * pI * J * b ** (J - 1);
    grtt += n * pI * J * (J - 1) * b ** (J - 2);
    grpt += n * I * pI1 * J * b ** (J - 1);
  }
  const v = R * T * pi * (g0p + grp) / (p * 1000);
  const q = 1 + pi * grp;
  return {
    region: 2, p, T, rho: 1 / v,
    h: R * T * tau * (g0t + grt),
    u: R * T * (tau * (g0t + grt) - pi * (g0p + grp)),
    s: R * (tau * (g0t + grt) - (g0 + gr)),
    cp: -R * tau * tau * (g0tt + grtt),
    cv: R * (-tau * tau * (g0tt + grtt) - (1 + pi * grp - tau * pi * grpt) ** 2 / (1 - pi * pi * grpp)),
    alpha: (1 + pi * grp - tau * pi * grpt) / q / T,
    drhodp: (1 / v) * ((1 - pi * pi * grpp) / q / p),
  };
}

// ── Region 3: near-critical (Helmholtz free energy, ρ and T) ────────────────────
function phi3(rho: number, T: number) {
  const d = rho / RHOC, tau = TC / T;
  let f = R3_N1 * Math.log(d), fd = R3_N1 / d, fdd = -R3_N1 / (d * d), ft = 0, ftt = 0, fdt = 0;
  for (let i = 0; i < R3.n.length; i++) {
    const I = R3.I[i], J = R3.J[i], n = R3.n[i];
    const dI = d ** I, tJ = tau ** J;
    f += n * dI * tJ;
    if (I) {
      fd += n * I * d ** (I - 1) * tJ;
      fdd += n * I * (I - 1) * d ** (I - 2) * tJ;
      if (J) fdt += n * I * J * d ** (I - 1) * tau ** (J - 1);
    }
    if (J) {
      ft += n * dI * J * tau ** (J - 1);
      ftt += n * dI * J * (J - 1) * tau ** (J - 2);
    }
  }
  return { d, tau, f, fd, fdd, ft, ftt, fdt };
}
/** Region-3 pressure, MPa */
export const p3 = (rho: number, T: number) => { const x = phi3(rho, T); return rho * R * T * x.d * x.fd / 1000; };

function region3(rho: number, T: number): Omit<State, 'mu' | 'k'> {
  const { d, tau, f, fd, fdd, ft, ftt, fdt } = phi3(rho, T);
  const dpdrho = R * T * (2 * d * fd + d * d * fdd);        // kPa per kg/m³
  return {
    region: 3, p: rho * R * T * d * fd / 1000, T, rho,
    h: R * T * (tau * ft + d * fd),
    u: R * T * tau * ft,
    s: R * (tau * ft - f),
    cv: -R * tau * tau * ftt,
    cp: R * (-tau * tau * ftt + (d * fd - d * tau * fdt) ** 2 / (2 * d * fd + d * d * fdd)),
    alpha: (fd - tau * fdt) / (2 * fd + d * fdd) / T,
    drhodp: 1000 / dpdrho,
  };
}

/** Density in region 3 for a given p and T. Liquid-like roots are searched from high density down,
 *  vapour-like roots from low density up (the isotherm has a van der Waals loop below Tc). */
function rho3(p: number, T: number, side: 'liquid' | 'vapour'): number {
  const step = 0.1;
  let a: number, b: number;
  if (side === 'liquid') {
    b = 800; a = b;                          // region 3 never exceeds ~765 kg/m³ (100 MPa, 623.15 K); the equation turns over above ~850
    while (a > 1 && p3(a, T) > p) { b = a; a -= step; }
  } else {
    a = 1; b = a;
    while (b < 800 && p3(b, T) < p) { a = b; b += step; }
  }
  for (let i = 0; i < 60; i++) {            // bisection: p3(a) < p < p3(b)
    const m = (a + b) / 2;
    if (p3(m, T) < p) a = m; else b = m;
  }
  return (a + b) / 2;
}

// ── Transport properties ────────────────────────────────────────────────────────
const H0 = [1.67752, 2.20462, 0.6366564, -0.241605];
const HI = [0, 1, 2, 3, 0, 1, 2, 3, 5, 0, 1, 2, 3, 4, 0, 1, 0, 3, 4, 3, 5];
const HJ = [0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 4, 4, 5, 6, 6];
const HN = [0.520094, 0.850895e-1, -0.108374e1, -0.289555, 0.222531, 0.999115, 0.188797e1, 0.126613e1, 0.120573,
  -0.281378, -0.906851, -0.772479, -0.489837, -0.257040, 0.161913, 0.257399, -0.325372e-1, 0.698452e-1,
  0.872102e-2, -0.435673e-2, -0.593264e-3];

/** Viscosity, Pa·s (IAPWS 2008, μ₂ = 1 as recommended for industrial use). */
export function viscosity(rho: number, T: number): number {
  const t = T / TC, d = rho / RHOC;
  const mu0 = 100 * Math.sqrt(t) / H0.reduce((s, h, i) => s + h / t ** i, 0);
  let sum = 0;
  for (let i = 0; i < HN.length; i++) sum += HN[i] * (1 / t - 1) ** HI[i] * (d - 1) ** HJ[i];
  return mu0 * Math.exp(d * sum) * 1e-6;
}

const L0 = [2.443221e-3, 1.323095e-2, 6.770357e-3, -3.454586e-3, 4.096266e-4];
const L1 = [
  [1.60397357, -0.646013523, 0.111443906, 0.102997357, -0.0504123634, 0.00609859258],
  [2.33771842, -2.78843778, 1.53616167, -0.463045512, 0.0832827019, -0.00719201245],
  [2.19650529, -4.54580785, 3.55777244, -1.40944978, 0.275418278, -0.0205938816],
  [-1.21051378, 1.60812989, -0.621178141, 0.0716373224, 0, 0],
  [-2.7203370, 4.57586331, -3.18369245, 1.1168348, -0.19268305, 0.012913842],
];
// ζ at the reference temperature 1.5·Tc, by density range (R15-11 Table 6, industrial use)
const ZR: [number, number[]][] = [
  [0.310559006, [6.53786807199516, -5.61149954923348, 3.39624167361325, -2.27492629730878, 10.2631854662709, 1.97815050331519]],
  [0.776397516, [6.52717759281799, -6.30816983387575, 8.08379285492595, -9.82240510197603, 12.1358413791395, -5.54349664571295]],
  [1.242236025, [5.35500529896124, -3.96415689925446, 8.91990208918795, -12.0338729505790, 9.19494865194302, -2.16866274479712]],
  [1.863354037, [1.55225959906681, 0.464621290821181, 8.93237374861479, -11.0321960061126, 6.16780999933360, -0.965458722086812]],
  [Infinity, [1.11999926419994, 0.595748562571649, 9.88952565078920, -10.3255051147040, 4.66861294457414, -0.503243546373828]],
];

/** Thermal conductivity without the critical enhancement (λ₀·λ₁ of IAPWS 2011), W/(m·K). */
export function conductivityBackground(rho: number, T: number): number {
  const t = T / TC, d = rho / RHOC;
  const k0 = Math.sqrt(t) / L0.reduce((s, l, i) => s + l / t ** i, 0);
  let sum = 0;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) sum += L1[i][j] * (1 / t - 1) ** i * (d - 1) ** j;
  return k0 * Math.exp(d * sum) * 1e-3;
}

/** Thermal conductivity, W/(m·K) (IAPWS 2011, critical enhancement in its industrial form). */
export function conductivity(st: Omit<State, 'k'>): number {
  const { rho, T, cp, cv, drhodp, mu } = st;
  const t = T / TC, d = rho / RHOC;
  // critical enhancement
  const a = ZR.find(([lim]) => d <= lim)![1];
  const zetaR = 1 / a.reduce((s, ai, i) => s + ai * d ** i, 0);             // reduced (∂ρ/∂p)_T at 1.5·Tc
  let dX = d * ((PC / RHOC) * drhodp - zetaR * 1.5 / t);
  if (dX < 0) dX = 0;
  const X = 0.13 * (dX / 0.06) ** (0.63 / 1.239);
  const y = X / 0.4;
  const kappa = cp / cv;
  const Z = y < 1.2e-7 ? 0
    : (2 / (Math.PI * y)) * (((1 - 1 / kappa) * Math.atan(y) + y / kappa) - (1 - Math.exp(-1 / (1 / y + (y * y) / (3 * d * d)))));
  const k2 = (177.8514 * d * cp / 0.46151805 * t / (mu / 1e-6)) * Z;
  return conductivityBackground(rho, T) + k2 * 1e-3;
}

function finish(st: Omit<State, 'mu' | 'k'>): State {
  const mu = viscosity(st.rho, st.T);
  return { ...st, mu, k: conductivity({ ...st, mu }) };
}

// ── Public API ──────────────────────────────────────────────────────────────────
export type Phase = 'liquid' | 'vapour' | 'supercritical';

/** Single-phase state at p (MPa) and T (K). Throws outside the range of regions 1–3. On the saturation line
 *  (p = psat(T)) `side` chooses water or steam. */
export function stateAt(p: number, T: number, side?: 'liquid' | 'vapour'): State {
  if (!(T >= T_MIN && T <= T_MAX && p > 0 && p <= P_MAX)) throw new RangeError('outside IF97 range');
  if (T <= 623.15) {
    const ps = psat(T);
    const liquid = side ? side === 'liquid' : p >= ps;
    return finish(liquid ? region1(p, T) : region2(p, T));
  }
  if (T > 863.15 || p <= pB23(T)) return finish(region2(p, T));
  // region 3
  const sideR3 = T >= TC ? 'liquid' : side ?? (p >= psat(T) ? 'liquid' : 'vapour');
  return finish(region3(rho3(p, T, sideR3), T));
}

export function phaseAt(p: number, T: number): Phase {
  if (T >= TC && p >= PC) return 'supercritical';
  if (T >= TC) return 'vapour';
  return p >= psat(T) ? 'liquid' : 'vapour';
}

export interface Saturation { p: number; T: number; liquid: State; vapour: State }

/** Saturated water and steam at pressure p (MPa), triple point to critical point. */
export function satP(p: number): Saturation {
  if (!(p >= P_TRIPLE * (1 - 1e-9) && p <= PC)) throw new RangeError('outside saturation range');
  return sat(p, tsat(p));
}
/** Saturated water and steam at temperature T (K), triple point (273.16 K) to critical point. */
export function satT(T: number): Saturation {
  if (!(T >= T_TRIPLE - 1e-9 && T <= TC)) throw new RangeError('outside saturation range');
  return sat(psat(T), T);
}
function sat(p: number, T: number): Saturation {
  if (T > TC - 1e-4) {                       // at the critical point (within 0.1 mK) both phases are the same
    const c = finish(region3(RHOC, TC));
    return { p, T, liquid: c, vapour: c };
  }
  if (T <= 623.15) return { p, T, liquid: finish(region1(p, T)), vapour: finish(region2(p, T)) };
  return { p, T, liquid: finish(region3(rho3(p, T, 'liquid'), T)), vapour: finish(region3(rho3(p, T, 'vapour'), T)) };
}
