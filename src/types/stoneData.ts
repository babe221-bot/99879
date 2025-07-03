export interface StoneType {
  id: string;
  name: string;
  description?: string;
  densityKgM3: number;
  strengthMPa?: number;
  priceEURPerM3: number;
  pbrTexturePath?: string;
  origin?: string;
}

export interface EdgeProcessingDefinition {
  id: string;
  name: string;
  type: 'CHAMFER' | 'ROUND' | 'DEBURR';
  parameters: {
    width?: number;
    angle?: number;
    radius?: number;
    profile?: 'POLU_C' | 'PUNO_C';
  };
  priceEURPerMeter: number;
  description?: string;
}

export interface FaceProcessingDefinition {
  id: string;
  name: string;
  normalMapPath?: string;
  roughnessMapPath?: string;
  aoMapPath?: string;
  priceEURPerM2: number;
  description?: string;
}

export type AppliedEdgeProcessingID = string;
export interface AppliedEdgeProcessingConfig {
  TOP?: AppliedEdgeProcessingID;
  BOTTOM?: AppliedEdgeProcessingID;
  SIDES_FRONT_BACK?: AppliedEdgeProcessingID;
  SIDES_LEFT_RIGHT?: AppliedEdgeProcessingID;
}

export type AppliedFaceProcessingID = string;
export type BoxFaceName = 'RIGHT' | 'LEFT' | 'TOP' | 'BOTTOM' | 'FRONT' | 'BACK';
export interface AppliedFaceProcessingConfig {
  RIGHT?: AppliedFaceProcessingID;
  LEFT?: AppliedFaceProcessingID;
  TOP?: AppliedFaceProcessingID;
  BOTTOM?: AppliedFaceProcessingID;
  FRONT?: AppliedFaceProcessingID;
  BACK?: AppliedFaceProcessingID;
}

// New Logistics Types
export interface PalletType {
  id: string; // e.g., "euro_pallet", "custom_wood_large"
  name: string; // e.g., "Euro Pallet (1200x800)", "Custom Wood Crate Large"
  lengthMM: number; // Length in mm
  widthMM: number;  // Width in mm
  heightMM?: number; // Optional: height of pallet itself, or max stacking height
  maxLoadKg: number;
  material?: 'WOOD' | 'PLASTIC' | 'METAL';
  type: 'EURO' | 'NON_EURO' | 'CRATE' | 'CUSTOM';
  notes?: string; // e.g., "Standard disposable", "Heavy duty reusable"
}

// To be added to WorkOrderData or a separate LogisticsInfo object
export interface LogisticsInfo {
  selectedPalletId?: string;
  packingNotes?: string;
  // calculatedWeightKg?: number; // Could be stored per component or summed for WO
  // calculatedFitStatus?: string;
}
