"use client";

import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { Canvas, useLoader, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Edges } from '@react-three/drei';
import * as THREE from 'three';
// JSCAD types might still be needed if passed around, but operations move to HomePage
import { geom3 } from '@jscad/modeling/src/geometries';

import { convertJscadGeomToThreeBufferGeometry } from '@/lib/jscadToThree';
import {
  FaceProcessingDefinition, // Keep for material processing
  sampleFaceProcessingDefinitions // Keep for material processing
} from '@/data/sampleData'; // Edge defs no longer needed here
import {
  AppliedFaceProcessingConfig, // Keep for material processing
  BoxFaceName
} from '@/types/stoneData';


export type HighlightedFaceGroup = 'NONE' | 'TOP' | 'BOTTOM' | 'SIDES_FRONT_BACK' | 'SIDES_LEFT_RIGHT' | 'ALL';
// ProcessableGroup and ProcessingID for edges are now managed in HomePage
// export type ProcessableGroup = 'TOP' | 'BOTTOM' | 'SIDES_FRONT_BACK' | 'SIDES_LEFT_RIGHT';
// export type ProcessingID = string;


interface StoneBlockProps {
  position?: [number, number, number];
  // size is implicitly handled by the incoming jscadGeom now
  stoneType?: string; // Still needed for base textures
  onBlockClick?: (event: ThreeEvent<MouseEvent>, faceNormal: THREE.Vector3 | null, faceIndex?: number) => void;
  highlightedFaceGroupVisual?: HighlightedFaceGroup;
  hovered?: boolean;
  // edgeProcessingConfig is no longer directly used here for CSG
  faceProcessingConfig?: AppliedFaceProcessingConfig; // Still needed for materials
  wireframe?: boolean;
  processedJscadGeom: geom3 | null; // Receive the final JSCAD geometry
}

// getEdgeProcessingParams no longer needed here
const getFaceProcessingParams = (id: string): FaceProcessingDefinition | undefined => { return sampleFaceProcessingDefinitions.find(p => p.id === id);};
const faceIndexToNameMap: BoxFaceName[] = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'];


const StoneBlock: React.FC<StoneBlockProps> = ({
  position = [0, 0, 0],
  // size prop is removed as geometry is now passed in
  stoneType = "kirmenjak",
  onBlockClick,
  highlightedFaceGroupVisual = 'NONE',
  hovered = false,
  // edgeProcessingConfig, // Removed
  faceProcessingConfig = {},
  wireframe = false,
  processedJscadGeom // Consumed here
}) => {
  const texturePath = `/textures/${stoneType}/`;
  const [baseColorMap, baseNormalMap, baseRoughnessMap, baseAoMap] = useLoader(THREE.TextureLoader, [
    `${texturePath}diffuse.png`, `${texturePath}normal.png`,
    `${texturePath}roughness.png`, `${texturePath}ao.png`,
  ]);

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
    if (!processedJscadGeom || geom3.toPolygons(processedJscadGeom).length === 0) {
      console.warn("StoneBlock: received null or empty processedJscadGeom. Rendering fallback empty geometry.");
      return new THREE.BufferGeometry(); // Return empty if no valid geom
    }

    const threeGeom = convertJscadGeomToThreeBufferGeometry(processedJscadGeom);

    // Material group assignment for face processing on the converted geometry.
    // This is still a major challenge as the converter does not preserve/create groups from JSCAD.
    // For now, the geometry will use materials[0] or an array if it somehow gets groups.
    // If the processedJscadGeom was *originally* a simple cuboid (no CSG from HomePage),
    // and if convertJscadGeomToThreeBufferGeometry could be made to understand its 6 faces
    // and apply material groups, then face processing could work.
    // This is beyond the current scope of the converter.
    if (Object.keys(faceProcessingConfig).length > 0) {
        console.warn("StoneBlock: Face-specific PBR materials may not apply correctly to CSG-modified geometry due to material group complexities in the converter.");
    }

    return threeGeom;

  }, [processedJscadGeom, materials, faceProcessingConfig]); // Dependencies updated

  const getEdgeColor = () => { return wireframe ? '#00cc00' : (highlightedFaceGroupVisual !== 'NONE' ? '#66f' : (hovered ? 'yellow' : '#777')); };

  const handlePointerDown = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (onBlockClick) {
      const faceNormal = event.face?.normal.clone();
      const faceIndex = event.faceIndex;
      onBlockClick(event, faceNormal || null, faceIndex !== undefined ? Math.floor(faceIndex / 2) : undefined);
    }
  };

  const meshRef = useRef<THREE.Mesh>(null!);
  useEffect(() => {
    if (meshRef.current && processedThreeGeometry) {
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = processedThreeGeometry;
      meshRef.current.material = materials; // Assign array of materials
    }
  }, [processedThreeGeometry, materials]);

  if (!processedThreeGeometry || processedThreeGeometry.attributes.position === undefined || (processedThreeGeometry.attributes.position as THREE.BufferAttribute).count === 0) {
    return null; // Don't render if geometry is empty
  }

  return (
    <mesh
      ref={meshRef} position={position} castShadow receiveShadow
      onPointerDown={handlePointerDown}
    >
      {!wireframe && <Edges
        color={getEdgeColor()}
        linewidth={hovered || highlightedFaceGroupVisual !== 'NONE' ? 2 : 1}
        threshold={15}
      />}
    </mesh>
  );
};

interface SceneProps {
  // currentEdgeProcessingConfig is no longer needed here as jscadGeom is pre-processed
  currentFaceProcessingConfig: AppliedFaceProcessingConfig; // Still needed for materials
  onFaceClickForSelection: (group: HighlightedFaceGroup, faceName?: BoxFaceName) => void;
  // componentSize is no longer needed here, jscadGeom defines the size
  componentStoneType: string; // Still needed for base texture
  wireframeMode?: boolean;
  onCanvasRef?: (canvas: HTMLCanvasElement | null) => void;
  processedJscadGeom: geom3 | null; // The pre-calculated JSCAD geometry
}

const Scene: React.FC<SceneProps> = ({
  // currentEdgeProcessingConfig, // Removed
  currentFaceProcessingConfig,
  onFaceClickForSelection,
  // componentSize, // Removed
  componentStoneType,
  wireframeMode = false,
  onCanvasRef,
  processedJscadGeom // New prop
}) => {
  const [highlightedGroupVisual, setHighlightedGroupVisual] = useState<HighlightedFaceGroup>('NONE');
  const [isBlockHovered, setIsBlockHovered] = useState<boolean>(false);
  const canvasInternalRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (onCanvasRef && canvasInternalRef.current) { onCanvasRef(canvasInternalRef.current); }
    return () => { if (onCanvasRef) { onCanvasRef(null); }};
  }, [onCanvasRef, canvasInternalRef]);

  const handleStoneClick = (event: ThreeEvent<MouseEvent>, faceNormal: THREE.Vector3 | null, faceIndex?: number) => {
    // ... (click logic as before, faceIndex mapping to BoxFaceName is still heuristic)
  };
  const handleCanvasMiss = () => { /* ... */ };

  // Determine camera position based on the bounds of the incoming geometry if possible
  // For now, keep it based on passed componentSize or a default if geom is null
  const [w,h,d] = useMemo(() => {
    if (processedJscadGeom) {
        const bounds = geom3.measureBoundingBox(processedJscadGeom);
        if (bounds && bounds[0] && bounds[1]) {
            return [
                bounds[1][0] - bounds[0][0],
                bounds[1][1] - bounds[0][1],
                bounds[1][2] - bounds[0][2]
            ];
        }
    }
    return [1.5, 1.5, 1.0]; // Fallback size
  }, [processedJscadGeom]);


  return (
    <Canvas ref={canvasInternalRef} camera={{ position: [w*1.5, h*1.5, d*2.5], fov: 50 }} shadows onPointerMissed={handleCanvasMiss}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[w*2, h*3, d*2]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]}/>
      <Grid infiniteGrid cellSize={0.5} sectionSize={2.5} fadeDistance={Math.max(w,d)*5} cellColor="#555" sectionColor="#885555" />
      <Suspense fallback={null}>
        <group onPointerOver={(e) => { e.stopPropagation(); setIsBlockHovered(true);}} onPointerOut={(e) => { e.stopPropagation(); setIsBlockHovered(false);}}>
          {processedJscadGeom && ( // Only render StoneBlock if geometry is available
            <StoneBlock
              stoneType={componentStoneType}
              // size prop removed
              position={[0,0,0]} // The jscadGeom should be centered, place mesh at origin
              // edgeProcessingConfig prop removed
              faceProcessingConfig={currentFaceProcessingConfig}
              onBlockClick={handleStoneClick}
              highlightedFaceGroupVisual={highlightedGroupVisual}
              hovered={isBlockHovered}
              wireframe={wireframeMode}
              processedJscadGeom={processedJscadGeom}
            />
          )}
        </group>
      </Suspense>
      <OrbitControls makeDefault />
    </Canvas>
  );
};

export default Scene;
