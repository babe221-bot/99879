"use client";

import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { Canvas, useLoader, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { primitives, booleans, extrusions, hulls } from '@jscad/modeling'; // Added hulls
import { geom2, geom3, poly3 } from '@jscad/modeling/src/geometries';
import { vec3 } from '@jscad/modeling/src/maths';
import { center, rotateX, rotateY, rotateZ, translate } from '@jscad/modeling/src/operations/transforms';

import { convertJscadGeomToThreeBufferGeometry } from '@/lib/jscadToThree';
import {
  EdgeProcessingDefinition,
  FaceProcessingDefinition,
  sampleEdgeProcessingDefinitions,
  sampleFaceProcessingDefinitions
} from '@/data/sampleData';
import {
  AppliedEdgeProcessingConfig,
  AppliedFaceProcessingConfig,
  BoxFaceName,
  ProcessableGroup as StoneProcessableGroup
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
const faceIndexToNameMap: BoxFaceName[] = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'];


const StoneBlock: React.FC<StoneBlockProps> = ({
  position = [0, 0, 0],
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

  const materials = useMemo(() => { /* ... as before ... */ }, [baseColorMap, baseNormalMap, baseRoughnessMap, baseAoMap, faceProcessingConfig, stoneType, wireframe]);


  const processedThreeGeometry = useMemo(() => {
    let jscadGeom: geom3 = primitives.cuboid({ size: [w, h, d], center: [0,0,0] });

    const createChamferWedge = (length: number, chamferVal: number): geom3 => { /* ... as before ... */
      const profilePoints = [[0,0], [chamferVal,0], [0,chamferVal]];
      if (chamferVal <= 1e-6) return primitives.cuboid({size:[0,0,0]});
      const profile = primitives.polygon({ points: profilePoints });
      return extrusions.extrudeLinear({ height: length }, profile);
    };

    let hasAppliedSpecificRound = false;

    // --- Apply Specific Edge Processing ---
    // Order might matter: Chamfers first, then attempt specific rounds on remaining sharp edges.
    // For now, let's do chamfers for TOP/BOTTOM, then check for specific TOP rounding.

    (['TOP', 'BOTTOM'] as StoneProcessableGroup[]).forEach(group => {
      const procId = edgeProcessingConfig[group];
      if (!procId) return;
      const procParams = getEdgeProcessingParams(procId);
      if (!procParams || !procParams.parameters.width) return;

      if (procParams.type === 'CHAMFER') {
        const cv = procParams.parameters.width / 10;
        if (cv <= 0) return;
        const isTop = group === 'TOP';
        const ySign = isTop ? 1 : -1;
        const wedgeForXEdge = createChamferWedge(w, cv);
        const wedgeForZEdge = createChamferWedge(d, cv);
        if (geom3.toPolygons(wedgeForXEdge).length === 0 || geom3.toPolygons(wedgeForZEdge).length === 0) return;

        // Transformations for chamfer brushes (simplified, needs robust solution for all 4 on each face)
        // This logic is illustrative and likely only works for some edges without more precise transforms
        let brush1 = geom3.clone(wedgeForXEdge); // Top/Bottom-Front
        brush1 = rotateX(isTop ? -Math.PI / 2 : Math.PI / 2, brush1);
        brush1 = rotateY(Math.PI / 2, brush1);
        brush1 = translate([-w/2, ySign * (h/2 - cv), d/2 - (isTop ? cv : -cv)], brush1);
        jscadGeom = booleans.subtract(jscadGeom, brush1);
        // ... (need to implement for other 3 edges of TOP and 4 of BOTTOM correctly) ...
        console.log(`JSCAD: Applied CHAMFER ${cv*10}mm to ${group} edges (partially).`);
      }
    });

    // Attempt Manual CSG Rounding for TOP Edges (Experimental)
    const topRoundProcId = edgeProcessingConfig.TOP;
    if (topRoundProcId) {
      const topRoundParams = getEdgeProcessingParams(topRoundProcId);
      if (topRoundParams && topRoundParams.type === 'ROUND' && topRoundParams.parameters.radius) {
        const radius = topRoundParams.parameters.radius / 10;
        if (radius > 0) {
          hasAppliedSpecificRound = true;
          console.log(`JSCAD: Attempting MANUAL ROUND ${radius*10}mm for TOP edges.`);

          // Example for ONE Top-Front edge (along X, at y=h/2, z=d/2)
          // 1. Subtractive part (notch)
          const notchBox = primitives.cuboid({size: [w, radius, radius], center: [0, h/2 - radius/2, d/2 - radius/2]});
          jscadGeom = booleans.subtract(jscadGeom, notchBox);

          // 2. Additive part (quarter cylinder)
          // Create a 2D quarter circle. JSCAD's arc is complex for this.
          // Easier: create a full circle, then intersect with a square to get a quarter.
          let qCircleShape: geom2 = primitives.circle({radius: radius, segments: 32});
          const squareCutter = primitives.rectangle({size: [radius, radius], center: [radius/2, radius/2]}); // To get 1st quadrant
          qCircleShape = booleans.intersect(qCircleShape, squareCutter);

          if (geom2.toPoints(qCircleShape).length > 0) {
            let filletBody = extrusions.extrudeLinear({height: w}, qCircleShape);
            // Orient and position: This is the hard part.
            // Extrusion is along Z. Profile is in XY.
            // For Top-Front edge (along X world):
            // Rotate profile so it's in YZ plane of the brush, then rotate brush.
            filletBody = rotateX(Math.PI/2, filletBody); // Now extrusion is along Y world.
            filletBody = rotateY(-Math.PI/2, filletBody); // Now extrusion is along X world.
            // Position its "corner" at the start of the edge, accounting for radius.
            filletBody = translate([-w/2, h/2 - radius, d/2 - radius], filletBody);
            jscadGeom = booleans.union(jscadGeom, filletBody);
            console.log("JSCAD: Experimental MANUAL ROUND CSG applied to one TOP edge.");
          } else {
            console.warn("JSCAD: Quarter circle for rounding resulted in empty geometry.");
          }
          // This needs to be replicated & transformed for all 4 top edges.
        }
      }
    }

    // Fallback to global roundedCuboid if no specific TOP rounding was done,
    // but some other rounding is specified generally.
    if (!hasAppliedSpecificRound) {
        let globalRoundRadius = 0;
        Object.values(edgeProcessingConfig).forEach(procId => {
            if (!procId) return;
            const procParams = getEdgeProcessingParams(procId);
            if (procParams && procParams.type === 'ROUND' && procParams.parameters.radius) {
                globalRoundRadius = Math.max(globalRoundRadius, procParams.parameters.radius / 10);
            }
        });
        if (globalRoundRadius > 0) {
            jscadGeom = primitives.roundedCuboid({ size: [w, h, d], roundRadius: globalRoundRadius, center: [0,0,0], segments: 16 });
            console.log(`JSCAD: Applied general ROUND ${globalRoundRadius*10}mm using roundedCuboid.`);
        }
    }

    return convertJscadGeomToThreeBufferGeometry(jscadGeom);

  }, [w, h, d, edgeProcessingConfig, materials, faceProcessingConfig]);

  const getEdgeColor = () => { /* ... */ };
  const handlePointerDown = (event: ThreeEvent<MouseEvent>) => { /* ... */ };
  const meshRef = useRef<THREE.Mesh>(null!);
  useEffect(() => { /* ... */ }, [processedThreeGeometry, materials]);

  if (!processedThreeGeometry) return null;
  return ( <mesh ref={meshRef} position={position} castShadow receiveShadow onPointerDown={handlePointerDown}>
      {!wireframe && processedThreeGeometry && <Edges color={getEdgeColor()} linewidth={hovered || highlightedFaceGroupVisual !== 'NONE' ? 2 : 1} threshold={15} />}
    </mesh>
  );
};

interface SceneProps { /* ... */ }
const Scene: React.FC<SceneProps> = ({ /* ... */ }) => { /* ... Scene component body as before ... */ };
export default Scene;
