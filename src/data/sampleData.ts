import { StoneType, EdgeProcessingDefinition, FaceProcessingDefinition } from '@/types/stoneData';

export const sampleStoneTypes: StoneType[] = [
  {
    id: "kirmenjak",
    name: "Kirmenjak",
    densityKgM3: 2650,
    strengthMPa: 120,
    priceEURPerM3: 180,
    pbrTexturePath: "/textures/kirmenjak/", // Assuming base path
    description: "Istarski vapnenac, otporan na sol i vodu.",
    origin: "Istria",
  },
  {
    id: "kanfanar",
    name: "Kanfanar",
    densityKgM3: 2600, // From initial doc; 2630 in edge processing doc
    strengthMPa: 110, // From initial doc; 115 in edge processing doc
    priceEURPerM3: 200, // From initial doc; 160 in edge processing doc
    pbrTexturePath: "/textures/kanfanar/",
    description: "Tradicionalni istarski žuti kamen.",
    origin: "Istria",
  },
  {
    id: "plano",
    name: "Plano",
    densityKgM3: 2700,
    strengthMPa: 140,
    priceEURPerM3: 220,
    pbrTexturePath: "/textures/plano/", // Placeholder, need actual texture
    description: "Fino zrnast vapnenac, idealan za precizne radove.",
    origin: "Brač",
  },
  {
    id: "avorio",
    name: "Avorio",
    densityKgM3: 2680,
    strengthMPa: 135,
    priceEURPerM3: 280,
    pbrTexturePath: "/textures/avorio/", // Placeholder
    description: "Premium bijeli kamen s Brača, idealan za luksuzne aplikacije.",
    origin: "Brač",
  },
  {
    id: "pulenat", // Added from edge processing doc
    name: "Pulenat",
    densityKgM3: 2640,
    strengthMPa: 125,
    priceEURPerM3: 200,
    pbrTexturePath: "/textures/pulenat/", // Placeholder
    description: "Polirana tekstura karakteristična za ovu vrstu obrade.",
    origin: "Istria", // Assumed
  }
];

export const sampleEdgeProcessingDefinitions: EdgeProcessingDefinition[] = [
  // Chamfers
  {
    id: "chamfer_c05", name: "Obaranje C0.5 (0.5mm)", type: 'CHAMFER',
    parameters: { width: 0.5, angle: 45 }, priceEURPerMeter: 5,
    description: "Najfinije obaranje širine 0.5mm pod uglom od 45°, idealno za delikatne završne radove."
  },
  {
    id: "chamfer_c1", name: "Obaranje C1 (1mm)", type: 'CHAMFER',
    parameters: { width: 1, angle: 45 }, priceEURPerMeter: 7,
    description: "Standardno obaranje širine 1mm."
  },
  {
    id: "chamfer_c2", name: "Obaranje C2 (2mm)", type: 'CHAMFER',
    parameters: { width: 2, angle: 45 }, priceEURPerMeter: 8,
    description: "Naglašen estetski efekt, širina 2mm."
  },
  {
    id: "chamfer_c5", name: "Obaranje C5 (5mm)", type: 'CHAMFER',
    parameters: { width: 5, angle: 45 }, priceEURPerMeter: 10,
    description: "Najizraženije obaranje širine 5mm za arhitektonske detalje."
  },
  // Rounding / Fillet
  {
    id: "round_r1", name: "Zaobljavanje R1", type: 'ROUND',
    parameters: { radius: 1, profile: 'POLU_C' }, priceEURPerMeter: 8,
    description: "Fino zaobljenje R1."
  },
  {
    id: "round_r2", name: "Zaobljavanje R2", type: 'ROUND',
    parameters: { radius: 2, profile: 'POLU_C' }, priceEURPerMeter: 10,
    description: "Fino zaobljenje R2."
  },
  {
    id: "round_r3_polu_c", name: "Zaobljavanje Polu C R3", type: 'ROUND',
    parameters: { radius: 3, profile: 'POLU_C' }, priceEURPerMeter: 12,
    description: "Standardni Polu C R3 profil."
  },
  {
    id: "round_r5_puno_c", name: "Zaobljavanje Puno C R5", type: 'ROUND',
    parameters: { radius: 5, profile: 'PUNO_C' }, priceEURPerMeter: 15,
    description: "Puno C profil R5 za premium aplikacije."
  },
  {
    id: "round_r10_puno_c", name: "Zaobljavanje Puno C R10", type: 'ROUND',
    parameters: { radius: 10, profile: 'PUNO_C' }, priceEURPerMeter: 20,
    description: "Puno C profil R10 za potpuno zaobljene rubove."
  },
  // Deburring
  {
    id: "deburr_01_02", name: "Skidanje Oštre Ivice (0.1-0.2mm)", type: 'DEBURR',
    parameters: { width: 0.15 }, // Representing average removal
    priceEURPerMeter: 3,
    description: "Uklanja tanki, oštri srh u rasponu 0.1-0.2mm."
  }
];

export const sampleFaceProcessingDefinitions: FaceProcessingDefinition[] = [
  {
    id: "martelina_fina", name: "Martelina fina", priceEURPerM2: 20,
    description: "Fina hammered tekstura stvorena malim čekićem."
    // textureVisualPath: "/textures/face/martelina_fina.jpg" // Placeholder
  },
  {
    id: "bucarda_fina", name: "Bućarda fina", priceEURPerM2: 18,
    description: "Uniformna tekstura stvorena bućardom s finim šiljcima."
  },
  {
    id: "stokovanje", name: "Štokovanje", priceEURPerM2: 8,
    description: "Gruba tekstura tradicionalne obrade dlijetom."
  },
  {
    id: "poliranje", name: "Poliranje", priceEURPerM2: 15,
    description: "Visoko-reflektivna površina."
  },
  {
    id: "plamena_obrada", name: "Plamena obrada", priceEURPerM2: 12,
    description: "Karakteristična tekstura nastala termičkim tretmanom."
  },
  {
    id: "pjeskarenje", name: "Pjeskarenje", priceEURPerM2: 10,
    description: "Uniformno hrapava površina stvorena abrazivnim tretmanom."
  }
];

// This function could be used to populate Firestore if needed, or directly in the app for now.
export const getAllSampleData = () => ({
  stoneTypes: sampleStoneTypes,
  edgeProcessing: sampleEdgeProcessingDefinitions,
  faceProcessing: sampleFaceProcessingDefinitions,
});
