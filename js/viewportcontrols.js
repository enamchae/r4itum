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
	
			if ((event.clientX - mousedownEvent.clientX) ** 2 + (event.clientY - mousedownEvent.clientY) ** 2 <= maxClickSelectDeviation ** 2) {
				viewport.raycastSelectFrom(mousedownEvent, element);
			}
	
			mousedownEvent = null;
		});
	}

	const movementSensitivity = 1 / 64; // Factor by which to multiply turning/panning movements

	// Scroll-click to turn

	{
		let holding = false;
		element.addEventListener("mousedown", event => {
			if (event.button !== 1 || shiftPressed) return;

			holding = true;
		});

		element.addEventListener("mousemove", event => {
			if (!holding) return;

			element.requestPointerLock();

			const angleX = event.movementX / (2 * Math.PI) * movementSensitivity;
			const angleY = event.movementY / (2 * Math.PI) * movementSensitivity;

			// TODO maintain up vector (screen tilts when rotating)
			viewport.camera3.quaternion
					.multiply(new Three.Quaternion(0, -Math.sin(angleX), 0, Math.cos(angleX))) // Rotate along XZ plane (horizontal)
					.multiply(new Three.Quaternion(-Math.sin(angleY), 0, 0, Math.cos(angleY))); // Rotate along ZY plane (vertical)
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

		element.addEventListener("mousemove", event => {
			if (!holding) return;

			element.requestPointerLock();

			const right = new Three.Vector3(-1, 0, 0).applyQuaternion(viewport.camera3.quaternion); // local right vector
			const up = new Three.Vector3(0, 1, 0).applyQuaternion(viewport.camera3.quaternion); // local up vector

			viewport.camera3.position
					.add(right.multiplyScalar(event.movementX * movementSensitivity))
					.add(up.multiplyScalar(event.movementY * movementSensitivity));
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
			viewport.camera.translateForward(event.deltaY * -.002);

			viewport.queueRender();
		} else {
			viewport.camera3.translateZ(event.deltaY * .002);
			// viewport.camera3.updateProjectionMatrix();
			viewport.queueRender();
		}
	});
}

// Maximum distance (px) the mouse can move for a click to be interpreted as a mouse select
const maxClickSelectDeviation = 4;

// Whether the modifier key is being held
let altPressed = false;
let shiftPressed = false;

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
});
addEventListener("keyup", event => {
	if (altPressed && !event.altKey) {
		altPressed = false;
		event.preventDefault();
	}
	if (shiftPressed && !event.shiftKey) {
		shiftPressed = false;
	}
});