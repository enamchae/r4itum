/**
 * @file Handles user interaction with the viewport.
 */

import {Vector4, Rotor4} from "./4d/vector.js";
import tiedActions from "./interfaceties.js";
import * as Three from "./_libraries/three.module.js";

export function attachViewportControls(viewport, user) {
	const element = viewport.renderer.domElement;

	// Coords recorder
	// let x;
	// let y;
	// element.addEventListener("mousemove", event => {
	// 	x = event.clientX;
	// 	y = event.clientY;
	// });

	// Click to focus

	element.tabIndex = -1; // element must have tabIndex to be focusable
	element.addEventListener("click", () => {
		element.focus();
	});

	// Click to select an object

	{
		let mousedownEvent = null; // Keeps track of the current mousedown event. `null` if there was no mousedown on the canvas
	
		element.addEventListener("mousedown", event => {
			if (event.button !== 0 || transforming) return;
	
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
				// `movementX` mapped to ZW (no CTRL) or XW (CTRL) plane (horizontal), `movementY` mapped to WY plane (vertical)
				const plane = ctrlPressed
						? [0, 0, 0, 0, -event.movementY, event.movementX]
						: [0, 0, event.movementX, 0, -event.movementY, 0];

				const rot = viewport.camera.rot.mult(Rotor4.planeAngle(plane, angle));
				// Reset any residual XY/XZ/YZ rotation
				// rot[1] = 0;
				// rot[2] = 0;
				// rot[4] = 0;
				// rot.normalize();

				tiedActions.setObjectRot(viewport.camera, rot);

			} else { // Rotate 3D camera
				// Equivalent to above, but for 3D (and with `Rotor4.planeAngle`'s concept expanded here)

				// `movementX` mapped to XZ plane (horizontal), `movementY` mapped to ZY plane (vertical)
				const plane = new Vector4(-event.movementY, -event.movementX, 0).normalize().scale(Math.sin(angle / 2));

				viewport.camera3.quaternion.multiply(new Three.Quaternion(plane[0], plane[1], plane[2], Math.cos(angle / 2)));
				
				// Reset any residual XY rotation
				// temp disabled because it does not have the intended effect when not looking from the front
				// viewport.camera3.quaternion.z = 0;
				// viewport.camera3.quaternion.normalize();

				const quat = viewport.camera3.quaternion;
				const rotNew = new Rotor4(quat.w, quat.z, -quat.y, 0, quat.x, 0, 0, 0);
				tiedActions.setObjectRot(viewport.camera3Wrapper, rotNew, false);
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

				const posNew = viewport.camera.pos
						.add(right.scale(event.movementX * movementSensitivity))
						.add(up.scale(event.movementY * movementSensitivity));

				tiedActions.setObjectPos(viewport.camera, posNew);
			} else { // Move 3D camera
				const right = new Three.Vector3(-1, 0, 0).applyQuaternion(viewport.camera3.quaternion); // local right vector
				const up = new Three.Vector3(0, 1, 0).applyQuaternion(viewport.camera3.quaternion); // local up vector

				const posNew = viewport.camera3.position
						.add(right.multiplyScalar(event.movementX * movementSensitivity))
						.add(up.multiplyScalar(event.movementY * movementSensitivity))
						.toArray(new Vector4());

				tiedActions.setObjectPos(viewport.camera3Wrapper, posNew);
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
			if (viewport.camera.usingPerspective) {
				viewport.camera.translateForward(event.deltaY * -.5 * movementSensitivity);
				tiedActions.setObjectPos(viewport.camera, viewport.camera.pos, false);
			} else {
				tiedActions.setCameraRadius(viewport.camera, viewport.camera.radius * 1.25 ** (event.deltaY / 100));
			}
		} else {
			if (viewport.camera3Wrapper.usingPerspective) {
				viewport.camera3.translateZ(event.deltaY * .5 * movementSensitivity);
				tiedActions.setObjectPos(viewport.camera3Wrapper, viewport.camera3.position.toArray(new Vector4()), false);

				// viewport.camera3.updateProjectionMatrix();
			} else {
				tiedActions.setCameraRadius(viewport.camera3Wrapper, viewport.camera3Wrapper.radius * 1.25 ** (event.deltaY / 100));
			}
		}

		viewport.queueRender();
		event.preventDefault();
	});

	// DEL to delete the selected object

	element.addEventListener("keydown", event => {
		if (event.repeat || event.key !== "Delete" || user.selectedObjects.length === 0) return;
		
		tiedActions.removeObject(...user.selectedObjects);
		tiedActions.replaceSelection();
	});

	let transforming = false;
	// G to move the selected object

	element.addEventListener("keydown", keydownEvent => {
		const object = user.selectedObjectPrimary;
		if (keydownEvent.repeat || keydownEvent.key !== "g" || !object || transforming) return;

		transforming = true;
		element.requestPointerLock();

		const initialPos = object.pos.clone();

		const up = new Three.Vector3(0, 1, 0).applyQuaternion(viewport.camera3.quaternion).toArray(new Vector4());
		const right = new Three.Vector3(1, 0, 0).applyQuaternion(viewport.camera3.quaternion).toArray(new Vector4());

		let movementX = 0;
		let movementY = 0;
		const mousemove = mousemoveEvent => {
			movementX += mousemoveEvent.movementX;
			movementY += mousemoveEvent.movementY;

			tiedActions.setObjectPos(object,
					initialPos.add(right.multScalar(movementX * movementSensitivity))
							.add(up.multScalar(-movementY * movementSensitivity)));
		};
		element.addEventListener("mousemove", mousemove);

		element.addEventListener("mousedown", event => {
			if (event.button === 2) { // If right-click, reset
				tiedActions.setObjectPos(object, initialPos);
			} else if (event.button !== 0) { // If not left-click, ignore
				return;
			}

			transforming = false;
			document.exitPointerLock();
			element.removeEventListener("mousemove", mousemove);
		}, {once: true});

		// Don't show context menu on right-click
		element.addEventListener("contextmenu", preventDefault, {once: true});
	});

	// R to rotate the selected object

	element.addEventListener("keydown", keydownEvent => {
		const object = user.selectedObjectPrimary;
		if (keydownEvent.repeat || keydownEvent.key !== "r" || !object || transforming) return;

		transforming = true;
		element.requestPointerLock();

		const initialRot = object.rot.clone();

		// Bivector represents current viewing plane of 3D camera
		const up = new Three.Vector3(0, 1, 0).applyQuaternion(viewport.camera3.quaternion);
		const right = new Three.Vector3(1, 0, 0).applyQuaternion(viewport.camera3.quaternion);
		const bivector = new Vector4(up.x, up.y, up.z).outer(new Vector4(right.x, right.y, right.z));

		let movementX = 32; // Arbitrary offset so that user starts at 0° and does not rotate wildly at start
		let movementY = 0;
		const mousemove = mousemoveEvent => {
			movementX += mousemoveEvent.movementX;
			movementY += mousemoveEvent.movementY;

			const angle = Math.atan2(movementY, movementX);

			// TODO take influence from 4D camera rotation
			tiedActions.setObjectRot(object, initialRot.mult(Rotor4.planeAngle(bivector, angle)));
		};
		element.addEventListener("mousemove", mousemove);

		element.addEventListener("mousedown", event => {
			if (event.button === 2) { // If right-click, reset
				tiedActions.setObjectRot(object, initialRot);
			} else if (event.button !== 0) { // If not left-click, ignore
				return;
			}

			transforming = false;
			document.exitPointerLock();
			element.removeEventListener("mousemove", mousemove);
		}, {once: true});

		// Don't show context menu on right-click
		element.addEventListener("contextmenu", preventDefault, {once: true});
	});

	// S to scale the selected object

	element.addEventListener("keydown", keydownEvent => {
		const object = user.selectedObjectPrimary;
		if (keydownEvent.repeat || keydownEvent.key !== "s" || !object || transforming) return;

		transforming = true;
		element.requestPointerLock();

		const initialScale = object.scl.clone();

		let movementX = 0;
		const mousemove = mousemoveEvent => {
			movementX += mousemoveEvent.movementX;

			tiedActions.setObjectScl(object, initialScale.multScalar(movementX * movementSensitivity + 1));
		};
		element.addEventListener("mousemove", mousemove);

		element.addEventListener("mousedown", event => {
			if (event.button === 2) { // If right-click, reset
				tiedActions.setObjectScl(object, initialScale);
			} else if (event.button !== 0) { // If not left-click, ignore
				return;
			}

			transforming = false;
			document.exitPointerLock();
			element.removeEventListener("mousemove", mousemove);
		}, {once: true});

		// Don't show context menu on right-click
		element.addEventListener("contextmenu", preventDefault, {once: true});
	});
}

// Aux function for event handlers
function preventDefault(event) {
	event.preventDefault();
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