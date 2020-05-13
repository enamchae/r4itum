/**
 * @file Handles user interaction with the viewport.
 */

import {Vector4, Rotor4} from "./4d/vector.js";
import * as Three from "./_libraries/three.module.js";

export function attachViewportControls(viewport) {
	const element = viewport.renderer.domElement;

	// Click to select an object

	{
		let mousedownEvent = null; // Keeps track of the current mousedown event. `null` if there was no mousedown on the canvas
	
		element.addEventListener("mousedown", event => {
			if (event.button !== 0) return;
	
			mousedownEvent = event;
		});
	
		element.addEventListener("mouseup", event => {
			if (event.button !== 0 || !mousedownEvent) return;
	
			// Only treat this as a click if the mouse has moved less than `maxClickSelectDeviation` px away from mousedown
			if ((event.clientX - mousedownEvent.clientX) ** 2 + (event.clientY - mousedownEvent.clientY) ** 2 <= maxClickSelectDeviation ** 2) {
				viewport.raycastSelectFrom(mousedownEvent, element);
			}
	
			mousedownEvent = null;
		});
	}

	// Scroll-click to turn

	{
		let holding = false;
		element.addEventListener("mousedown", event => {
			if (event.button !== 1 || shiftPressed) return;

			element.requestPointerLock();

			holding = true;
		});

		element.addEventListener("mousemove", event => {
			if (!holding) return;

			// Angle by which to turn the camera, in terms of mouse movement distance
			const angle = Math.sqrt(event.movementX ** 2 + event.movementY ** 2) / (2 * Math.PI) * movementSensitivity;

			if (altPressed) { // Rotate 4D camera
				// `movementX` mapped to XW (no CTRL) or ZW (CTRL) plane (horizontal), `movementY` mapped to WY plane (vertical)
				const plane = ctrlPressed
						? [0, 0, event.movementX, 0, -event.movementY, 0]
						: [0, 0, 0, 0, -event.movementY, event.movementX];

				viewport.camera.setRot(viewport.camera.rot.mult(Rotor4.planeAngle(plane, angle)));

				// Reset any residual XY/XZ/YZ rotation
				viewport.camera.rot[1] = 0;
				viewport.camera.rot[2] = 0;
				viewport.camera.rot[4] = 0;
				viewport.camera.rot.normalize();

			} else { // Rotate 3D camera
				// Equivalent to above, but for 3D (and with `Rotor4.planeAngle`'s concept expanded here)

				// `movementX` mapped to XZ plane (horizontal), `movementY` mapped to ZY plane (vertical)
				const plane = new Vector4(-event.movementY, -event.movementX, 0).normalize().scale(Math.sin(angle));

				viewport.camera3.quaternion.multiply(new Three.Quaternion(plane[0], plane[1], 0, Math.cos(angle)));
				
				// Reset any residual XY rotation
				viewport.camera3.quaternion.z = 0;
				viewport.camera3.quaternion.normalize();
			}

			viewport.queueRender();
		});

		element.addEventListener("mouseup", event => {
			if (event.button !== 1 || !holding) return;

			document.exitPointerLock();

			holding = false;
		});
	}

	// SHIFT + scroll-click to pan

	{
		let holding = false;
		element.addEventListener("mousedown", event => {
			if (event.button !== 1 || !shiftPressed) return;

			holding = true;
		});

		const rightVectorX = new Vector4(-1, 0, 0, 0);
		const rightVectorZ = new Vector4(0, 0, -1, 0);
		element.addEventListener("mousemove", event => {
			if (!holding) return;

			element.requestPointerLock();

			if (altPressed) { // Move 4D camera
				const right = viewport.camera.localVector(ctrlPressed ? rightVectorZ : rightVectorX); // local right vector
				const up = viewport.camera.localUp(); // local up vector

				viewport.camera.setPos(viewport.camera.pos
						.add(right.scale(event.movementX * movementSensitivity))
						.add(up.scale(event.movementY * movementSensitivity)));
			} else { // Move 3D camera
				const right = new Three.Vector3(-1, 0, 0).applyQuaternion(viewport.camera3.quaternion); // local right vector
				const up = new Three.Vector3(0, 1, 0).applyQuaternion(viewport.camera3.quaternion); // local up vector

				viewport.camera3.position
						.add(right.multiplyScalar(event.movementX * movementSensitivity))
						.add(up.multiplyScalar(event.movementY * movementSensitivity));
			}
			viewport.queueRender();
		});

		element.addEventListener("mouseup", event => {
			if (event.button !== 1 || !holding) return;

			document.exitPointerLock();

			holding = false;
		});
	}

	// Scroll to move forward

	element.addEventListener("wheel", event => {
		if (altPressed) {
			viewport.camera.translateForward(event.deltaY * -.5 * movementSensitivity);

			viewport.queueRender();
		} else {
			viewport.camera3.translateZ(event.deltaY * .5 * movementSensitivity);
			// viewport.camera3.updateProjectionMatrix();
			viewport.queueRender();
		}

		event.preventDefault();
	});
}

const maxClickSelectDeviation = 4; // Maximum distance (px) the mouse can move for a click to be interpreted as a mouse select
const movementSensitivity = 1 / 64; // Factor by which to multiply turning/panning movements

// Whether the modifier key is being held
let altPressed = false;
let shiftPressed = false;
let ctrlPressed = false;

addEventListener("keydown", event => {
	// Do not fire repeatedly when holding key
	if (event.repeat) return;

	if (event.altKey) {
		altPressed = true;
		event.preventDefault();
	}
	if (event.shiftKey) {
		shiftPressed = true;
	}
	if (event.ctrlKey) {
		ctrlPressed = true;
	}
});
addEventListener("keyup", event => {
	if (altPressed && !event.altKey) {
		altPressed = false;
		event.preventDefault();
	}
	if (shiftPressed && !event.shiftKey) {
		shiftPressed = false;
	}
	if (ctrlPressed && !event.ctrlKey) {
		ctrlPressed = false;
	}
});