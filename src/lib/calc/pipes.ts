// Standard steel pipe dimensions: ASME B36.10M (carbon steel: Sch 5–160, STD, XS, XXS) and B36.19M (stainless:
// 5S, 10S, 40S, 80S), NPS 1/8–48. The wall table is generated (pipes-data.ts) from three sources that agree:
// the fluids library's schedule tables, the Engineering ToolBox (NPS 1/8–18) and Wikipedia "Nominal Pipe Size"
// tables. Inches; DN in mm. Read 2026-11-20 (STD, 10S) and 2026-11-22 (all schedules).
import { PIPE_DATA, SCHEDULES, type Schedule } from './pipes-data.ts';

export { SCHEDULES, type Schedule };
export interface Pipe { nps: string; dn: number; od: number; wall: number }
/** inside diameter, in */
export const id = (p: Pipe) => p.od - 2 * p.wall;

export interface Size { nps: string; value: number; dn: number; od: number; walls: Partial<Record<Schedule, number>> }
export const SIZES: Size[] = PIPE_DATA.map(([nps, value, dn, od, walls]) => ({ nps, value, dn, od, walls }));

/** The schedules that exist for a size, in the order of SCHEDULES. */
export const schedulesFor = (nps: string): Schedule[] => {
  const s = SIZES.find((x) => x.nps === nps);
  return s ? SCHEDULES.filter((k) => s.walls[k] !== undefined) : [];
};

/** A pipe by NPS label and schedule, or undefined where that schedule does not exist. */
export function pipe(nps: string, sched: Schedule): Pipe | undefined {
  const s = SIZES.find((x) => x.nps === nps);
  const w = s?.walls[sched];
  return s && w !== undefined ? { nps: s.nps, dn: s.dn, od: s.od, wall: w } : undefined;
}

/** All sizes of one schedule (optionally only the listed NPS). */
const series = (sched: Schedule, only?: string[]): Pipe[] =>
  SIZES.filter((s) => s.walls[sched] !== undefined && (!only || only.includes(s.nps)))
    .map((s) => ({ nps: s.nps, dn: s.dn, od: s.od, wall: s.walls[sched]! }));

// The Pipe Size tool's lists, unchanged since it went live (2026-11-20): STD without NPS 38, 40, 44, 46.
const PIPE_SIZE_NPS = ['1/8', '1/4', '3/8', '1/2', '3/4', '1', '1 1/4', '1 1/2', '2', '2 1/2', '3', '3 1/2', '4', '5', '6',
  '8', '10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30', '32', '34', '36', '42', '48'];
/** Carbon steel, Schedule STD (ASME B36.10M) */
export const CS_STD: Pipe[] = series('STD', PIPE_SIZE_NPS);
/** Stainless steel, Schedule 10S (ASME B36.19M) */
export const SS_10S: Pipe[] = series('10S', PIPE_SIZE_NPS);

/** The smallest pipe whose inside diameter is at least d (in), and the size below it. */
export function pick(list: Pipe[], d: number): { up?: Pipe; down?: Pipe } {
  const i = list.findIndex((p) => id(p) >= d);
  if (i === -1) return { down: list[list.length - 1] };
  return { up: list[i], down: i > 0 ? list[i - 1] : undefined };
}
