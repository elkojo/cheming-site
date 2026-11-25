// Flare Stack — native rebuild of the Zoho sheet "Flare Stack Sizing by Calculation of Flame Distortion Caused by Wind"
// (Phase 7). API RP 521 (1997) simple approach (4.4.2.3, 5.4.3.1, Appendix C.2): tip diameter from the Mach number
// (Eq. 23/24, Appendix Eq. 34), flame length (Fig. 9, the sheet's curve fit), flame distortion by wind (Fig. 10, the
// sheet's fits), flame centre at mid-flame, Hajek & Ludwig distance D = √(τ·F·Q/(4π·K)) (Eq. 20) with the
// Brzustowski & Sommer transmittance (Appendix Eq. C-2) or τ = 1; points of interest at grade under the flame and at
// any distance/elevation; stack height required or radiation for a given height. Owner's choices 2026-11-25.
// SI: kg/s, K, Pa, m, W, W/m².

export const R = 8.314462618;   // J/(mol·K)
export const PATM = 101325;
const PI = Math.PI;

export interface Gas { W: number; M: number; T: number; Z: number; k: number; /** pressure at the tip outlet, Pa abs */ p2: number }
/** Mach number at the tip: Ma = 4·W/(π·d²·p2)·√(Z·R·T/(k·M)) (API Eq. 24: 3.23·10⁻⁵·W/(p2·d²)·√(Z·T/(k·M)) in kg/h, kPa, m) */
export const machOf = (g: Gas, d: number) => 4 * g.W / (PI * d * d * g.p2) * Math.sqrt(g.Z * R * g.T / (g.k * g.M / 1000));
export const diameterFor = (g: Gas, Ma: number) => Math.sqrt(4 * g.W / (PI * Ma * g.p2) * Math.sqrt(g.Z * R * g.T / (g.k * g.M / 1000)));
/** API's rounded constant (for the reproduction tests) */
export const machAPI = (g: Gas, d: number) => 3.23e-5 * (g.W * 3600) / (g.p2 / 1000 * d * d) * Math.sqrt(g.Z * g.T / (g.k * g.M));
export const sonic = (g: Gas) => Math.sqrt(g.k * g.Z * R * g.T / (g.M / 1000));
export const density = (g: Gas) => g.p2 * g.M / 1000 / (g.Z * R * g.T);
/** exit velocity uj = W/(ρ·π·d²/4) (with Z, FLR-5) */
export const exitVelocity = (g: Gas, d: number) => g.W / (density(g) * PI * d * d / 4);

/** Flame length, API Fig. 9 (the original sheet's fit: log L = 0.45899·log Q[kW] − 0.94676), Q in W. */
export const flameLength = (Q: number) => 10 ** (0.458990919192443 * Math.log10(Q / 1000) - 0.946760764349705);
/** Wind distortion, API Fig. 10 (the original sheet's fits), u = u∞/uj */
export const dxL = (u: number) => (0.00041747068 + 34.778454 * u) / (1 + 34.287096 * u + 0.49941884 * u * u);
export const dyL = (u: number) => (1 + 154.33643 * u) / (1 + 212.17435 * u + 1448.9956 * u * u);

/** Brzustowski & Sommer transmittance τ = 0.79·(100/RH)^(1/16)·(c/D)^(1/16), RH in %, D in m, c = 30.5 m (API C-2). */
export const tauBS = (RH: number, D: number, c = 30.5) => 0.79 * (100 / RH) ** (1 / 16) * (c / D) ** (1 / 16);
export type TauMode = 'bs' | 'one';
export interface Rad { F: number; Q: number; RH: number; tau: TauMode; /** background (solar) radiation, W/m² */ K0: number; c?: number }
/** Radiation at distance D from the flame centre: K = τ·F·Q/(4π·D²) + K0 */
export function radiation(r: Rad, D: number): { K: number; tau: number } {
  const tau = r.tau === 'one' ? 1 : tauBS(r.RH, D, r.c);
  return { K: tau * r.F * r.Q / (4 * PI * D * D) + r.K0, tau };
}
/** Distance at which the radiation equals K (closed form; with B&S τ: D^(33/16) = 0.79·(100/RH)^(1/16)·c^(1/16)·F·Q/(4π·(K − K0))) */
export function distanceFor(r: Rad, K: number): { D: number; tau: number } {
  const net = K - r.K0;
  if (!(net > 0)) return { D: NaN, tau: NaN };
  if (r.tau === 'one') return { D: Math.sqrt(r.F * r.Q / (4 * PI * net)), tau: 1 };
  const c = r.c ?? 30.5;
  const D = (0.79 * (100 / r.RH) ** (1 / 16) * c ** (1 / 16) * r.F * r.Q / (4 * PI * net)) ** (16 / 33);
  return { D, tau: tauBS(r.RH, D, c) };
}

export interface Flame { L: number; u: number; dx: number; dy: number; uj: number }
export function flame(g: Gas, d: number, Q: number, uw: number): Flame {
  const uj = exitVelocity(g, d), u = uw / uj, L = flameLength(Q);
  return { L, u, uj, dx: dxL(u) * L, dy: dyL(u) * L };
}

/** Required stack height so that the radiation at a point (horizontal distance r from the stack, elevation h above
 *  grade) does not exceed K: flame centre at (½Δx, H + ½Δy); D from K; H = √(D² − r′²) + h − ½Δy, r′ = r − ½Δx.
 *  If |r′| ≥ D the point is never limiting (NaN). POI at grade under the flame: r = ½Δx, h = 0 → H = D − ½Δy. */
export function heightFor(f: Flame, D: number, r: number, h: number): number {
  const rp = r - f.dx / 2;
  if (Math.abs(rp) >= D) return NaN;
  return Math.sqrt(D * D - rp * rp) + h - f.dy / 2;
}
/** Radiation at a point for a given stack height. */
export function radiationAt(f: Flame, rad: Rad, H: number, r: number, h: number) {
  const D = Math.hypot(r - f.dx / 2, H + f.dy / 2 - h);
  return { D, ...radiation(rad, D) };
}

/** Stack support (API RP 521 1997, 4.4.3.3): self-supported economically to 60–90 m; guyed, guy radius ≈ H/2,
 *  used to 180–250 m; derrick on larger stacks or where land excludes guy wires. */
export function support(H: number): { kind: string; guy: number } {
  if (H <= 60) return { kind: 'Self-supported', guy: NaN };
  if (H <= 90) return { kind: 'Self-supported or guyed', guy: H / 2 };
  if (H <= 250) return { kind: 'Guyed (or derrick)', guy: H / 2 };
  return { kind: 'Derrick — above the heights of guyed stacks in API', guy: NaN };
}

/** Smokeless steam, API Eq. 53 / GPSA Eq. 5-35: W_steam = W_HC·(0.68 − 10.8/M) (steam–CO₂ mass ratio ≈ 0.7). */
export const steamRate = (W: number, M: number) => W * (0.68 - 10.8 / M);

/** Purge gas through the tip at a velocity v: actual m³/s = v·π·d²/4. API RP 521 (1997) 4.4.3.4.2: velocity seals
 *  0.02–0.04 ft/s, molecular (diffusion) seals 0.01 ft/s. */
export const FT = 0.3048;
export const PURGE_V = { velocity: [0.02 * FT, 0.04 * FT] as [number, number], molecular: [0.01 * FT, 0.01 * FT] as [number, number] };
export const purgeFlow = (d: number, v: number) => v * PI * d * d / 4;

/** API RP 521 (1997) Table 8, recommended design total radiation (incl. solar), W/m², with Btu/(h·ft²). */
export const K_TABLE: { K: number; btu: number; text: string }[] = [
  { K: 15770, btu: 5000, text: 'Structures and areas where operators are not likely to work and shelter from radiant heat is available (e.g. behind equipment)' },
  { K: 9460, btu: 3000, text: 'At design flare release, any location to which people have access (e.g. at grade below the flare or a service platform of a nearby tower); exposure limited to a few seconds, enough for escape only' },
  { K: 6310, btu: 2000, text: 'Areas where emergency actions lasting up to 1 minute may be required by personnel without shielding but with appropriate clothing' },
  { K: 4730, btu: 1500, text: 'Areas where emergency actions lasting several minutes may be required by personnel without shielding but with appropriate clothing' },
  { K: 1580, btu: 500, text: 'Any location where personnel with appropriate clothing may be continuously exposed' },
];
/** API RP 521 (1997) Table 9 (U.S. Bureau of Mines): fraction of heat radiated by gas, burner diameter (cm). */
export const F_TABLE: { gas: string; d: number; F: number }[] = [
  ...[[0.51, 0.095], [0.91, 0.091], [1.90, 0.097], [4.10, 0.111], [8.40, 0.156], [20.30, 0.154], [40.60, 0.169]].map(([d, F]) => ({ gas: 'Hydrogen', d, F })),
  ...[[0.51, 0.215], [0.91, 0.253], [1.90, 0.286], [4.10, 0.285], [8.40, 0.291], [20.30, 0.280], [40.60, 0.299]].map(([d, F]) => ({ gas: 'Butane', d, F })),
  ...[[0.51, 0.103], [0.91, 0.116], [1.90, 0.160], [4.10, 0.161], [8.40, 0.147]].map(([d, F]) => ({ gas: 'Methane', d, F })),
  ...[[20.30, 0.192], [40.60, 0.232]].map(([d, F]) => ({ gas: 'Natural gas (95 % CH₄)', d, F })),
];
/** GPSA 12th ed. Fig. 5-20, vendor values (maximum 0.13 for any gas). */
export const F_GPSA: [string, number][] = [['Carbon monoxide', 0.075], ['Hydrogen', 0.075], ['Hydrogen sulfide', 0.070], ['Ammonia', 0.070], ['Methane', 0.10], ['Propane', 0.11], ['Butane', 0.12], ['Ethylene', 0.12], ['Propylene', 0.13]];
