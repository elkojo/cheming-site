// Geometry: volume and area of geometrical objects.
// Native rebuild of the Zoho sheet (Phase 7). Defaults are the Zoho sheet's defaults;
// tests/geometry.test.ts checks the results against the values the Zoho sheet shows.
import type { Group } from './types';

const { PI, sqrt } = Math;

// Sketch helpers: ink lines, graphite italic labels. viewBox 0 0 120 100.
const svg = (body: string) =>
  `<svg viewBox="0 0 120 100" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">${body}</svg>`;
const t = (x: number, y: number, s: string) =>
  `<text x="${x}" y="${y}" class="sk-l" stroke="none">${s}</text>`;
const dash = 'stroke-dasharray="4 3"';

export const geometry: Group[] = [
  {
    id: 'circle',
    title: 'Circle',
    sketch: svg(`<circle cx="60" cy="50" r="40"/><path d="M32 78 88 22" /><path d="M60 50 96 64" stroke-width="1"/>${t(36, 62, 'D')}${t(80, 54, 'r')}`),
    inputs: [{ key: 'D', label: 'Diameter', sym: 'D', unit: 'u', value: 1 }],
    outputs: [
      { key: 'r', label: 'Radius', formula: 'r = D/2', unit: 'u', calc: (v) => v.D / 2 },
      { key: 'A', label: 'Area', formula: 'A = π·r²', unit: 'u²', calc: (v) => PI * (v.D / 2) ** 2 },
      { key: 'C', label: 'Circumference', formula: 'C = 2·π·r', unit: 'u', calc: (v) => PI * v.D },
    ],
  },
  {
    id: 'sphere',
    title: 'Sphere',
    sketch: svg(`<circle cx="60" cy="50" r="40"/><ellipse cx="60" cy="50" rx="40" ry="11" ${dash}/><path d="M60 50 h40" stroke-width="1"/>${t(76, 45, 'r')}`),
    inputs: [{ key: 'D', label: 'Diameter', sym: 'D', unit: 'u', value: 5.7 }],
    outputs: [
      { key: 'r', label: 'Radius', formula: 'r = D/2', unit: 'u', calc: (v) => v.D / 2 },
      { key: 'V', label: 'Volume', formula: 'V = 4/3·π·r³', unit: 'u³', calc: (v) => (4 / 3) * PI * (v.D / 2) ** 3 },
      { key: 'S', label: 'Surface', formula: 'S = 4·π·r²', unit: 'u²', calc: (v) => 4 * PI * (v.D / 2) ** 2 },
    ],
  },
  {
    id: 'cylinder',
    title: 'Cylinder',
    sketch: svg(`<ellipse cx="60" cy="18" rx="32" ry="9"/><path d="M28 18v64M92 18v64"/><path d="M28 82a32 9 0 0 0 64 0"/><path d="M28 82a32 9 0 0 1 64 0" ${dash}/><path d="M60 18h32" stroke-width="1"/>${t(72, 14, 'r')}${t(14, 54, 'h')}`),
    inputs: [
      { key: 'D', label: 'Diameter', sym: 'D', unit: 'u', value: 1 },
      { key: 'h', label: 'Height', sym: 'h', unit: 'u', value: 2 },
    ],
    outputs: [
      { key: 'r', label: 'Radius', formula: 'r = D/2', unit: 'u', calc: (v) => v.D / 2 },
      { key: 'V', label: 'Volume', formula: 'V = π·r²·h', unit: 'u³', calc: (v) => PI * (v.D / 2) ** 2 * v.h },
      { key: 'S', label: 'Surface', formula: 'S = 2·π·r·h + 2·π·r²', unit: 'u²', calc: (v) => 2 * PI * (v.D / 2) * v.h + 2 * PI * (v.D / 2) ** 2 },
    ],
  },
  {
    id: 'rectangle',
    title: 'Rectangle',
    sketch: svg(`<rect x="14" y="25" width="92" height="50"/>${t(56, 92, 'l')}${t(110, 54, 'w')}`),
    inputs: [
      { key: 'l', label: 'Length', sym: 'l', unit: 'u', value: 1 },
      { key: 'w', label: 'Width', sym: 'w', unit: 'u', value: 2 },
    ],
    outputs: [
      { key: 'A', label: 'Area', formula: 'A = l·w', unit: 'u²', calc: (v) => v.l * v.w },
      { key: 'P', label: 'Perimeter', formula: 'P = 2·l + 2·w', unit: 'u', calc: (v) => 2 * v.l + 2 * v.w },
    ],
  },
  {
    id: 'box',
    title: 'Rectangular Solid',
    sketch: svg(`<rect x="12" y="38" width="72" height="50"/><path d="M12 38l22-24h72L84 38M106 14v50L84 88"/><path d="M34 14v50h72M34 64 12 88" ${dash} stroke-width="1"/>${t(46, 99, 'l')}${t(98, 86, 'w')}${t(110, 44, 'h')}`),
    inputs: [
      { key: 'l', label: 'Length', sym: 'l', unit: 'u', value: 1 },
      { key: 'w', label: 'Width', sym: 'w', unit: 'u', value: 2 },
      { key: 'h', label: 'Height', sym: 'h', unit: 'u', value: 3 },
    ],
    outputs: [
      { key: 'V', label: 'Volume', formula: 'V = l·w·h', unit: 'u³', calc: (v) => v.l * v.w * v.h },
      { key: 'S', label: 'Surface', formula: 'S = 2·l·w + 2·l·h + 2·w·h', unit: 'u²', calc: (v) => 2 * (v.l * v.w + v.l * v.h + v.w * v.h) },
    ],
  },
  {
    id: 'parallelogram',
    title: 'Parallelogram',
    sketch: svg(`<path d="M10 80 34 24h76L86 80Z"/><path d="M34 24v56" ${dash} stroke-width="1"/>${t(56, 94, 'b')}${t(38, 58, 'h')}`),
    inputs: [
      { key: 'b', label: 'Base', sym: 'b', unit: 'u', value: 3 },
      { key: 'h', label: 'Height', sym: 'h', unit: 'u', value: 2 },
    ],
    outputs: [{ key: 'A', label: 'Area', formula: 'A = b·h', unit: 'u²', calc: (v) => v.b * v.h }],
  },
  {
    id: 'trapezoid',
    title: 'Trapezoid',
    sketch: svg(`<path d="M6 82 34 22h50l30 60Z"/><path d="M34 22v60" ${dash} stroke-width="1"/>${t(56, 16, 'b1')}${t(56, 96, 'b2')}${t(10, 52, 'a')}${t(104, 52, 'c')}${t(38, 58, 'h')}`),
    inputs: [
      { key: 'b1', label: 'Base 1', sym: 'b1', unit: 'u', value: 1 },
      { key: 'b2', label: 'Base 2', sym: 'b2', unit: 'u', value: 2 },
      { key: 'h', label: 'Height', sym: 'h', unit: 'u', value: 2 },
      { key: 'a', label: 'Side 1', sym: 'a', unit: 'u', value: 2 },
      { key: 'c', label: 'Side 2', sym: 'c', unit: 'u', value: 2 },
    ],
    outputs: [
      { key: 'A', label: 'Area', formula: 'A = (b1 + b2)/2·h', unit: 'u²', calc: (v) => ((v.b1 + v.b2) / 2) * v.h },
      { key: 'P', label: 'Perimeter', formula: 'P = a + b1 + b2 + c', unit: 'u', calc: (v) => v.a + v.b1 + v.b2 + v.c },
    ],
  },
  {
    id: 'triangle',
    title: 'Triangle',
    sketch: svg(`<path d="M8 82 44 20l68 62Z"/><path d="M44 20v62" ${dash} stroke-width="1"/>${t(16, 50, 'a')}${t(82, 46, 'c')}${t(60, 96, 'b')}${t(48, 62, 'h')}`),
    note: 'Defaults: isosceles triangle, a = c = √((b/2)² + h²).',
    inputs: [
      { key: 'b', label: 'Base', sym: 'b', unit: 'u', value: 3 },
      { key: 'h', label: 'Height', sym: 'h', unit: 'u', value: 2 },
      { key: 'a', label: 'Side 1', sym: 'a', unit: 'u', value: 2.5 },
      { key: 'c', label: 'Side 2', sym: 'c', unit: 'u', value: 2.5 },
    ],
    outputs: [
      { key: 'A', label: 'Area', formula: 'A = ½·b·h', unit: 'u²', calc: (v) => 0.5 * v.b * v.h },
      { key: 'P', label: 'Perimeter', formula: 'P = a + b + c', unit: 'u', calc: (v) => v.a + v.b + v.c },
    ],
  },
  {
    id: 'cone',
    title: 'Cone',
    sketch: svg(`<path d="M24 76 60 8l36 68"/><path d="M24 76a36 11 0 0 0 72 0"/><path d="M24 76a36 11 0 0 1 72 0" ${dash}/><path d="M60 8v68h36" ${dash} stroke-width="1"/>${t(52, 52, 'h')}${t(76, 72, 'r')}${t(82, 38, 's')}`),
    inputs: [
      { key: 'D', label: 'Diameter', sym: 'D', unit: 'u', value: 1 },
      { key: 'h', label: 'Height', sym: 'h', unit: 'u', value: 2 },
    ],
    outputs: [
      { key: 'r', label: 'Radius', formula: 'r = D/2', unit: 'u', calc: (v) => v.D / 2 },
      { key: 's', label: 'Side Length', formula: 's = √(r² + h²)', unit: 'u', calc: (v) => sqrt((v.D / 2) ** 2 + v.h ** 2) },
      { key: 'V', label: 'Volume', formula: 'V = ⅓·π·r²·h', unit: 'u³', calc: (v) => (PI * (v.D / 2) ** 2 * v.h) / 3 },
      {
        key: 'S', label: 'Surface', formula: 'S = π·r² + π·r·s', unit: 'u²',
        calc: (v) => { const r = v.D / 2; return PI * r * r + PI * r * sqrt(r * r + v.h ** 2); },
      },
    ],
  },
  {
    id: 'pyramid',
    title: 'Square Pyramid',
    sketch: svg(`<path d="M60 6 12 86h72l24-22Z"/><path d="M60 6l24 80"/><path d="M12 86l24-22h72M60 6v70" ${dash} stroke-width="1"/>${t(46, 52, 'h')}${t(44, 98, 'b')}`),
    inputs: [
      { key: 'h', label: 'Height', sym: 'h', unit: 'u', value: 8 },
      { key: 'b', label: 'Length of Base', sym: 'b', unit: 'u', value: 3 },
    ],
    outputs: [
      { key: 'V', label: 'Volume', formula: 'V = ⅓·b²·h', unit: 'u³', calc: (v) => (v.b ** 2 * v.h) / 3 },
      { key: 'S', label: 'Surface', formula: 'S = b² + 2·b·√(h² + b²/4)', unit: 'u²', calc: (v) => v.b ** 2 + 2 * v.b * sqrt(v.h ** 2 + v.b ** 2 / 4) },
    ],
  },
  {
    id: 'prism',
    title: 'Prism',
    sketch: svg(`<path d="M10 34 50 14l26 20Z"/><path d="M10 34v52M76 34v52M50 14v52" /><path d="M10 86l40-20 26 20Z" ${dash} stroke-width="1"/><path d="M10 86h66"/>${t(88, 64, 'h')}${t(36, 46, 'B')}`),
    note: 'Any right prism: B is the area of the base, P its perimeter.',
    inputs: [
      { key: 'h', label: 'Height', sym: 'h', unit: 'u', value: 2 },
      { key: 'B', label: 'Area of Base', sym: 'B', unit: 'u²', value: 3 },
      { key: 'P', label: 'Base Perimeter', sym: 'P', unit: 'u', value: 2 },
    ],
    outputs: [
      { key: 'V', label: 'Volume', formula: 'V = B·h', unit: 'u³', calc: (v) => v.B * v.h },
      { key: 'S', label: 'Surface', formula: 'S = 2·B + P·h', unit: 'u²', calc: (v) => 2 * v.B + v.P * v.h },
    ],
  },
];
