# Roadmap

## Phase 7: native JavaScript calculators (in progress)

Goal: replace the Zoho Sheet iframes one tool at a time with calculators built into the site. That makes them faster, works offline, removes the dependency on Zoho, allows shareable result URLs, and lets equations render properly.

### Approach
- Each entry in `src/data/tools.ts` gets an optional component. When present, the tool page renders it instead of the Zoho iframe. Zoho stays as the fallback until the native version is proven.
- **Acceptance rule:** a rebuilt tool must reproduce the Zoho results on at least 3 test cases (automated tests) before it replaces the Zoho version.
- Keep the conventions users know: yellow = input, green = output, unit selection, reset on reload. Follow `DESIGN.md` (Drawing Sheet design system).

### How it is built
- Calculation: `src/lib/calc/<tool>.ts`: inputs, outputs and formulas as data (pure functions, no DOM). Registered in `src/lib/calc/registry.ts`.
- Page: `src/components/NativeCalc.astro` renders any registered calculator (yellow inputs, green outputs, live recalculation, Reset button, decimal comma accepted).
- Switch: set `native: '<id>'` on the tool in `src/data/tools.ts`. The Zoho sheet stays linked as "Original Zoho sheet".
- Tests: `tests/<tool>.test.ts`, run with `npm test`. `npm run build` runs the tests first, so a failing calculator never deploys.

### Progress
| Tool | Status | Notes |
|---|---|---|
| Geometry | native (2026-11-18) | 26 tests: every Zoho default result + hand-checked cases. Two Zoho errors fixed: triangle "circumference" was 2·b + 2·h (now perimeter a + b + c, with side inputs a and c added); prism volume showed 2 instead of B·h = 6 (both fixes approved by the owner 2026-11-18). Polygon "Circumference" renamed "Perimeter". |

### Suggested order (simple → complex)
1. Unit Conversion
2. Geometry
3. Gas Equation (pV = nRTZ)
4. Prime Numbers
5. Pipe Size, Heat Exchanger, Drum
6. Pressure loss (single phase, non-circular), CV, RO
7. Relief & Flare (PSV, fire cases, KOD, Flare Stack, Noise), Two-phase pressure loss, Pump, Compressor
8. Properties and Steam (need data tables: pure-component database, steam tables)

### Not to rebuild
- **Drainage & Overflow**: third-party sheet (credit: LinkedIn). Keep the Zoho embed unless its author agrees.

### Notes
- PED tool basis is Directive 97/23/EC, superseded by 2014/68/EU (2016); update the logic if rebuilt.
- Background: `/home/milan/Claude/Cheming/MIGRATION-PLAN.md` (Phase 7) and `PRODUCT.md`.
