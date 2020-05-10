/**
 * @file Handles storage and operation of 4D mesh geometry.
 */

import {Vector4} from "./vector.js";

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
	
		priv.set(this, {
			edgesCache: null,
			facesCache: null,
		});
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
}

// Alternative to private fields
const priv = new WeakMap();
const _ = key => priv.get(key);

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
	vertIndexes.sort((a, b) => a - b);

	let primitive = BigInt(vertIndexes[0]);
	for (let i = 1; i < vertIndexes.length; i++) {
		primitive <<= bitsPerComponent;
		primitive += (BigInt(vertIndexes[i]) + 1n) % bitsPerComponent; // Add 1 so different-length lists are not considered equal
	}
	
	return primitive;
}