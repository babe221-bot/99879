export interface Stone {
  name: string;
  density: number;
  strength: number;
  price: number;
  color: string;
  description: string;
}

export interface SurfaceFinish {
  name: string;
  price: number;
  description: string;
}

export interface EdgeProcess {
  name: string;
  price: number;
  description: string;
}

export interface Dimensions {
  length: number;
  width: number;
  thickness: number;
  quantity: number;
}

export interface Config {
  projectType: string;
  material: string;
  surface: string;
  edge: string;
  dimensions: Dimensions;
  view: string;
}

export interface Calculations {
  volume: number;
  surfaceArea: number;
  edgeLength: number;
  weight: number;
}

export interface Costs {
  materialCost: number;
  surfaceCost: number;
  edgeCost: number;
  totalCost: number;
}
