/**
 * @file Handles construction of geometries of geometric figures.
 */

import {Geometry4} from "./meshgeometry.js";
import {Vector4, Rotor4} from "./vector.js";

const phi = (1 + Math.sqrt(5)) / 2;
const iphi = phi - 1; // === 1 / phi

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
            new Vector4(2/3, 2/3, 2/3),
            new Vector4(2/3, -2/3, -2/3),
            new Vector4(-2/3, 2/3, -2/3),
            new Vector4(-2/3, -2/3, 2/3),
        ], [
            [0, 1, 2, 3],
        ]);
    },

    hexahedron() {
        const verts = [];
        const values = [1, -1];
        for (let i = 0; i < 0b1000; i++) {
            verts.push(new Vector4(
                values[0b1 & i],
                values[(0b10 & i) >>> 1],
                values[(0b100 & i) >>> 2]));
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
            new Vector4(-1, 1, -1),
            new Vector4(-phi, 0, iphi),
            new Vector4(-phi, 0, -iphi),
            new Vector4(-1, 1, 1),
            new Vector4(-iphi, phi, 0),
            new Vector4(1, 1, 1),
            new Vector4(iphi, phi, 0),
            new Vector4(0, iphi, phi),
            new Vector4(-1, -1, 1),
            new Vector4(0, -iphi, phi),
            new Vector4(-1, -1, -1),
            new Vector4(-iphi, -phi, 0),
            new Vector4(0, -iphi, -phi),
            new Vector4(0, iphi, -phi),
            new Vector4(1, 1, -1),
            new Vector4(phi, 0, -iphi),
            new Vector4(phi, 0, iphi),
            new Vector4(1, -1, 1),
            new Vector4(iphi, -phi, 0),
            new Vector4(1, -1, -1),
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

    mobiusStrip(nStrips=16) {
        // const verts = [];
        // const faces = [];

        // const angleIncrement = 2 * Math.PI / nStrips;

        // for (let i = 0; i < nStrips; i++) {
        //     const angle = angleIncrement * i;
        //     const angleTurn = angle / 2;

        //     let vertTop = new Vector4(Math.cos(angle), .5, Math.sin(angle));
        //     let vertBottom = new Vector4(Math.cos(angle), -.5, Math.sin(angle));
        // }

        // return new Geometry4(verts, faces);
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
        const verts = [];
        const values = [1, -1];
        for (let i = 0; i < 0b10000; i++) {
            verts.push(new Vector4(
                values[0b1 & i],
                values[(0b10 & i) >>> 1],
                values[(0b100 & i) >>> 2], 
                values[(0b1000 & i) >>> 3]));
        }

        // TODO
        return new Geometry4(verts, [
            // kata cell
            [0, 1, 2, 4],
            [1, 2, 3, 7],
            [1, 4, 5, 7],
            [2, 4, 6, 7],

            // ana cell
            [8, 9, 10, 12],
            [9, 10, 11, 15],
            [9, 12, 13, 15],
            [10, 12, 14, 15],
        ]);
    },

    hexadecachoron() {

    },

    icositetrachoron() {

    },

    hecatonicosachoron() {

    },

    icospherinder() {

    },

    kleinBottle() {

    },

    testGeometry: {
        cube: new Geometry4([
            new Vector4(0, 0, 0, 0),
            new Vector4(1, 0, 0, 0),
            new Vector4(0, 1, 0, 0),
            new Vector4(1, 1, 0, 0),
            new Vector4(0, 0, 1, 0),
            new Vector4(1, 0, 1, 0),
            new Vector4(0, 1, 1, 0),
            new Vector4(1, 1, 1, 0),
        // ], [
    	// 	[0, 1, 2],
    	// 	[3, 1, 2],
    
    	// 	[0, ],
        ]),
    
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