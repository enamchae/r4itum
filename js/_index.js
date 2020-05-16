/**
 * @file Called directly from the page. Sets up all the necessary imports and performs other initiation work.
 * 
 * This file should not be imported from any other module.
 */

import "./ce.js";
import {qs} from "./util.js";

const main = qs("main");

import construct from "./4d/construction.js";
import {Mesh4, PlaneRef4, Axis4} from "./4d/objects.js";
import {Vector4, Rotor4} from "./4d/vector.js";

import {scene, Viewport} from "./interface.js";
import tiedActions from "./interfaceties.js";

const meshes = [
	new Mesh4(construct.icositetrachoron()),
	// new Mesh4(construct.pentachoron()).setPos(new Vector4(-2, -2, 2, 0)),
	// new Mesh4(construct.pentachoron()).setPos(new Vector4(2, 2, 2, 0)),
	// new Mesh4(construct.hexahedron()),
	// new Mesh4(construct.tetrahedron()).setPos(new Vector4(-2, -2, 2, 0)),
	// new Mesh4(construct.tetrahedron()).setPos(new Vector4(2, 2, 2, 0)),
];

for (let i = 0; i < 2; i++) {
	meshes.push(new Mesh4(construct.pentachoron()).setPos(new Vector4(...new Array(4).fill(0).map(() => 10 * Math.random() - 5))));
}

tiedActions.addObject(...meshes);

// scene.addObjectReference(new PlaneRef4(0, 3, 10));
const axisColors = [
	// {hsv(n * 360° / 4, 1, 1) | n ∈ ℤ}
	0xFF0000, // X
	0x80FF00, // Y
	0x00FFFF, // Z
	0x8000FF, // W
];
for (let i = 0; i < 4; i++) {
	scene.addObjectReference(new Axis4(i, 10, axisColors[i]));
}
Viewport.allNeedRerender = true;