// Sources behind the native calculators: standards, articles, tables and web pages that numbers, formulas or
// data were taken from or checked against. Shown on each tool page ("Sources") and on /sources.
// Every entry: what it is, where to find it (url + a Wayback Machine snapshot so the link survives), when it
// was read, and what it was used for. The original Zoho sheet of each native tool is listed automatically.
// The owner also keeps private copies of the documents (not published); add new sources here first.

export interface Source {
  id: string;
  /** author(s) or issuing body */
  by: string;
  title: string;
  /** journal, publisher or site; edition */
  where?: string;
  year?: number;
  url?: string;
  /** Wayback Machine snapshot of url */
  archive?: string;
  /** date the source was read for this site (YYYY-MM-DD) */
  read: string;
  /** tool slug → what this source was used for in that tool */
  use: Record<string, string>;
}

export const sources: Source[] = [
  // ── units and constants ──
  {
    id: 'nist-sp811-b8', by: 'NIST (A. Thompson, B. N. Taylor)', title: 'Guide for the Use of the International System of Units (SI), SP 811, Appendix B.8: Factors for units listed alphabetically',
    where: 'National Institute of Standards and Technology', year: 2008,
    url: 'https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8',
    archive: 'https://web.archive.org/web/20261031140919/https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8',
    read: '2026-11-20',
    use: {
      'unit-conversion': 'Exact conversion factors (foot, pound, BTU, calorie …); reference values in the tests.',
      steam: 'International Table calorie (1 kcal = 4.1868 kJ) and BTU for the kcal and BTU units.',
    },
  },
  {
    id: 'nist-sp811-fn', by: 'NIST', title: 'Guide for the Use of the SI, SP 811: footnotes to Appendix B (International Table calorie and BTU)',
    where: 'National Institute of Standards and Technology', year: 2008,
    url: 'https://www.nist.gov/pml/special-publication-811/nist-guide-si-footnotes',
    archive: 'https://web.archive.org/web/20261018221613/https://www.nist.gov/pml/special-publication-811/nist-guide-si-footnotes',
    read: '2026-11-20',
    use: {
      'unit-conversion': 'Definition of the International Table calorie, 4.1868 J (5th Int. Conference on the Properties of Steam, 1956): the calorie used on the site.',
      steam: 'Same: the calorie of the steam tables.',
    },
  },
  {
    id: 'codata-r', by: 'NIST / CODATA', title: 'Molar gas constant R (exact since the 2019 SI redefinition)',
    where: 'The NIST Reference on Constants, Units, and Uncertainty', year: 2018,
    url: 'https://physics.nist.gov/cgi-bin/cuu/Value?r',
    archive: 'https://web.archive.org/web/20261002193050/https://physics.nist.gov/cgi-bin/cuu/Value?r',
    read: '2026-11-20',
    use: {
      'gas-equation': 'R = 8.314462618 J/(mol·K) in pV = nRTZ.',
      'unit-conversion': 'Standard volumes of an ideal gas (std m³, std ft³ in Amount of Substance).',
    },
  },
  {
    id: 'unitconversion-org', by: 'unitconversion.org', title: 'Unit conversion (reference of the original sheet)',
    url: 'http://www.unitconversion.org/index.html',
    archive: 'https://web.archive.org/web/20260804002117/http://www.unitconversion.org/index.html',
    read: '2026-11-20',
    use: { 'unit-conversion': 'Unit lists and factors of the original Zoho sheet; replaced by exact definitions where they differed.' },
  },
  // ── water and steam ──
  {
    id: 'iapws-if97', by: 'IAPWS', title: 'Revised Release on the IAPWS Industrial Formulation 1997 for the Thermodynamic Properties of Water and Steam, R7-97(2012)',
    where: 'International Association for the Properties of Water and Steam', year: 2012,
    url: 'https://iapws.org/technical-guidance/release/IF97-Rev',
    archive: 'https://web.archive.org/web/20250608103336/https://iapws.org/relguide/IF97-Rev.pdf',
    read: '2026-11-20',
    use: { steam: 'All thermodynamic properties (regions 1–4, saturation line, B23 boundary); all 126 coefficients and the verification values in the tests checked against the release.' },
  },
  {
    id: 'iapws-visc', by: 'IAPWS', title: 'Release on the IAPWS Formulation 2008 for the Viscosity of Ordinary Water Substance, R12-08',
    where: 'International Association for the Properties of Water and Steam', year: 2008,
    url: 'https://iapws.org/technical-guidance/release/viscosity',
    read: '2026-11-20',
    use: { steam: 'Viscosity (industrial use, without the critical term); check values in the tests from Table 4.' },
  },
  {
    id: 'iapws-thcond', by: 'IAPWS', title: 'Release on the IAPWS Formulation 2011 for the Thermal Conductivity of Ordinary Water Substance, R15-11',
    where: 'International Association for the Properties of Water and Steam', year: 2011,
    url: 'https://iapws.org/technical-guidance/release/ThCond',
    archive: 'https://web.archive.org/web/20250120122950/https://iapws.org/relguide/ThCond.pdf',
    read: '2026-11-20',
    use: { steam: 'Thermal conductivity with the critical enhancement in its industrial form; check values in the tests.' },
  },
  {
    id: 'pypi-iapws', by: 'J. J. Gómez Romera', title: 'iapws: Python implementation of the IAPWS standards, version 1.5.5',
    where: 'Python Package Index',
    url: 'https://pypi.org/project/iapws/',
    archive: 'https://web.archive.org/web/20261018125800/https://pypi.org/project/iapws/',
    read: '2026-11-20',
    use: { steam: 'Independent cross-check only (not part of the site): agrees with the native IF97 code within 10⁻⁹ on 314 states.' },
  },
  // ── sieves ──
  {
    id: 'wovenwire-e11', by: 'TWP Inc. (wovenwire.com)', title: 'ISO/ASTM Standard Sieve Series Specifications (ASTM E11-95 alternate designations)',
    url: 'https://wovenwire.com/reference/astm-sieve.htm',
    archive: 'https://web.archive.org/web/20260516142806/https://www.wovenwire.com/reference/astm-sieve.htm',
    read: '2026-11-20',
    use: { sieve: 'Current ASTM E11 openings (= ISO 565 / ISO 3310-1) for all 41 sieves.' },
  },
  {
    id: 'ecoshell-e11', by: 'Ecoshell', title: 'ASTM Specification E-11: nominal dimensions of standard test sieves',
    url: 'https://www.ecoshell.com/sds-technical-data/astm-specification-e-11/',
    archive: 'https://web.archive.org/web/20260515112817/https://www.ecoshell.com/sds-technical-data/astm-specification-e-11/',
    read: '2026-11-20',
    use: { sieve: 'Second source for the current openings (18 sieves; all agree).' },
  },
  {
    id: 'kuo-acharya', by: 'K. K. Kuo, R. Acharya', title: 'Applications of Turbulent and Multiphase Combustion, Appendix D, Table D.1: Standard U.S. Sieve Sizes and Tyler Mesh Sizes',
    where: 'John Wiley & Sons', year: 2012,
    url: 'https://hallaweb.jlab.org/tech/Detectors/public_html/manuals/data_sheets-manuals/X-Z/zurn_wilkins/PARTICLE%20SIZE%e2%80%93U.S.%20SIEVE%20SIZE.pdf',
    read: '2026-11-20',
    use: { sieve: 'Tyler mesh equivalents and the old ASTM E11 openings.' },
  },
  {
    id: 'agm-mesh', by: 'AGM Container Controls', title: 'Particle Size – US Sieve Series and Tyler Mesh Size Equivalents',
    url: 'https://www.agmcontainer.com/wp-content/uploads/2020/06/Mesh_Equivalents.pdf',
    archive: 'https://web.archive.org/web/20251223025224/https://www.agmcontainer.com/wp-content/uploads/2020/06/Mesh_Equivalents.pdf',
    read: '2026-11-20',
    use: { sieve: 'Second source for the Tyler equivalents and old openings (all agree).' },
  },
  // ── piping ──
  {
    id: 'anaya-durand-1999', by: 'A. Anaya Durand et al.', title: 'Updated Rules for Pipe Sizing',
    where: 'Chemical Engineering, May 1999, pp. 153–156', year: 1999,
    read: '2026-11-20',
    use: { 'pipe-size': 'Economic-diameter correlation (Generaux type). Constants as on the original sheet; the article itself could not be accessed to verify them.' },
  },
  {
    id: 'cheresources', by: 'The Chemical Engineers’ Resource', title: 'Economic pipe sizing spreadsheet (basis of the original sheet)',
    url: 'https://www.cheresources.com/',
    archive: 'https://web.archive.org/web/20261115001441/https://www.cheresources.com/',
    read: '2026-11-20',
    use: { 'pipe-size': 'Algorithm of the original Zoho sheet, as stated on the sheet.' },
  },
  {
    id: 'etb-pipes', by: 'The Engineering ToolBox', title: 'ASME/ANSI B36.10/19 – Carbon, Alloy and Stainless Steel Pipes – Dimensions',
    url: 'https://www.engineeringtoolbox.com/steel-pipes-dimensions-d_43.html',
    archive: 'https://web.archive.org/web/20261020002132/https://www.engineeringtoolbox.com/steel-pipes-dimensions-d_43.html',
    read: '2026-11-20',
    use: { 'pipe-size': 'Outside diameters, Schedule STD and 10S walls, NPS 1/8–18.' },
  },
  {
    id: 'etb-ss-pipes', by: 'The Engineering ToolBox', title: 'Stainless Steel Pipes – Dimensions and Weights (ASME B36.19)',
    url: 'https://www.engineeringtoolbox.com/ansi-stainless-steel-pipes-d_247.html',
    archive: 'https://web.archive.org/web/20261001092051/https://www.engineeringtoolbox.com/ansi-stainless-steel-pipes-d_247.html',
    read: '2026-11-20',
    use: { 'pipe-size': 'Second source for Schedule 10S walls, NPS 1/2–12 (agrees).' },
  },
  {
    id: 'wiki-nps', by: 'Wikipedia', title: 'Nominal Pipe Size (tables based on ASME B36.10M and B36.19M)',
    url: 'https://en.wikipedia.org/wiki/Nominal_Pipe_Size',
    archive: 'https://web.archive.org/web/20261109090751/https://en.wikipedia.org/wiki/Nominal_Pipe_Size',
    read: '2026-11-20',
    use: { 'pipe-size': 'Schedule STD and 10S dimensions, NPS 10–48 (agrees with the ToolBox where both list a size).' },
  },
];

/** Sources used by one tool, in registry order. */
export const sourcesFor = (slug: string) => sources.filter((s) => slug in s.use);
