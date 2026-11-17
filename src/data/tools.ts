// The single list of all tools. Order inside a category = order on the site.
// Generated from the WordPress export (migration/pages.raw.json) on 2026-11-17; edit by hand from now on.

export type CategoryId = 'relief' | 'piping' | 'equipment' | 'properties' | 'general';

export const categories: { id: CategoryId; title: string }[] = [
  { id: 'relief', title: 'Relief & Flare' },
  { id: 'piping', title: 'Piping & Flow' },
  { id: 'equipment', title: 'Equipment' },
  { id: 'properties', title: 'Properties' },
  { id: 'general', title: 'General' },
];

export interface Tool {
  slug: string;        // URL: https://cheming.site/<slug>/
  tag: string;         // instrument-bubble tag, e.g. PSV (keep to 3 characters)
  sub?: string;        // optional lower half of the bubble, e.g. G for gas
  description?: string; // one or two lines: what it calculates and when to use it
  title: string;       // short name (menu)
  name: string;        // full descriptive name
  category: CategoryId;
  zoho: string;        // Zoho Sheet embed URL
  standard?: string;   // standard / reference followed
  credit?: { name: string; url: string };
}

export const tools: Tool[] = [
  {
    "slug": "psv",
    "tag": "PSV",
    "title": "PSV",
    "name": "Pressure Safety Valve",
    "category": "relief",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/8cc3425a2dec03483d70b75b03d5a0f4cfcb1098276383c3205d1553329a0aad?type=grid&mode=embed"
  },
  {
    "slug": "psv-gas-filled-vessel",
    "tag": "PSV",
    "sub": "G",
    "title": "PSV: Gas Filled Vessel",
    "name": "PSV Sizing for Fire Case in a Vapor/Gas Filled Vessel",
    "category": "relief",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/250a14e89cdeaf0535dc3bbb3a5b6b1a35d2acdaa3974379b8aac4dc8868852a?type=grid&mode=embed"
  },
  {
    "slug": "psv-liquid-filled-vessel",
    "tag": "PSV",
    "sub": "L",
    "title": "PSV: Liquid Filled Vessel",
    "name": "PSV Sizing for Fire Case in a Liquid Filled Vessel",
    "category": "relief",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/6c9c61f423c0019928e17c434407830cbdf9b916d98bf8dd0521bc5f97e47a2e?type=grid&mode=embed"
  },
  {
    "slug": "flare-stack",
    "tag": "FS",
    "title": "Flare Stack",
    "name": "Flare Stack Sizing by ANSI/API Standard 521/ ISO 23251",
    "category": "relief",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/53b4685016fa0d81312c2fa316ea64e448c3ab8bc2461b2ad88aa07d84f7c32a?type=grid&mode=embed",
    "standard": "ANSI/API Std 521 / ISO 23251"
  },
  {
    "slug": "kod",
    "tag": "KOD",
    "title": "KOD",
    "name": "Horizontal Knock Out Drum as per API RP 521, 1997, par. 5.4.2.1",
    "category": "relief",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/e1c2da68bc9cbfa1c47143b3d3bda6687a1ec3cf70fffb50279965248e701fd7?type=grid&mode=embed",
    "standard": "API RP 521 (1997), §5.4.2.1"
  },
  {
    "slug": "noise",
    "tag": "dB",
    "title": "Noise",
    "name": "Noise Calculation by API 521 5th Edition par. 7.3.4.3",
    "category": "relief",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/75c00428f9365d519c7d41a9210cf9d1ec563720efd7414f2d2a31aa68920540?type=grid&mode=embed",
    "standard": "API 521 5th ed., §7.3.4.3"
  },
  {
    "slug": "pressurization-depressurization",
    "tag": "BDV",
    "title": "Pressurization & Depressurization",
    "name": "Pressurization and Depressurization",
    "category": "relief",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/a4b4bb874058313fd40b0142e22fba59c6e9ab72440d528e214207945373ce98?type=grid&mode=embed"
  },
  {
    "slug": "pressure-loss-single-phase",
    "tag": "ΔP",
    "sub": "1",
    "title": "Pressure Loss: Single Phase",
    "name": "Pressure Loss of Single Phase Flow in Circular Rough Piping",
    "category": "piping",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/a5e624f799e372407267e75c5d2ea2d2aa8a0e692e4a1cab09ae6f9e3df66194?type=grid&mode=embed"
  },
  {
    "slug": "pressure-loss-non-circular-piping",
    "tag": "ΔP",
    "sub": "NC",
    "title": "Pressure Loss: Non-Circular Piping",
    "name": "Pressure Loss of Single Phase Flow in Non-Circular Rough Piping",
    "category": "piping",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/258da99aa8f3f8da7c392c614e3df2081b2f2f8b8408deda2c677ba76adfca7b?type=grid&mode=embed"
  },
  {
    "slug": "pressure-loss-two-phase",
    "tag": "ΔP",
    "sub": "2",
    "title": "Pressure Loss: Two Phase",
    "name": "Pressure Loss of Two Phase Flow in Circular Rough Piping",
    "category": "piping",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/9d31950cf989751b5aceab7b2ddd1d39966e88bef9eaff6a88cbc738b74e9fce?type=grid&mode=embed"
  },
  {
    "slug": "pipe-size",
    "tag": "DN",
    "title": "Pipe Size",
    "name": "Pipe Size Optimization for Carbon and Stainless Steel Pipes",
    "category": "piping",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/37f0cd48177be703ca2d0bf1696576b8c6e052db1b23436bfa9de72dba2aa9f6?type=grid&mode=embed"
  },
  {
    "slug": "cv",
    "tag": "CV",
    "title": "CV",
    "name": "Control Valve",
    "category": "piping",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/a430d7f498321368fb8848caee9ad5c5fcc346b68552cf4395ecb7f11f40632a?type=grid&mode=embed"
  },
  {
    "slug": "ro",
    "tag": "RO",
    "title": "RO",
    "name": "Restriction Orifice",
    "category": "piping",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/c5cb6f2f1092e2eef77ffb31340b6a93e548baa2424549c3abe4fd610191e275?type=grid&mode=embed"
  },
  {
    "slug": "drainage-overflow",
    "tag": "DRN",
    "title": "Drainage & Overflow",
    "name": "Liquid Gravity Drainage / Overflow Design",
    "category": "piping",
    "zoho": "https://sheet.zohopublic.eu/sheet/published/c6r1h72b876f046da470aa7985decaa85ff8f?sheetid=0&range=C2:I2&mode=embed",
    "credit": {
      "name": "Ash Gratton",
      "url": "https://www.linkedin.com/in/ash-gratton-chemical-engineer/"
    }
  },
  {
    "slug": "compressor",
    "tag": "K",
    "title": "Compressor",
    "name": "Compressor",
    "category": "equipment",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/436c80a66d2d7e9b3d3015559dcd8229f2ba0f73db159ef93c423272633b4460?type=grid&mode=embed"
  },
  {
    "slug": "pump",
    "tag": "P",
    "title": "Pump",
    "name": "Pump",
    "category": "equipment",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/c93432793a31089aa283c7459397d89baff3cf6c8f63397188e438955e64ae2e?type=grid&mode=embed"
  },
  {
    "slug": "drum",
    "tag": "D",
    "title": "Drum",
    "name": "Drum Geometry, Hold-up & Surge Rate",
    "category": "equipment",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/057f035821f5b6762307ea37b329156892d37b5a05e60cb2ccb314a8b3aa1878?type=grid&mode=embed"
  },
  {
    "slug": "heat-exchanger",
    "tag": "E",
    "title": "Heat Exchanger",
    "name": "Heat Exchanger Design",
    "category": "equipment",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/f83746a7440e99f8a5017d3a2b05e259f1ba0a260774e96c35f63a3b3de67413?type=grid&mode=embed"
  },
  {
    "slug": "sieve",
    "tag": "SV",
    "title": "Sieve",
    "name": "Sieve Opening Size",
    "category": "equipment",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/daac6a0543f110d4dbfb19d0bfd71d6c99a0e1cb0edb2226688e65921cc8aefd?type=grid&mode=embed"
  },
  {
    "slug": "ped",
    "tag": "PED",
    "title": "PED",
    "name": "PED Selection: European Pressure Equipment Directive 97/23/EG",
    "category": "equipment",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/c7abcf8d1578584c5b3ca9812e441b9365f50c713014664defbd85bb8cc46157?type=grid&mode=embed",
    "standard": "Directive 97/23/EG"
  },
  {
    "slug": "properties",
    "tag": "PRP",
    "title": "Properties",
    "name": "Physical Properties of Pure Components",
    "category": "properties",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/459b084fb19212c637bc096e8fd94e30a4584e3517987d87aa3b87aeebbc5354?type=grid&mode=embed"
  },
  {
    "slug": "steam",
    "tag": "STM",
    "title": "Steam",
    "name": "Properties of Saturated Steam",
    "category": "properties",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/63d9fe5a7817f726df25c343cb6ddba735f65721e175f91ea697a01f57912fbf?type=grid&mode=embed"
  },
  {
    "slug": "gas-equation",
    "tag": "pVT",
    "title": "Gas Equation",
    "name": "Gas Calculations (p.V=n.R.t.Z)",
    "category": "properties",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/dc31fc5d502a6b4ee5bac824aff9bf7b9eb8df8e3f308d0e6d727c80d7da85ef?type=grid&mode=embed"
  },
  {
    "slug": "unit-conversion",
    "tag": "UC",
    "title": "Unit Conversion",
    "name": "Unit Conversion",
    "category": "general",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/139dc894065c9d7af95f05f39fd4c1b89e681a205d153e181812f027caf5d7bd?type=grid&mode=embed"
  },
  {
    "slug": "geometry",
    "tag": "GEO",
    "title": "Geometry",
    "name": "Geometry – Volume and Area of Geometrical Objects",
    "category": "general",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/1e4d4c0cc14f918ddbd0a012cbcd9862f0980c77919cfaf312181ebf7c20aad3?type=grid&mode=embed"
  },
  {
    "slug": "prime-numbers",
    "tag": "PN",
    "title": "Prime Numbers",
    "name": "Prime Numbers",
    "category": "general",
    "zoho": "https://sheet.zohopublic.eu/sheet/publishedrange/a852f5426713dcd67b3614914880fe7b302a35ea5334df3ac6496a926997f788?type=grid&mode=embed"
  }
];
