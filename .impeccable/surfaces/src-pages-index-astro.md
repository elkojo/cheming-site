---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/pages/[tool].astro","src/layouts/Base.astro"]
---

# Surface brief: site shell, tool index (home) and tool pages

Scope: the whole Cheming.Site frame (Base layout, home tool index, 26 tool pages, About, 404). Visitor mode: **Operate**. Engineers arrive knowing the tool they want; students arrive to learn the method. Job: find a tool in seconds, use the Zoho sheet with maximum room, see the standard it follows. Constraints: Zoho sheets are white with yellow input and green output cells and can't be styled; disclaimer on every page; URLs unchanged; light theme (office desktop, daylight, white sheets).

Unresolved: final tag codes per tool (proposed in `src/data/tools.ts`, author to confirm); per-tool one-line descriptions (author to supply); Formspree form (Phase 4).

## Direction contract

THESIS: The site is a clean engineering drawing sheet, and every tool is an instrument tag on it. It refuses the category default of rounded calculator cards on a grey SaaS grid.

OWN-WORLD: Drawing paper #fbfbf8, drafting ink #1b2433 for the header band and text, line blue #2f5d8a for links, focus and selection, markup red #d0312d only for caution and error. Hairline 1px rules, square corners, no shadows, no cards. Tags and title-block text are set in Osifont (ISO 3098 CAD lettering); UI and prose in Archivo. Tool identity is a circular ISA instrument bubble holding the tool's tag (PSV, KOD, CV).

STORY: The visitor sees all 26 tools at once, grouped by discipline, each with tag, full name and standard. They find theirs by scanning or typing, open it, and work in a sheet framed like a drawing. The standard and the disclaimer make the basis visible.

FIRST VIEWPORT: An ink header band with the bubble mark and wordmark left; Tools menu, About and Contact right. Below it, the purpose line plus the input/output legend as swatches matching the Zoho cells (#ffff99 / #ccffcc). Then the finder (label, search field, count) between two ink rules, and the index: category columns that auto-fit (three at 1440, one on phone), General first, rows of bubble, short name and one-line description. The primary action is typing a tag or clicking a row. (Amended 2026-11-17 after the user approved the built version: the search lives in the page, not the header.)

FORM: P&ID drawing sheet (ISA tag bubbles, zone-marked frame, title block), #1 on the ordered list, taken as IMPECCABLE’S PICK; seed key 8b88e67a. Signature move: ISA tag bubbles as the tool identity everywhere (index, menu, tool header, related tools); the Zoho sheet sits in a zone-marked drawing frame; the footer is a title block holding name, disclaimer and contact.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
