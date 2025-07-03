import { StoneType, EdgeProcessingDefinition, FaceProcessingDefinition, PalletType } from '@/types/stoneData';

export const sampleStoneTypes: StoneType[] = [
  {
    id: "kirmenjak", name: "Kirmenjak", densityKgM3: 2650, strengthMPa: 120, priceEURPerM3: 180,
    pbrTexturePath: "/textures/kirmenjak/", description: "Istarski vapnenac, otporan na sol i vodu.", origin: "Istria",
  },
  {
    id: "kanfanar", name: "Kanfanar", densityKgM3: 2600, strengthMPa: 110, priceEURPerM3: 200,
    pbrTexturePath: "/textures/kanfanar/", description: "Tradicionalni istarski žuti kamen.", origin: "Istria",
  },
  {
    id: "plano", name: "Plano", densityKgM3: 2700, strengthMPa: 140, priceEURPerM3: 220,
    pbrTexturePath: "/textures/plano/", description: "Fino zrnast vapnenac, idealan za precizne radove.", origin: "Brač",
  },
  {
    id: "avorio", name: "Avorio", densityKgM3: 2680, strengthMPa: 135, priceEURPerM3: 280,
    pbrTexturePath: "/textures/avorio/", description: "Premium bijeli kamen s Brača.", origin: "Brač",
  },
  {
    id: "pulenat", name: "Pulenat", densityKgM3: 2640, strengthMPa: 125, priceEURPerM3: 200,
    pbrTexturePath: "/textures/pulenat/", description: "Polirana tekstura.", origin: "Istria",
  }
];

export const sampleEdgeProcessingDefinitions: EdgeProcessingDefinition[] = [
  { id: "chamfer_c05", name: "Obaranje C0.5 (0.5mm)", type: 'CHAMFER', parameters: { width: 0.5, angle: 45 }, priceEURPerMeter: 5, description: "Delikatno obaranje." },
  { id: "chamfer_c1", name: "Obaranje C1 (1mm)", type: 'CHAMFER', parameters: { width: 1, angle: 45 }, priceEURPerMeter: 7, description: "Standardno obaranje." },
  { id: "chamfer_c2", name: "Obaranje C2 (2mm)", type: 'CHAMFER', parameters: { width: 2, angle: 45 }, priceEURPerMeter: 8, description: "Naglašen efekt." },
  { id: "chamfer_c5", name: "Obaranje C5 (5mm)", type: 'CHAMFER', parameters: { width: 5, angle: 45 }, priceEURPerMeter: 10, description: "Izraženo obaranje." },
  { id: "round_r1", name: "Zaobljavanje R1", type: 'ROUND', parameters: { radius: 1, profile: 'POLU_C' }, priceEURPerMeter: 8, description: "Fino R1." },
  { id: "round_r2", name: "Zaobljavanje R2", type: 'ROUND', parameters: { radius: 2, profile: 'POLU_C' }, priceEURPerMeter: 10, description: "Fino R2." },
  { id: "round_r3_polu_c", name: "Zaobljavanje Polu C R3", type: 'ROUND', parameters: { radius: 3, profile: 'POLU_C' }, priceEURPerMeter: 12, description: "Standard R3 Polu C." },
  { id: "round_r5_puno_c", name: "Zaobljavanje Puno C R5", type: 'ROUND', parameters: { radius: 5, profile: 'PUNO_C' }, priceEURPerMeter: 15, description: "Premium R5 Puno C." },
  { id: "round_r10_puno_c", name: "Zaobljavanje Puno C R10", type: 'ROUND', parameters: { radius: 10, profile: 'PUNO_C' }, priceEURPerMeter: 20, description: "Premium R10 Puno C." },
  { id: "deburr_01_02", name: "Skidanje Oštre Ivice (0.1-0.2mm)", type: 'DEBURR', parameters: { width: 0.15 }, priceEURPerMeter: 3, description: "Uklanja oštri srh." }
];

export const sampleFaceProcessingDefinitions: FaceProcessingDefinition[] = [
  { id: "martelina_fina", name: "Martelina fina", priceEURPerM2: 20, description: "Fina hammered tekstura." },
  { id: "bucarda_fina", name: "Bućarda fina", priceEURPerM2: 18, description: "Uniformna tekstura bućardom." },
  { id: "stokovanje", name: "Štokovanje", priceEURPerM2: 8, description: "Gruba tekstura dlijetom." },
  { id: "poliranje", name: "Poliranje", priceEURPerM2: 15, description: "Visoko-reflektivna površina." },
  { id: "plamena_obrada", name: "Plamena obrada", priceEURPerM2: 12, description: "Termički obrađena tekstura." },
  { id: "pjeskarenje", name: "Pjeskarenje", priceEURPerM2: 10, description: "Uniformno hrapava površina." }
];

export const samplePalletTypes: PalletType[] = [
  {
    id: "euro_pallet_1200x800", name: "Euro Paleta (1200x800 mm)",
    lengthMM: 1200, widthMM: 800, heightMM: 144, maxLoadKg: 1500,
    material: 'WOOD', type: 'EURO', notes: "Standardna Euro paleta."
  },
  {
    id: "non_euro_1000x1000", name: "Industrijska Paleta (1000x1000 mm)",
    lengthMM: 1000, widthMM: 1000, maxLoadKg: 1200,
    material: 'WOOD', type: 'NON_EURO', notes: "Četvrtasta industrijska paleta."
  },
  {
    id: "custom_crate_small", name: "Drveni Sanduk - Mali (800x600 mm)",
    lengthMM: 800, widthMM: 600, heightMM: 500, maxLoadKg: 500,
    material: 'WOOD', type: 'CRATE', notes: "Za manje, osjetljive komade."
  },
  {
    id: "custom_crate_large", name: "Drveni Sanduk - Veliki (1500x1000 mm)",
    lengthMM: 1500, widthMM: 1000, heightMM: 800, maxLoadKg: 1000,
    material: 'WOOD', type: 'CRATE', notes: "Za veće komponente."
  },
];


export const getAllSampleData = () => ({
  stoneTypes: sampleStoneTypes,
  edgeProcessing: sampleEdgeProcessingDefinitions,
  faceProcessing: sampleFaceProcessingDefinitions,
  palletTypes: samplePalletTypes,
});
