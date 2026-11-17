# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro (static), published on GitHub Pages from `elkojo/cheming-site`. Custom domain `cheming.site` (Namecheap DNS). GoatCounter for visitor stats, Formspree for the contact form. Calculators are embedded Zoho Sheet published ranges (iframes); native JavaScript calculators may replace them one by one later.

## Users

- **Practising process engineers** (oil & gas, petrochemical): quick sizing and checks during project work, mostly at a desktop with a large screen. They know the methods; they want the right tool fast and a result they can trust and cite.
- **Students and junior engineers**: learning the methods. The cited standard, the references and the equations matter to them as much as the number.

Phone use is secondary but must work.

## Product Purpose

Cheming.Site offers free engineering calculation tools for oil & gas and petrochemical process design, with references and equations. Today there are 26 tools: relief and flare, piping and flow, equipment, physical properties and general utilities.

Success over the next year, in order:
1. **More engineers using the tools**: they find a tool quickly, bookmark it and come back.
2. **Professional leads**: the site builds trust in the author's expertise and invites offers, partnerships or paid work.

## Positioning

The tools were built and refined over about two decades of real project work by a physical chemist turned process engineer. They aren't generic calculators: each follows a named industry standard (e.g. API 521 / ISO 23251, API RP 521 §5.4.2.1, PED 97/23/EG) and shows its formulae and sources, so the user can verify the result.

## Operating Context

- Each tool is a spreadsheet: **yellow cells = editable input**, **double-click = unit selection**, **green cells = calculated output**. Refreshing the page resets it; nothing is saved. Users may need to zoom the browser to fit a sheet.
- The sheets are wide and tall, and need as much of the viewport as possible.
- Users usually arrive knowing which tool they need (by name or abbreviation: PSV, KOD, CV, RO, PED).

## Capabilities and Constraints

- 26 tools in 5 proposed categories: Relief & Flare, Piping & Flow, Equipment, Properties, General (`src/data/tools.ts`).
- Calculator content and behaviour live in Zoho and can't be styled from the site. The site frame must sit comfortably around white spreadsheets with yellow and green cells.
- Static hosting only: no server, no database, no user accounts, no comments.
- All existing URLs (`/pump/`, `/kod/` …) must stay the same.
- A **disclaimer** must appear on every page (text in `src/data/site.ts`).
- One tool (Drainage & Overflow) credits a co-author (Ash Gratton, LinkedIn link); credits must be kept.
- English only.
- Per-tool content the author will provide: a **short description (1–2 lines)** and the **standard / reference used**. No changelogs or version dates.

## Brand Commitments

- **The name "Cheming.Site" is fixed.**
- The current logo (white hexagon mark) and navy colour (#33466C) are **not binding**; a refreshed mark and palette are allowed.
- Voice: plain, precise, engineer-to-engineer. No marketing hype.

## Evidence on Hand

- 26 working calculators (Zoho), with the standards they follow named in their titles.
- The author's About text (first person: physical chemist by education, chemical engineer by career).
- Links: author's LinkedIn, Telegram group, Discord server, Reddit r/ChemingSite, email (SimpleLogin alias).
- **Absent, never fabricate:** testimonials, user counts, client names, company logos, certifications, ratings.

## Product Principles

1. **Tool first.** Getting to the right calculator and having room to use it beats everything else on the page.
2. **Show the basis.** Always make the standard and reference visible; trust comes from verifiability, not claims.
3. **Quiet expertise.** The craft of the site itself signals professional quality; it never boasts.
4. **Honest limits.** The disclaimer and the "verify independently" stance are part of the product, not fine print to hide.

## Accessibility & Inclusion

No specific standard was mandated. Target WCAG 2.2 AA for the site frame. The Zoho sheets themselves are outside our control.
