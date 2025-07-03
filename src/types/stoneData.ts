export interface StoneType {
  id: string; // Firestore document ID
  name: string; // e.g., "Kirmenjak", "Kanfanar"
  description?: string;
  densityKgM3: number; // kg/m³ e.g., 2650
  strengthMPa?: number; // e.g., 120
  priceEURPerM3: number; // Price per cubic meter, e.g., 180
  pbrTexturePath?: string; // Path to PBR textures, e.g., "/textures/kirmenjak/" or a base name for diffuse, normal etc.
  // Example: pbrTexturePath = "/textures/kirmenjak/" means diffuse is at /textures/kirmenjak/diffuse.png
  origin?: string; // e.g., "Istria", "Brač"
}

export interface EdgeProcessingDefinition {
  id: string; // Firestore document ID, or a unique key like "CHAMFER_C1"
  name: string; // e.g., "Obaranje Ivica C1 (1mm)"
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
  id: string; // Firestore document ID, e.g., "polishing", "martelina_fina"
  name: string; // e.g., "Poliranje", "Martelina fina"
  // These paths would point to textures specific to the face processing effect
  // e.g., a different normal map for martelina, or a roughness map for polishing.
  normalMapPath?: string;
  roughnessMapPath?: string;
  aoMapPath?: string; // Optional, if face processing adds specific AO
  // Base color/diffuse map usually comes from the stone type itself.
  priceEURPerM2: number;
  description?: string;
}


// Maps to the ID of an EdgeProcessingDefinition
export type AppliedEdgeProcessingID = string;

// Configuration for edge processing applied to different groups
export interface AppliedEdgeProcessingConfig {
  TOP?: AppliedEdgeProcessingID;
  BOTTOM?: AppliedEdgeProcessingID;
  SIDES_FRONT_BACK?: AppliedEdgeProcessingID;
  SIDES_LEFT_RIGHT?: AppliedEdgeProcessingID;
}

// Maps to the ID of a FaceProcessingDefinition
export type AppliedFaceProcessingID = string;

// For BoxGeometry, faces are typically indexed: 0: +X, 1: -X, 2: +Y, 3: -Y, 4: +Z, 5: -Z
// We can map these to more readable names.
export type BoxFaceName = 'RIGHT' | 'LEFT' | 'TOP' | 'BOTTOM' | 'FRONT' | 'BACK';

// Configuration for face processing applied to different faces
export interface AppliedFaceProcessingConfig {
  RIGHT?: AppliedFaceProcessingID;  // +X
  LEFT?: AppliedFaceProcessingID;   // -X
  TOP?: AppliedFaceProcessingID;    // +Y
  BOTTOM?: AppliedFaceProcessingID; // -Y
  FRONT?: AppliedFaceProcessingID;  // +Z
  BACK?: AppliedFaceProcessingID;   // -Z
}
