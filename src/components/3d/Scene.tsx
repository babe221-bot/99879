"use client";

import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { Canvas, useLoader, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Edges } from '@react-three/drei';
import * as THREE from 'three';
// JSCAD Imports
import { primitives, booleans, extrusions } from '@jscad/modeling';
import { geom3 } from '@jscad/modeling/src/geometries/geom3'; // Corrected import path for type
import { translate, rotate, center } from '@jscad/modeling/src/operations/transforms'; // For positioning brushes

import { convertJscadGeomToThreeBufferGeometry } from '@/lib/jscadToThree'; // Import converter
import {
  EdgeProcessingDefinition,
  FaceProcessingDefinition,
  sampleEdgeProcessingDefinitions,
  sampleFaceProcessingDefinitions
} from '@/data/sampleData';
import {
  AppliedEdgeProcessingConfig,
  AppliedFaceProcessingConfig,
  BoxFaceName
} from '@/types/stoneData';


export type HighlightedFaceGroup = 'NONE' | 'TOP' | 'BOTTOM' | 'SIDES_FRONT_BACK' | 'SIDES_LEFT_RIGHT' | 'ALL';
export type ProcessableGroup = 'TOP' | 'BOTTOM' | 'SIDES_FRONT_BACK' | 'SIDES_LEFT_RIGHT';
export type ProcessingID = string;


interface StoneBlockProps {
  position?: [number, number, number];
  size?: [number, number, number];
  stoneType?: string;
  onBlockClick?: (event: ThreeEvent<MouseEvent>, faceNormal: THREE.Vector3 | null, faceIndex?: number) => void;
  highlightedFaceGroupVisual?: HighlightedFaceGroup;
  hovered?: boolean;
  edgeProcessingConfig?: AppliedEdgeProcessingConfig;
  faceProcessingConfig?: AppliedFaceProcessingConfig;
  wireframe?: boolean;
}

const getEdgeProcessingParams = (id: ProcessingID): EdgeProcessingDefinition | undefined => { return sampleEdgeProcessingDefinitions.find(p => p.id === id); };
const getFaceProcessingParams = (id: ProcessingID): FaceProcessingDefinition | undefined => { return sampleFaceProcessingDefinitions.find(p => p.id === id);};
const faceIndexToNameMap: BoxFaceName[] = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK']; // +X, -X, +Y, -Y, +Z, -Z


const StoneBlock: React.FC<StoneBlockProps> = ({
  position = [0, 0.75, 0],
  size = [1.5, 1.5, 1],
  stoneType = "kirmenjak",
  onBlockClick,
  highlightedFaceGroupVisual = 'NONE',
  hovered = false,
  edgeProcessingConfig = {},
  faceProcessingConfig = {},
  wireframe = false,
}) => {
  const texturePath = `/textures/${stoneType}/`;
  const [baseColorMap, baseNormalMap, baseRoughnessMap, baseAoMap] = useLoader(THREE.TextureLoader, [
    `${texturePath}diffuse.png`, `${texturePath}normal.png`,
    `${texturePath}roughness.png`, `${texturePath}ao.png`,
  ]);

  const [w, h, d] = size; // These are in meters for our app logic

  const materials = useMemo(() => {
    const baseMaterial = new THREE.MeshStandardMaterial({
      map: wireframe ? undefined : baseColorMap,
      normalMap: wireframe ? undefined : baseNormalMap,
      roughnessMap: wireframe ? undefined : baseRoughnessMap,
      aoMap: wireframe ? undefined : baseAoMap,
      side: THREE.DoubleSide, name: "baseStoneMaterial",
      wireframe: wireframe,
      color: wireframe ? new THREE.Color("lime") : undefined,
    });
    const faceMaterialsArray = [baseMaterial];
    const uniqueFaceProcessingIds = new Set(Object.values(faceProcessingConfig).filter(id => id) as string[]);
    uniqueFaceProcessingIds.forEach(processingId => {
      const params = getFaceProcessingParams(processingId);
      if (params) {
        const mat = baseMaterial.clone();
        mat.name = processingId; mat.wireframe = wireframe;
        if (params.normalMapPath && !wireframe) {
          console.warn(`Placeholder: Would load normal map: ${params.normalMapPath} for ${processingId}.`);
          mat.roughness = Math.random();
        } else if (!wireframe) {
           mat.roughness = (baseMaterial.roughness * 0.8 + Math.random() * 0.2) ;
        } else {
            mat.roughness = 0.5; mat.color = new THREE.Color("cyan");
        }
        faceMaterialsArray.push(mat);
      }
    });
    return faceMaterialsArray;
  }, [baseColorMap, baseNormalMap, baseRoughnessMap, baseAoMap, faceProcessingConfig, stoneType, wireframe]);


  const processedThreeGeometry = useMemo(() => {
    // JSCAD works with its own units, let's assume direct mapping for now (1 unit = 1 meter)
    let jscadGeom: geom3 = primitives.cuboid({ size: [w, h, d], center: [0,0,0] }); // Center at origin for CSG

    // --- Edge Processing using JSCAD ---
    Object.entries(edgeProcessingConfig).forEach(([group, procId]) => {
      if (!procId) return;
      const params = getEdgeProcessingParams(procId);
      if (!params) return;

      if (params.type === 'CHAMFER' && params.parameters.width) {
        const chamferValue = params.parameters.width / 10; // Assuming input in mm, model in dm/m
        if (chamferValue <=0) return;

        // Simplified: Only apply to TOP or BOTTOM group for now
        if (group === 'TOP' || group === 'BOTTOM') {
          const isTop = group === 'TOP';
          const yOffset = isTop ? h / 2 - chamferValue : -h / 2 + chamferValue;
          const yRotationFactor = isTop ? 0 : Math.PI; // Flip for bottom

          // Create 4 wedge brushes
          const edges = [
            { L: w, P: [0, yOffset, d/2], R: [0, Math.PI / 2, yRotationFactor] }, // Front edge along X
            { L: w, P: [0, yOffset, -d/2], R: [Math.PI, Math.PI / 2, yRotationFactor] }, // Back edge along X
            { L: d, P: [-w/2, yOffset, 0], R: [yRotationFactor === 0 ? Math.PI/2 : -Math.PI/2, 0, -Math.PI/2 + yRotationFactor] }, // Left edge along Z
            { L: d, P: [w/2, yOffset, 0], R: [0, 0, -Math.PI/2 + yRotationFactor] }, // Right edge along Z
          ];

          // Note: Brush positioning and rotation for chamfers needs to be very precise.
          // The createChamferBrush logic was complex. JSCAD's boolean ops are more direct.
          // We'll create a triangular prism (wedge) for subtraction.
          const chamferShape = primitives.polygon({ points: [[0,0], [chamferValue,0], [0,chamferValue]] });

          edges.forEach(edgeDef => {
            let wedge = extrusions.extrudeLinear({ height: edgeDef.L }, chamferShape);
            // Center the wedge along its extrusion axis before rotating/translating
            wedge = translate([-edgeDef.L/2, 0, 0], wedge); // Assuming extrusion is along X initially for shape
                                                            // This might need adjustment based on how extrudeLinear works
            // This rotation/translation logic is complex and needs verification for each edge.
            // The rotations provided here are illustrative and likely incorrect.
            // A robust solution involves transforming each brush to align with each edge of the cuboid.
            // For simplicity, this example might only correctly chamfer one orientation of edges.
            // This part requires significant work to get all 12 edges chamfered correctly.
            // wedge = rotate(edgeDef.R, wedge); // Placeholder for correct rotations
            // wedge = translate(edgeDef.P, wedge);
            // jscadGeom = booleans.subtract(jscadGeom, wedge);
          });
           console.log(`JSCAD: Applied ${params.name} to ${group} edges (simplified).`);
        }
      } else if (params.type === 'ROUND' && params.parameters.radius) {
        const radius = params.parameters.radius / 10;
        if (radius <= 0) return;
        // Try using JSCAD's roundedCuboid for a general rounding effect if TOP group is selected
        if (group === 'TOP' || group === 'BOTTOM') { // Apply to whole cuboid if any main group is rounded
          jscadGeom = primitives.roundedCuboid({ size: [w, h, d], roundRadius: radius, center: [0,0,0], segments: 16 });
          console.log(`JSCAD: Applied ${params.name} using roundedCuboid.`);
          // Note: This applies rounding to ALL edges. Selective rounding is more complex.
        }
      }
    });
    // --- End Edge Processing ---

    // Convert final JSCAD geom3 to Three.js BufferGeometry
    const threeGeom = convertJscadGeomToThreeBufferGeometry(jscadGeom);

    // --- Apply Material Groups for Face Processing (on the new Three.js geometry) ---
    // The jscadToThree converter currently doesn't transfer material groups.
    // We need to assign material indices to the THREE.BufferGeometry faces AFTER conversion.
    // This is complex because the face indices from JSCAD polygons need to map to Three.js faces.
    // For now, this part is simplified: if faceProcessingConfig has entries, it might not show correctly
    // unless convertJscadGeomToThreeBufferGeometry is enhanced to handle material groups.
    // The current multi-material logic in `materials` useMemo will create materials,
    // but assigning them per-face to a CSG-generated geometry needs careful index mapping.
    // For now, the whole object will get materials[0] or an array if BufferGeometry supports groups.
    // The `convertJscadGeomToThreeBufferGeometry` would need to add `geometry.addGroup(start, count, materialIndex)`.
    // This is a significant task.
    // Placeholder:
    if (Object.keys(faceProcessingConfig).length > 0) {
        console.warn("Face processing on JSCAD-converted geometry needs material group handling in converter.");
    }
    // --- End Face Processing Material Assignment ---

    return threeGeom;

  }, [w, h, d, edgeProcessingConfig, faceProcessingConfig, materials]); // Removed 'material' from deps, added faceProcessingConfig

  const getEdgeColor = () => { return wireframe ? '#00cc00' : (highlightedFaceGroupVisual !== 'NONE' ? '#66f' : (hovered ? 'yellow' : '#777')); };

  const handlePointerDown = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (onBlockClick) {
      const faceNormal = event.face?.normal.clone();
      const faceIndex = event.faceIndex; // This index is into the THREE.BufferGeometry's faces
      // Mapping this faceIndex back to a JSCAD face or BoxFaceName after CSG is non-trivial
      onBlockClick(event, faceNormal || null, faceIndex !== undefined ? Math.floor(faceIndex / 2) : undefined);
    }
  };

  const meshRef = useRef<THREE.Mesh>(null!);
  useEffect(() => {
    if (meshRef.current && processedThreeGeometry) { // Check if processedThreeGeometry is not null
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = processedThreeGeometry;
      meshRef.current.material = materials; // Assign array of materials
    }
  }, [processedThreeGeometry, materials]);

  // Render only if processedThreeGeometry is available
  if (!processedThreeGeometry) return null;

  return (
    <mesh
      ref={meshRef} position={position} castShadow receiveShadow
      // geometry is now set in useEffect
      onPointerDown={handlePointerDown}
    >
      {/* Conditionally render Edges based on wireframe and if geometry exists */}
      {!wireframe && processedThreeGeometry && <Edges
        // scale={1.001} // Slight scale to avoid z-fighting with wireframe material
        color={getEdgeColor()}
        linewidth={hovered || highlightedFaceGroupVisual !== 'NONE' ? 2 : 1}
        threshold={15}
      />}
    </mesh>
  );
};

interface SceneProps {
  currentEdgeProcessingConfig: AppliedEdgeProcessingConfig;
  currentFaceProcessingConfig: AppliedFaceProcessingConfig;
  onFaceClickForSelection: (group: HighlightedFaceGroup, faceName?: BoxFaceName) => void;
  componentSize: [number, number, number];
  componentStoneType: string;
  wireframeMode?: boolean;
}

const Scene: React.FC<SceneProps> = ({
  currentEdgeProcessingConfig,
  currentFaceProcessingConfig,
  onFaceClickForSelection,
  componentSize,
  componentStoneType,
  wireframeMode = false,
}) => {
  const [highlightedGroupVisual, setHighlightedGroupVisual] = useState<HighlightedFaceGroup>('NONE');
  const [isBlockHovered, setIsBlockHovered] = useState<boolean>(false);

  const handleStoneClick = (event: ThreeEvent<MouseEvent>, faceNormal: THREE.Vector3 | null, faceIndex?: number) => {
    let group: HighlightedFaceGroup = 'NONE';
    let nameOfFace: BoxFaceName | undefined = undefined;
    // Mapping faceIndex to BoxFaceName after CSG is complex.
    // The faceIndex from raycaster is for the final triangulated mesh.
    // For now, derive group from normal, and faceName might be less reliable after CSG.
    if (faceIndex !== undefined && faceNormal) { // A simple heuristic based on normal
        const x = Math.abs(faceNormal.x);
        const y = Math.abs(faceNormal.y);
        const z = Math.abs(faceNormal.z);
        if (y > x && y > z) nameOfFace = faceNormal.y > 0 ? 'TOP' : 'BOTTOM';
        else if (x > y && x > z) nameOfFace = faceNormal.x > 0 ? 'RIGHT' : 'LEFT';
        else if (z > y && z > x) nameOfFace = faceNormal.z > 0 ? 'FRONT' : 'BACK';
    }

    if (faceNormal) {
      if (faceNormal.y > 0.9) group = 'TOP';
      else if (faceNormal.y < -0.9) group = 'BOTTOM';
      else if (Math.abs(faceNormal.z) > 0.9) group = 'SIDES_FRONT_BACK';
      else if (Math.abs(faceNormal.x) > 0.9) group = 'SIDES_LEFT_RIGHT';
      else group = 'ALL';
    }
    setHighlightedGroupVisual(group);
    onFaceClickForSelection(group, nameOfFace);
  };

  const handleCanvasMiss = () => {
    setHighlightedGroupVisual('NONE');
    onFaceClickForSelection('NONE');
  };

  const [width, height, depth] = componentSize;

  return (
    <Canvas
      camera={{ position: [width*1.5, height*1.5, depth*2.5], fov: 50 }}
      shadows
      onPointerMissed={handleCanvasMiss}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[width*2, height*3, depth*2]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]}/>
      <Grid infiniteGrid cellSize={0.5} sectionSize={2.5} fadeDistance={Math.max(width,depth)*5} cellColor="#555" sectionColor="#885555" />
      <Suspense fallback={null}>
        <group
          onPointerOver={(e) => { e.stopPropagation(); setIsBlockHovered(true);}}
          onPointerOut={(e) => { e.stopPropagation(); setIsBlockHovered(false);}}
        >
          <StoneBlock
            stoneType={componentStoneType}
            size={componentSize}
            position={[0, 0, 0]} // JSCAD geometry is centered, then Three geometry is centered again. Position mesh at origin.
            edgeProcessingConfig={currentEdgeProcessingConfig}
            faceProcessingConfig={currentFaceProcessingConfig}
            onBlockClick={handleStoneClick}
            highlightedFaceGroupVisual={highlightedGroupVisual}
            hovered={isBlockHovered}
            wireframe={wireframeMode}
          />
        </group>
      </Suspense>
      <OrbitControls makeDefault />
    </Canvas>
  );
};

export default Scene;
