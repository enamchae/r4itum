/**
 * @file Handles user interaction with the viewport.
 */

export function attachViewportControls(viewport) {
	// Click to select an object

	let mousedownEvent = null; // Keeps track of the current mousedown event. `null` if there was no mousedown on the canvas
	let mousedownTarget = null; // `currentTarget` is not preserved

	viewport.renderer.domElement.addEventListener("mousedown", event => {
		if (event.button !== 0) return;

		mousedownEvent = event;
		mousedownTarget = event.currentTarget;
	});

	viewport.renderer.domElement.addEventListener("mouseup", event => {
		if (event.button !== 0 || !mousedownEvent) return;

		if ((event.clientX - mousedownEvent.clientX) ** 2 + (event.clientY - mousedownEvent.clientY) ** 2 <= maxClickSelectDeviation ** 2) {
			viewport.raycastSelectFrom(mousedownEvent, mousedownTarget);
		}

		mousedownEvent = null;
		mousedownTarget = null;
	});

	// Scroll to move forward

	viewport.renderer.domElement.addEventListener("wheel", event => {
		if (altPressed) {
			viewport.camera.translateForward(event.deltaY * -.002);

			viewport.constructor.renderQueue.add(viewport);
		} else {
			viewport.camera3.translateZ(event.deltaY * .002);
			// viewport.camera3.updateProjectionMatrix();
			viewport.constructor.renderQueue.add(viewport);
		}
	});
}

// Maximum distance (px) the mouse can move for a click to be interpreted as a mouse select
const maxClickSelectDeviation = 4;

// Whether the alt key is being held
let altPressed = false;

addEventListener("keydown", event => {
	// Do not fire repeatedly when holding key
	if (event.repeat) return;

	if (event.altKey) {
		altPressed = true;
		event.preventDefault();
	}
});
addEventListener("keyup", event => {
	if (altPressed && !event.altKey) {
		altPressed = false;
		event.preventDefault();
	}
});