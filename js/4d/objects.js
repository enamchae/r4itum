/**
 * @file Handles 4D objects and their properties, along with the world itself's.
 */

import {Vector4, Rotor4} from "./vector.js";
import {Geometry4} from "./meshgeometry.js";
import {projectVector4} from "./projection.js";
import * as Three from "../_libraries/three.module.js";
import * as ThreeMeshLine from "../_libraries/threeMeshLine.js";

// const wireframeMat = new Three.LineBasicMaterial({color: 0x000000, linewidth: 10});

const vertGeometry = new Three.SphereBufferGeometry(.03, 4, 2);
const vertMat = new Three.MeshLambertMaterial({color: 0xFFCC44});

/**
 * Objects and operations for the 4D scene.
 */
export const scene = {
	/**
	 * @type Set<Object4>
	 */
	objects: new Set(),

	addObject(...objects) {
		for (const object of objects) {
			this.objects.add(object);
		}
	},
	
	/**
	 * Objects that cannot moved or selected.
	 * @type Set<Object4>
	 */
	objectsReference: new Set(),
	addObjectReference(...objects) {
		for (const object of objects) {
			this.objectsReference.add(object);
		}
	},

	*objectsAll() {
		yield* this.objects;
		yield* this.objectsReference;
    },
    
	/**
	 * Basis directions defined (arbitrarily) for the world as vectors. They can be used to define the *absolute* orientation for
	 * directional objects (i.e. cameras and directional lights)
	 */
	basis: {
		forward: new Vector4(0, 0, 0, -1),
		up: new Vector4(0, 1, 0, 0),
		over: new Vector4(0, 0, 1, 0),
	},
};

export class Object4 {
	static ViewportStates = Object.freeze({
		DEFAULT: 0,
		SELECTED: 1,
		SELECTED_PRIMARY: 2,
	});

	static materials = [ // Indexed by `Object4.ViewportStates`
		[0xFFFFFF, 0x777777],
		[0xFFEEDD, 0xFF7700],
		[0xFFEEDD, 0xFFAA00],
	].map(colors => ({
			mesh: new Three.MeshBasicMaterial({color: colors[0], transparent: true, opacity: .25, depthWrite: false, side: Three.DoubleSide}),
			wire: new ThreeMeshLine.MeshLineMaterial({color: colors[1], /* sizeAttenuation: 0, */ lineWidth: 1}),
		}));

	/**
	 * Position of this object.
	 * @type Vector4
	 */
	pos;
	/**
	 * Rotation of this object.
	 * @type Rotor4
	 */
	rot;
	/**
	 * Scale of this object.
	 * @type Vector4
	 */
	scl;
	
	/**
	 * TODO
	 * @type boolean
	 */
	hidden = false;

	/**
	 * Whether or not this object's properties has been updated and needs to be updated in the render.
	 * TODO
	 * @type boolean
	 */
	needsUpdate = false;

	constructor(pos=new Vector4(), rot=new Rotor4(), scl=new Vector4(1, 1, 1, 1)) {
		this.pos = pos;
		this.rot = rot;
		this.scl = scl;
	}

	translateForward(distance) {
		this.pos = this.pos.add(scene.basis.forward.multRotor(this.rot).normalize().multScalar(distance));
	}
}

export class Camera4 extends Object4 {
	usingPerspective = true;

	fovAngle = Math.PI / 2;
	radius = 1;

	constructor(pos, rot, options={}) {
		super(pos, rot);

		Object.assign(this, options);
	}

}

export class Mesh4 extends Object4 {
	/**
	 * @type Geometry4
	 */
	geometry;

	constructor(geometry, pos, rot, scl) {
		super(pos, rot, scl);

		this.geometry = geometry;

		// this.wireframe3 = new Three.LineSegments(new Three.EdgesGeometry(this.mesh3.geometry), wireframeMat);
		// this.updateWireframe();
	}

	transformedVerts() {
		return this.geometry.verts.map(vert => {
			return vert.multComponents(this.scl).multRotor(this.rot).add(this.pos);
		});
	}
}

export class Line4 extends Object4 {
	constructor(points, material) {
		super();
	}
}