// Noise — native rebuild of the Zoho sheet "Noise Calculation by API 521" (Phase 7). API RP 521 (1997) 5.4.4.3:
// sound pressure level 30 m (100 ft) from the point of discharge L30 = L + 10·log10(½·W·c²) (Eq. 58), c = √(k·R·T/M)
// (Eq. 60, API's 91.2 = √8314), L from Fig. 23 against the pressure ratio, and Lp = L30 − 20·log10(r/30) (Eq. 62),
// +3 dB for hemispherical spreading (API note). Owner's choices 2026-11-25: a new continuous fit of Fig. 23
// (digitized from the printed chart; the sheet's fit was up to 0.9 dB high with a 0.4 dB step, NOI-1), extended
// outside PR 1.5–10 with a warning; distance for a given level; several sources combined; steam from IAPWS-IF97.

export const R = 8.314462618;
/** speed of sound in the gas, m/s (T in K, M in kg/kmol) */
export const sonic = (k: number, T: number, M: number) => Math.sqrt(k * R * T / (M / 1000));
/** API Fig. 23: L = L30 − 10·log10(½·W·c²) against PR = P1/P2. Two straight lines on the chart's log axis fitted to
 *  the digitized curve (300 dpi): 37.600·ln PR + 13.391 up to the knee, 1.844·ln PR + 51.900 above; the knee where
 *  they meet (PR ≈ 2.936). */
export const FIG23 = { a1: 37.600, b1: 13.391, a2: 1.844, b2: 51.900 };
export const fig23 = (PR: number) => Math.min(FIG23.a1 * Math.log(PR) + FIG23.b1, FIG23.a2 * Math.log(PR) + FIG23.b2);
export const FIG23_KNEE = Math.exp((FIG23.b2 - FIG23.b1) / (FIG23.a1 - FIG23.a2));
export const FIG23_RANGE: [number, number] = [1.5, 10];
/** the original sheet's fit (for the reproduction test) */
export const fig23Sheet = (PR: number) => (38.95 * Math.log(PR) + 12.91 < 54.5 ? 38.95 * Math.log(PR) + 12.91 : 2.19 * Math.log(PR) + 51.75);

/** acoustic reference power ½·W·c², W */
export const halfWc2 = (W: number, c: number) => 0.5 * W * c * c;
/** level at 30 m */
export const L30 = (L: number, W: number, c: number) => L + 10 * Math.log10(halfWc2(W, c));
/** level at distance r (m); hemi adds 3 dB */
export const Lp = (l30: number, r: number, hemi = false) => l30 - 20 * Math.log10(r / 30) + (hemi ? 3 : 0);
/** distance at which the level falls to Lmax */
export const distanceFor = (l30: number, Lmax: number, hemi = false) => 30 * 10 ** ((l30 + (hemi ? 3 : 0) - Lmax) / 20);
/** energy sum of levels at one point */
export const combine = (levels: number[]) => 10 * Math.log10(levels.reduce((s, l) => s + 10 ** (l / 10), 0));

/** EU Directive 2003/10/EC, Article 3: daily exposure LEX,8h dB(A) and peak sound pressure (Pa; dB(C) re 20 µPa). */
export const EU_LIMITS: { name: string; LEX: number; peakPa: number; peakdB: number }[] = [
  { name: 'Exposure limit value', LEX: 87, peakPa: 200, peakdB: 140 },
  { name: 'Upper exposure action value', LEX: 85, peakPa: 140, peakdB: 137 },
  { name: 'Lower exposure action value', LEX: 80, peakPa: 112, peakdB: 135 },
];
