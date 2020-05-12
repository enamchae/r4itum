/**
 * @file Handles projection of 4D objects as renderable 3D meshes.
 * 
 * Acknowledgements:
 *  - Steven Hollasch's [university thesis](https://hollasch.github.io/ray4/Four-Space_Visualization_of_4D_Objects.html) on 4D-to-2D visualization. Gave all the formulas for dimension-reduction projection!
 *  - [Three.JS](https://threejs.org/) for doing all the 3D to 2D heavylifting for me. :)
 */

import {Vector4} from "./vector.js";

// export class VectorProjected3 extends Three.Vector3 {
// 	distance;

// 	constructor(x, y, z, distance) {
// 		super(x, y, z);

// 		this.distance = distance;
// 	}

// 	/**
// 	 * 
// 	 * @param {VectorProjected3} point 
// 	 */
// 	copy(point) {
// 		super.copy(point);
// 		this.distance = point.distance;
// 	}
// }

/**
 * 
 * @param {Vector4[]} points 
 * @param {Camera4} camera 
 * @param {object} [options] 
 * @param {Vector4[]} [options.destinationPoints] Group of projected point objects to which the locations of projected points should be copied.
 * @param {function} [options.callback]
 * @returns {Vector4[]}
 */
export function projectVector4(points, camera, {destinationPoints=[], callback}={}) {
	const projectionMatrix = camera.projectionMatrix();

	// Factor used to determine distortion due to focal length
	const distortionFac = camera.usingPerspective
			? 1 / Math.tan(camera.fovAngle / 2)
			: 1 / camera.radius;
	
	for (let i = 0; i < points.length; i++) {
		const point = points[i];

		const translated = point.subtract(camera.pos);

		let distance = camera.usingPerspective ? translated.dot(projectionMatrix[3]) : camera.radius;

		// Now accounts for distance as well
		// Shrink the transformed point depending on its distance from the camera 
		const distanceDistortionFac = distortionFac / distance;

		// Why do I need to negate the coordinated in order for them to face the right direction?
		const pointProjected = new Vector4(
			-translated.dot(projectionMatrix[0]) * distanceDistortionFac,
			-translated.dot(projectionMatrix[1]) * distanceDistortionFac,
			-translated.dot(projectionMatrix[2]) * distanceDistortionFac,
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