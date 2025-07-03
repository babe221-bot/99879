"use client";

import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { Canvas, useLoader, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { CSG } from 'three-csg-ts';
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
  wireframe?: boolean; // New prop for wireframe mode
}

const getEdgeProcessingParams = (id: ProcessingID): EdgeProcessingDefinition | undefined => { return sampleEdgeProcessingDefinitions.find(p => p.id === id); };
const getFaceProcessingParams = (id: ProcessingID): FaceProcessingDefinition | undefined => { return sampleFaceProcessingDefinitions.find(p => p.id === id);};
const faceIndexToNameMap: BoxFaceName[] = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'];


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

  const [w, h, d] = size;

  const materials = useMemo(() => {
    const baseMaterial = new THREE.MeshStandardMaterial({
      map: wireframe ? undefined : baseColorMap,
      normalMap: wireframe ? undefined : baseNormalMap,
      roughnessMap: wireframe ? undefined : baseRoughnessMap,
      aoMap: wireframe ? undefined : baseAoMap,
      side: THREE.DoubleSide, name: "baseStoneMaterial",
      wireframe: wireframe,
      color: wireframe ? new THREE.Color("lime") : undefined, // Give wireframe a color
    });

    const faceMaterialsArray = [baseMaterial];
    const uniqueFaceProcessingIds = new Set(Object.values(faceProcessingConfig).filter(id => id) as string[]);

    uniqueFaceProcessingIds.forEach(processingId => {
      const params = getFaceProcessingParams(processingId);
      if (params) {
        const mat = baseMaterial.clone();
        mat.name = processingId;
        mat.wireframe = wireframe;
        if (params.normalMapPath && !wireframe) {
          console.warn(`Wireframe: Would load normal map: ${params.normalMapPath} for ${processingId}. Preloading needed.`);
          mat.roughness = Math.random();
        } else if (!wireframe) {
           mat.roughness = (baseMaterial.roughness * 0.8 + Math.random() * 0.2) ;
        } else {
            mat.roughness = 0.5; // for wireframe, roughness might not matter but set it
            mat.color = new THREE.Color("cyan"); // Different color for processed faces in wireframe
        }
        faceMaterialsArray.push(mat);
      }
    });
    return faceMaterialsArray;
  }, [baseColorMap, baseNormalMap, baseRoughnessMap, baseAoMap, faceProcessingConfig, stoneType, wireframe]);


  const processedGeometry = useMemo(() => {
    let baseBoxGeom = new THREE.BoxGeometry(w, h, d);
    for (let i = 0; i < baseBoxGeom.groups.length; i++) {
        baseBoxGeom.groups[i].materialIndex = 0;
    }
    (Object.keys(faceProcessingConfig) as BoxFaceName[]).forEach(faceName => {
      const processingId = faceProcessingConfig[faceName];
      if (processingId) {
        const materialIndexInArray = materials.findIndex(m => m.name === processingId);
        const faceIdx = faceIndexToNameMap.indexOf(faceName);
        if (faceIdx !== -1 && materialIndexInArray !== -1 && baseBoxGeom.groups[faceIdx]) {
             baseBoxGeom.groups[faceIdx].materialIndex = materialIndexInArray > 0 ? materialIndexInArray : 0;
        }
      }
    });
    baseBoxGeom.groupsNeedUpdate = true;

    let baseMesh = new THREE.Mesh(baseBoxGeom);
    baseMesh.updateMatrixWorld(true);
    let csgResult: CSG = CSG.fromMesh(baseMesh);

    const createChamferBrush = (length: number, chamferVal: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(chamferVal, 0); shape.lineTo(0, chamferVal); shape.closePath();
      return new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
    };

    const topProcessingId = edgeProcessingConfig.TOP;
    if (topProcessingId) {
      const params = getEdgeProcessingParams(topProcessingId);
      if (params && params.type === 'CHAMFER' && params.parameters.width) {
        const chamferSize = params.parameters.width / 10;
        const edgesToProcess = [
          { L: w, P: [-w/2, h/2 - chamferSize, d/2], R: [0, Math.PI / 2,  0] },
          { L: w, P: [w/2, h/2 - chamferSize, -d/2], R: [Math.PI, Math.PI / 2, 0] },
          { L: d, P: [-w/2, h/2 - chamferSize, -d/2], R: [Math.PI/2, 0, -Math.PI/2] },
          { L: d, P: [w/2, h/2-chamferSize, d/2], R: [0, 0, -Math.PI/2] },
        ];
        edgesToProcess.forEach(edge => {
          let brushGeom = createChamferBrush(edge.L, chamferSize);
          let brushMesh = new THREE.Mesh(brushGeom);
          brushMesh.rotation.fromArray(edge.R.map(r => r as number) as [number,number,number]);
          brushMesh.position.fromArray(edge.P as [number,number,number]);
          brushMesh.updateMatrixWorld(true);
          csgResult = CSG.subtract(csgResult, CSG.fromMesh(brushMesh));
        });
      }
    }

    const finalMesh = CSG.toMesh(csgResult, baseMesh.matrix);
    finalMesh.geometry.computeVertexNormals();
    finalMesh.geometry.center();
    return finalMesh.geometry;

  }, [w, h, d, edgeProcessingConfig, materials, faceProcessingConfig]);

  const getEdgeColor = () => {
    if (wireframe) return '#00cc00'; // Brighter Green wireframe edges
    if (highlightedFaceGroupVisual !== 'NONE') return '#66f';
    if (hovered) return 'yellow';
    return '#777';
  };

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
    if (meshRef.current) {
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = processedGeometry;
      meshRef.current.material = materials;
    }
  }, [processedGeometry, materials]); // wireframe is already a dep of materials

  return (
    <mesh
      ref={meshRef} position={position} castShadow receiveShadow
      geometry={processedGeometry}
      onPointerDown={handlePointerDown}
    >
      {!wireframe && <Edges // Only show Edges component if not in wireframe mode, as material handles it
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
    if (faceIndex !== undefined && faceIndex >=0 && faceIndex < faceIndexToNameMap.length) {
        nameOfFace = faceIndexToNameMap[faceIndex];
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
            position={[0, componentSize[1]/2, 0]}
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
