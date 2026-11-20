// Sieve: U.S. standard sieve series (ASTM E11) with Tyler mesh equivalents, and a particle-size lookup.
// Native rebuild of the Zoho sheet "Sieve Opening Size" (Phase 7), approved by the owner 2026-11-20:
// - Opening: current ASTM E11 (E11-95 and later; the same apertures as ISO 565 / ISO 3310-1).
//   Sources: wovenwire.com ASTM/ISO sieve table (E11-95), ecoshell.com ASTM E-11 table (they agree).
// - Old E11: the openings of the earlier ASTM E11 series, as on the Zoho sheet (e.g. No. 20 = 841 µm).
// - Tyler: Tyler mesh equivalents. Sources: Kuo & Acharya, Applications of Turbulent and Multiphase
//   Combustion (Wiley 2012), Table D.1; AGM "US Sieve Series and Tyler Mesh Size Equivalents" (they agree).
// - Typical material: the sheet's notes.
// The sheet's "No. 3½" row was split over two columns ("1/2" | "3"); its typed inch column disagreed with
// its micron column. Here the inch value is derived from the opening.

export interface Sieve {
  /** U.S. designation: inch size for the coarse sieves, "No. n" (openings per inch) for the fine ones */
  us: string;
  /** current ASTM E11 / ISO opening, mm */
  mm: number;
  /** old ASTM E11 opening, µm (Zoho sheet) */
  old: number;
  /** Tyler mesh equivalent, if any */
  tyler?: string;
  material?: string;
}

export const SIEVES: Sieve[] = [
  { us: '1 in', mm: 25.0, old: 25400 },
  { us: '7/8 in', mm: 22.4, old: 22600 },
  { us: '3/4 in', mm: 19.0, old: 19000 },
  { us: '5/8 in', mm: 16.0, old: 16000 },
  { us: '0.530 in', mm: 13.2, old: 13500 },
  { us: '1/2 in', mm: 12.5, old: 12700 },
  { us: '7/16 in', mm: 11.2, old: 11200 },
  { us: '3/8 in', mm: 9.5, old: 9510 },
  { us: '5/16 in', mm: 8.0, old: 8000, tyler: '2½' },
  { us: '0.265 in', mm: 6.7, old: 6730, tyler: '3' },
  { us: '1/4 in', mm: 6.3, old: 6350 },
  { us: 'No. 3½', mm: 5.6, old: 5660, tyler: '3½' },
  { us: 'No. 4', mm: 4.75, old: 4760, tyler: '4' },
  { us: 'No. 5', mm: 4.0, old: 4000, tyler: '5' },
  { us: 'No. 6', mm: 3.35, old: 3360, tyler: '6' },
  { us: 'No. 7', mm: 2.80, old: 2830, tyler: '7' },
  { us: 'No. 8', mm: 2.36, old: 2380, tyler: '8' },
  { us: 'No. 10', mm: 2.00, old: 2000, tyler: '9' },
  { us: 'No. 12', mm: 1.70, old: 1680, tyler: '10' },
  { us: 'No. 14', mm: 1.40, old: 1410, tyler: '12' },
  { us: 'No. 16', mm: 1.18, old: 1190, tyler: '14' },
  { us: 'No. 18', mm: 1.00, old: 1000, tyler: '16' },
  { us: 'No. 20', mm: 0.850, old: 841, tyler: '20' },
  { us: 'No. 25', mm: 0.710, old: 707, tyler: '24' },
  { us: 'No. 30', mm: 0.600, old: 595, tyler: '28', material: 'Beach sand' },
  { us: 'No. 35', mm: 0.500, old: 500, tyler: '32' },
  { us: 'No. 40', mm: 0.425, old: 420, tyler: '35' },
  { us: 'No. 45', mm: 0.355, old: 354, tyler: '42' },
  { us: 'No. 50', mm: 0.300, old: 297, tyler: '48' },
  { us: 'No. 60', mm: 0.250, old: 250, tyler: '60', material: 'Fine sand' },
  { us: 'No. 70', mm: 0.212, old: 210, tyler: '65' },
  { us: 'No. 80', mm: 0.180, old: 177, tyler: '80' },
  { us: 'No. 100', mm: 0.150, old: 149, tyler: '100' },
  { us: 'No. 120', mm: 0.125, old: 125, tyler: '115' },
  { us: 'No. 140', mm: 0.106, old: 105, tyler: '150' },
  { us: 'No. 170', mm: 0.090, old: 88, tyler: '170' },
  { us: 'No. 200', mm: 0.075, old: 74, tyler: '200', material: 'Portland cement' },
  { us: 'No. 230', mm: 0.063, old: 63, tyler: '250' },
  { us: 'No. 270', mm: 0.053, old: 53, tyler: '270' },
  { us: 'No. 325', mm: 0.045, old: 44, tyler: '325', material: 'Silt' },
  { us: 'No. 400', mm: 0.038, old: 37, tyler: '400', material: 'Plant pollen' },
];

/** Length units for openings and particle size; factor to mm. */
export const LENGTH: { label: string; f: number }[] = [
  { label: 'µm', f: 1e-3 }, { label: 'mm', f: 1 }, { label: 'in', f: 25.4 },
];
export const lengthUnit = (label: string) => LENGTH.find((u) => u.label === label)!;

export interface Lookup {
  /** finest sieve the particle still passes (opening > d), or undefined if it is larger than every opening */
  passes?: number;
  /** coarsest sieve that retains it (opening ≤ d), or undefined if it passes every sieve (goes to the pan) */
  retained?: number;
}

/** Where a particle of size d (mm) ends up in a full stack: it passes every sieve with a larger opening and stays
 *  on the first one whose opening is not larger than d. Uses the current openings, or the old ones. */
export function lookup(d: number, old = false): Lookup {
  const op = (s: Sieve) => (old ? s.old / 1000 : s.mm);
  const r = SIEVES.findIndex((s) => op(s) <= d * (1 + 1e-12));
  if (r === -1) return { passes: SIEVES.length - 1 };
  return { retained: r, passes: r > 0 ? r - 1 : undefined };
}
