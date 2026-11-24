// Centrifugal pump circuit (native Pump tool, Phase 7). Rebuilt from the cheming.site Zoho sheet "Pump" with the owner's
// decisions of 2026-11-24 (ORIGINAL-ERRORS.md PUMP-1…12):
// - flow given as the NORMAL flow; three cases as % of it, case 0 = rated (the pump is sized there);
// - pressure losses entered for the rated case and scaled with (Q/Q_rated)² for the other cases;
// - pump curve H(Q) = H_so − (H_so − H_r)·(Q/Q_r)², H_so = (1 + R_so)·H_r (the sheet assumed a flat curve, PUMP-1);
// - NPSHr estimated from the suction specific speed at the rated flow per impeller eye (Evans, in Branan 2002),
//   used for every case; Ns with the head per stage;
// - maximum discharge (piping design) pressure per API 610 5.3.1 / 5.3.2 c): maximum suction pressure + shut-off
//   differential, scaled to trip speed for turbine drivers;
// - motor rating per API 610 Table 11; steam turbine 110 % of rated power (API 610 6.1.8);
// - efficiency estimate: Branan's fit to the GPSA curves (percent; F = 50–300 ft, G = 100–1000 US gpm).
// All quantities SI: Pa (absolute), m, kg/m³, kg/s, m³/s, W, rpm.
import { G } from './units.ts';
import { GPM } from './pump-units.ts';

const FT = 0.3048;

export interface PumpInput {
  /** normal total mass flow, kg/s */
  m: number;
  rho: number;
  /** vapour pressure, Pa (A) */
  pv: number;
  /** pumps operating in parallel */
  n: number;
  /** case flows in % of normal; [0] = rated */
  pct: [number, number, number];
  // suction
  pos: number; elsg: number; lll: number; elclg: number;
  /** suction equipment and line losses at the rated flow, Pa */
  dpSeq: number; dpSfr: number;
  // discharge
  pt: number; elclt: number;
  /** discharge equipment, flow meter, line losses and control valve at the rated flow, Pa */
  dpDeq: number; dpDfe: number; dpDfr: number; dpCv: number;
  // pump
  /** rise of head from rated point to shut-off, fraction (0.30) */
  rso: number;
  N: number;
  /** impeller eyes: 1 single suction, 2 double suction */
  eyes: 1 | 2;
  stages: number;
  /** suction specific speed, rpm·(m³/s)^0.5/m^0.75 */
  nss: number;
  /** NPSH safety margin, m */
  margin: number;
  // design pressure
  /** suction vessel design pressure, Pa (A) */
  pds: number;
  /** HLL above pump centreline, m */
  hll: number;
  driver: 'motor' | 'turbine';
  /** trip speed / rated speed (1.10) — turbine only */
  trip: number;
  // power
  /** pump efficiency per case, fraction */
  eff: [number, number, number];
  /** driver efficiency, fraction */
  effDrv: number;
}

export interface PumpCase {
  pct: number;
  /** total mass flow, kg/s */
  m: number;
  /** volume flow per pump, m³/s */
  q: number;
  /** (Q/Q_r)² */
  s: number;
  pstat: number; dpSeq: number; dpSfr: number; ps: number;
  pclt: number; dpDeq: number; dpDfe: number; dpDfr: number; dpCv: number; pd: number;
  /** pump differential pressure and head */
  dp: number; h: number;
  /** system head without control valve, m */
  hsys: number;
  npsha: number; ratio: number; elsMin: number; npshOk: boolean;
  whp: number; bhp: number; drv: number;
}

export interface PumpResult {
  cases: PumpCase[];
  qr: number;
  hr: number;
  /** shut-off head of the operating curve (rated speed), m */
  hso0: number;
  /** shut-off head for the design pressure (incl. trip speed), m */
  hso: number;
  pdd: number;
  ns: number;
  hvp: number;
  npshrCl: number;
  npshr: number;
  u: number;
  dImp: number;
  /** minimum driver rating, W, and the API 610 percentage used */
  drvRating: number; drvPct: number;
  /** Branan/GPSA efficiency estimate at the rated point, %, and whether inside its range */
  effEst: number; effEstInRange: boolean;
}

/** Pump head of the parabolic curve at flow q (per pump). */
export const curveHead = (q: number, qr: number, hr: number, hso0: number) => hso0 - (hso0 - hr) * (q / qr) ** 2;

/** Branan (2002) fit to the GPSA pump-efficiency curves: efficiency in %, F head in ft, G flow in US gpm. */
export function brananEfficiency(F: number, G_: number): number {
  return 80 - 0.2855 * F + 3.78e-4 * F * G_ - 2.38e-7 * F * G_ ** 2 + 5.39e-4 * F ** 2 - 6.39e-7 * F ** 2 * G_ + 4e-10 * F ** 2 * G_ ** 2;
}

/** API 610 (10th ed.) Table 11: smallest motor nameplate rating P_m with P_m ≥ k(P_m)·P. */
export function motorRating(P: number): { rating: number; pct: number } {
  const kW = P / 1000;
  if (1.25 * kW < 22) return { rating: 1.25 * P, pct: 125 };
  if (1.15 * kW <= 55) return { rating: Math.max(22e3, 1.15 * P), pct: 115 };
  return { rating: Math.max(55e3, 1.1 * P), pct: 110 };
}

export function pump(x: PumpInput): PumpResult {
  const rg = x.rho * G;
  const qOf = (pct: number) => (x.m * pct / 100) / x.rho / x.n;
  const qr = qOf(x.pct[0]);
  const pstat = (x.elsg + x.lll - x.elclg) * rg;
  const pclt = x.elclt * rg;
  const hvp = (x.pos - x.pv) / rg;

  // rated point
  const psR = x.pos + pstat - x.dpSeq - x.dpSfr;
  const pdR = x.pt + pclt + x.dpDeq + x.dpDfe + x.dpDfr + x.dpCv;
  const dpR = pdR - psR;
  const hr = dpR / rg;
  const hso0 = (1 + x.rso) * hr;

  const npshrCl = (x.N * Math.sqrt(qr / x.eyes) / x.nss) ** (4 / 3);
  const npshr = npshrCl + x.margin;
  const hStage = hr / x.stages;
  const ns = x.N * Math.sqrt(qr) / hStage ** 0.75;
  const u = Math.sqrt(2 * G * hStage);
  const dImp = 60 * u / (Math.PI * x.N);

  const trip = x.driver === 'turbine' ? x.trip : 1;
  const hso = trip ** 2 * hso0;
  const pdd = x.pds + (hso + x.hll) * rg;

  const cases: PumpCase[] = x.pct.map((pct, i) => {
    const q = qOf(pct), s = (q / qr) ** 2;
    const dpSeq = x.dpSeq * s, dpSfr = x.dpSfr * s;
    const ps = x.pos + pstat - dpSeq - dpSfr;
    const dpDeq = x.dpDeq * s, dpDfe = x.dpDfe * s, dpDfr = x.dpDfr * s;
    const pRest = x.pt + pclt + dpDeq + dpDfe + dpDfr;   // discharge pressure needed without the control valve
    const h = i === 0 ? hr : curveHead(q, qr, hr, hso0);
    const dp = h * rg;
    const pd = ps + dp;
    const dpCv = i === 0 ? x.dpCv : pd - pRest;
    const npsha = x.elsg + x.lll - x.elclg - (dpSeq + dpSfr) / rg + hvp;
    const elsMin = npshr + x.elclg + (dpSeq + dpSfr) / rg - x.lll - hvp;
    const whp = q * dp, bhp = whp / x.eff[i], drv = bhp / x.effDrv;
    return {
      pct, m: x.m * pct / 100, q, s, pstat, dpSeq, dpSfr, ps, pclt, dpDeq, dpDfe, dpDfr, dpCv, pd, dp, h,
      hsys: (pRest - ps) / rg, npsha, ratio: npsha / npshrCl, elsMin, npshOk: npsha >= npshr, whp, bhp, drv,
    };
  });

  const bhpR = cases[0].bhp;
  const d = x.driver === 'motor' ? motorRating(bhpR) : { rating: 1.1 * bhpR, pct: 110 };
  const F = hr / FT, Gq = qr / GPM;
  return {
    cases, qr, hr, hso0, hso, pdd, ns, hvp, npshrCl, npshr, u, dImp,
    drvRating: d.rating, drvPct: d.pct,
    effEst: brananEfficiency(F, Gq), effEstInRange: F >= 50 && F <= 300 && Gq >= 100 && Gq <= 1000,
  };
}

/** Pump and system curves for the chart: head (m) vs flow per pump (m³/s), at nPts points from 0 to qMax. */
export function curves(x: PumpInput, r: PumpResult, qMax: number, nPts = 60): { q: number; pump: number; sys: number }[] {
  const rg = x.rho * G;
  const pstat = (x.elsg + x.lll - x.elclg) * rg, pclt = x.elclt * rg;
  const out: { q: number; pump: number; sys: number }[] = [];
  for (let i = 0; i <= nPts; i++) {
    const q = qMax * i / nPts, s = (q / r.qr) ** 2;
    const ps = x.pos + pstat - (x.dpSeq + x.dpSfr) * s;
    const pRest = x.pt + pclt + (x.dpDeq + x.dpDfe + x.dpDfr) * s;
    out.push({ q, pump: curveHead(q, r.qr, r.hr, r.hso0), sys: (pRest - ps) / rg });
  }
  return out;
}
