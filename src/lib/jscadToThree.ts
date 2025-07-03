import * as THREE from 'three';
import { geom3, poly3 } from '@jscad/modeling').geometries; // Import types from JSCAD
import { vec3 } from '@jscad/modeling').maths; // Import vec3 type

// Helper function to triangulate a polygon (assuming convex polygon)
// A simple fan triangulation from the first vertex.
const triangulatePolygon = (polygon: poly3): Array<Array<vec3>> => {
  const triangles: Array<Array<vec3>> = [];
  if (polygon.vertices.length < 3) {
    return triangles; // Not a valid polygon for triangulation
  }
  // Assuming vertices are ordered (e.g., counter-clockwise)
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
  const uvs: number[] = []; // Basic UVs, likely incorrect for complex shapes

  jscadPolygons.forEach(polygon => {
    const triangles = triangulatePolygon(polygon);

    triangles.forEach(triangle => {
      // Assuming triangle vertices are vec3 [x, y, z]
      const v0 = triangle[0];
      const v1 = triangle[1];
      const v2 = triangle[2];

      // Add positions
      positions.push(...v0, ...v1, ...v2);

      // Calculate normal for this triangle (flat shading)
      // For smooth shading, normals would need to be averaged at vertices.
      // JSCAD polygons should have a plane, from which we can get a normal.
      // However, toPolygons might not directly give per-polygon normal in a way Three.js expects per-vertex.
      // Let's try to use the plane normal if available, or calculate.
      let normal: vec3;
      if (polygon.plane) { // poly3 may not have a plane property directly, depends on internal structure.
                           // geom3.toPolygons returns an array of polygons, each polygon is an array of vertices.
                           // The normal is typically associated with the plane of the polygon.
                           // Let's assume for now the polygons from toPolygons are simple arrays of vertices.
                           // We might need to access normals differently if JSCAD stores them per polygon.
        // For now, calculate face normal.
        const pA = new THREE.Vector3().fromArray(v0);
        const pB = new THREE.Vector3().fromArray(v1);
        const pC = new THREE.Vector3().fromArray(v2);
        const cb = new THREE.Vector3().subVectors(pC, pB);
        const ab = new THREE.Vector3().subVectors(pA, pB);
        const faceNormal = cb.cross(ab).normalize();
        normal = faceNormal.toArray() as vec3;

      } else { // Fallback if no plane normal easily accessible
        const pA = new THREE.Vector3().fromArray(v0);
        const pB = new THREE.Vector3().fromArray(v1);
        const pC = new THREE.Vector3().fromArray(v2);
        const cb = new THREE.Vector3().subVectors(pC, pB);
        const ab = new THREE.Vector3().subVectors(pA, pB);
        const faceNormal = cb.cross(ab).normalize();
        normal = faceNormal.toArray() as vec3;
      }

      normals.push(...normal, ...normal, ...normal); // Apply same normal to all 3 vertices of the triangle

      // Basic/Placeholder UVs (e.g., using X/Y of vertices, not generally correct)
      // This is highly dependent on the geometry and desired mapping.
      // For a cuboid, one could map each face appropriately.
      // For complex CSG results, UVs are very hard.
      uvs.push(v0[0], v0[1]); // U = x, V = y (example)
      uvs.push(v1[0], v1[1]);
      uvs.push(v2[0], v2[1]);
    });
  });

  threeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  threeGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  threeGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  // threeGeometry.computeVertexNormals(); // Alternative if per-vertex normals are desired and faces are correctly defined
                                        // But our manual calculation above is for flat shading.
                                        // If JSCAD provides reliable per-polygon normals, using those would be better.
  return threeGeometry;
};
