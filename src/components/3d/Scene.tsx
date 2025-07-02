"use client";

import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { Canvas, useLoader, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { CSG } from 'three-csg-ts';

// For highlighting based on click. This can be different from the group selected for processing.
export type HighlightedFaceGroup = 'NONE' | 'TOP' | 'BOTTOM' | 'SIDES_FRONT_BACK' | 'SIDES_LEFT_RIGHT' | 'ALL';

// For applying processing. These string values must match keys in AppliedProcessing.
export type ProcessableGroup = 'TOP' | 'BOTTOM' | 'SIDES_FRONT_BACK' | 'SIDES_LEFT_RIGHT';

export type ProcessingType = 'NONE' | 'CHAMFER_C1' | 'ROUND_R1'; // C1 = 0.1 unit chamfer

export interface AppliedProcessingConfig {
  TOP?: ProcessingType;
  BOTTOM?: ProcessingType;
  SIDES_FRONT_BACK?: ProcessingType;
  SIDES_LEFT_RIGHT?: ProcessingType;
}

interface StoneBlockProps {
  position?: [number, number, number]; // This should be the center of the final geometry
  size?: [number, number, number]; // Initial dimensions before processing
  stoneType?: string;
  onBlockClick?: (event: ThreeEvent<MouseEvent>, faceNormal: THREE.Vector3 | null) => void;
  highlightedFaceGroupVisual?: HighlightedFaceGroup; // For visual feedback on click
  hovered?: boolean;
  processingConfig?: AppliedProcessingConfig;
}

const StoneBlock: React.FC<StoneBlockProps> = ({
  position = [0, 0.75, 0],
  size = [1.5, 1.5, 1],
  stoneType = "kirmenjak",
  onBlockClick,
  highlightedFaceGroupVisual = 'NONE',
  hovered = false,
  processingConfig = {},
}) => {
  const texturePath = `/textures/${stoneType}/`;
  const [colorMap, normalMap, roughnessMap, aoMap] = useLoader(THREE.TextureLoader, [
    `${texturePath}diffuse.png`, `${texturePath}normal.png`,
    `${texturePath}roughness.png`, `${texturePath}ao.png`, // Corrected comma
  ]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    map: colorMap, normalMap: normalMap, roughnessMap: roughnessMap, aoMap: aoMap,
    side: THREE.DoubleSide, // Important for CSG results
  }), [colorMap, normalMap, roughnessMap, aoMap]);

  const [w, h, d] = size;

  const processedGeometry = useMemo(() => {
    console.log("Recalculating geometry with processing:", processingConfig);
    let baseMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    baseMesh.updateMatrixWorld(true); // Ensure world matrix is up-to-date

    const chamferSize = 0.1; // For CHAMFER_C1

    // Helper to create a chamfer brush for an edge along a given axis
    const createChamferBrush = (length: number, chamfer: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(chamfer, 0);
      shape.lineTo(0, chamfer);
      shape.closePath();
      const extrudeSettings = { depth: length, bevelEnabled: false };
      return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    };

    let csgResult: CSG = CSG.fromMesh(baseMesh);

    // TOP Edges Chamfer
    if (processingConfig.TOP === 'CHAMFER_C1') {
      // Edge 1 (front: +Z, along X axis)
      let brushGeom1 = createChamferBrush(w, chamferSize); // length along X
      let brushMesh1 = new THREE.Mesh(brushGeom1, material); // material needed for CSG object
      brushMesh1.rotation.set(0, Math.PI / 2,  0); // Rotate shape to align
      brushMesh1.position.set(-w/2, h/2 - chamferSize, d/2); // Top-Front-Left corner start
      brushMesh1.updateMatrixWorld(true);
      csgResult = CSG.subtract(csgResult, CSG.fromMesh(brushMesh1));

      // Edge 2 (back: -Z, along X axis)
      let brushGeom2 = createChamferBrush(w, chamferSize);
      let brushMesh2 = new THREE.Mesh(brushGeom2, material);
      brushMesh2.rotation.set(Math.PI, Math.PI / 2, 0); // Rotate to face inwards and along -X
      brushMesh2.position.set(w/2, h/2 - chamferSize, -d/2);
      brushMesh2.updateMatrixWorld(true);
      csgResult = CSG.subtract(csgResult, CSG.fromMesh(brushMesh2));

      // Edge 3 (left: -X, along Z axis)
      let brushGeom3 = createChamferBrush(d, chamferSize); // length along Z
      let brushMesh3 = new THREE.Mesh(brushGeom3, material);
      brushMesh3.rotation.set(Math.PI/2, 0, -Math.PI/2);
      brushMesh3.position.set(-w/2, h/2 - chamferSize, -d/2);
      brushMesh3.updateMatrixWorld(true);
      csgResult = CSG.subtract(csgResult, CSG.fromMesh(brushMesh3));

      // Edge 4 (right: +X, along Z axis)
      let brushGeom4 = createChamferBrush(d, chamferSize);
      let brushMesh4 = new THREE.Mesh(brushGeom4, material);
      brushMesh4.rotation.set(0, 0, -Math.PI/2);
      brushMesh4.position.set(w/2, h/2-chamferSize, d/2);
      brushMesh4.updateMatrixWorld(true);
      csgResult = CSG.subtract(csgResult, CSG.fromMesh(brushMesh4));
    }

    // Similar blocks for BOTTOM, SIDES_FRONT_BACK, SIDES_LEFT_RIGHT would go here
    // if (processingConfig.BOTTOM === 'CHAMFER_C1') { ... }

    const finalMesh = CSG.toMesh(csgResult, baseMesh.matrix);
    finalMesh.material = material; // Re-apply material
    finalMesh.geometry.computeVertexNormals();

    // Center the geometry if CSG operations shifted its origin
    finalMesh.geometry.center();

    return finalMesh.geometry;

  }, [w, h, d, processingConfig, material]); // material added as dep

  const getEdgeColor = () => {
    if (highlightedFaceGroupVisual !== 'NONE') return '#66f'; // Light blue for highlight
    if (hovered) return 'yellow';
    return '#777';
  };

  const handlePointerDown = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (onBlockClick) {
      const faceNormal = event.face?.normal.clone();
      onBlockClick(event, faceNormal || null);
    }
  };

  const meshRef = useRef<THREE.Mesh>(null!);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = processedGeometry;
    }
  }, [processedGeometry]);


  return (
    <mesh
      ref={meshRef}
      position={position} // The component is positioned at its center
      castShadow
      receiveShadow
      geometry={processedGeometry}
      material={material}
      onPointerDown={handlePointerDown}
    >
      <Edges
        color={getEdgeColor()}
        linewidth={hovered || highlightedFaceGroupVisual !== 'NONE' ? 2 : 1}
        threshold={15}
      />
    </mesh>
  );
};

interface SceneProps {
  currentProcessingConfig: AppliedProcessingConfig;
  onFaceClickForSelection: (group: HighlightedFaceGroup) => void;
}

const Scene: React.FC<SceneProps> = ({ currentProcessingConfig, onFaceClickForSelection }) => {
  const [highlightedGroupVisual, setHighlightedGroupVisual] = useState<HighlightedFaceGroup>('NONE');
  const [isBlockHovered, setIsBlockHovered] = useState<boolean>(false);

  const handleStoneClick = (event: ThreeEvent<MouseEvent>, faceNormal: THREE.Vector3 | null) => {
    let group: HighlightedFaceGroup = 'NONE';
    if (faceNormal) {
      if (faceNormal.y > 0.9) group = 'TOP';
      else if (faceNormal.y < -0.9) group = 'BOTTOM';
      else if (Math.abs(faceNormal.z) > 0.9) group = 'SIDES_FRONT_BACK';
      else if (Math.abs(faceNormal.x) > 0.9) group = 'SIDES_LEFT_RIGHT';
      else group = 'ALL'; // Should not happen often with distinct faces
    }
    setHighlightedGroupVisual(group);
    onFaceClickForSelection(group); // Inform parent which face group was clicked
  };

  const handleCanvasMiss = () => {
    setHighlightedGroupVisual('NONE');
    onFaceClickForSelection('NONE');
  };

  return (
    <Canvas
      camera={{ position: [3.5, 3.5, 3.5], fov: 50 }} // slightly adjusted camera
      shadows
      onPointerMissed={handleCanvasMiss}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[8, 10, 5]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]}/>
      <Grid infiniteGrid cellSize={0.5} sectionSize={2.5} fadeDistance={30} cellColor="#555" sectionColor="#885555" />
      <Suspense fallback={null}>
        <group
          onPointerOver={(e) => { e.stopPropagation(); setIsBlockHovered(true);}}
          onPointerOut={(e) => { e.stopPropagation(); setIsBlockHovered(false);}}
        >
          <StoneBlock
            stoneType="kirmenjak" // Example
            processingConfig={currentProcessingConfig}
            onBlockClick={handleStoneClick}
            highlightedFaceGroupVisual={highlightedGroupVisual}
            hovered={isBlockHovered}
            size={[1.5, 1.5, 1]} // w, h, d - ensure position is adjusted if needed
            position={[0, 1.5/2, 0]} // center geometry on grid
          />
        </group>
      </Suspense>
      <OrbitControls makeDefault />
    </Canvas>
  );
};

export default Scene;
