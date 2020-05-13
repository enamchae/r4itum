/**
 * @file Called directly from the page. Sets up all the necessary imports and performs other initiation work.
 * 
 * This file should not be imported from any other module.
 */

import "./ce.js";
import {qs} from "./util.js";

const main = qs("main");

import construct from "./4d/construction.js";
import {Mesh4} from "./4d/objects.js";
import {Vector4, Rotor4} from "./4d/vector.js";

import {scene} from "./interface.js";

const meshes = [
	new Mesh4(construct.octachoron()),
	new Mesh4(construct.pentachoron()).setPos(new Vector4(-2, -2, 2, 0)),
	new Mesh4(construct.pentachoron()).setPos(new Vector4(2, -2, 2, 0)),
	new Mesh4(construct.pentachoron()).setPos(new Vector4(-2, 2, 2, 0)),
	new Mesh4(construct.pentachoron()).setPos(new Vector4(2, 2, 2, 0)),
	new Mesh4(construct.octachoron()).setPos(new Vector4(0, 0, 10, 0)),
	// new Mesh4(construct.mobiusStrip(12)),
];
// mesh.rot = Rotor4.planeAngle([0, 0, 0, 0, 0, 0, 0], Math.PI / 2);
scene.addObject(...meshes);