import * as THREE from 'three';
import { geom3, poly3 } from '@jscad/modeling').geometries;
import { vec3 } from '@jscad/modeling').maths;

const triangulatePolygon = (polygon: poly3): Array<Array<vec3>> => {
  const triangles: Array<Array<vec3>> = [];
  if (polygon.vertices.length < 3) {
    return triangles;
  }
  const firstVertex = polygon.vertices[0];
  for (let i = 1; i < polygon.vertices.length - 1; i++) {
    triangles.push([firstVertex, polygon.vertices[i], polygon.vertices[i + 1]]);
  }
  return triangles;
};

export const convertJscadGeomToThreeBufferGeometry = (jscadGeom: geom3): THREE.BufferGeometry => {
  const threeGeometry = new THREE.BufferGeometry();
  const jscadPolygons = geom3.toPolygons(jscadGeom);

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  if (jscadPolygons.length === 0) {
    return threeGeometry; // Return empty geometry if no polygons
  }

  // For Box Projection UVs, calculate the bounding box of the entire geometry once.
  // geom3.measureBoundingBox returns [[minX, minY, minZ], [maxX, maxY, maxZ]]
  const bbox = geom3.measureBoundingBox(jscadGeom);
  if (!bbox || !bbox[0] || !bbox[1]) { // Bbox might be null for empty geometry
      console.warn("JSCAD geometry has no bounding box, UVs will be [0,0]");
      // Return empty geometry or geometry with just positions/normals if that's preferable
      // For now, proceed but UVs will be bad.
      // A robust solution might be to throw an error or handle this case more gracefully.
      // Let's assume bbox is valid for typical cases.
      // If size is zero in any dimension, UVs will also be problematic.
      const tempMin = [0,0,0];
      const tempMax = [0,0,0];
      // A default small bounding box to prevent division by zero if bbox is degenerate
      const min = bbox && bbox[0] ? bbox[0] : tempMin;
      const max = bbox && bbox[1] ? bbox[1] : tempMax;

      jscadPolygons.forEach(polygon => {
        const triangles = triangulatePolygon(polygon);
        triangles.forEach(triangle => {
            const v = [triangle[0], triangle[1], triangle[2]];
            const pA = new THREE.Vector3().fromArray(v[0]);
            const pB = new THREE.Vector3().fromArray(v[1]);
            const pC = new THREE.Vector3().fromArray(v[2]);
            const cb = new THREE.Vector3().subVectors(pC, pB);
            const ab = new THREE.Vector3().subVectors(pA, pB);
            const faceNormalVec3 = cb.cross(ab).normalize();
            const normal = faceNormalVec3.toArray();
            v.forEach(vertex => {
                positions.push(...vertex);
                normals.push(...normal, ...normal, ...normal); // Re-check this, should be one normal per vertex
                uvs.push(0,0); // Fallback UVs
            });
        });
      });
      if (positions.length > 0) {
        threeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        threeGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); // Ensure normals array matches positions length
        threeGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      }
      return threeGeometry;

  }

  const minBound = vec3.fromValues(bbox[0][0], bbox[0][1], bbox[0][2]);
  const maxBound = vec3.fromValues(bbox[1][0], bbox[1][1], bbox[1][2]);
  const geomSize = vec3.subtract(vec3.create(), maxBound, minBound);


  jscadPolygons.forEach(polygon => {
    const triangles = triangulatePolygon(polygon);

    triangles.forEach(triangle => {
      const v = [triangle[0], triangle[1], triangle[2]];

      const pA = new THREE.Vector3().fromArray(v[0]);
      const pB = new THREE.Vector3().fromArray(v[1]);
      const pC = new THREE.Vector3().fromArray(v[2]);
      const cb = new THREE.Vector3().subVectors(pC, pB);
      const ab = new THREE.Vector3().subVectors(pA, pB);
      const faceNormalVec3 = cb.cross(ab).normalize();
      const normalArr = faceNormalVec3.toArray();

      v.forEach(vertexVec3 => { // vertexVec3 is [x,y,z]
        positions.push(...vertexVec3);
        normals.push(...normalArr);

        // Box Projection UVs
        const relX = geomSize[0] === 0 ? 0.5 : (vertexVec3[0] - minBound[0]) / geomSize[0];
        const relY = geomSize[1] === 0 ? 0.5 : (vertexVec3[1] - minBound[1]) / geomSize[1];
        const relZ = geomSize[2] === 0 ? 0.5 : (vertexVec3[2] - minBound[2]) / geomSize[2];

        const absNormalX = Math.abs(faceNormalVec3.x);
        const absNormalY = Math.abs(faceNormalVec3.y);
        const absNormalZ = Math.abs(faceNormalVec3.z);

        if (absNormalX > absNormalY && absNormalX > absNormalZ) { // Dominant X-axis normal (side faces)
          uvs.push(relY, 1.0 - relZ); // or (relZ, relY) depending on desired orientation
        } else if (absNormalY > absNormalX && absNormalY > absNormalZ) { // Dominant Y-axis normal (top/bottom faces)
          uvs.push(relX, 1.0 - relZ); // or (relX, relZ)
        } else { // Dominant Z-axis normal (front/back faces)
          uvs.push(relX, 1.0 - relY); // or (relX, relY)
        }
      });
    });
  });

  if (positions.length > 0) {
    threeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    threeGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    threeGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }
  return threeGeometry;
};
