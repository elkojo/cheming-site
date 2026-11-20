// Standard pipe dimensions: carbon steel Schedule STD (ASME B36.10M) and stainless Schedule 10S (ASME B36.19M).
// Sources (they agree): engineeringtoolbox.com "ASME/ANSI B36.10/19 Steel Pipes – Dimensions" (NPS 1/8–18) and
// "Stainless Steel Pipes – Dimensions" (NPS 1/2–12); Wikipedia "Nominal Pipe Size" tables based on B36.10M/B36.19M
// (NPS 10–48). Read 2026-11-20. Inches; DN in mm.

export interface Pipe { nps: string; dn: number; od: number; wall: number }
/** inside diameter, in */
export const id = (p: Pipe) => p.od - 2 * p.wall;

// NPS, DN, OD (in), STD wall (in), 10S wall (in) or null where 10S does not exist
const T: [string, number, number, number, number | null][] = [
  ['1/8', 6, 0.405, 0.068, 0.049], ['1/4', 8, 0.540, 0.088, 0.065], ['3/8', 10, 0.675, 0.091, 0.065],
  ['1/2', 15, 0.840, 0.109, 0.083], ['3/4', 20, 1.050, 0.113, 0.083], ['1', 25, 1.315, 0.133, 0.109],
  ['1 1/4', 32, 1.660, 0.140, 0.109], ['1 1/2', 40, 1.900, 0.145, 0.109], ['2', 50, 2.375, 0.154, 0.109],
  ['2 1/2', 65, 2.875, 0.203, 0.120], ['3', 80, 3.500, 0.216, 0.120], ['3 1/2', 90, 4.000, 0.226, 0.120],
  ['4', 100, 4.500, 0.237, 0.120], ['5', 125, 5.563, 0.258, 0.134], ['6', 150, 6.625, 0.280, 0.134],
  ['8', 200, 8.625, 0.322, 0.148], ['10', 250, 10.750, 0.365, 0.165], ['12', 300, 12.750, 0.375, 0.180],
  ['14', 350, 14.0, 0.375, 0.188], ['16', 400, 16.0, 0.375, 0.188], ['18', 450, 18.0, 0.375, 0.188],
  ['20', 500, 20.0, 0.375, 0.218], ['22', 550, 22.0, 0.375, 0.218], ['24', 600, 24.0, 0.375, 0.250],
  ['26', 650, 26.0, 0.375, null], ['28', 700, 28.0, 0.375, null], ['30', 750, 30.0, 0.375, 0.312],
  ['32', 800, 32.0, 0.375, null], ['34', 850, 34.0, 0.375, null], ['36', 900, 36.0, 0.375, null],
  ['42', 1050, 42.0, 0.375, null], ['48', 1200, 48.0, 0.375, null],
];

/** Carbon steel, Schedule STD (ASME B36.10M) */
export const CS_STD: Pipe[] = T.map(([nps, dn, od, wall]) => ({ nps, dn, od, wall }));
/** Stainless steel, Schedule 10S (ASME B36.19M) */
export const SS_10S: Pipe[] = T.filter((r) => r[4] !== null).map(([nps, dn, od, , w]) => ({ nps, dn, od, wall: w! }));

/** The smallest pipe whose inside diameter is at least d (in), and the size below it. */
export function pick(list: Pipe[], d: number): { up?: Pipe; down?: Pipe } {
  const i = list.findIndex((p) => id(p) >= d);
  if (i === -1) return { down: list[list.length - 1] };
  return { up: list[i], down: i > 0 ? list[i - 1] : undefined };
}
