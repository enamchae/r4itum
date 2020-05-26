/**
 * @file Handles storage and operation of 4D mesh geometry.
 */

import {Vector4, Bivector4} from "./vector.js";

/**
 * Stores a set of 4D points and how they are connected. Used to define a 4D polygon mesh.
 */
export class Geometry4 {
	/**
	 * @type Vector4[]
	 */
	verts;
	/**
	 * @type number[][]
	 */
	facets;

	constructor(verts=[], facets=[]) {
		this.verts = verts;

		this.facets = facets;

		this.resetCache();
	}

	edges() {
		// TODO clear when geometry updates
		if (_(this).edgesCache) {
			return _(this).edgesCache;
		}

		const edgeMap = new Map();

		for (const vertIndexes of this.facets) {
			if (vertIndexes.length === 2) { // Edge
				pushFacets(edgeMap, vertIndexes);
			} else if (vertIndexes.length === 3) { // Face
				pushFacets(edgeMap,
					[vertIndexes[0], vertIndexes[1]],
					[vertIndexes[0], vertIndexes[2]],
					[vertIndexes[1], vertIndexes[2]],
				);
			} else if (vertIndexes.length === 4) { // Cell
				pushFacets(edgeMap,
					[vertIndexes[0], vertIndexes[1]],
					[vertIndexes[0], vertIndexes[2]],
					[vertIndexes[0], vertIndexes[3]],
					[vertIndexes[1], vertIndexes[2]],
					[vertIndexes[1], vertIndexes[3]],
					[vertIndexes[2], vertIndexes[3]],
				);
			} else { // The code has broken every bone in its body
				throw new RangeError(`Cell has ${vertIndexes.length} vertices`);
			}
		}

		const edges = [...edgeMap.values()];

		_(this).edgesCache = edges;
		return edges;
	}

	faces() {
		// TODO clear when geometry updates
		if (_(this).facesCache) {
			return _(this).facesCache;
		}

		const faceMap = new Map();

		for (const vertIndexes of this.facets) {
			if (vertIndexes.length === 3) { // Face
				pushFacets(faceMap, vertIndexes);
			} else if (vertIndexes.length === 4) { // Cell
				pushFacets(faceMap,
					[vertIndexes[0], vertIndexes[1], vertIndexes[2]],
					[vertIndexes[0], vertIndexes[2], vertIndexes[3]],
					[vertIndexes[0], vertIndexes[3], vertIndexes[1]],
					[vertIndexes[1], vertIndexes[2], vertIndexes[3]],
				);
			}
		}

		const faces = [...faceMap.values()];

		_(this).facesCache = faces;
		return faces;
	}

	// similar to `Three.EdgesGeometry` constructor
	edgesMerged(angleThreshold=0.02) {
		if (_(this).edgesMergedThreshold === angleThreshold) {
			return _(this).edgesMergedCache;
		}

		const edgesToFaces = new Map();
		const includedEdges = new Map();
		const permanentIncludedEdges = new Set();

		for (const face of this.faces()) {
			for (let i = 0; i < face.length; i++) {
				const edge = [face[i], face[(i + 1) % face.length]];
				const primitive = vertIndexArrayAsPrimitive(edge);

				if (permanentIncludedEdges.has(primitive)) continue;
				
				let faceList = edgesToFaces.get(primitive);
				if (!faceList) {
					faceList = [];
					edgesToFaces.set(primitive, faceList);
				}

				if (faceList.length === 0) {
					// Include any edge with less than 2 faces
					includedEdges.set(primitive, edge);

				// Already a face present
				} else if (faceList.length === 1) {
					// Determine if the angle between the faces is under the threshold
					const bivector0 = bivectorFromFace(this, faceList[0]).normalize();
					const bivector1 = bivectorFromFace(this, face).normalize();
					const angle = Math.acos(bivector0.dot(bivector1));

					// Angle under threshold
					if (angle < angleThreshold || Math.PI - angle < angleThreshold) {
						includedEdges.delete(primitive);
					} else {
						edgesToFaces.delete(primitive);
						permanentIncludedEdges.add(primitive);
						continue;
					}

				// Already 2 faces present
				} else if (faceList.length === 2) {
					// Include any edge with more than 2 faces
					edgesToFaces.delete(primitive);
					includedEdges.set(primitive, edge);
					permanentIncludedEdges.add(primitive);
					continue;
				}

				faceList.push(face);
			}
		}

		const edgesMerged = [...includedEdges.values()].concat(this.edges());

		_(this).edgesMergedThreshold = angleThreshold;
		_(this).edgesMergedCache = edgesMerged;
		return edgesMerged;
	}

	/**
	 * @returns {Map<number, Set<number>>}
	 */
	vertsToFacets(facets) {
		const map = new Map();

		for (let i = 0; i < facets.length; i++) {
			const facet = facets[i];

			for (const vertIndex of facet) {
				// Get the set of facets that correspond to this vertex
				let set = map.get(vertIndex);
				if (!set) {
					set = new Set();
					map.set(vertIndex, set);
				}

				set.add(i);
			}
		}

		return map;
	}

	vertsToEdges() {
		return this.vertsToFacets(this.edges());
	}

	vertsToFaces() {
		return this.vertsToFacets(this.faces());
	}

	resetCache() {
		priv.set(this, {});
		return this;
	}
}

// Alternative to private fields
const priv = new WeakMap();
const _ = key => priv.get(key);

/**
 * 
 * @param {Geometry4} geometry 
 * @param {number[]} vertIndexes 
 * @returns {Bivector4} 
 */
function bivectorFromFace(geometry, vertIndexes) {
	const dir0 = geometry.verts[vertIndexes[1]].subtract(geometry.verts[vertIndexes[0]]);
	const dir1 = geometry.verts[vertIndexes[2]].subtract(geometry.verts[vertIndexes[0]]);

	return dir0.outer(dir1);
}

/* export class Edge4 extends Array {
	constructor(vert0, vert1) {
		super();

		this.push(vert0, vert1);
	}
}

export class Face4 extends Array {
	constructor(...vertIndexes) {
		super();

		this.push(...vertIndexes);
	}

	*edges() {
		for (let i = 0; i < this.length; i++) {
			yield new Edge4(i, i % this.length);
		}
	}

	*triangles() {
		for (let i = 2; i < this.length; i++) {
			yield new Face4(0, i - 1, i);
		}
	}

	*triangulatedVertexIndexes() {
		for (let i = 2; i < this.length; i++) {
			yield 0;
			yield i - 1;
			yield i;
		}
	}
}

export class Cell4 extends Array {
	constructor(...faceIndexes) {
		super();

		this.push(...faceIndexes);
	}
} */

/**
 * Adds a vertex index array to a map, if another index array equivalent to it is not already present.
 * @param {Map<bigint, number[]>} facetMap 
 * @param {...number[]} vertIndexArrays 
 */
function pushFacets(facetMap, ...vertIndexArrays) {
	for (const vertIndexes of vertIndexArrays) {
		// Sort the array and get it as a primitive value to add it to the map
		const key = vertIndexArrayAsPrimitive(vertIndexes);

		// Ignore duplicate facets
		if (!facetMap.has(key)) {
			facetMap.set(key, vertIndexes);
		}
	}
}

/**
 * Sorts an array of vertex indices and represents it as a BigInt. The return value is used to distinguish it in a
 * set or map, like a `hashCode`.
 * @param {number[]} vertIndexes 
 * @returns {bigint}
 */
function vertIndexArrayAsPrimitive(vertIndexes) {
	const bitsPerComponent = 32n; // arbitrary; can practically be at most 53n (max safe integer for doubles)

	// Sort the array so that facets with the same vertices, but not in the same direction, are no longer distinguished
	const vertIndexesClone = vertIndexes.slice().sort((a, b) => a - b);

	let primitive = BigInt(vertIndexesClone[0]);
	for (let i = 1; i < vertIndexesClone.length; i++) {
		primitive <<= bitsPerComponent;
		primitive += (BigInt(vertIndexesClone[i]) + 1n) % bitsPerComponent; // Add 1 so different-length lists are not considered equal
	}
	
	return primitive;
}