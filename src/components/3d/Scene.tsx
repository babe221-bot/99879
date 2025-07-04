"use client";

import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { Canvas, useLoader, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { primitives, booleans, extrusions, hulls } from '@jscad/modeling';
import { geom2, geom3, poly3 } from '@jscad/modeling/src/geometries';
import { vec3 } from '@jscad/modeling/src/maths';
import { center, rotateX, rotateY, rotateZ, translate, align } from '@jscad/modeling/src/operations/transforms';

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

    // Canonical chamfer wedge: right angle at local origin (0,0,0) of its profile,
    // profile in local XY plane, cutting into the +X and +Y quadrant.
    // Extruded along its local +Z axis by 'length'.
    const createCanonicalChamferWedge = (length: number, chamferVal: number): geom3 => {
      if (chamferVal <= 1e-6 || length <= 1e-6) return primitives.cuboid({size:[0,0,0]}); // empty geom
      const profilePoints = [[0,0], [chamferVal,0], [0,chamferVal]];
      const profile = primitives.polygon({ points: profilePoints });
      return extrusions.extrudeLinear({ height: length }, profile);
    };

    let hasAppliedSpecificRound = false; // Flag to check if manual rounding was attempted

    // --- Apply Chamfers for TOP and BOTTOM Groups ---
    // Iterates through TOP and BOTTOM groups to apply chamfers.
    // The transformation logic for each of the 4 edges per group is highly experimental
    // and requires careful visual validation and likely significant adjustments for accuracy.
    (['TOP', 'BOTTOM'] as StoneProcessableGroup[]).forEach(group => {
      const procId = edgeProcessingConfig[group];
      if (!procId) return;

      const procParams = getEdgeProcessingParams(procId);

      let applyChamferToThisGroup = procParams && procParams.type === 'CHAMFER' && procParams.parameters.width;
      if (applyChamferToThisGroup) {
        const isThisGroupAlsoRound = getEdgeProcessingParams(edgeProcessingConfig[group] || "")?.type === 'ROUND';
        const isTopGroupAndTopHasSpecificRoundAttempt = (group === 'TOP' && getEdgeProcessingParams(edgeProcessingConfig.TOP || "")?.type === 'ROUND');

        // If this group is also set for rounding, or if TOP group has a specific round attempt, skip chamfering for this group.
        // This prioritizes rounding if both are somehow selected for the same group.
        if (isThisGroupAlsoRound || (group === 'TOP' && isTopGroupAndTopHasSpecificRoundAttempt && hasAppliedSpecificRound) ) {
            applyChamferToThisGroup = false;
        }
      }
      if (!applyChamferToThisGroup || !procParams || !procParams.parameters.width) return;

      const cv = procParams.parameters.width / 10;
      if (cv <= 0) return;

      const isTop = group === 'TOP';
      const ySign = isTop ? 1 : -1; // +1 for TOP face (y=h/2), -1 for BOTTOM face (y=-h/2)
      const hValue = h; // Cuboid height, used for clarity in translations

      const wedgeForXEdge = createCanonicalChamferWedge(w, cv); // Wedge for edges parallel to X-axis
      const wedgeForZEdge = createCanonicalChamferWedge(d, cv); // Wedge for edges parallel to Z-axis

      if (geom3.toPolygons(wedgeForXEdge).length === 0 || geom3.toPolygons(wedgeZLen).length === 0) {
        console.warn(`Cannot create chamfer wedge for ${group} with cv=${cv}`);
        return;
      }

      console.log(`JSCAD: Applying CSG CHAMFER ${cv*10}mm to ${group} edges (EXPERIMENTAL transformations).`);

      // For each edge, the goal is to:
      // 1. Rotate the canonical wedge so its length aligns with the world edge.
      // 2. Further rotate the wedge so its cutting profile (originally +X,+Y local) is oriented
      //    to cut inwards into the cuboid and towards the plane of the face (downwards for TOP, upwards for BOTTOM).
      // 3. Translate the wedge's reference point (local 0,0,0 of its profile) to the start corner of the cuboid edge,
      //    then offset by `cv` along the two face-plane axes.

      // --- Edges parallel to X-axis ---
      // 1. Front Edge: (along +X world direction), on face z = d/2
      //    Needs to cut towards world -Y (if top) or +Y (if bottom), and towards world -Z.
      let brushFE = geom3.clone(wedgeXLen);
      brushFE = rotateX(ySign * -Math.PI / 2, brushFE); // Orients profile's local Y along world -Y (top) or +Y (bottom)
      brushFE = rotateY(Math.PI / 2, brushFE);       // Orients wedge length (local Z) along world +X
      brushFE = translate([-w/2, ySign * (hValue/2 - cv), d/2 - cv], brushFE);
      jscadGeom = booleans.subtract(jscadGeom, brushFE);

      // 2. Back Edge: (along +X world direction), on face z = -d/2
      //    Needs to cut towards world -Y (if top) or +Y (if bottom), and towards world +Z.
      let brushBE = geom3.clone(wedgeXLen);
      brushBE = rotateX(ySign * -Math.PI / 2, brushBE);
      brushBE = rotateY(-Math.PI / 2, brushBE); // Rotates wedge length to align with world +X, but profile faces +Z
      brushBE = translate([-w/2, ySign * (hValue/2 - cv), -d/2 + cv], brushBE);
      jscadGeom = booleans.subtract(jscadGeom, brushBE);

      // --- Edges parallel to Z-axis ---
      // 3. Left Edge: (along +Z world direction), on face x = -w/2
      //    Needs to cut towards world -Y (if top) or +Y (if bottom), and towards world +X.
      let brushLE = geom3.clone(wedgeZLen); // Canonical wedge length is along its Z axis.
      brushLE = rotateX(ySign * -Math.PI / 2, brushLE); // Orients profile's local Y along world -Y (top) or +Y (bottom).
                                                     // Profile (orig XY) is now in world XZ plane, cutting +X, +/-Z.
      // We need profile to cut +X and +/-Y. The current orientation after rotateX is good for cutting +/-Y.
      // No Y-axis rotation on the brush itself is needed if its length is already aligned with world Z.
      // We need to rotate the *profile* (originally cutting +X,+Y) around the wedge's length axis (local Z).
      // To cut +X world: no change to profile's X. To cut -Y world (top): profile's Y needs to point -Y.
      // This implies the canonical wedge profile (cuts +X,+Y) is suitable if Y-axis of profile is aligned correctly.
      // If isTop: rotateZ(0) - profile cuts +X, +Y. After rotateX(-PI/2), profile is XZ, cuts +X, -Z (world). Good.
      // If !isTop (bottom): rotateZ(Math.PI) - profile cuts -X, -Y. After rotateX(PI/2), profile is XZ, cuts -X, +Z (world). Good.
      brushLE = rotateZ(isTop ? 0 : Math.PI, brushLE);
      brushLE = translate([-w/2 + cv, ySign * (hValue/2 - cv), -d/2], brushLE);
      jscadGeom = booleans.subtract(jscadGeom, brushLE);

      // 4. Right Edge: (along +Z world direction), on face x = w/2
      //    Needs to cut towards world -Y (if top) or +Y (if bottom), and towards world -X.
      let brushRE = geom3.clone(wedgeZLen);
      brushRE = rotateX(ySign * -Math.PI / 2, brushRE);
      brushRE = rotateZ(isTop ? Math.PI : 0, brushRE); // Flip profile to cut towards -X world
      brushRE = translate([w/2 - cv, ySign * (hValue/2 - cv), -d/2], brushRE);
      jscadGeom = booleans.subtract(jscadGeom, brushRE);
    });
    // --- End TOP/BOTTOM Edge Chamfering ---

    // --- Chamfering for VERTICAL Edges (Highly Experimental - One Edge Example) ---
    const verticalChamferProcId = edgeProcessingConfig.SIDES_FRONT_BACK || edgeProcessingConfig.SIDES_LEFT_RIGHT;
    if (verticalChamferProcId && !hasAppliedSpecificRound) { // Don't apply if global round will happen
      const procParams = getEdgeProcessingParams(verticalChamferProcId);
      if (procParams && procParams.type === 'CHAMFER' && procParams.parameters.width) {
        const cv = procParams.parameters.width / 10;
        if (cv > 0) {
          console.log(`JSCAD: Attempting CHAMFER ${cv*10}mm for VERTICAL edges (EXPERIMENTAL - Front-Left Edge Only).`);
          let wedgeFLV = createCanonicalChamferWedge(h, cv);
          wedgeFLV = rotateX(-Math.PI / 2, wedgeFLV);
          wedgeFLV = translate([-w/2 + cv, -h/2, d/2 - cv], wedgeFLV);
          jscadGeom = booleans.subtract(jscadGeom, wedgeFLV);
        }
      }
    }
    // --- End VERTICAL Edge Chamfering ---

    // --- Attempt Manual CSG Rounding for TOP Edges (Experimental, if specified) ---
    const topRoundProcId = edgeProcessingConfig.TOP;
    if (topRoundProcId) {
      const topRoundParams = getEdgeProcessingParams(topRoundProcId);
      if (topRoundParams && topRoundParams.type === 'ROUND' && topRoundParams.parameters.radius) {
        const radius = topRoundParams.parameters.radius / 10;
        if (radius > 0) {
          hasAppliedSpecificRound = true;
          console.log(`JSCAD: Attempting MANUAL ROUND ${radius*10}mm for TOP edges.`);
          const notchBoxTF = primitives.cuboid({size: [w, radius, radius], center: [0, h/2 - radius/2, d/2 - radius/2]});
          jscadGeom = booleans.subtract(jscadGeom, notchBoxTF);
          let qCircleShape: geom2 = primitives.circle({radius: radius, segments: 16});
          const squareCutter = primitives.rectangle({size: [radius, radius], center: [radius/2, radius/2]});
          qCircleShape = booleans.intersect(qCircleShape, squareCutter);
          if (geom2.toPoints(qCircleShape).length > 2) {
            let filletBodyTF = extrusions.extrudeLinear({height: w}, qCircleShape);
            filletBodyTF = rotateX(Math.PI/2, filletBodyTF);
            filletBodyTF = rotateZ(-Math.PI/2, filletBodyTF);
            filletBodyTF = translate([-w/2, h/2 - radius, d/2 - radius], filletBodyTF);
            jscadGeom = booleans.union(jscadGeom, filletBodyTF);
            console.log("JSCAD: Experimental MANUAL ROUND CSG applied to one TOP edge.");
          } else { console.warn("JSCAD: Quarter circle for TOP-FRONT rounding resulted in invalid/empty geometry.");}
        }
      }
    }
    // --- End TOP Edge Rounding ---

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
            // If any chamfer was applied, global rounding will smooth it out.
            // If only rounding is desired, this is fine.
            // If mixed chamfer and round on different groups, current logic is problematic.
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
const Scene: React.FC<SceneProps> = ({ /* ... Scene component body as before ... */ }) => { /* ... */ };
export default Scene;
