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
      properties: 'Output in cal and kcal uses the International Table calorie (the 1977 data were read with the thermochemical 4.184 J of their book).',
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
      properties: 'R in the critical compressibility Z_c = p_c·V_c/(R·T_c) and in the Poling heat-capacity polynomials.',
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
    archive: 'https://web.archive.org/web/20261012033204/https://iapws.org/technical-guidance/release/viscosity',
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
    use: { 'pipe-size': 'Outside diameters, Schedule STD and 10S walls, NPS 1/8–18.', 'pressure-loss-single-phase': 'Walls of all schedules, NPS 1/8–18: one of three agreeing sources for the pipe table (fixes PIP-1, PIP-2).' },
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
    use: { 'pipe-size': 'Schedule STD and 10S dimensions, NPS 10–48 (agrees with the ToolBox where both list a size).', 'pressure-loss-single-phase': 'Walls of all schedules, NPS 1/8–48: one of three agreeing sources for the pipe table.' },
  },
  {
    id: 'fluids', by: 'C. Bell and contributors', title: 'fluids: fluid dynamics component of Chemical Engineering Design Library (ChEDL), version 1.3.1',
    url: 'https://pypi.org/project/fluids/',
    archive: 'https://web.archive.org/web/20260414063257/https://pypi.org/project/fluids/',
    read: '2026-11-22',
    use: { ro: 'Independent check of the ISO 5167 orifice equations (C_Reader_Harris_Gallagher, orifice_expansibility, dP_orifice, differential_pressure_meter_solver): agreement within 1e-6.', cv: 'Independent check of the IEC 60534-2-1 liquid and gas sizing (size_control_valve_l, size_control_valve_g): agreement within 0.3 % (rounded handbook constants).', 'pressure-loss-two-phase': 'Independent checks: Churchill friction factor (1e-12), Chisholm with all B branches and Friedel (within 1 %; fluids uses the Colebrook friction factor), Rouhani–Axelsson void fraction (1e-12); pipe table as for Single Phase.', 'pressure-loss-single-phase': 'Schedule tables (after ASME B36.10M/B36.19M, in mm): the main source of the pipe table, checked against the ToolBox and Wikipedia. Independent check of the Colebrook solution (agrees to 1e-10) and of the API RP 14E formula.' },
  },
  {
    id: 'colebrook-1939', by: 'C. F. Colebrook', title: 'Turbulent flow in pipes, with particular reference to the transition region between the smooth and rough pipe laws',
    where: 'Journal of the Institution of Civil Engineers, vol. 11, no. 4, pp. 133–156', year: 1939,
    url: 'https://doi.org/10.1680/ijoti.1939.13150',
    read: '2026-11-22',
    use: { 'pressure-loss-non-circular-piping': 'Colebrook–White friction factor with the hydraulic diameter, solved exactly (turbulent and transitional flow).', 'pressure-loss-single-phase': 'Colebrook–White friction factor, solved exactly (owner\'s choice 2026-11-22); the original sheet used an explicit approximation of it.' },
  },
  {
    id: 'moody-1944', by: 'L. F. Moody', title: 'Friction Factors for Pipe Flow',
    where: 'Transactions of the ASME, vol. 66, pp. 671–684', year: 1944,
    url: 'http://user.engineering.uiowa.edu/~me_160/lecture_notes/MoodyLFpaper1944.pdf',
    archive: 'https://web.archive.org/web/20141121084643/http://user.engineering.uiowa.edu:80/~me_160/lecture_notes/MoodyLFpaper1944.pdf',
    read: '2026-11-22',
    use: { 'pressure-loss-two-phase': 'Absolute roughness presets (Fig. 2 and the Fig. 7 table), as for Single Phase.', 'pressure-loss-non-circular-piping': 'Absolute roughness presets and the default 0.0457 mm (commercial steel), as for Single Phase.', 'pressure-loss-single-phase': 'Absolute roughness of new pipe (the material presets): Fig. 2 and the table in Fig. 7 (H. Rouse\'s discussion, p. 681), drawn tubing 0.000005 ft (p. 677); the default 0.0457 mm is commercial steel, 0.00015 ft. Also the laminar f = 64/R and the critical zone between R = 2000 and 3000–4000 (p. 674).' },
  },
  {
    id: 'goudar-sonnad-2007', by: 'C. T. Goudar, J. R. Sonnad', title: 'Explicit friction factor correlation for turbulent flow in rough pipe',
    where: 'Hydrocarbon Processing, April 2007, pp. 103–105', year: 2007,
    read: '2026-11-22',
    use: { 'pressure-loss-non-circular-piping': 'Basis of the original sheet; its correlation is kept only to reproduce the Zoho results in the tests.', 'pressure-loss-single-phase': 'Basis of the original sheet: Eq. 3, an explicit approximation of Colebrook (stated maximum error 1 %; the sheet copies it exactly). Kept only to reproduce the Zoho results in the tests; the tool solves Colebrook exactly.' },
  },
  {
    id: 'api-rp-14e', by: 'American Petroleum Institute', title: 'API RP 14E: Recommended Practice for Design and Installation of Offshore Production Platform Piping Systems',
    where: 'American Petroleum Institute, Washington, 5th ed.',
    read: '2026-11-22',
    use: { 'pressure-loss-two-phase': 'Erosional velocity v = C/√ρ with the no-slip mixture density (the standard is written for two-phase production piping), as quoted in the fluids library.', 'pressure-loss-non-circular-piping': 'Erosional velocity, as for Single Phase.', 'pressure-loss-single-phase': 'Erosional velocity vₑ = C/√ρ (ft/s, lb/ft³) and the suggested C factors, as quoted in the fluids library (not read from the standard itself).' },
  },
  {
    id: 'shah-london-1971', by: 'R. K. Shah, A. L. London', title: 'Laminar Flow Forced Convection Heat Transfer and Flow Friction in Straight and Curved Ducts – A Summary of Analytical Solutions',
    where: 'Technical Report No. 75, Department of Mechanical Engineering, Stanford University (DTIC AD0736260)', year: 1971,
    url: 'https://apps.dtic.mil/sti/pdfs/AD0736260.pdf',
    archive: 'https://web.archive.org/web/20240415164215/https://apps.dtic.mil/sti/pdfs/AD0736260.pdf',
    read: '2026-11-22',
    use: { 'pressure-loss-non-circular-piping': 'Laminar friction constants f·Re (Fanning; ×4 for Darcy): rectangle Eq. 148–149 (exact series, checked against Table 13 to 7 digits), equilateral triangle Eq. 155 (40/3), ellipse Eq. 172, concentric annulus Eq. 187. Table 33 (ellipse) is not used: it evaluates E at the modulus instead of the parameter (e.g. 17.055 at α = 0.99 instead of 16.00); Eq. 172 agrees with the exact flow rate and a finite-difference check.' },
  },
  {
    id: 'perry-7-6', by: 'R. H. Perry, D. W. Green (eds.)', title: 'Perry\'s Chemical Engineers\' Handbook, 7th ed., Section 6 (Fluid and Particle Dynamics, J. N. Tilton)',
    where: 'McGraw-Hill, New York', year: 1997,
    read: '2026-11-22',
    use: { 'pressure-loss-non-circular-piping': 'p. 6-12: the hydraulic diameter for turbulent flow; "the hydraulic diameter method does not work well for laminar flow" (shape-dependent; equivalent diameters), the basis of the shape constants used here.', 'pressure-loss-two-phase': 'p. 6-26/27: Baker chart (Fig. 6-25) with λ, ψ and their reference values (air 1.20 kg/m³, σ 0.073 N/m: fixes 2P-3); the sheet\'s six boundaries and its Lockhart–Martinelli curve fits were overlaid on Fig. 6-25 and Fig. 6-26 and coincide.' },
  },
  {
    id: 'haraburda-chafin-2000', by: 'S. S. Haraburda, S. Chafin', title: 'Calculating Two-Phase Pressure Drop, and its Two Phase Flow Calculation Spreadsheet v1.04 (River City Engineering)',
    where: 'Chemical Processing, 2000 Fluid Flow Annual Desktop Reference', year: 2000,
    read: '2026-11-22',
    use: { 'pressure-loss-two-phase': 'Basis of the original sheet. Its spreadsheet (macro code read) confirms the method, the correlation choice, Friedel\'s down-flow multiplier and the Lockhart–Martinelli curve fits, regressed from the 1949 table it contains (the fits follow that table within 3.5 % and Perry\'s Fig. 6-26). Errors 2P-1, 2P-2 and 2P-6 come from it and are fixed here.' },
  },
  {
    id: 'thome-db3', by: 'J. R. Thome', title: 'Engineering Data Book III, chapters 12 (Two-Phase Flow Patterns) and 13 (Two-Phase Pressure Drops)',
    where: 'Wolverine Tube, Inc. (online edition, chapters citing work to 2006)',
    url: 'http://www.wlv.com/wp-content/uploads/2014/06/databook3/data/db3ch13.pdf',
    archive: 'https://web.archive.org/web/20150513223913/http://www.wlv.com:80/wp-content/uploads/2014/06/databook3/data/db3ch13.pdf',
    read: '2026-11-22',
    use: { 'pressure-loss-two-phase': 'Friedel (1979) with the total flow as liquid and as gas and F = x^0.78·(1 − x)^0.224 (fixes 2P-1, 2P-2); Chisholm\'s B with all mass-flux branches (fixes 2P-6); Whalley\'s (1980) choice of correlation; Rouhani–Axelsson void fraction and the static head; and Baker\'s λ and ψ (ch. 12; its rounded reference values 1.23 kg/m³ and 0.072 N/m are those of the sheet, replaced by Perry\'s).' },
  },
  {
    id: 'keshock-1975', by: 'E. G. Keshock', title: 'Experimental and Analytical Investigation of "0" G Condensation in a Mechanical Refrigeration System Application, Fig. 8: Baker chart',
    where: 'Old Dominion University, Technical Report 75-T6, for NASA Johnson Space Center (NTRS 19750022396)', year: 1975,
    url: 'https://ntrs.nasa.gov/citations/19750022396',
    archive: 'https://web.archive.org/web/20261122102400/https://ntrs.nasa.gov/citations/19750022396',
    read: '2026-11-22',
    use: { 'pressure-loss-two-phase': 'Reproduction of Baker\'s original map: the six boundary lines of the original sheet were overlaid on it and coincide.' },
  },
  {
    id: 'baker-1954', by: 'O. Baker', title: 'Simultaneous flow of oil and gas',
    where: 'Oil and Gas Journal, vol. 53, pp. 185–195', year: 1954,
    read: '2026-11-22',
    use: { 'pressure-loss-two-phase': 'The flow-pattern map for horizontal pipes (cited; checked through its reproduction by Keshock 1975).' },
  },
  {
    id: 'churchill-1977', by: 'S. W. Churchill', title: 'Friction-factor equation spans all fluid-flow regimes',
    where: 'Chemical Engineering, vol. 84, no. 24, pp. 91–92', year: 1977,
    read: '2026-11-22',
    use: { 'pressure-loss-two-phase': 'Single-phase friction factors, as on the original sheet (checked against the fluids library).' },
  },
  {
    id: 'rouhani-axelsson-1970', by: 'S. Z. Rouhani, E. Axelsson', title: 'Calculation of void volume fraction in the subcooled and quality boiling regions',
    where: 'International Journal of Heat and Mass Transfer, vol. 13, pp. 383–393', year: 1970,
    read: '2026-11-22',
    use: { 'pressure-loss-two-phase': 'Void fraction for the static head (owner\'s choice 2026-11-22), in the form given by Thome (eq. 13.2.4b).' },
  },
  {
    id: 'masoneilan-oz1000', by: 'Masoneilan (Dresser Industries)', title: 'Control Valve Sizing Handbook, Bulletin OZ1000 7/00',
    where: 'Dresser Industries, Inc.', year: 2000,
    url: 'https://docs.ufpr.br/~gazda/valmason.pdf',
    archive: 'https://web.archive.org/web/20261122113735/https://docs.ufpr.br/~gazda/valmason.pdf',
    read: '2026-11-22',
    use: { ro: 'Equivalent control-valve Cv of the orifice (IEC method, as in the CV tool).', cv: 'Basis of the original sheet: liquid sizing with N6 = 27.3, choked flow at FL²·(p1 − FF·pv), FF = 0.96 − 0.28·√(pv/pc); gas sizing with Y = 1 − x/(3·Fk·xT) and N8 = 94.8 (ISA S75.01 / IEC 534-2), used here instead of the sheet\'s older Cf method (owner\'s choice); Kv = 0.865·Cv.' },
  },
  {
    id: 'masoneilan-2022', by: 'Baker Hughes (Masoneilan)', title: 'Masoneilan Control Valve Sizing Handbook, GEA19540A, Rev. C',
    where: 'Baker Hughes', year: 2022,
    url: 'https://dam.bakerhughes.com/m/47616eb160214a1d/original/MN-Valve-Sizing-Handbook-GEA19540A-English-pdf.pdf',
    archive: 'https://web.archive.org/web/20261122113740/https://dam.bakerhughes.com/m/47616eb160214a1d/original/MN-Valve-Sizing-Handbook-GEA19540A-English-pdf.pdf',
    read: '2026-11-22',
    use: { cv: 'Current edition of the same handbook: equations and constants unchanged.' },
  },
  {
    id: 'fisher-cvh3', by: 'Fisher Controls International (Emerson)', title: 'Control Valve Handbook, 3rd ed., Chapter 5: Representative Sizing Coefficients',
    where: 'Fisher Controls, Marshalltown, pp. 125–127', year: 1999,
    url: 'http://www.documentation.emersonprocess.com/groups/public/documents/book/cvh99.pdf',
    archive: 'https://web.archive.org/web/20160303181623/http://www.documentation.emersonprocess.com/groups/public/documents/book/cvh99.pdf',
    read: '2026-11-22',
    use: { ro: 'Default FL and xT of the equivalent-valve comparison (1″ single-port globe, equal percentage).', cv: 'Representative Cv, FL and xT at rated travel by size for single-port globe (equal percentage, linear), V-notch ball and high-performance butterfly valves: the valve-style data and size suggestion (replacing the sheet\'s unsourced typical table).' },
  },
  {
    id: 'api-521', by: 'American Petroleum Institute', title: 'API Standard 521 / ISO 23251: Pressure-relieving and Depressuring Systems, 5.10 Failure of automatic controls',
    where: 'American Petroleum Institute, 5th ed.', year: 2007,
    read: '2026-11-22',
    use: { cv: 'Failed-open relief case (5.10.2–5.10.4): one inlet valve fully open regardless of its failure position, relieving rate = maximum inlet flow − normal outlet flow, bypass and limit-stop rules, gas blow-through on loss of level.' },
  },
  {
    id: 'iso-5167-2003', by: 'ISO', title: 'ISO 5167-1:2003 and ISO 5167-2:2003, Measurement of fluid flow by means of pressure differential devices inserted in circular cross-section conduits running full: Part 1 General principles; Part 2 Orifice plates',
    where: 'International Organization for Standardization, Geneva (also BS EN ISO 5167-1/-2:2003)', year: 2003,
    read: '2026-11-22',
    use: { ro: 'Flow equation (Part 1 Eq. 1), Reader–Harris/Gallagher discharge coefficient with flange tappings (Part 2 Eq. 4, small-pipe term), expansibility (Eq. 5), permanent pressure loss (Eq. 7) and limits of use (5.3.1); replaces the 1991 equations of the original sheet (owner\'s choice).' },
  },
  {
    id: 'perry-7-10', by: 'R. H. Perry, D. W. Green (eds.)', title: 'Perry\'s Chemical Engineers\' Handbook, 7th ed., Section 10 (Transport and Storage of Fluids): flow measurement, orifice meters',
    where: 'McGraw-Hill, New York, pp. 10-15 to 10-16', year: 1997,
    read: '2026-11-22',
    use: { ro: 'Critical flow through a sharp-edged orifice (Eq. 10-26): discharge coefficient rising from about 0.75 at the critical ratio to 0.84 at p2/p1 → 0 (Grace and Lapple; Benedict), which the original sheet\'s Cd fit follows; expansion factor Eq. 10-29 (the 1991 form used by the sheet).' },
  },
  {
    id: 'ward-smith-1979', by: 'A. J. Ward-Smith', title: 'Critical flowmetering: the characteristics of cylindrical nozzles with sharp upstream edges',
    where: 'International Journal of Heat and Fluid Flow, vol. 1, no. 3, pp. 123–132', year: 1979,
    read: '2026-11-22',
    use: { ro: 'Discharge coefficient of choked thick plates against t/d (side note, as quoted on the original sheet; the paper itself was not accessible).' },
  },
  // ── pure-component properties ──
  {
    id: 'rps77', by: 'R. C. Reid, J. M. Prausnitz, T. K. Sherwood', title: 'The Properties of Gases and Liquids, 3rd ed., Appendix A: Property data bank',
    where: 'McGraw-Hill, New York', year: 1977,
    read: '2026-11-21',
    use: { properties: 'The original sheet\'s table (469 components; identified by its columns, not checked page by page): used only where no newer evaluated value exists, after its typing errors were fixed (sign, digit, decimal point, shifted rows, wrong names). Harlacher vapour pressure, and the 1977 heat-capacity, viscosity and Antoine equations as fallback; 1977 energies read with the thermochemical calorie (4.184 J).' },
  },
  {
    id: 'chemicals', by: 'C. Bell and contributors', title: 'chemicals: chemical properties component of Chemical Engineering Design Library (ChEDL), version 1.5.2',
    where: 'Python Package Index; MIT licence', year: 2025,
    url: 'https://github.com/CalebBell/chemicals',
    archive: 'https://web.archive.org/web/20260626195303/https://github.com/CalebBell/chemicals',
    read: '2026-11-21',
    use: { properties: 'Access to the newer data (its data files from the sources listed below, by CAS number), identification of every component by CAS number, the cross-check of the 1977 table, and the reference values in the tests (its own equation implementations).' },
  },
  {
    id: 'coolprop', by: 'I. H. Bell, J. Wronski, S. Quoilin, V. Lemort', title: 'Pure and Pseudo-pure Fluid Thermophysical Property Evaluation and the Open-Source Thermophysical Property Library CoolProp',
    where: 'Ind. Eng. Chem. Res. 53 (6), 2498–2508', year: 2014,
    url: 'https://doi.org/10.1021/ie4033999',
    read: '2026-11-21',
    use: { properties: 'Critical point, normal boiling point and acentric factor of the 96 fluids with a reference equation of state (first choice).' },
  },
  {
    id: 'iupac-crit', by: 'D. Ambrose, C. Tsonopoulos, K. N. Marsh, C. L. Young et al. (IUPAC)', title: 'Vapor–Liquid Critical Properties of Elements and Compounds, parts 1–12 (part 12: review of recent data)',
    where: 'J. Chem. Eng. Data 40 (1995) – 60 (2015)', year: 2015,
    url: 'https://doi.org/10.1021/acs.jced.5b00571',
    read: '2026-11-21',
    use: { properties: 'Evaluated critical temperature, pressure and volume (second choice, after CoolProp).' },
  },
  {
    id: 'mathews72', by: 'J. F. Mathews', title: 'The Critical Constants of Inorganic Substances',
    where: 'Chem. Rev. 72 (1), 71–100', year: 1972,
    url: 'https://doi.org/10.1021/cr60276a003',
    read: '2026-11-21',
    use: { properties: 'Critical constants of inorganic gases not covered by CoolProp or IUPAC.' },
  },
  {
    id: 'crc', by: 'W. M. Haynes, T. J. Bruno, D. R. Lide (eds.)', title: 'CRC Handbook of Chemistry and Physics, 95th ed.',
    where: 'CRC Press, Boca Raton', year: 2014,
    read: '2026-11-21',
    use: { properties: 'Freezing and boiling points, critical constants where IUPAC has none, heat of vaporization at the boiling point, heats and Gibbs energies of formation and standard entropies of the ideal gas.' },
  },
  {
    id: 'atct', by: 'B. Ruscic, D. H. Bross (Argonne National Laboratory)', title: 'Active Thermochemical Tables (ATcT), values based on version 1.112 of the Thermochemical Network',
    where: 'Argonne National Laboratory',
    url: 'https://atct.anl.gov/',
    archive: 'https://web.archive.org/web/20261115045758/https://atct.anl.gov/',
    read: '2026-11-21',
    use: { properties: 'Heat of formation of the ideal gas at 25 °C (first choice, about 100 components).' },
  },
  {
    id: 'webbook', by: 'P. J. Linstrom, W. G. Mallard (eds.), NIST', title: 'NIST Chemistry WebBook, NIST Standard Reference Database 69',
    where: 'National Institute of Standards and Technology',
    url: 'https://webbook.nist.gov/chemistry/',
    archive: 'https://web.archive.org/web/20261118015401/https://webbook.nist.gov/chemistry/',
    read: '2026-11-21',
    use: { properties: 'Heats of formation where ATcT and CRC have none; replaces a few 1977 boiling and freezing points that disagreed with every other compilation.' },
  },
  {
    id: 'api-tdb', by: 'American Petroleum Institute; compiled by T. A. Albahri', title: 'API Technical Data Book – Petroleum Refining: standard heats of formation of the ideal gas',
    where: 'API, Washington DC (values as tabulated in the chemicals library)',
    read: '2026-11-21',
    use: { properties: 'Heats of formation of some hydrocarbons not covered by ATcT, CRC or the WebBook.' },
  },
  {
    id: 'trc', by: 'M. Frenkel, G. J. Kabo, K. N. Marsh, G. N. Roganov, R. C. Wilhoit', title: 'Thermodynamics of Organic Compounds in the Gas State',
    where: 'Thermodynamics Research Center, College Station, Texas', year: 1994,
    read: '2026-11-21',
    use: { properties: 'Heats of formation of a few long-chain alcohols.' },
  },
  {
    id: 'poling', by: 'B. E. Poling, J. M. Prausnitz, J. P. O\'Connell', title: 'The Properties of Gases and Liquids, 5th ed., Appendix A',
    where: 'McGraw-Hill, New York', year: 2001,
    read: '2026-11-21',
    use: { properties: 'Ideal-gas heat capacity polynomials with their ranges (about 240 components), Wagner and Antoine vapour-pressure equations with their ranges, dipole moments.' },
  },
  {
    id: 'landolt', by: 'J. Dykyj, J. Svoboda, R. C. Wilhoit, M. Frenkel, K. R. Hall', title: 'Vapor Pressure of Chemicals (Landolt-Börnstein, New Series IV/20): Antoine constants',
    where: 'Springer, Berlin', year: 2001,
    read: '2026-11-21',
    use: { properties: 'Antoine vapour-pressure equations with their ranges where Poling has none (about 190 components).' },
  },
  {
    id: 'perry', by: 'D. W. Green, R. H. Perry (eds.)', title: 'Perry\'s Chemical Engineers\' Handbook, 8th ed., Section 2: liquid density (DIPPR equation 105) and liquid viscosity (Table 2-313, DIPPR equation 101)',
    where: 'McGraw-Hill, New York (data from the DIPPR 801 database)', year: 2008,
    read: '2026-11-21',
    use: { properties: 'Liquid density and liquid viscosity as functions of temperature, with their ranges (first choice).' },
  },
  {
    id: 'vdi', by: 'VDI-GVC (ed.)', title: 'VDI Heat Atlas, 2nd ed., section D3.1: PPDS equations for saturated-liquid density and viscosity',
    where: 'Springer, Berlin', year: 2010,
    read: '2026-11-21',
    use: { properties: 'Liquid density and liquid viscosity where Perry\'s tables have none.' },
  },
  {
    id: 'psrk', by: 'S. Horstmann, A. Jabłoniec, J. Krafczyk, K. Fischer, J. Gmehling', title: 'PSRK group contribution equation of state: comprehensive revision and extension IV, including critical constants and α-function parameters for 1000 components',
    where: 'Fluid Phase Equilib. 227 (2), 157–164', year: 2005,
    url: 'https://doi.org/10.1016/j.fluid.2004.11.002',
    read: '2026-11-21',
    use: { properties: 'Acentric factors where CoolProp has none and the 1977 table has none or disagrees with every other compilation; a few critical volumes.' },
  },
  {
    id: 'pinamartines', by: 'A. Piña-Martinez, R. Privat, J.-N. Jaubert, D.-Y. Peng', title: 'Updated versions of the generalized Soave α-function suitable for the Redlich-Kwong and Peng-Robinson equations of state (DIPPR critical data in the supplementary material)',
    where: 'Fluid Phase Equilib. 485, 264–269', year: 2019,
    url: 'https://doi.org/10.1016/j.fluid.2018.12.007',
    read: '2026-11-21',
    use: { properties: 'DIPPR critical constants replacing 1977 values that disagreed with every other compilation (ketene, vinyl formate).' },
  },
  {
    id: 'yaws', by: 'C. L. Yaws', title: 'Thermophysical Properties of Chemicals and Hydrocarbons, 2nd ed.',
    where: 'Gulf Professional Publishing, Amsterdam', year: 2014,
    read: '2026-11-21',
    use: { properties: 'Acentric factors replacing 1977 values that disagreed with every other compilation (confirmed by a second source); heats of formation of a few esters and ethers that no evaluated source covers; standard entropies of the ideal gas where CRC has none (for the Gibbs energy of formation).' },
  },
  {
    id: 'cas-cc', by: 'CAS, a division of the American Chemical Society', title: 'CAS Common Chemistry',
    where: 'American Chemical Society',
    url: 'https://commonchemistry.cas.org/',
    archive: 'https://web.archive.org/web/20260830153110/https://commonchemistry.cas.org/',
    read: '2026-11-21',
    use: { properties: 'Freezing point of trans-2-hexene (the 1977 value disagreed with every other compilation).' },
  },
  {
    id: 'muller', by: 'K. Müller, L. Mokrushina, W. Arlt', title: 'Second-Order Group Contribution Method for the Determination of the Dipole Moment (experimental data in the supporting information)',
    where: 'J. Chem. Eng. Data 57 (4), 1231–1236', year: 2012,
    url: 'https://doi.org/10.1021/je2013395',
    read: '2026-11-21',
    use: { properties: 'Experimental dipole moments where Poling has none.' },
  },
  {
    id: 'cccbdb', by: 'R. D. Johnson III (ed.), NIST', title: 'NIST Computational Chemistry Comparison and Benchmark Database, NIST Standard Reference Database 101: experimental dipole moments',
    where: 'National Institute of Standards and Technology',
    url: 'https://cccbdb.nist.gov/',
    archive: 'https://web.archive.org/web/20261111005921/https://cccbdb.nist.gov/',
    read: '2026-11-21',
    use: { properties: 'Experimental dipole moments where Poling and Müller have none.' },
  },
  {
    id: 'codata-kv', by: 'J. D. Cox, D. D. Wagman, V. A. Medvedev', title: 'CODATA Key Values for Thermodynamics',
    where: 'Hemisphere, New York', year: 1989,
    read: '2026-11-21',
    use: { properties: 'Standard entropies of the elements in their reference states, for Δg_f° = Δh_f° − T·(S° − ΣS°elements) where no tabulated Gibbs energy of formation agrees with the heat of formation.' },
  },
  {
    id: 'iupac-aw', by: 'IUPAC Commission on Isotopic Abundances and Atomic Weights', title: 'Standard atomic weights of the elements',
    where: 'CIAAW / IUPAC',
    url: 'https://www.ciaaw.org/atomic-weights.htm',
    archive: 'https://web.archive.org/web/20261116120541/https://www.ciaaw.org/atomic-weights.htm',
    read: '2026-11-21',
    use: { properties: 'Molar masses, calculated from the chemical formula.' },
  },
  {
    id: 'lemmon-air', by: 'E. W. Lemmon, R. T. Jacobsen, S. G. Penoncello, D. G. Friend', title: 'Thermodynamic Properties of Air and Mixtures of Nitrogen, Argon, and Oxygen From 60 to 2000 K at Pressures to 2000 MPa',
    where: 'J. Phys. Chem. Ref. Data 29 (3), 331–385', year: 2000,
    url: 'https://doi.org/10.1063/1.1285884',
    read: '2026-11-21',
    use: { properties: 'Air: molar mass 28.9586 kg/kmol and critical point (132.5306 K, 3.786 MPa).' },
  },
];

/** Sources used by one tool, in registry order. */
export const sourcesFor = (slug: string) => sources.filter((s) => slug in s.use);
