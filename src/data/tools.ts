// The single list of all tools. Order inside a category = order on the site.
// Generated from the WordPress export (migration/pages.raw.json) on 2026-11-17; edit by hand from now on.

import type { CalcId } from '../lib/calc/registry';

export type CategoryId = 'relief' | 'piping' | 'equipment' | 'properties' | 'general';

export const categories: { id: CategoryId; title: string }[] = [
  { id: 'general', title: 'General' },
  { id: 'relief', title: 'Relief & Flare' },
  { id: 'piping', title: 'Piping & Flow' },
  { id: 'equipment', title: 'Equipment' },
  { id: 'properties', title: 'Properties' },
];

export interface Tool {
  slug: string;        // URL: https://cheming.site/<slug>/
  tag: string;         // instrument-bubble tag, e.g. PSV (keep to 3 characters)
  sub?: string;        // optional lower half of the bubble, e.g. G for gas
  description?: string; // one or two lines: what it calculates and when to use it
  title: string;       // short name (menu)
  name: string;        // full descriptive name
  category: CategoryId;
  zoho: string;        // Zoho Sheet embed URL (kept as the fallback when `native` is set)
  native?: CalcId;     // native JS calculator (Phase 7); set only once its tests pass against Zoho
  standard?: string;   // standard / reference followed
  credit?: { name: string; url: string };
}

export const tools: Tool[] = [
  {
    "slug": "psv",
    "tag": "PSV",
    "title": "PSV",
    "name": "Pressure Safety Valve",
    "description": "Vapor and liquid relief sized by API RP 520-1 (2000).",
    "standard": "API RP 520-1 (2000)",
    "category": "relief",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/8cc3425a2dec03483d70b75b03d5a0f4cfcb1098276383c3205d1553329a0aad?type=grid&mode=embed"
  },
  {
    "slug": "psv-gas-filled-vessel",
    "tag": "PSV",
    "sub": "G",
    "title": "PSV: Gas Filled Vessel",
    "name": "PSV Sizing for Fire Case in a Vapor/Gas Filled Vessel",
    "description": "Fire-case relief load and required orifice for a vapour- or gas-filled vessel: exposed area from vessel geometry, then PSV sizing and orifice letter selection.",
    "standard": "API 520 Part I; relief load per API 521",
    "category": "relief",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/250a14e89cdeaf0535dc3bbb3a5b6b1a35d2acdaa3974379b8aac4dc8868852a?type=grid&mode=embed"
  },
  {
    "slug": "psv-liquid-filled-vessel",
    "tag": "PSV",
    "sub": "L",
    "title": "PSV: Liquid Filled Vessel",
    "name": "PSV Sizing for Fire Case in a Liquid Filled Vessel",
    "description": "Fire-case relief for a vessel holding liquid: wetted area in the fire zone for horizontal, vertical or spherical vessels (sketch to scale), API 521 heat input with insulation credit, relief load (water from IAPWS-IF97), API 520 orifice and API 526 valve.",
    "standard": "API 521; PSV sizing per API 520 Part I; orifices per API 526",
    "category": "relief",
    "native": "psvl",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/6c9c61f423c0019928e17c434407830cbdf9b916d98bf8dd0521bc5f97e47a2e?type=grid&mode=embed"
  },
  {
    "slug": "flare-stack",
    "tag": "FS",
    "title": "Flare Stack",
    "name": "Flare Stack Sizing by ANSI/API Standard 521/ ISO 23251",
    "description": "Flare stack diameter, flame length and wind-induced flame distortion for a given relief rate and gas composition, in design and rating modes.",
    "standard": "ANSI/API Std 521 / ISO 23251, 5th ed. (2007)",
    "category": "relief",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/53b4685016fa0d81312c2fa316ea64e448c3ab8bc2461b2ad88aa07d84f7c32a?type=grid&mode=embed",
  },
  {
    "slug": "kod",
    "tag": "KOD",
    "title": "KOD",
    "name": "Horizontal Knock Out Drum as per API RP 521, 1997, par. 5.4.2.1",
    "description": "Sizes a horizontal knock-out drum from the droplet dropout velocity, drum dimensions and liquid levels.",
    "standard": "API RP 521 (1997), §5.4.2.1",
    "category": "relief",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/e1c2da68bc9cbfa1c47143b3d3bda6687a1ec3cf70fffb50279965248e701fd7?type=grid&mode=embed",
  },
  {
    "slug": "noise",
    "tag": "dB",
    "title": "Noise",
    "name": "Noise Calculation by API 521 5th Edition par. 7.3.4.3",
    "description": "Sound pressure level from a relief valve or other restriction, at 30 m and at any distance, from gas properties, pressure ratio and mass flow.",
    "standard": "API 521 5th ed., §7.3.4.3",
    "category": "relief",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/75c00428f9365d519c7d41a9210cf9d1ec563720efd7414f2d2a31aa68920540?type=grid&mode=embed",
  },
  {
    "slug": "pressurization-depressurization",
    "tag": "BDV",
    "title": "Pressurization & Depressurization",
    "name": "Pressurization and Depressurization",
    "description": "Time to pressurize or depressurize a system through a valve of known Cv, calculated step by step, with Cv tables for globe, butterfly and gate valves.",
    "standard": "Masoneilan Control Valve Sizing Handbook (OZ1000)",
    "category": "relief",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/a4b4bb874058313fd40b0142e22fba59c6e9ab72440d528e214207945373ce98?type=grid&mode=embed"
  },
  {
    "slug": "pressure-loss-single-phase",
    "tag": "ΔP",
    "sub": "1",
    "title": "Pressure Loss: Single Phase",
    "name": "Pressure Loss of Single Phase Flow in Circular Rough Piping",
    "description": "Pressure drop of liquid or gas in circular rough pipe from pipe size and schedule (ASME B36.10M/B36.19M) or any inside diameter, including fittings by equivalent length (Le/D), with velocity, Reynolds number, Mach number and API RP 14E erosional velocity.",
    "standard": "Darcy–Weisbach with the Colebrook–White friction factor",
    "category": "piping",
    "native": "pressure1p",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/a5e624f799e372407267e75c5d2ea2d2aa8a0e692e4a1cab09ae6f9e3df66194?type=grid&mode=embed"
  },
  {
    "slug": "pressure-loss-non-circular-piping",
    "tag": "ΔP",
    "sub": "NC",
    "title": "Pressure Loss: Non-Circular Piping",
    "name": "Pressure Loss of Single Phase Flow in Non-Circular Rough Piping",
    "description": "Pressure drop of liquid or gas in rectangular, annular, triangular, elliptical or any other channel: hydraulic diameter with Colebrook in turbulent flow, the shape's exact laminar friction constant, fittings by equivalent length.",
    "standard": "Darcy–Weisbach with Colebrook (hydraulic diameter); laminar f·Re after Shah & London",
    "category": "piping",
    "native": "pressurenc",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/258da99aa8f3f8da7c392c614e3df2081b2f2f8b8408deda2c677ba76adfca7b?type=grid&mode=embed"
  },
  {
    "slug": "pressure-loss-two-phase",
    "tag": "ΔP",
    "sub": "2",
    "title": "Pressure Loss: Two Phase",
    "name": "Pressure Loss of Two Phase Flow in Circular Rough Piping",
    "description": "Gas–liquid pressure drop in circular rough pipe by Friedel, Chisholm–Baroczy and Lockhart–Martinelli (chosen by Whalley's rule), static head in inclined lines, and the flow pattern on the Baker map.",
    "standard": "Haraburda & Chafin, Chemical Processing (2000); Whalley (1980); Baker (1954) map",
    "category": "piping",
    "native": "twophase",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/9d31950cf989751b5aceab7b2ddd1d39966e88bef9eaff6a88cbc738b74e9fce?type=grid&mode=embed"
  },
  {
    "slug": "pipe-size",
    "tag": "DN",
    "title": "Pipe Size",
    "name": "Pipe Size Optimization for Carbon and Stainless Steel Pipes",
    "description": "Economic pipe diameter and velocity for carbon and stainless steel lines from mass or volume flow, density and viscosity, with the nearest standard pipe (NPS, Schedule STD / 10S).",
    "standard": "“Updated Rules for Pipe Sizing”, Chemical Engineering (May 1999)",
    "category": "piping",
    "native": "pipesize",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/37f0cd48177be703ca2d0bf1696576b8c6e052db1b23436bfa9de72dba2aa9f6?type=grid&mode=embed"
  },
  {
    "slug": "cv",
    "tag": "CV",
    "title": "CV",
    "name": "Control Valve",
    "description": "Required control valve Cv and Kv for liquid or gas by IEC 60534-2-1, with choked-flow, cavitation and flashing checks, a suggested valve size, and the flow through a fully open valve for the failed-open relief case.",
    "standard": "IEC 60534-2-1 as in the Masoneilan Control Valve Sizing Handbook (OZ1000)",
    "category": "piping",
    "native": "cv",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/a430d7f498321368fb8848caee9ad5c5fcc346b68552cf4395ecb7f11f40632a?type=grid&mode=embed"
  },
  {
    "slug": "ro",
    "tag": "RO",
    "title": "RO",
    "name": "Restriction Orifice",
    "description": "Restriction orifice sizing (bore for a flow) or rating (flow for a bore) for vapour or liquid: ISO 5167-2 unchoked flow, critical gas and choked liquid flow, vena contracta and recovery, equivalent valve Cv, and the full calculation basis.",
    "standard": "ISO 5167-1/-2:2003; critical flow per Perry's Handbook",
    "category": "piping",
    "native": "ro",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/c5cb6f2f1092e2eef77ffb31340b6a93e548baa2424549c3abe4fd610191e275?type=grid&mode=embed"
  },
  {
    "slug": "drainage-overflow",
    "tag": "DRN",
    "title": "Drainage & Overflow",
    "name": "Liquid Gravity Drainage / Overflow Design",
    "description": "Sizes gravity overflow and drain lines for low-pressure and atmospheric tanks: liquid-relief overflows, side overflows, inbreathing drain rates and time to empty.",
    "category": "piping",
    "zoho": "https://sheet.zohopublic.eu/sheet/published/c6r1h72b876f046da470aa7985decaa85ff8f?sheetid=0&range=C2:I2&mode=embed",
    "credit": {
      "name": "LinkedIn",
      "url": "https://www.linkedin.com/in/ash-gratton-chemical-engineer/"
    }
  },
  {
    "slug": "compressor",
    "tag": "K",
    "title": "Compressor",
    "name": "Compressor",
    "description": "Gas compression for one duty: suction, mass or standard flow; reciprocating compressor (fewest stages within the discharge-temperature and ratio limits, power with intercooling) and centrifugal compressor (polytropic head, impellers, discharge temperature); shaft power, driver and motor rating.",
    "category": "equipment",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/436c80a66d2d7e9b3d3015559dcd8229f2ba0f73db159ef93c423272633b4460?type=grid&mode=embed",
    "native": "compressor"
  },
  {
    "slug": "pump",
    "tag": "P",
    "title": "Pump",
    "name": "Pump",
    "description": "Centrifugal pump circuit for three flow cases: suction and discharge pressures, control-valve pressure drop on the pump curve, NPSH available versus an NPSHr estimate, specific speed, maximum discharge pressure, power and driver rating.",
    "standard": "API 610 (ISO 13709) for design pressure and driver rating; NPSHr from suction specific speed",
    "category": "equipment",
    "native": "pump",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/c93432793a31089aa283c7459397d89baff3cf6c8f63397188e438955e64ae2e?type=grid&mode=embed"
  },
  {
    "slug": "drum",
    "tag": "D",
    "title": "Drum",
    "name": "Drum Geometry, Hold-up & Surge Rate",
    "description": "Total and level volumes of a horizontal or vertical drum with elliptical, torispherical, hemispherical or flat heads, a sketch to scale, and hold-up and surge times between the liquid levels.",
    "standard": "Exact head geometry (Crookston & Crookston, 2011)",
    "category": "equipment",
    "native": "drum",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/057f035821f5b6762307ea37b329156892d37b5a05e60cb2ccb314a8b3aa1878?type=grid&mode=embed"
  },
  {
    "slug": "heat-exchanger",
    "tag": "E",
    "title": "Heat Exchanger",
    "name": "Heat Exchanger Design",
    "description": "Sizing or rating of a two-stream exchanger: heat balance with any one unknown, condensing or boiling streams, counter-, co-current, shell-and-tube or cross-flow (LMTD with F), service or clean U with fouling, area and tube count, live temperature profile.",
    "category": "equipment",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/f83746a7440e99f8a5017d3a2b05e259f1ba0a260774e96c35f63a3b3de67413?type=grid&mode=embed",
    "native": "hx"
  },
  {
    "slug": "sieve",
    "tag": "SV",
    "title": "Sieve",
    "name": "Sieve Opening Size",
    "description": "U.S. standard sieve sizes (ASTM E11) with openings in mm, µm or inches, the old E11 openings and Tyler mesh equivalents; finds the sieves for a particle size.",
    "category": "equipment",
    "native": "sieve",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/daac6a0543f110d4dbfb19d0bfd71d6c99a0e1cb0edb2226688e65921cc8aefd?type=grid&mode=embed"
  },
  {
    "slug": "ped",
    "tag": "PED",
    "title": "PED",
    "name": "PED Selection: Pressure Equipment Directive 2014/68/EU",
    "description": "Finds the PED category and the conformity-assessment modules for vessels, piping, steam generators and accessories, with the Annex II table drawn and the design point marked.",
    "standard": "Directive 2014/68/EU (replaced 97/23/EC from 19 July 2016)",
    "category": "equipment",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/c7abcf8d1578584c5b3ca9812e441b9365f50c713014664defbd85bb8cc46157?type=grid&mode=embed",
    "native": "ped",
  },
  {
    "slug": "properties",
    "tag": "PRP",
    "title": "Properties",
    "name": "Physical Properties of Pure Components",
    "description": "Physical properties of pure components found by name: molecular weight, boiling and freezing points, critical constants, heats of vaporization and formation, density, heat capacity and viscosity.",
    "category": "properties",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/459b084fb19212c637bc096e8fd94e30a4584e3517987d87aa3b87aeebbc5354?type=grid&mode=embed",
    "native": "properties"
  },
  {
    "slug": "steam",
    "tag": "STM",
    "title": "Steam",
    "name": "Properties of Water and Steam",
    "description": "Properties of saturated water and steam from pressure or temperature, and of subcooled water and superheated steam: density, enthalpy, entropy, heat capacities, viscosity and thermal conductivity (IAPWS-IF97).",
    "category": "properties",
    "native": "steam",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/63d9fe5a7817f726df25c343cb6ddba735f65721e175f91ea697a01f57912fbf?type=grid&mode=embed"
  },
  {
    "slug": "gas-equation",
    "tag": "pVT",
    "title": "Gas Equation",
    "name": "Gas Calculations (p.V=n.R.t.Z)",
    "description": "Real-gas law pV = nRTZ: converts between mass, volumetric, molar and standard flows, and gives density and specific volume at the stated conditions.",
    "category": "properties",
    "native": "gas",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/dc31fc5d502a6b4ee5bac824aff9bf7b9eb8df8e3f308d0e6d727c80d7da85ef?type=grid&mode=embed"
  },
  {
    "slug": "unit-conversion",
    "tag": "UC",
    "title": "Unit Conversion",
    "name": "Unit Conversion",
    "description": "Converts values between SI, imperial and process units for common engineering quantities, with settings for atmospheric pressure and fluid-column density.",
    "standard": "unitconversion.org",
    "category": "general",
    "native": "units",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/139dc894065c9d7af95f05f39fd4c1b89e681a205d153e181812f027caf5d7bd?type=grid&mode=embed"
  },
  {
    "slug": "geometry",
    "tag": "GEO",
    "title": "Geometry",
    "name": "Geometry – Volume and Area of Geometrical Objects",
    "description": "Volume, surface area and circumference of common shapes: circle, sphere, cylinder, rectangle, box, parallelogram, triangle, cone and pyramid.",
    "category": "general",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/1e4d4c0cc14f918ddbd0a012cbcd9862f0980c77919cfaf312181ebf7c20aad3?type=grid&mode=embed",
    "native": "geometry"
  },
  {
    "slug": "prime-numbers",
    "tag": "PN",
    "title": "Prime Numbers",
    "name": "Prime Numbers",
    "description": "Simplifies a fraction by dividing both terms by their common prime factors and splits off the whole-number part.",
    "category": "general",
    "native": "primes",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/a852f5426713dcd67b3614914880fe7b302a35ea5334df3ac6496a926997f788?type=grid&mode=embed"
  }
];
