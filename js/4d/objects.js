/**
 * @file Handles 4D objects and their properties, along with the world itself's.
 */

import {Vector4, Rotor4} from "./vector.js";
import {Geometry4} from "./meshgeometry.js";

// const wireframeMat = new Three.LineBasicMaterial({color: 0x000000, linewidth: 10});

/**
 * Basis directions defined (arbitrarily) for the world as vectors. They can be used to define the *absolute* orientation for
 * directional objects (i.e. cameras and directional lights)
 */
const basis = {
    forward: new Vector4(0, 0, 0, -1),
    up: new Vector4(0, 1, 0, 0),
    over: new Vector4(0, 0, 1, 0),
};

/**
 * Objects and operations for the 4D scene.
 */
export class Scene4 {
	/**
	 * @type Set<Object4>
	 */
	objects = new Set();
	
	/**
	 * Objects that cannot moved or selected.
	 * @type Set<Object4>
	 */
	objectsReference = new Set();

	addObject(...objects) {
		for (const object of objects) {
            this.objects.add(object);
            object.scene = this;
        }
        
        return this;
    }
    removeObject(...objects) {
        for (const object of objects) {
            this.objects.delete(object);
            object.scene = null;
        }

        return this;
    }

	addObjectReference(...objects) {
		for (const object of objects) {
			this.objectsReference.add(object);
            object.scene = this;
        }
        
        return this;
	}

	*objectsAll() {
		yield* this.objects;
		yield* this.objectsReference;
    }
};

export class Object4 {
    /**
     * @type Scene4
     */
    scene = null;

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
        
        priv.set(this, {});
    }
    
    localForward() {
        return basis.forward.multRotor(this.rot);
    }
    
    localUp() {
        return basis.up.multRotor(this.rot);
    }
    
    localOver() {
        return basis.over.multRotor(this.rot);
	}
	
	/**
	 * @returns Vector4[]
	 */
	projectionMatrix() {
		// The camera is facing from `cameraOrigin` to `cameraForward`
		const cameraOrigin = this.pos;
		const cameraForward = this.localForward();
	
		// Used to maintain the orientation of the camera
		const cameraUp = this.localUp();
		const cameraOver = this.localOver();
	
		// console.log(cameraForward, cameraUp, cameraOver);
	
		// Define the projection matrix
		// This matrix rotates the world to the camera view, based on the camera's direction and the basis directions
		// Multiplying a point by this matrix and getting a single dimension is a matter of taking the dot product of the
		// original point and the nth column of the matrix ([0] :: X, [1] :: Y, etc)
		const transformMatrix = [];
	
		// TODO understand the methodology behind constructing this matrix :D
		transformMatrix[3] = cameraForward.subtract(cameraOrigin).normalize();
		transformMatrix[0] = cameraUp.cross(cameraOver, transformMatrix[3]).normalize();
		transformMatrix[1] = cameraOver.cross(transformMatrix[3], transformMatrix[0]).normalize();
		transformMatrix[2] = transformMatrix[3].cross(transformMatrix[0], transformMatrix[1]).normalize();

		return Object.seal(transformMatrix);
	}

	translateForward(distance) {
		this.pos = this.pos.add(basis.forward.multRotor(this.rot).multScalar(distance));
	}
    
    get scene() {
        return _(this).scene;
    }

    set scene(scene) {
        if (scene !== null && scene !== _(this).scene) {
            throw new TypeError("Object already belongs to a scene");
        }

        _(this).scene = scene;
    }
}

const priv = new WeakMap();
const _ = key => priv.get(key);

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