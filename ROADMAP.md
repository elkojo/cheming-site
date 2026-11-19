# Roadmap

## Phase 7: native JavaScript calculators (in progress)

Goal: replace the Zoho Sheet iframes one tool at a time with calculators built into the site. That makes them faster, works offline, removes the dependency on Zoho, allows shareable result URLs, and lets equations render properly.

### Approach
- Each entry in `src/data/tools.ts` gets an optional component. When present, the tool page renders it instead of the Zoho iframe. Zoho stays as the fallback until the native version is proven.
- **Acceptance rule:** a rebuilt tool must reproduce the Zoho results on at least 3 test cases (automated tests) before it replaces the Zoho version.
- Keep the conventions users know: yellow = input, green = output, unit selection, reset on reload. Follow `DESIGN.md` (Drawing Sheet design system).

### How it is built
- Calculation: `src/lib/calc/<tool>.ts`: inputs, outputs and formulas as data (pure functions, no DOM). Registered in `src/lib/calc/registry.ts`.
- Page: `src/components/NativeCalc.astro` renders any table-style calculator (groups of rows); a calculator with a different layout gets its own component, listed in `custom` in the registry and chosen in `src/pages/[tool].astro` (e.g. `PrimeCalc.astro`). It still follows the conventions below.
- (table-style) `NativeCalc.astro` renders any registered calculator (yellow inputs, green outputs, live recalculation, Reset button, decimal comma accepted).
- Switch: set `native: '<id>'` on the tool in `src/data/tools.ts`. The Zoho sheet stays linked as "Original Zoho sheet".
- Tests: `tests/<tool>.test.ts`, run with `npm test`. `npm run build` runs the tests first, so a failing calculator never deploys.

### Conventions for every native calculator (lessons from Geometry, approved by the owner)
- **One cell per row:** property name followed by its symbol or formula in the same cell, same font and colour (Archivo, ink). Then the yellow/green field, then the unit. No separate formula column, no CAD lettering inside the calculator.
- **Formula basis always visible**, on every screen size; on phones it wraps under the name inside the same cell, never hidden.
- **Italic variables everywhere** (formulas, symbols, drawing labels, notes, enlarged view); numbers, operators, π and √ upright. Use `mathHtml()` for formulas; notes may contain `<i>` for symbols.
- **Same order everywhere:** name → symbol/formula → value → unit, in the sheet and the enlarged view alike.
- **Drawings:** simple line sketches with the same symbols as the formulas; no label may touch a line (check them rendered large). Each drawing opens in an enlarged view with its rows (yellow/green markers) and note.
- **Phone:** drawing sits beside the group title so the rows use the full width; no sideways scroll.
- **Clear all inputs** button empties every input; empty fields are not errors; a result shows as soon as its own inputs are filled. Reload restores the example values (the Zoho defaults).
- **Invalid input:** red border, result "—". Decimal comma accepted.
- **Zoho as reference, not gospel:** the published Zoho views don't recalculate, so the default values on the sheet are the reference cases. Check every formula; if the sheet is wrong, fix it, add a test explaining the fix, and get the owner's approval before going live.
- **Before going live:** tests pass (`npm run build` runs them), browser check on desktop and phone (typing, invalid input, clear, enlarged view), owner approval, then push.

### Progress
| Tool | Status | Notes |
|---|---|---|
| Geometry | native (2026-11-18) | 26 tests: every Zoho default result + hand-checked cases. Two Zoho errors fixed: triangle "circumference" was 2·b + 2·h (now perimeter a + b + c, with side inputs a and c added); prism volume showed 2 instead of B·h = 6 (both fixes approved by the owner 2026-11-18). Polygon "Circumference" renamed "Perimeter". |
| Prime Numbers | native (2026-11-19) | Own component (`PrimeCalc.astro`): the fraction chain as in Zoho (a/b = lowest terms = mixed number = mixed in lowest terms), plus a "Working" table (prime factors of a and b, gcd, whole-number part, remainder) and a one-line answer. Tests: the Zoho default 375/225 = 5/3 = 1 150/225 = 1 2/3 + hand-checked cases (proper fraction, exact division, coprime, large numbers). The Zoho limit (first 500 primes, up to the 10th power) is gone: gcd by Euclid's algorithm; inputs are whole numbers 1 to 10¹². Lifted limit, input rules and the added Working table approved by the owner 2026-11-19. |

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
