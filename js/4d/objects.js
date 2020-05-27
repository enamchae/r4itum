/**
 * @file Handles 4D objects and their properties, along with the world itself's.
 * 
 * Acknowledgements:
 *  - Steven Hollasch's [university thesis](https://hollasch.github.io/ray4/Four-Space_Visualization_of_4D_Objects.html) on 4D-to-2D visualization. Gave all the formulas for dimension-reduction projection!
 */

import {Vector4, Rotor4, Matrix5, Line4, Space3_4} from "./vector.js";
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

const priv = new WeakMap();
const _ = key => priv.get(key);

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

	defaultTransforms;

	constructor(pos=new Vector4(), rot=new Rotor4(), scl=new Vector4(1, 1, 1, 1)) {
		priv.set(this, {
			pos,
			rot,
			rot2: new Rotor4(),
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

	get rot2() {
		return _(this).rot2;
	}

	setRot2(rot) {
		this.rot2.copy(rot);
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

	saveDefaultTransforms() {
		this.defaultTransforms = {
			pos: this.pos.clone(),
			rot: this.rot.clone(),
			rot2: this.rot2.clone(),
			scl: this.scl.clone(),
		};
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
	 * Intended for cameras.
	 * @returns Matrix5
	 */
	// Currently just a matrix that undoes rotation. Should be renamed or generalized to work for any basis forward vector
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
	
		transformMatrix[3] = cameraForward.normalize();
		transformMatrix[0] = cameraUp.cross(cameraOver, transformMatrix[3]).normalize();
		transformMatrix[1] = cameraOver.cross(transformMatrix[3], transformMatrix[0]).normalize();
		transformMatrix[2] = transformMatrix[3].cross(transformMatrix[0], transformMatrix[1]).normalize();

		// Added elements allow translation
		return new Matrix5(transformMatrix);
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

	clone() {
		return new Object4(this.pos.clone(), this.rot.clone(), this.scl.clone());
	}

	eq(object) {
		return this.pos.eq(object.pos)
				&& this.rot.eq(object.rot)
				&& this.scl.eq(object.scl);
	}
}

export class Camera4 extends Object4 {
	name = "Camera";

	constructor(pos, rot, {
		usingPerspective=true,
		focalLength=1,
	}={}) {
		super(pos, rot);

		Object.assign(this, {
			usingPerspective,
			focalLength,
		});
	}

	get usingPerspective() {
		return _(this).usingPerspective;
	}

	set usingPerspective(value) {
		this.setUsingPerspective(value);
	}

	setUsingPerspective(value) {
		_(this).usingPerspective = Boolean(value);
		return this;
	}

	get fovAngle() {
		return 2 * Math.atan(this.focalLength);
	}

	set fovAngle(angle) {
		this.setFovAngle(angle);
	}

	setFovAngle(angle) {
		if (isNaN(angle)) {
			throw new TypeError(`${angle} not a number`);
		} else if (angle <= 0 || angle >= Math.PI) {
			throw new RangeError(`${angle} out of FOV range`);
		}

		this.focalLength = Math.tan(angle / 2);
		return this;
	}

	get focalLength() {
		return _(this).focalLength;
	}

	set focalLength(focalLength) {
		this.setFocalLength(focalLength);
	}

	setFocalLength(focalLength) {
		if (isNaN(focalLength)) {
			throw new TypeError(`${focalLength} not a number`);
		} else if (focalLength <= 0) {
			throw new RangeError(`${focalLength} not positive`);
		}

		_(this).focalLength = focalLength;
		return this;
	}
	
	/**
	 * 
	 * @param {Vector4[]} points 
	 * @param {object} [options] 
	 * @param {Vector4[]} [options.destinationPoints] Group of projected point objects to which the locations of projected points should be copied.
	 * @param {function} [options.callback]
	 * @returns {Vector4[]}
	 */
	projectVector4(points, {destinationPoints=[], callback}={}) {
		const projectionMatrix = this.projectionMatrix();
	
		// Factor used to determine distortion due to focal length
		const distortionFac = 1 / this.focalLength;
		
		for (let i = 0; i < points.length; i++) {
			const point = points[i].subtract(this.pos);
	
			const distance = this.usingPerspective ? projectionMatrix.dot4WithColumn(point, 3) : this.focalLength;
	
			// Now accounts for distance as well
			// Shrink the transformed point depending on its distance from the camera 
			const distanceDistortionFac = distortionFac / distance;
	
			const pointProjected = new Vector4(
				-projectionMatrix.dot4WithColumn(point, 0) * distanceDistortionFac,
				-projectionMatrix.dot4WithColumn(point, 1) * distanceDistortionFac,
				-projectionMatrix.dot4WithColumn(point, 2) * distanceDistortionFac,
				distance,
			);
	
			// Reassign coordinates
			if (destinationPoints[i]) {
				destinationPoints[i].copy(pointProjected);
			} else {
				destinationPoints[i] = pointProjected;
			}
	
			callback?.(pointProjected, i);
		}
	
		return destinationPoints;
	}

	/**
	 * 
	 * @param {Vector4[]} points 
	 * @param {object} [options] 
	 * @param {Vector4[]} [options.destinationPoints] 
	 * @param {function} [options.callback]
	 * @returns {Vector4[]}
	 */
	unprojectVector4(points, {destinationPoints=[], callback}={}) {
		const unprojectionMatrix = this.projectionMatrix().inverse();
	
		// Factor used to determine distortion due to focal length
		const distortionFac = 1 / this.focalLength;
		
		for (let i = 0; i < points.length; i++) {
			const point = points[i];
	
			// Formulas in `projectVector4`, but reversed

			const distance = point[3];
			const distanceDistortionFac = distortionFac / distance;

			const pointUndistorted = new Vector4(
				-point[0] / distanceDistortionFac,
				-point[1] / distanceDistortionFac,
				-point[2] / distanceDistortionFac,
				distance,
			);
	
			const pointUnprojected = new Vector4(
				unprojectionMatrix.dot4WithColumn(pointUndistorted, 0) + this.pos[0],
				unprojectionMatrix.dot4WithColumn(pointUndistorted, 1) + this.pos[1],
				unprojectionMatrix.dot4WithColumn(pointUndistorted, 2) + this.pos[2],
				// Cannot accurately derive point distance in parllel projection
				this.usingPerspective ? unprojectionMatrix.dot4WithColumn(pointUndistorted, 3) + this.pos[3] : this.focalLength,
			);
	
			// Reassign coordinates
			if (destinationPoints[i]) {
				destinationPoints[i].copy(pointUnprojected);
			} else {
				destinationPoints[i] = pointUnprojected;
			}
	
			callback?.(pointUnprojected, i);
		}
	
		return destinationPoints;
	}

	/**
	 * Calculates the distance of a point from this object's viewbox.
	 * @param {Vector4} vector
	 * @returns {number}  
	 */
	viewboxDistanceFrom(vector) {
		return this.usingPerspective
				? this.localForward().dot(vector.subtract(this.pos))
				: this.focalLength;
	}

	clone() {
		return new Camera4(this.pos.clone(), this.rot.clone(), this);
	}

	/**
	 * Determines whether two cameras have the same settings.
	 * @param {Camera4} camera 
	 */
	eq(camera) {
		return this.pos.eq(camera.pos)
				&& this.rot.eq(camera.rot)
				&& this.usingPerspective === camera.usingPerspective
				&& this.focalLength === camera.focalLength
	}
}

export class Mesh4 extends Object4 {
	name = "Mesh";

	/**
	 * @type Geometry4
	 */
	geometry;

	tint = 0xFFFFFF;
	opacity = 0.25;

	constructor(geometry, pos, rot, scl) {
		super(pos, rot, scl);

		this.geometry = geometry;

		// this.wireframe3 = new Three.LineSegments(new Three.EdgesGeometry(this.mesh3.geometry), wireframeMat);
		// this.updateWireframe();
	}

	transformedVerts() {
		return this.geometry.verts.map(vert => {
			return vert.multComponents(this.scl).multRotor(this.rot).multRotor(this.rot2).add(this.pos);
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