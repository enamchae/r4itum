/**
 * @file Handles construction of geometries of geometric figures.
 */

import {Geometry4} from "./meshgeometry.js";
import {Vector4, Rotor4} from "./vector.js";

const sqrt1_3 = Math.sqrt(1 / 3);

const phi = (1 + Math.sqrt(5)) / 2;
const iphi = phi - 1; // === 1 / phi

const phiSqrt1_3 = phi * sqrt1_3;
const iphiSqrt1_3 = iphi * sqrt1_3;

// unsure how these will be called yet
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
			verts.push(new Vector4(Math.cos(angle), Math.sin(angle)));

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
		return new Geometry4([
			new Vector4(-1, phi, 0),
			new Vector4(1, phi, 0),
			new Vector4(-1, -phi, 0),
			new Vector4(1, -phi, 0),
			new Vector4(0, -1, phi),
			new Vector4(0, 1, phi),
			new Vector4(0, -1, -phi),
			new Vector4(0, 1, -phi),
			new Vector4(phi, 0, -1),
			new Vector4(phi, 0, 1),
			new Vector4(-phi, 0, -1),
			new Vector4(-phi, 0, 1),
		], [
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
		]);
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
			const y = Math.sin(Math.PI * latCut / (nLatCuts - 1) - Math.PI / 2); // equal arc lengths
			const radius = Math.sqrt(1 - y ** 2);

			for (let longCut = 0; longCut < nLongCuts; longCut++) {
				const angle = longIncrement * longCut;

				verts.push(new Vector4(radius * Math.cos(angle), y, radius * Math.sin(angle)));

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

			const rotor = Rotor4.planeAngle([Math.cos(angle), 0, 0, -Math.sin(angle), 0, 0], angleTurn);
			const offset = new Vector4(Math.cos(angle), 0, Math.sin(angle));

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
		const f = Math.sqrt(1 / 5);

		return new Geometry4([
			new Vector4(s, s, s, -f),
			new Vector4(-s, -s, s, -f),
			new Vector4(-s, s, -s, -f),
			new Vector4(s, -s, -s, -f),
			new Vector4(0, 0, 0, Math.sqrt(5) - f),
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
		const values = [.5, -.5];
		for (let i = 0; i < 0b10000; i++) {
			verts.push(new Vector4(
				values[0b1 & i],
				values[0b1 & i >>> 1],
				values[0b1 & i >>> 2], 
				values[0b1 & i >>> 3]));
		}

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
		return new Geometry4([
			new Vector4(-1, 0, 0, 0),
			new Vector4(1, 0, 0, 0),
			new Vector4(0, -1, 0, 0),
			new Vector4(0, 1, 0, 0),
			new Vector4(0, 0, -1, 0),
			new Vector4(0, 0, 1, 0),
			new Vector4(0, 0, 0, -1),
			new Vector4(0, 0, 0, 1),
		], [
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
		for (let i = 0; i < 4; i++) {
			const vert0 = new Vector4();
			const vert1 = new Vector4();
			vert0[i] = 1;
			vert1[i] = -1;

			verts.push(vert0, vert1);
		}

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
		const values = [.5, -.5];
		for (let i = 0; i < 0b10000; i++) {
			verts.push(new Vector4(
				values[0b1 & i],
				values[(0b10 & i) >>> 1],
				values[(0b100 & i) >>> 2], 
				values[(0b1000 & i) >>> 3]));
		}

		const faces = [];

		// The octahedron's vertices are determined as follows:
		// [0]  1 pole on a (±1, 0, 0, 0)-permutation vertex
		// [1]  1 pole on a different (±1, 0, 0, 0)-permutation vertex that is not the opposite of [0]
		// [2:6]  A (±.5, ±.5, ±.5, ±.5) point such that:
		//    • The point has the same sign as [0] for the axis that [0] covers
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

	},
	
	hexacosichoron() {
		
	},

	spherinder() {

	},

	altlatlongsphere(nAltCuts=4, nLatCuts=4, nLongCuts=4) {

	},

	kleinBottle() {

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