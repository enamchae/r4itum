/**
 * @file Called directly from the page. Sets up all the necessary imports and performs other initiation work.
 * 
 * This file should not be imported from any other module.
 */

import "./ce.js";
import {qs} from "./util.js";

import * as Three from "./_libraries/three.module.js";

const main = qs("main");

import construct from "./4d/construction.js";
import {scene, Mesh4} from "./4d/objects.js";
import {Rotor4} from "./4d/vector.js";
const mesh = new Mesh4(construct.hexadecachoron());
// mesh.rot = Rotor4.planeAngle([0, 0, 0, 0, 0, 0, 1], Math.PI / 2);
scene.addObject(mesh);