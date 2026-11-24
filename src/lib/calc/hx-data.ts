// Reference tables of the Heat Exchanger tool.
// 1. Perry's Chemical Engineers' Handbook, 7th ed., Table 11-3 "Typical Overall Heat-Transfer Coefficients in Tubular
//    Heat Exchangers": design U in Btu/(°F·ft²·h), INCLUDING the total dirt given (h·ft²·°F/Btu), as published.
// 2. Engineering ToolBox d_450 (the original sheet's Note 3): overall coefficients by exchanger type, W/(m²·K);
//    the page does not say whether fouling is included.
// 3. Engineering ToolBox d_1661 (the sheet's Note 4): typical fouling factors, m²·K/W.
// Values transcribed 2026-11-24 and checked against the sources (Perry page 11-25; ToolBox pages = sheet).

export const BTU_HFT2F = 1055.05585262 / (3600 * 0.3048 ** 2 * (5 / 9));   // 1 Btu/(h·ft²·°F) = 5.678263 W/(m²·K)

export interface PerryRow { shell: string; tube: string; u: [number, number]; dirt: number }
export interface PerryGroup { title: string; rows: PerryRow[] }

const r = (shell: string, tube: string, lo: number, hi: number, dirt: number): PerryRow => ({ shell, tube, u: [lo, hi], dirt });

export const PERRY_11_3: PerryGroup[] = [
  {
    title: 'Liquid–liquid media',
    rows: [
      r('Aroclor 1248', 'Jet fuels', 100, 150, 0.0015),
      r('Cutback asphalt', 'Water', 10, 20, 0.01),
      r('Demineralized water', 'Water', 300, 500, 0.001),
      r('Ethanol amine (MEA or DEA) 10–25 % solutions', 'Water or DEA, or MEA solutions', 140, 200, 0.003),
      r('Fuel oil', 'Water', 15, 25, 0.007),
      r('Fuel oil', 'Oil', 10, 15, 0.008),
      r('Gasoline', 'Water', 60, 100, 0.003),
      r('Heavy oils', 'Heavy oils', 10, 40, 0.004),
      r('Heavy oils', 'Water', 15, 50, 0.005),
      r('Hydrogen-rich reformer stream', 'Hydrogen-rich reformer stream', 90, 120, 0.002),
      r('Kerosene or gas oil', 'Water', 25, 50, 0.005),
      r('Kerosene or gas oil', 'Oil', 20, 35, 0.005),
      r('Kerosene or jet fuels', 'Trichlorethylene', 40, 50, 0.0015),
      r('Jacket water', 'Water', 230, 300, 0.002),
      r('Lube oil (low viscosity)', 'Water', 25, 50, 0.002),
      r('Lube oil (high viscosity)', 'Water', 40, 80, 0.003),
      r('Lube oil', 'Oil', 11, 20, 0.006),
      r('Naphtha', 'Water', 50, 70, 0.005),
      r('Naphtha', 'Oil', 25, 35, 0.005),
      r('Organic solvents', 'Water', 50, 150, 0.003),
      r('Organic solvents', 'Brine', 35, 90, 0.003),
      r('Organic solvents', 'Organic solvents', 20, 60, 0.002),
      r('Tall oil derivatives, vegetable oil, etc.', 'Water', 20, 50, 0.004),
      r('Water', 'Caustic soda solutions (10–30 %)', 100, 250, 0.003),
      r('Water', 'Water', 200, 250, 0.003),
      r('Wax distillate', 'Water', 15, 25, 0.005),
      r('Wax distillate', 'Oil', 13, 23, 0.005),
    ],
  },
  {
    title: 'Condensing vapour–liquid media',
    rows: [
      r('Alcohol vapour', 'Water', 100, 200, 0.002),
      r('Asphalt (450 °F)', 'Dowtherm vapour', 40, 60, 0.006),
      r('Dowtherm vapour', 'Tall oil and derivatives', 60, 80, 0.004),
      r('Dowtherm vapour', 'Dowtherm liquid', 80, 120, 0.0015),
      r('Gas-plant tar', 'Steam', 40, 50, 0.0055),
      r('High-boiling hydrocarbons, vacuum', 'Water', 20, 50, 0.003),
      r('Low-boiling hydrocarbons, atmospheric', 'Water', 80, 200, 0.003),
      r('Hydrocarbon vapours (partial condenser)', 'Oil', 25, 40, 0.004),
      r('Organic solvents, atmospheric', 'Water', 100, 200, 0.003),
      r('Organic solvents, high non-condensables, atmospheric', 'Water or brine', 20, 60, 0.003),
      r('Organic solvents, low non-condensables, vacuum', 'Water or brine', 50, 120, 0.003),
      r('Kerosene', 'Water', 30, 65, 0.004),
      r('Kerosene', 'Oil', 20, 30, 0.005),
      r('Naphtha', 'Water', 50, 75, 0.005),
      r('Naphtha', 'Oil', 20, 30, 0.005),
      r('Stabilizer reflux vapours', 'Water', 80, 120, 0.003),
      r('Steam', 'Feed water', 400, 1000, 0.0005),
      r('Steam', 'No. 6 fuel oil', 15, 25, 0.0055),
      r('Steam', 'No. 2 fuel oil', 60, 90, 0.0025),
      r('Sulfur dioxide', 'Water', 150, 200, 0.003),
      r('Tall-oil derivatives, vegetable oils (vapour)', 'Water', 20, 50, 0.004),
      r('Water', 'Aromatic vapour-stream azeotrope', 40, 80, 0.005),
    ],
  },
  {
    title: 'Gas–liquid media',
    rows: [
      r('Air, N₂, etc. (compressed)', 'Water or brine', 40, 80, 0.005),
      r('Air, N₂, etc., atmospheric', 'Water or brine', 10, 50, 0.005),
      r('Water or brine', 'Air, N₂ (compressed)', 20, 40, 0.005),
      r('Water or brine', 'Air, N₂, etc., atmospheric', 5, 20, 0.005),
      r('Water', 'Hydrogen containing natural-gas mixtures', 80, 125, 0.003),
    ],
  },
  {
    title: 'Vaporizers',
    rows: [
      r('Anhydrous ammonia', 'Steam condensing', 150, 300, 0.0015),
      r('Chlorine', 'Steam condensing', 150, 300, 0.0015),
      r('Chlorine', 'Light heat-transfer oil', 40, 60, 0.0015),
      r('Propane, butane, etc.', 'Steam condensing', 200, 300, 0.0015),
      r('Water', 'Steam condensing', 250, 400, 0.0015),
    ],
  },
];

export interface EtbRow { type: string; app: string; u: [number, number] }
export const ETB_U: EtbRow[] = [
  { type: 'Tubular, heating or cooling', app: 'Gases at atmospheric pressure inside and outside tubes', u: [5, 35] },
  { type: 'Tubular, heating or cooling', app: 'Gases at high pressure inside and outside tubes', u: [150, 500] },
  { type: 'Tubular, heating or cooling', app: 'Liquid outside (inside) and gas at atmospheric pressure inside (outside) tubes', u: [15, 70] },
  { type: 'Tubular, heating or cooling', app: 'Gas at high pressure inside and liquid outside tubes', u: [200, 400] },
  { type: 'Tubular, heating or cooling', app: 'Liquids inside and outside tubes', u: [150, 1200] },
  { type: 'Tubular, heating or cooling', app: 'Steam outside and liquid inside tubes', u: [300, 1200] },
  { type: 'Tubular, condensation', app: 'Steam outside and cooling water inside tubes', u: [1500, 4000] },
  { type: 'Tubular, condensation', app: 'Organic vapours or ammonia outside and cooling water inside tubes', u: [300, 1200] },
  { type: 'Tubular, evaporation', app: 'Steam outside and high-viscous liquid inside tubes, natural circulation', u: [300, 900] },
  { type: 'Tubular, evaporation', app: 'Steam outside and low-viscous liquid inside tubes, natural circulation', u: [600, 1700] },
  { type: 'Tubular, evaporation', app: 'Steam outside and liquid inside tubes, forced circulation', u: [900, 3000] },
  { type: 'Air-cooled', app: 'Cooling of water', u: [600, 750] },
  { type: 'Air-cooled', app: 'Cooling of liquid light hydrocarbons', u: [400, 550] },
  { type: 'Air-cooled', app: 'Cooling of tar', u: [30, 60] },
  { type: 'Air-cooled', app: 'Cooling of air or flue gas', u: [60, 180] },
  { type: 'Air-cooled', app: 'Cooling of hydrocarbon gas', u: [200, 450] },
  { type: 'Air-cooled', app: 'Condensation of low-pressure steam', u: [700, 850] },
  { type: 'Air-cooled', app: 'Condensation of organic vapours', u: [350, 500] },
  { type: 'Plate', app: 'Liquid to liquid', u: [1000, 4000] },
  { type: 'Spiral', app: 'Liquid to liquid', u: [700, 2500] },
  { type: 'Spiral', app: 'Condensing vapour to liquid', u: [900, 3500] },
];

export const ETB_FOULING: { fluid: string; rf: number }[] = [
  { fluid: 'Alcohol vapours', rf: 0.00009 },
  { fluid: 'Boiler feed water, treated, above 325 K', rf: 0.0002 },
  { fluid: 'Fuel oil', rf: 0.0009 },
  { fluid: 'Industrial air', rf: 0.0004 },
  { fluid: 'Quenching oil', rf: 0.0007 },
  { fluid: 'Refrigerating liquid', rf: 0.0002 },
  { fluid: 'Seawater below 325 K', rf: 0.00009 },
  { fluid: 'Seawater above 325 K', rf: 0.0002 },
  { fluid: 'Steam', rf: 0.00009 },
];
