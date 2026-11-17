---
name: Cheming.Site
description: Process engineering calculators presented as a clean engineering drawing sheet.
colors:
  drawing-paper: "#fbfbf8"
  hover-wash: "#eef1f4"
  drafting-ink: "#1b2433"
  graphite: "#4f5a6b"
  pencil-rule: "#c9ced6"
  line-blue: "#2f5d8a"
  line-blue-deep: "#244a6f"
  markup-red: "#d0312d"
  sent-green: "#1f6b3a"
  selection-blue: "#cfdcea"
  sheet-input: "#ffff99"
  sheet-output: "#ccffcc"
typography:
  headline:
    fontFamily: "'Archivo Variable', Archivo, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "'Archivo Variable', Archivo, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Archivo Variable', Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "'tnum'"
  body-small:
    fontFamily: "'Archivo Variable', Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.35
  label:
    fontFamily: "Osifont, 'Archivo Variable', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.08em"
  tag:
    fontFamily: "Osifont, 'Archivo Variable', sans-serif"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
rounded:
  none: "0px"
  bubble: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.line-blue}"
    textColor: "{colors.drawing-paper}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.line-blue-deep}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.line-blue}"
    rounded: "{rounded.none}"
    padding: "0 14px"
    height: "36px"
  button-outline-hover:
    backgroundColor: "{colors.line-blue}"
    textColor: "{colors.drawing-paper}"
  input-field:
    backgroundColor: "#ffffff"
    textColor: "{colors.drafting-ink}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
    height: "40px"
  header-band:
    backgroundColor: "{colors.drafting-ink}"
    textColor: "{colors.drawing-paper}"
    height: "56px"
  tag-bubble:
    textColor: "{colors.drafting-ink}"
    backgroundColor: "{colors.drawing-paper}"
    rounded: "{rounded.bubble}"
    typography: "{typography.tag}"
    size: "44px"
---

# Design System: Cheming.Site

## Overview

**Creative North Star: "The Drawing Sheet"**

The site reads as one clean engineering drawing: paper-white ground, drafting-ink lines, hairline rules and square corners. Every tool is an instrument on that drawing, identified by an ISA-style tag bubble (PSV, KOD, CV) the way a P&ID identifies a valve or vessel. The world lends type, palette, density and that one signature mark; layout, navigation and controls stay standard web, because visitors come to work, not to admire.

Density is that of a reference index: many items visible at once, each with tag, short name and one line of description. Colour does few, specific jobs: ink for structure, line blue for anything you can act on, markup red only for errors. The yellow and green that mean input and output inside the Zoho sheets are reserved for that meaning.

Rejected: rounded calculator cards on a grey SaaS grid, and blueprint pastiche (white-on-blue, grid-paper backgrounds).

**Key Characteristics:**
- Tag bubbles as the identity of every tool, everywhere a tool is named
- Ink header band, paper body, a title-block footer
- Hairline rules and square corners; no cards, no shadows
- Osifont (ISO 3098 CAD lettering) for tags and labels; Archivo for everything read
- The Zoho sheet sits in a zone-marked drawing frame (A–F, 1–4)

## Colors

A restrained drafting palette: ink and paper carry the page; one blue does every interactive job.

### Primary
- **Line Blue** (line-blue): links, focus rings, text selection, the primary button, the "Open sheet" outline button, the hovered tag bubble and the current tool in the menu. Deepens to **Line Blue Deep** (line-blue-deep) on primary-button hover.

### Neutral
- **Drafting Ink** (drafting-ink): the header band, all body text, frame and title-block lines, category rules, tag bubble strokes.
- **Drawing Paper** (drawing-paper): the page ground and the text on ink.
- **Graphite** (graphite): secondary text (descriptions, hints, title-block content, zone marks), and input borders at rest.
- **Pencil Rule** (pencil-rule): hairlines between list rows, zone ticks, the scrollbar thumb.
- **Hover Wash** (hover-wash): the row and menu-item hover background, and the current item in the Tools menu.
- **Selection Blue** (selection-blue): the text-selection highlight.

### Semantic
- **Markup Red** (markup-red): invalid form fields and send errors only; on a drawing, red is the reviewer's mark.
- **Sent Green** (sent-green): the contact form's success message.
- **Sheet Input** (sheet-input) and **Sheet Output** (sheet-output): sampled from the Zoho sheets' own cells, used only in the usage legend.

### Named Rules
**The Sheet Colours Rule.** Pale yellow and pale green mean "input" and "output", because that's what they mean inside the Zoho sheets. They never appear on the site for any other purpose.

**The One Blue Rule.** If it is blue, it can be clicked or is focused. Nothing decorative is blue.

## Typography

**Body Font:** Archivo (variable, self-hosted via Fontsource; system-ui fallback)
**Label / Tag Font:** Osifont (ISO 3098 engineering lettering, self-hosted; Archivo fallback)

**Character:** Archivo is a sober grotesque that carries headings, prose and data. Osifont is the lettering of technical drawings and is used only where a drawing would carry lettering: tags, field labels, category heads, the "Basis" line and zone marks.

### Hierarchy
- **Headline** (650, 1.75rem, 1.2): the home page purpose line and page titles (About). Max about 40ch.
- **Title** (650, 1.5rem, 1.2): the full tool name on a tool page.
- **Body** (400, 1rem, 1.55): prose, tool short names (600 weight in lists), controls. Tabular numerals throughout.
- **Body Small** (400, 0.875rem, 1.35): one-line tool descriptions, breadcrumbs, hints.
- **Label** (Osifont 400, 0.8125rem, 0.08em tracking, uppercase): category heads, form labels, title-block field names.
- **Tag** (Osifont 400, sized from the bubble diameter): text inside tag bubbles.

### Named Rules
**The Lettering Rule.** Osifont is lettering, not text: never set a sentence or a paragraph in it. If it would be printed in a drawing's title block or a tag bubble, it is Osifont; otherwise it's Archivo.

## Layout

A fixed 56px ink header band (sticky) over a paper body. Side padding is a fluid gutter, clamp(1rem, 3vw, 2rem). The home index is a responsive grid of category columns (minimum 19rem, auto-fill: three at 1440px, one on a phone), with General first. The finder sits between two ink rules. Tool pages give the Zoho sheet the full content width and nearly the full viewport height, max(36rem, viewport minus header); on phones the frame drops its margins and zone marks so the sheet runs edge to edge. Prose pages (About) use a 42rem column. The footer is a title-block grid that collapses from three columns to two below 50rem.

Spacing rhythm is 4/8/16/24/40px, with more space above a section heading than below it.

## Elevation & Depth

Flat. There are no shadows anywhere; depth is shown with lines, as on a drawing. Overlays (the Tools menu) separate from content with a 1.5px ink border and the paper ground, not a shadow.

### Named Rules
**The Lines-Not-Shadows Rule.** If something must stand apart, draw a line around it.

## Shapes

Square corners on everything (0px): inputs, buttons, menus, the sheet frame, the title block. The one curve in the system is the circle of the tag bubble, which makes it read as an instrument tag. Line weights: 1px hairlines for list rows and inputs, 1.5px for structural ink lines (frame, finder rules, title block, bubbles), 2px for large bubbles.

## Components

### Tag bubble (signature)
A circle with an ink stroke and the tool's tag in Osifont. Sizes: small 30px (menus, related tools), medium 44px (home index), large 68px (tool page header). A tag with a qualifier splits the bubble with a hairline: tag above, qualifier below (PSV / G, ΔP / NC), as in ISA notation. On hover in lists, the stroke and lettering turn line blue. Tags are kept to three characters.

### Buttons
- **Shape:** square (0px).
- **Primary:** line blue fill, paper text, 600 weight, 40px tall (contact form submit). Hover deepens to line blue deep; disabled at 60% opacity with a "Sending…" label.
- **Outline:** 1px line-blue border and text, 36px tall, with a small drawn arrow icon ("Open sheet full screen"). Hover fills line blue with paper text, 150ms.

### Inputs / Fields
- **Style:** white field, 1px graphite border, square, 40px tall; labels above in the Label style.
- **Focus:** border turns line blue, 2px line-blue outline.
- **Error:** border turns markup red after the visitor has interacted (:user-invalid).

### Navigation
Header links are paper text on the ink band, 36px hit areas; hover and the current page get a 10% white wash. The Tools menu is a native popover anchored under the header: category columns of small bubbles and names, the current tool shaded and its bubble in line blue. On phones it spans the full width.

### Drawing frame
The Zoho iframe sits inside a 1.5px ink border with an 18px margin band carrying zone marks (A–F across, 1–4 down) in small Osifont, separated by pencil-rule ticks. Hidden on phones.

### Title block
The site footer: a bordered grid with labelled cells (Title, Disclaimer, Contact, Source); field names in the Label style, contents in small graphite text.

### Usage legend
Swatches (ink-bordered rectangles) in the exact Zoho cell colours, each followed by a bold label and a graphite explanation. A compact variant sits in the tool page header; on phones it becomes a two-column grid of label over explanation.

## Do's and Don'ts

### Do:
- **Do** give every tool a tag bubble wherever the tool is named (index, menu, tool header, related tools).
- **Do** use hairlines (pencil-rule) between list rows and ink rules (1.5px) for structure.
- **Do** keep the legend swatches identical to the Zoho cell colours (sheet-input, sheet-output).
- **Do** keep the disclaimer in the title block on every page.
- **Do** theme browser surfaces: selection (selection-blue), caret and focus (line-blue), scrollbar (pencil-rule on paper).

### Don't:
- **Don't** use cards, rounded corners or shadows; this is a drawing, not a dashboard.
- **Don't** use yellow or green for anything except the input/output meaning.
- **Don't** set prose in Osifont.
- **Don't** add eyebrow labels above headings; category heads are the headings.
- **Don't** colour anything blue that isn't interactive.
