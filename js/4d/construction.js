/**
 * @file Handles construction of geometries of geometric figures.
 */

import {Geometry4} from "./meshgeometry.js";
import {Vector4, Rotor4} from "./vector.js";

const {sqrt, cos, sin, sign, PI} = Math;
const REV = 2 * PI;

const sqrt1_3 = sqrt(1 / 3);

const phi = (1 + sqrt(5)) / 2;
const iphi = phi - 1; // === 1 / phi

const phiSqrt1_3 = phi * sqrt1_3;
const iphiSqrt1_3 = iphi * sqrt1_3;

function octachoronVerts(verts=[]) {
	const values = [.5, -.5];
	for (let i = 0; i < 0b10000; i++) {
		verts.push(new Vector4(
			values[0b1 & i],
			values[0b1 & i >>> 1],
			values[0b1 & i >>> 2], 
			values[0b1 & i >>> 3]));
	}

	return verts;
}

function hexadecachoronVerts(verts=[]) {
	for (let i = 0; i < 4; i++) {
		const vert0 = new Vector4();
		const vert1 = new Vector4();
		vert0[i] = 1;
		vert1[i] = -1;

		verts.push(vert0, vert1);
	}

	return verts;
}

const icosahedronCoords = [
	new Vector4(0, -1, phi),
	new Vector4(0, 1, phi),
	new Vector4(0, -1, -phi),
	new Vector4(0, 1, -phi),
	new Vector4(phi, 0, -1),
	new Vector4(phi, 0, 1),
	new Vector4(-phi, 0, -1),
	new Vector4(-phi, 0, 1),
	new Vector4(-1, phi, 0),
	new Vector4(1, phi, 0),
	new Vector4(-1, -phi, 0),
	new Vector4(1, -phi, 0),
];

const icosahedronFaceVertIndexes = [
	[0, 11, 5],
	[0, 5, 1],
	[0, 1, 7],
	[0, 7, 10],
	[0, 10, 11],
	[1, 5, 9],
	[5, 11, 4],
	[11, 10, 2],
	[10, 7, 6],
	[7, 1, 8],
	[3, 9, 4],
	[3, 4, 2],
	[3, 2, 6],
	[3, 6, 8],
	[3, 8, 9],
	[4, 9, 5],
	[2, 4, 11],
	[6, 2, 10],
	[8, 6, 7],
	[9, 8, 1],
];

/**
 * 
 * @param {Vector4[]} [verts] 
 * @param {object} [settings]
 * @param {number} [settings.scaleFactor] Factor by which all values apart from the `fixedValue` will be multiplied. No effect if `normalizing` is `true`.
 * @param {number} [settings.fixedValue] 
 * @returns Map<number, Vector4[]>
 */
function icosahedronVerts(verts=[], {
	normalizing=false,
	scaleFactor=1,
	fixedIndex=3,
	fixedValue=0,
	signMap,
}={}) {
	for (const sourceCoord of icosahedronCoords) {
		const vert = new Vector4();
		// Place the other values around the fixed value
		vert[fixedIndex > 0 ? 0 : 1] = sourceCoord[0];
		vert[fixedIndex > 1 ? 1 : 2] = sourceCoord[1];
		vert[fixedIndex > 2 ? 2 : 3] = sourceCoord[2];
		
		if (!normalizing)  {
			vert.scale(scaleFactor);
		}

		// Set the fixed value
		vert[fixedIndex] = fixedValue;

		if (normalizing) {
			vert.normalize();
		}

		verts.push(vert);

		if (signMap) {
			const index = verts.length - 1; // Index of this vertex in the verts array

			const key = signPrimitive(vert);
			const signList = signMap.get(key) || [];
			signMap.set(key, signList);
			signList.push(index);
		}
	}
	return verts;
}

function icosahedronFaces(faces=[], {
	offsetIndex=0,
	creatingCells=false,
	fixedValue=0,
}={}) {
	for (const vertIndexes of icosahedronFaceVertIndexes) {
		const facet = vertIndexes.map(index => offsetIndex + index);

		if (creatingCells) {
			facet.push(fixedValue);
		}

		faces.push(facet);
	}

	return faces;
}

// TODO figure out common properties (e.g. default orientation, edge length)
export default {
	vert() {
		return new Geometry4([new Vector4()]);
	},

	polygon(nSides=4) {
		const verts = [];
		const faces = [];

		const angleIncrement = 2 * Math.PI / nSides;
		for (let i = 0; i < nSides; i++) {
			const angle = angleIncrement * i;
			verts.push(new Vector4(cos(angle), sin(angle)));

			// Create a triangle fan
			if (i >= 2) {
				faces.push([0, i - 1, i]);
			}
		}

		if (nSides == 2) {
			faces.push([0, 1]);
		}

		return new Geometry4(verts, faces);
	},
	
	tetrahedron() {
		return new Geometry4([
			new Vector4(sqrt1_3, sqrt1_3, sqrt1_3),
			new Vector4(sqrt1_3, -sqrt1_3, -sqrt1_3),
			new Vector4(-sqrt1_3, sqrt1_3, -sqrt1_3),
			new Vector4(-sqrt1_3, -sqrt1_3, sqrt1_3),
		], [
			[0, 1, 2, 3],
		]);
	},

	hexahedron() {
		const verts = [];
		const values = [sqrt1_3, -sqrt1_3];
		for (let i = 0; i < 0b1000; i++) {
			verts.push(new Vector4(
				values[0b1 & i],
				values[0b1 & i >>> 1],
				values[0b1 & i >>> 2]));
		}

		return new Geometry4(verts, [
			// front face
			[0, 1, 2],
			[1, 2, 3],
			// back face
			[4, 5, 6],
			[5, 6, 7],
			// left face
			[1, 3, 5],
			[3, 5, 7],
			// right face
			[0, 2, 4],
			[2, 4, 6],
			// top face
			[0, 1, 4],
			[1, 4, 5],
			// bottom face
			[2, 3, 6],
			[3, 6, 7],
		]);
	},

	octahedron() {
		return new Geometry4([
			new Vector4(0, 1, 0),
			new Vector4(0, -1, 0),
			new Vector4(1, 0, 0),
			new Vector4(0, 0, 1),
			new Vector4(-1, 0, 0),
			new Vector4(0, 0, -1),
		], [
			[0, 2, 3],
			[0, 3, 4],
			[0, 4, 5],
			[0, 5, 2],
			[1, 2, 3],
			[1, 3, 4],
			[1, 4, 5],
			[1, 5, 2],
		]);
	},

	// https://github.com/thinks/platonic-solids/blob/master/thinks/platonic_solids/platonic_solids.h
	dodecahedron() {
		return new Geometry4([
			new Vector4(-sqrt1_3, sqrt1_3, -sqrt1_3),
			new Vector4(-phiSqrt1_3, 0, iphiSqrt1_3),
			new Vector4(-phiSqrt1_3, 0, -iphiSqrt1_3),
			new Vector4(-sqrt1_3, sqrt1_3, sqrt1_3),
			new Vector4(-iphiSqrt1_3, phiSqrt1_3, 0),
			new Vector4(sqrt1_3, sqrt1_3, sqrt1_3),
			new Vector4(iphiSqrt1_3, phiSqrt1_3, 0),
			new Vector4(0, iphiSqrt1_3, phiSqrt1_3),
			new Vector4(-sqrt1_3, -sqrt1_3, sqrt1_3),
			new Vector4(0, -iphiSqrt1_3, phiSqrt1_3),
			new Vector4(-sqrt1_3, -sqrt1_3, -sqrt1_3),
			new Vector4(-iphiSqrt1_3, -phiSqrt1_3, 0),
			new Vector4(0, -iphiSqrt1_3, -phiSqrt1_3),
			new Vector4(0, iphiSqrt1_3, -phiSqrt1_3),
			new Vector4(sqrt1_3, sqrt1_3, -sqrt1_3),
			new Vector4(phiSqrt1_3, 0, -iphiSqrt1_3),
			new Vector4(phiSqrt1_3, 0, iphiSqrt1_3),
			new Vector4(sqrt1_3, -sqrt1_3, sqrt1_3),
			new Vector4(iphiSqrt1_3, -phiSqrt1_3, 0),
			new Vector4(sqrt1_3, -sqrt1_3, -sqrt1_3),
		], [
			[1, 0, 2],
			[0, 1, 3],
			[0, 3, 4],
			[4, 5, 6],
			[5, 4, 3],
			[5, 3, 7],
			[8, 3, 1],
			[3, 8, 7],
			[7, 8, 9],
			[8, 10, 11],
			[10, 8, 2],
			[2, 8, 1],
			[0, 10, 2],
			[10, 0, 12],
			[12, 0, 13],
			[0, 14, 13],
			[14, 0, 6],
			[6, 0, 4],
			[15, 5, 16],
			[5, 15, 14],
			[5, 14, 6],
			[9, 5, 7],
			[5, 9, 17],
			[5, 17, 16],
			[18, 8, 11],
			[8, 18, 17],
			[8, 17, 9],
			[19, 10, 12],
			[10, 19, 11],
			[11, 19, 18],
			[13, 19, 12],
			[19, 13, 14],
			[19, 14, 15],
			[19, 17, 18],
			[17, 19, 16],
			[16, 19, 15],
		]);
	},

	// http://blog.andreaskahler.com/2009/06/creating-icosphere-mesh-in-code.html
	icosahedron() {
		return new Geometry4(
			icosahedronCoords.map(vert => vert.clone().normalize()),
			icosahedronFaceVertIndexes,
		);
	},

	latlongsphere(nLatCuts=6, nLongCuts=8) {
		const longIncrement = Math.PI * 2 / nLongCuts;

		const verts = [];
		const faces = [];

		for (let latCut = 0; latCut < nLatCuts; latCut++) {
			if (latCut === 0) {
				// Bottom pole
				verts.push(new Vector4(0, -1, 0));
				continue;
			} else if (latCut === nLatCuts - 1) {
				// Top pole
				verts.push(new Vector4(0, 1, 0));
				continue;
			}

			const offset = verts.length;

			// const y = 2 * latCut / (nLatCuts - 1) - 1; // evenly spaced cuts
			const y = sin(Math.PI * latCut / (nLatCuts - 1) - Math.PI / 2); // equal arc lengths
			const radius = sqrt(1 - y ** 2);

			for (let longCut = 0; longCut < nLongCuts; longCut++) {
				const angle = longIncrement * longCut;

				verts.push(new Vector4(radius * cos(angle), y, radius * sin(angle)));

				// Index of the vertex adjacent to the current one on this longitude cut
				const adjacentVert = (longCut + 1) % nLongCuts;

				if (latCut === nLatCuts - 2) {
					// Top triangle loop
					faces.push([offset + longCut, offset + adjacentVert, offset + nLongCuts]);
					continue;
				}

				if (latCut === 1) {
					// Bottom triangle loop
					faces.push([0, offset + longCut, offset + adjacentVert]);
				}
				// Triangle strip for each pair of longitude cuts
				// .  .  .  . |.  .
				// 01 1  .  01|1  .
				// 0  01 .  0 |01 .
				// .  .  .  . |.  .
				//      prime meridian
				faces.push(
					[offset + longCut, offset + adjacentVert, offset + longCut + nLongCuts],
					[offset + adjacentVert, offset + adjacentVert + nLongCuts, offset + longCut + nLongCuts],
				);
			}
		}

		return new Geometry4(verts, faces);
	},

	mobiusStrip(nStrips=16, width=1) {
		const verts = [];
		const faces = [];
		
		const angleIncrement = 2 * Math.PI / nStrips;

		for (let i = 0; i < nStrips; i++) {
			const angle = angleIncrement * i; // Angle around the circle where the points are offset
			const angleTurn = angle / 2; // Angle by which the pair of points is tilted

			const vertTop = new Vector4(0, width / 2, 0);
			const vertBottom = new Vector4(0, -width / 2, 0);

			const rotor = Rotor4.planeAngle([cos(angle), 0, 0, -sin(angle), 0, 0], angleTurn);
			const offset = new Vector4(cos(angle), 0, sin(angle));

			verts.push(vertTop.multRotor(rotor).add(offset), vertBottom.multRotor(rotor).add(offset));

			// Make triangle strip
			if (i === nStrips - 1) {
				faces.push(
					[2 * i, 2 * i + 1, 0],
					[2 * i, 0, 1],
				);
			} else {
				faces.push(
					[2 * i, 2 * i + 1, 2 * i + 2],
					[2 * i + 1, 2 * i + 2, 2 * i + 3],
				);
			}
		}

		return new Geometry4(verts, faces);
	},

	// https://en.wikipedia.org/wiki/5-cell#Construction
	pentachoron() {
		const s = Math.SQRT1_2;
		const f = sqrt(1 / 5);

		return new Geometry4([
			new Vector4(s, -f, s, s).normalize(),
			new Vector4(-s, -f, s, -s).normalize(),
			new Vector4(-s, -f, -s, s).normalize(),
			new Vector4(s, -f, -s, -s).normalize(),
			new Vector4(0, sqrt(5) - f, 0, 0).normalize(),
		], [
			[0, 1, 2, 3],
			[0, 1, 2, 4],
			[0, 1, 3, 4],
			[0, 2, 3, 4],
			[1, 2, 3, 4],
		]);
	},

	octachoron() {
		// General form of cube

		const verts = [];
		octachoronVerts(verts);

		const faces = [];

		const cellIndexes = [
			[0, 2, 4, 6, 8, 10, 12, 14], // right
			[1, 3, 5, 7, 9, 11, 13, 15], // left
			[0, 1, 4, 5, 8, 9, 12, 13], // top
			[2, 3, 6, 7, 10, 11, 14, 15], // bottom
			[0, 1, 2, 3, 8, 9, 10, 11], // front
			[4, 5, 6, 7, 12, 13, 14, 15], // back
			[0, 1, 2, 3, 4, 5, 6, 7], // kata
			[8, 9, 10, 11, 12, 13, 14, 15], // ana
		];

		for (const ci of cellIndexes) {
			// Triangulations of each cube
			faces.push(
				[ci[0], ci[1], ci[2], ci[4]],
				[ci[1], ci[2], ci[3], ci[7]],
				[ci[1], ci[4], ci[5], ci[7]],
				[ci[2], ci[4], ci[6], ci[7]],

				[ci[1], ci[2], ci[4], ci[7]], // middle tetrahedron
			);
		}

		return new Geometry4(verts, faces);
	},

	hexadecachoron() {
		// General form of orthoplex
		// Vertices are permutations of (±1, 0, 0, 0) (2 for each axis)
		// All vertices are connected, apart from opposite vertices which lie on the same axis
		return new Geometry4(hexadecachoronVerts(), [
			[0, 2, 4, 6],
			[0, 2, 4, 7],
			[0, 2, 5, 6],
			[0, 2, 5, 7],
			[0, 3, 4, 6],
			[0, 3, 4, 7],
			[0, 3, 5, 6],
			[0, 3, 5, 7],
			[1, 2, 4, 6],
			[1, 2, 4, 7],
			[1, 2, 5, 6],
			[1, 2, 5, 7],
			[1, 3, 4, 6],
			[1, 3, 4, 7],
			[1, 3, 5, 6],
			[1, 3, 5, 7],
		]);
	},

	icositetrachoron() {
		const verts = [];

		// [0, 8)
		// permutations of (±1, 0, 0, 0)
		hexadecachoronVerts(verts);

		// [8, 24)
		// (±.5, ±.5, ±.5, ±.5)
		// 08  + + + +
		// 09  − + + +
		// 10  + − + +
		// 11  − − + +
		// 12  + + − +
		// 13  − + − +
		// 14  + − − +
		// 15  − − − +
		// 16  + + + −
		// 17  − + + −
		// 18  + − + −
		// 19  − − + −
		// 20  + + − −
		// 21  − + − −
		// 22  + − − −
		// 23  − − − −
		//     ⋮
		octachoronVerts(verts);

		const faces = [];

		// The octahedron's vertices are determined as follows:
		// [0]  1 pole on a (±1, 0, 0, 0)-permutation vertex
		// [1]  1 pole on a different (±1, 0, 0, 0)-permutation vertex that is not the opposite of [0]
		// [2:6]  A (±.5, ±.5, ±.5, ±.5) point such that:
		//    • The point has the same sign as [0] for the axis that [0] covers (e.g. the Z axis, if (0, 0, ±1, 0))
		//    • The point has the same sign as [1] for the axis that [1] covers
		//    • For the axes not covered, the signs can vary
		//			(e.g. if [0] is (0, 0, 0, −1)
		//				 and [1] is (1, 0, 0,  0), then this must be (.5, ±.5, ±.5, −.5))
		const cellIndexes = [
			[0, 2, 8, 12, 16, 20], // +X, +Y
			[0, 3, 10, 14, 18, 22], // +X, −Y
			[0, 4, 8, 10, 16, 18], // +X, +Z
			[0, 5, 12, 14, 20, 22], // +X, −Z
			[0, 6, 8, 10, 12, 14], // +X, +W
			[0, 7, 16, 18, 20, 22], // +X, −W
			[1, 2, 9, 13, 17, 21], // −X, +Y
			[1, 3, 11, 15, 19, 23], // −X, −Y
			[1, 4, 9, 11, 16, 18], // −X, +Z
			[1, 5, 13, 15, 21, 23], // −X, −Z
			[1, 6, 9, 11, 13, 15], // −X, +W
			[1, 7, 17, 19, 21, 23], // −X, −W

			[2, 4, 8, 9, 16, 17], // +Y, +Z
			[2, 5, 12, 13, 20, 21], // +Y, −Z
			[2, 6, 8, 9, 12, 13], // +Y, +W
			[2, 7, 16, 17, 20, 21], // +Y, −W
			[3, 4, 10, 11, 18, 19], // −Y, +Z
			[3, 5, 14, 15, 22, 23], // −Y, −Z
			[3, 6, 10, 11, 14, 15], // −Y, +W
			[3, 7, 18, 19, 22, 23], // −Y, −W

			[4, 6, 8, 9, 10, 11], // +Z, +W
			[4, 7, 16, 17, 18, 19], // +Z, −W
			[5, 6, 12, 13, 14, 15], // −Z, +W
			[5, 7, 20, 21, 22, 23], // −Z, −W
		];

		for (const ci of cellIndexes) {
			faces.push(
				[ci[0], ci[2], ci[3], ci[4]],
				[ci[0], ci[2], ci[3], ci[5]],
				[ci[1], ci[2], ci[3], ci[4]],
				[ci[1], ci[2], ci[3], ci[5]],
			);
		}

		return new Geometry4(verts, faces);
	},

	hecatonicosachoron() {
		return new Geometry4();
	},
	
	// https://en.wikipedia.org/wiki/600-cell
	// http://eusebeia.dyndns.org/4d/600-cell
	hexacosichoron() {
		const verts = [];
		const faces = [];

		const signMap = new Map();

		// All (±1, 0, 0, 0)-permutation vertices (16-cell vertices) are part of the solid
		{
			const values = [1, -1];
			for (let i = 0; i < 4; i++) {
				for (let j = 0; j < 2; j++) {
					const vert = new Vector4();
					vert[i] = values[j];
		
					// Assuming the golden ratio φ (phi)
		
					// For each 16-cell vertex, there are 12 vertices that are φ⁻¹ units away from it
					// These vertices can form an icosahedron (edge length φ⁻¹) with each other
		
					// For the axis that the 16-cell vertex covers, the coordinate is φ / 2, with the same sign as the 16-cell vertex
					// (e.g. if the 16-cell vertex is (0, 0, −1, 0), then the icosahedron's vertex is (<X>, <Y>, −φ / 2, <W>))
		
					// The remaining icosahedral vertices are made by filling the remaining axes with ±1 / 2, ±φ⁻¹ / 2, and 0 in the same way
					// as the icosahedron construction pattern
		
					// All icosahedral vertices happen to be the even permutations of (±φ, ±1, ±φ⁻¹, 0) / 2
		
					verts.push(vert);
					const offsetIndex = verts.length;
					icosahedronVerts(verts, {
						scaleFactor: iphi / 2,
						
						fixedIndex: i,
						fixedValue: sign(values[j]) * phi / 2,

						signMap,
					});
					icosahedronFaces(faces, {
						creatingCells: true,
		
						offsetIndex, // Icosahedron vert indexes start at `offsetIndex`
						fixedValue: offsetIndex - 1, // The 16-cell vert index precedes them; `offsetIndex - 1`
					});
				}
			}
		}
	
		// All (±.5, ±.5, ±.5, ±.5) vertices (tesseract vertices) are part of the solid
		{
			// octachoronVerts(verts);
			const values = [.5, -.5];

			// Dependent on how the vertices were ordered when being added to the array
			const cellConnections = [
				[0, 1, 2],
				[3, 4, 5],
				[6, 7, 8],
				[9, 10, 11],

				[0, 8, ],
			];

			for (let i = 0; i < 0b10000; i++) {
				const vert = new Vector4(
					values[0b1 & i],
					values[0b1 & i >>> 1],
					values[0b1 & i >>> 2],
					values[0b1 & i >>> 3]);

				const index = verts.push(vert) - 1; // Index of this new vertex in the vertices array

				// For each tesseract vertex, there are also 12 vertices that are φ⁻¹ units away from it
				// They are the vertices that are part of the previously formed icosahedra, but whose signs match to it for every axis

				// The vertices that connect to an icosahedral vertex can be determined as follows:
				//    0. 16-cell or tesseract vertices as described above (3 vertices)
				//    1. 0 is fixed to the same axis, the other values rotate into each other's axes (2 vertices) (e.g. (φ, 1, φ⁻¹, 0) and (φ⁻¹, φ, 1, 0) and (1, φ⁻¹, φ, 0))
				//    2. φ is fixed to the same axis, the other values rotate into each other's axes (2 vertices) (e.g. (φ, 1, φ⁻¹, 0) and (φ, 0, 1, φ⁻¹))
				//    3. Same as 2., but the value in the other vertex in the axis occupied by the 0 in this vertex is negated (2 vertices) (e.g. (φ, 1, φ⁻¹, 0) and (φ, 0, 1, −φ⁻¹))
				//    4. 1 and φ switch axes, and 0 and φ⁻¹ switch axes (1 vertex) (e.g. (φ, 1, φ⁻¹, 0) and (1, φ, 0, φ⁻¹))
				//    5. Same as 4., but the value in the other vertex in the axis occupied by the 0 in this vertex is negated (1 vertex)

				const connectedVerts = [];

				for (let j = 0; j < 4; j++) {
					const vertClone = vert.clone();
					vertClone[j] = 0;
					const signs = signPrimitive(vertClone);
					const signMatches = signMap.get(signs);

					connectedVerts.push(...signMatches);
				}

				// for (const vertIndexes of cellConnections) {
				// 	faces.push([
				// 		connectedVerts[vertIndexes[0]],
				// 		connectedVerts[vertIndexes[1]],
				// 		connectedVerts[vertIndexes[2]],
				// 		index,
				// 	]);
				// }

				// console.log(connectedVerts.map(i => verts[i]));
			}
		}

		// console.log(faces.length);

		return new Geometry4(verts, faces);
	},

	spherinder() {

	},

	altlatlongsphere(nAltCuts=4, nLatCuts=4, nLongCuts=4) {

	},

	kleinBottle(nStrips=12, nLongCuts=4, radius=0.3) {
		const verts = [];
		const faces = [];

		const plane = [1, 0, 0, 0, 0, 0];
		for (let i = 0; i < nStrips; i++) {
			const time = i / nStrips;

			// Arbitrary parameterization of ring offsets
			const offset = new Vector4(
				time > 0.5 ? -(sin(REV * time) ** 2) : 0,
				sin(REV * (time - 0.1)),
				0,
				-(sin(PI * time) ** 2),
			);
			const angle = PI * (time > 0.75 ? cos(REV * time) ** 2 : 0);

			const rotor = Rotor4.planeAngle(plane, angle);

			const vertIndexOffset = verts.length;
			// Generate this ring's vertices
			const ringVerts = [];
			for (let nLongCut = 0; nLongCut < nLongCuts; nLongCut++) {
				const polygonAngle = REV * (nLongCut / nLongCuts);
				const ringVert = new Vector4(radius * cos(polygonAngle), 0, radius * sin(polygonAngle), 0);
				ringVerts.push(ringVert.multRotor(rotor).add(offset));

				// Index of the vertex adjacent to the current one on this longitude cut
				const adjacentVertIndex = (nLongCut + 1) % nLongCuts;

				if (i !== nStrips - 1) {
					// Make a triangle strip
					faces.push([
						vertIndexOffset + nLongCut,
						vertIndexOffset + adjacentVertIndex,
						vertIndexOffset + nLongCut + nLongCuts,
					], [
						vertIndexOffset + adjacentVertIndex,
						vertIndexOffset + adjacentVertIndex + nLongCuts,
						vertIndexOffset + nLongCut + nLongCuts,
					]);

					continue;
				}

				// This ring has the opposite orientation as the starting ring
				// Get the starting ring indexes in reverse order
				faces.push([
					vertIndexOffset + nLongCut,
					vertIndexOffset + adjacentVertIndex,
					mod(-nLongCut + 1, nLongCuts),
				], [
					vertIndexOffset + adjacentVertIndex,
					mod(-adjacentVertIndex + 1, nLongCuts),
					mod(-nLongCut + 1, nLongCuts),
				]);
			}

			verts.push(...ringVerts);
			// faces.push([i, (i + 1) % nStrips]);
		}
		return new Geometry4(verts, faces);
	},

	testGeometry: {
		axes: new Geometry4([
			new Vector4(1, 0, 0, 0),
			new Vector4(0, 1, 0, 0),
			new Vector4(0, 1.2, 0, 0),
			new Vector4(0, 0, 1, 0),
			new Vector4(0, 0, 1.2, 0),
			new Vector4(0, 0, 1.4, 0),
			new Vector4(0, 0, 0, 1),
			new Vector4(0, 0, 0, 1.2),
			new Vector4(0, 0, 0, 1.4),
			new Vector4(0, 0, 0, 1.6),
		]),
	},
};

function mod(a, b) {
	return (a % b + b) % b;
}

function signPrimitive(vector) {
	let primitive = 0;
	for (const component of vector) {
		primitive <<= 2;
		primitive += sign(component) + 1;
	}
	return primitive;
}