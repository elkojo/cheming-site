// Native calculators by id. A tool in src/data/tools.ts uses one by setting `native: '<id>'`.
import type { Group } from './types';
import { geometry } from './geometry';

export const calculators = { geometry } satisfies Record<string, Group[]>;
export type CalcId = keyof typeof calculators;
