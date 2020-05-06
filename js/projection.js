/**
 * @file Handles projection of 4D objects as renderable 3D meshes.
 * 
 * Acknowledgements:
 *  - Steven Hollasch's [university thesis](https://hollasch.github.io/ray4/Four-Space_Visualization_of_4D_Objects.html) on 4D-to-2D visualization. Gave all the formulas for dimension-reduction projection!
 *  - [Three.JS](https://threejs.org/) for doing all the 3D to 2D heavylifting for me. :)
 */

import {world} from "./scene.js";
import * as Three from "./libraries/three.module.js";


export class VectorProjected3 extends Three.Vector3 {
	distance;

	constructor(x, y, z, distance) {
		super(x, y, z);

		this.distance = distance;
	}

	/**
	 * 
	 * @param {VectorProjected3} point 
	 */
	copy(point) {
		super.copy(point);
		this.distance = point.distance;
	}
}

/**
 * 
 * @param {Vector4[]} points 
 * @param {Camera4} camera 
 * @param {object} [options] 
 * @param {VectorProjected3[]} [options.destinationPoints] Group of projected point objects to which the locations of projected points should be copied.
 * @param {function} [options.callback]
 * @returns {VectorProjected3[]}
 */
export function projectVector4(points, camera, {destinationPoints=[], callback=() => {}}={}) {
	// The camera is facing from `cameraOrigin` to `cameraForward`
	const cameraOrigin = camera.pos;
	const cameraForward = camera.rot.rotateVector(world.basis.forward);

	// Used to maintain the orientation of the camera
	const cameraUp = camera.rot.rotateVector(world.basis.up);
	const cameraOver = camera.rot.rotateVector(world.basis.over);

	// console.log(cameraForward, cameraUp, cameraOver);

	// Define the transformation matrix
	// This matrix rotates the world to the camera view, based on the camera's direction and the basis directions
	// Multiplying a point by this matrix and getting a single dimension is a matter of taking the dot product of the
	// original point and the nth column of the matrix ([0] :: X, [1] :: Y, etc)
	const transformMatrix = [];

	// TODO understand the methodology behind constructing this matrix :D
	transformMatrix[3] = cameraForward.subtract(cameraOrigin).normalize();
	transformMatrix[0] = cameraUp.cross(cameraOver, transformMatrix[3]).normalize();
	transformMatrix[1] = cameraOver.cross(transformMatrix[3], transformMatrix[0]).normalize();
	transformMatrix[2] = transformMatrix[3].cross(transformMatrix[0], transformMatrix[1]).normalize();

	// Factor used to determine distortion due to focal length
	const distortionFac = camera.usingPerspective
			? 1 / Math.tan(camera.fovAngle / 2)
			: 1 / camera.radius;

	
	for (let i = 0; i < points.length; i++) {
		const point = points[i];

		const translated = point.subtract(cameraOrigin);

		const distance = camera.usingPerspective ? translated.dot(transformMatrix[3]) : camera.radius;

		// Now accounts for distance as well
		// Shrink the transformed point depending on its distance from the camera 
		const distanceDistortionFac = distortionFac / distance;

		// Why do I need to negate the coordinated in order for them to face the right direction?
		const pointProjected = new VectorProjected3(
			-translated.dot(transformMatrix[0]),
			-translated.dot(transformMatrix[1]),
			-translated.dot(transformMatrix[2]),
			distance,
		).multiplyScalar(distanceDistortionFac);

		// Reassign coordinates
		if (destinationPoints[i]) {
			destinationPoints[i].copy(pointProjected);
		} else {
			destinationPoints[i] = pointProjected;
		}

		callback(pointProjected, i);
	}

	return destinationPoints;
}