/**
 * @file Handles 4D objects and their properties, along with the world itself's.
 */

import {Vector4, Rotor4, Line4, Space3_4} from "./vector.js";
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
			if (!(object instanceof Object4)) {
				throw new TypeError("Not an object");
			}

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

	hasObject(object) {
		return this.objects.has(object) || this.objectsReference.has(object);
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
	 * @type string
	 */
	name = "Object";
	nameEditable = true;
	
	/**
	 * TODO
	 * @type boolean
	 */
	hidden = false;

	constructor(pos=new Vector4(), rot=new Rotor4(), scl=new Vector4(1, 1, 1, 1)) {
		priv.set(this, {
			pos,
			rot,
			scl,
		});
	}

	setName(name) {
		this.name = name;
		return this;
	}

	/**
	 * Position of this object.
	 * @type Vector4
	 */
	// This property must be a getter or it can't be overriden by a getter
	get pos() {
		return _(this).pos;
	}

	setPos(pos) {
		this.pos.copy(pos);
		return this;
	}

	/**
	 * Rotation of this object.
	 * @type Rotor4
	 */
	get rot() {
		return _(this).rot;
	}

	setRot(rot) {
		this.rot.copy(rot);
		return this;
	}

	/**
	 * Scale of this object.
	 * @type Vector4
	 */
	get scl() {
		return _(this).scl;
	}

	setScl(scl) {
		this.scl.copy(scl);
		return this;
	}
    
    localForward() {
        return this.localVector(basis.forward);
    }
    
    localUp() {
        return this.localVector(basis.up);
    }
    
    localOver() {
        return this.localVector(basis.over);
	}

	localVector(vector) {
		return this.rot.rotateVector(vector);
	}
	
	/**
	 * @returns Vector4[]
	 */
	projectionMatrix() {
		// The camera is facing from `this.pos` to `this.localForward()`
		const cameraForward = this.localForward();
	
		// Used to maintain the orientation of the camera
		const cameraUp = this.localUp();
		const cameraOver = this.localOver();
	
		// Define the projection matrix
		// This matrix rotates the world to the camera view, based on the camera's direction and the basis directions
		// Multiplying a point by this matrix and getting a single dimension is a matter of taking the dot product of the
		// original point and the nth column of the matrix ([0] :: X, [1] :: Y, etc)
		const transformMatrix = [];
	
		// What methodology was used to construct this matrix? :D
		transformMatrix[3] = cameraForward.normalize();
		transformMatrix[0] = cameraUp.cross(cameraOver, transformMatrix[3]).normalize();
		transformMatrix[1] = cameraOver.cross(transformMatrix[3], transformMatrix[0]).normalize();
		transformMatrix[2] = transformMatrix[3].cross(transformMatrix[0], transformMatrix[1]).normalize();

		return Object.seal(transformMatrix);
	}

	localSpace() {
		return new Space3_4(this.localForward(), this.pos);
	}

	translateForward(distance) {
		this.setPos(this.pos.add(this.localForward().multScalar(distance)));
		return this;
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
	name = "Camera";

	usingPerspective = true;

	fovAngle = Math.PI / 2;
	radius = 1;

	constructor(pos, rot, options={}) {
		super(pos, rot);

		Object.assign(this, options);
	}

	clone() {
		return new Camera4(this.pos, this.rot, this);
	}

	/**
	 * Determines whether two cameras have the same settings.
	 * @param {Camera4} camera 
	 */
	eq(camera) {
		return this.pos.eq(camera.pos)
				&& this.rot.eq(camera.rot)
				&& this.usingPerspective === camera.usingPerspective
				&& this.fovAngle === camera.fovAngle
				&& this.radius === camera.radius
	}
}

export class Mesh4 extends Object4 {
	name = "Mesh";

	/**
	 * @type Geometry4
	 */
	geometry;

	tint = 0xFFFFFF;

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

export class PlaneRef4 extends Object4 {
	geometry;

	constructor(axis0, axis1, size=8) {
		super();

		const signs = [1, -1];

		this.geometry = new Geometry4([], [
			[0, 1, 2],
			[1, 2, 3],
		]);
		for (let i = 0; i < 4; i++) {
			const vert = new Vector4();
			vert[axis0] = size * signs[0b1 & i];
			vert[axis1] = size * signs[0b1 & i >>> 1];

			this.geometry.verts.push(vert);
		}
	}

	transformedVerts() {
		return this.geometry.verts.map(vert => {
			return vert.multComponents(this.scl).multRotor(this.rot).add(this.pos);
		});
	}
}

export class Axis4 extends Object4 {
	geometry;
	line;

	color;

	constructor(axis, size=8, color=0) {
		super();

		this.geometry = new Geometry4();
		for (let i = -1; i <= 1; i += 0.1) { // Line must be split into several parts to counteract culling; arbitrary increment
			const vert = new Vector4();
			vert[axis] = size * i;
			this.geometry.verts.push(vert);
		}
		const direction = new Vector4();
		direction[axis] = 1;
		this.line = new Line4(direction);

		this.color = color;
	}

	transformedVerts() {
		return this.geometry.verts.map(vert => {
			return vert.multComponents(this.scl).multRotor(this.rot).add(this.pos);
		});
	}
}