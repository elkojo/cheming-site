// Native calculators by id. A tool in src/data/tools.ts uses one by setting `native: '<id>'`.
// `calculators` are rendered by NativeCalc.astro (groups of input/output rows);
// `custom` ones have their own component, chosen in src/pages/[tool].astro.
import type { Group } from './types';
import { geometry } from './geometry';

export const calculators = { geometry } satisfies Record<string, Group[]>;
export const custom = ['primes', 'gas', 'units', 'steam', 'sieve', 'pipesize', 'properties', 'pressure1p', 'pressurenc', 'twophase', 'cv', 'ro', 'drum', 'pump', 'compressor', 'hx', 'ped', 'psv', 'psvl', 'psvg', 'kod', 'flare', 'noise'] as const;

export type TableCalcId = keyof typeof calculators;
export type CalcId = TableCalcId | (typeof custom)[number];
