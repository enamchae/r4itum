/**
 * @file Handles user interaction with the viewport.
 */

import {Vector4, Rotor4} from "./4d/vector.js";
import userSelection from "./userselection.js";
import tiedActions from "./interfaceties.js";
import {qs} from "./util.js";
import * as Three from "./_libraries/three.module.js";

const movementSensitivity = 1 / 64; // Factor by which to multiply turning/panning movements

const handlers = {
	active: new Set(),

	/**
	 * Attaches an event listener to an event target and records it.
	 * @param {EventTarget} targetElement 
	 * @param {string} eventType 
	 * @param {function} handler 
	 * @param {object} [options] 
	 * @returns {function} A function that removes the added event listener.
	 */
	add(targetElement, eventType, handler, options={}) {
		let callback;
		if (options.once) {
			// Intercept the event handler to remove `once` listeners
			callback = event => {
				this.active.delete(key);
				handler(event);
			};
		} else {
			callback = handler;
		}

		const key = {targetElement, eventType, callback, options};
		this.active.add(key);
		targetElement.addEventListener(eventType, callback, options);

		return () => {
			targetElement.removeEventListener(eventType, callback, options);
			this.active.delete(key);
		};
	},

	clear() {
		for (const {targetElement, eventType, callback, options} of this.active) {
			targetElement.removeEventListener(eventType, callback, options);
		}
		this.active.clear();
	},

	setToolMode(toolMode, viewport) {
		toolModeButtons.get(currentToolMode)?.classList.remove("highlighted");

		this.clear();
		toolMode(viewport);

		toolModeButtons.get(toolMode)?.classList.add("highlighted");
		currentToolMode = toolMode;
	},
};

function toolbarHandler(toolMode, viewport) {
	return () => {
		handlers.setToolMode(toolMode, viewport);
		viewport.focus();
	};
}

let transforming = false;

/**
 * @type ToolMode
 */
let currentToolMode = null;

/**
 * @type Map<ToolMode, HTMLButtonElement>
 */
const toolModeButtons = new Map();

function linkToolModeButton(button, toolMode, viewport) {
	toolModeButtons.set(toolMode, button);
	button.addEventListener("click", toolbarHandler(toolMode, viewport));
	return button;
}

function wrapHandler(handler, viewport, prerequisite, data={}) {
	return event => {
		if (!prerequisite(event, viewport)) return;
		handler(Object.assign(data, {event, viewport}));
	};
}

// /**
//  * 
//  * @param {function} mousemoveHandler 
//  * @returns {function} 
//  */
// function wrapPointerLockAction(mousemoveHandler) {
// 	return data => {
// 		const event = data.event;
// 		event.currentTarget.requestPointerLock();

// 		const removeMousemove = handlers.add(event.currentTarget, "mousemove", mousemoveEvent => {
// 			mousemoveHandler(Object.assign(data, {mousemoveEvent}));
// 		});
		
// 		handlers.add(event.currentTarget, "mouseup", () => {
// 			document.exitPointerLock();
// 			removeMousemove();
// 		}, {once: true});
// 	};
// }


/**
 * @typedef {function} ToolMode
 */

/**
 * @enum {ToolMode}
 */
const ToolMode = {
	SELECTION: viewport => {
		handlers.add(viewport.canvas, "click", wrapHandler(
			actions.select,
			viewport,
			event => event.button === 0,
		));
		
		addDefaultCameraControls(viewport);
	},

	PAN3: viewport => {
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.pan3,
			viewport,
			event => (event.button === 0 || event.button === 1) && !shiftPressed && !altPressed,
		));

		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.pan4,
			viewport,
			event => (event.button === 0 || event.button === 1) && !shiftPressed && altPressed,
		));
		
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.turn3,
			viewport,
			event => (event.button === 0 || event.button === 1) && shiftPressed && !altPressed,
		));
		
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.turn4,
			viewport,
			event => (event.button === 0 || event.button === 1) && shiftPressed && altPressed,
		));
	},

	PAN4: viewport => {
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.pan4,
			viewport,
			event => (event.button === 0 || event.button === 1) && !shiftPressed && !altPressed,
		));

		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.pan3,
			viewport,
			event => (event.button === 0 || event.button === 1) && !shiftPressed && altPressed,
		));
		
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.turn4,
			viewport,
			event => (event.button === 0 || event.button === 1) && shiftPressed && !altPressed,
		));
		
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.turn3,
			viewport,
			event => (event.button === 0 || event.button === 1) && shiftPressed && altPressed,
		));
	},

	TURN3: viewport => {
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.turn3,
			viewport,
			event => (event.button === 0 || event.button === 1) && !shiftPressed && !altPressed,
		));

		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.turn4,
			viewport,
			event => (event.button === 0 || event.button === 1) && !shiftPressed && altPressed,
		));
		
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.pan3,
			viewport,
			event => (event.button === 0 || event.button === 1) && shiftPressed && !altPressed,
		));
		
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.pan4,
			viewport,
			event => (event.button === 0 || event.button === 1) && shiftPressed && altPressed,
		));
	},

	TURN4: viewport => {
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.turn4,
			viewport,
			event => (event.button === 0 || event.button === 1) && !shiftPressed && !altPressed,
		));

		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.turn3,
			viewport,
			event => (event.button === 0 || event.button === 1) && !shiftPressed && altPressed,
		));
		
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.pan4,
			viewport,
			event => (event.button === 0 || event.button === 1) && shiftPressed && !altPressed,
		));
		
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.pan3,
			viewport,
			event => (event.button === 0 || event.button === 1) && shiftPressed && altPressed,
		));
	},

	TRANSLATE: viewport => {
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.translate,
			viewport,
			event => event.button === 0 && !transforming,
		));
		
		addDefaultCameraControls(viewport);
	},

	ROTATE: viewport => {
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.rotate,
			viewport,
			event => event.button === 0 && !transforming,
		));
		
		addDefaultCameraControls(viewport);
	},

	SCALE: viewport => {
		handlers.add(viewport.canvas, "mousedown", wrapHandler(
			actions.scale,
			viewport,
			event => event.button === 0 && !transforming,
		));
		
		addDefaultCameraControls(viewport);
	},
};
function addDefaultCameraControls(viewport) {
	handlers.add(viewport.canvas, "mousedown", wrapHandler(
		actions.turn3,
		viewport,
		event => event.button === 1 && !shiftPressed && !altPressed && !transforming,
	));
	
	handlers.add(viewport.canvas, "mousedown", wrapHandler(
		actions.turn4,
		viewport,
		event => event.button === 1 && !shiftPressed && altPressed && !transforming,
	));
	
	handlers.add(viewport.canvas, "mousedown", wrapHandler(
		actions.pan3,
		viewport,
		event => event.button === 1 && shiftPressed && !altPressed && !transforming,
	));
	
	handlers.add(viewport.canvas, "mousedown", wrapHandler(
		actions.pan4,
		viewport,
		event => event.button === 1 && shiftPressed && altPressed && !transforming,
	));
}

/**
 * Object containing common listeners.
 */
const actions = {
	select: ({event, viewport}) => {
		viewport.raycastSelectFrom(event, viewport.canvas);
	},

	turn3: ({event, viewport}) => {
		event.currentTarget.requestPointerLock();
		associatedToolButton(actions.turn3)?.classList.add("subhighlighted");

		const removeMousemove = handlers.add(event.currentTarget, "mousemove", event => {
			// Angle by which to turn the camera, in terms of mouse movement distance
			const angle = angleFromMovement(event);

			// Equivalent to 4D turn, but for 3D (and with `Rotor4.planeAngle`'s concept expanded here)

			// `movementX` mapped to XZ plane (horizontal), `movementY` mapped to ZY plane (vertical)
			const plane = new Vector4(-event.movementY, -event.movementX, 0).normalize().scale(Math.sin(angle / 2));

			viewport.camera3.quaternion.multiply(new Three.Quaternion(plane[0], plane[1], plane[2], Math.cos(angle / 2)));
			
			// Reset any residual XY rotation
			// temp disabled because it does not have the intended effect when not looking from the front
			// viewport.camera3.quaternion.z = 0;
			// viewport.camera3.quaternion.normalize();

			const quat = viewport.camera3.quaternion;
			const rotNew = new Rotor4(quat.w, quat.z, -quat.y, 0, quat.x, 0, 0, 0);
			tiedActions.setObjectRot(viewport.camera3Wrapper, rotNew, {resetting: false});
		});
		
		handlers.add(event.currentTarget, "mouseup", () => {
			document.exitPointerLock();
			associatedToolButton(actions.turn3)?.classList.remove("subhighlighted");
			removeMousemove();
		}, {once: true});
	},

	turn4: ({event, viewport}) => {
		event.currentTarget.requestPointerLock();
		associatedToolButton(actions.turn4)?.classList.add("subhighlighted");

		const removeMousemove = handlers.add(event.currentTarget, "mousemove", event => {
			// Angle by which to turn the camera, in terms of mouse movement distance
			const angle = angleFromMovement(event);

			// `movementX` mapped to ZW (no CTRL) or XW (CTRL) plane (horizontal), `movementY` mapped to WY plane (vertical)
			const plane = ctrlPressed
					? [0, 0, 0, 0, -event.movementY, event.movementX]
					: [0, 0, event.movementX, 0, -event.movementY, 0];

			const rotNew = viewport.camera.rot.mult(Rotor4.planeAngle(plane, angle));
			// Reset any residual XY/XZ/YZ rotation
			// rot[1] = 0;
			// rot[2] = 0;
			// rot[4] = 0;
			// rot.normalize();

			tiedActions.setObjectRot(viewport.camera, rotNew);
		});
		
		handlers.add(event.currentTarget, "mouseup", () => {
			document.exitPointerLock();
			associatedToolButton(actions.turn4)?.classList.remove("subhighlighted");
			removeMousemove();
		}, {once: true});
	},

	pan3: ({event, viewport}) => {
		event.currentTarget.requestPointerLock();
		associatedToolButton(actions.pan3)?.classList.add("subhighlighted");

		const removeMousemove = handlers.add(event.currentTarget, "mousemove", event => {
			const right = new Three.Vector3(-1, 0, 0).applyQuaternion(viewport.camera3.quaternion); // local right vector
			const up = new Three.Vector3(0, 1, 0).applyQuaternion(viewport.camera3.quaternion); // local up vector

			const posNew = viewport.camera3.position
					.add(right.multiplyScalar(event.movementX * movementSensitivity))
					.add(up.multiplyScalar(event.movementY * movementSensitivity))
					.toArray(new Vector4());

			tiedActions.setObjectPos(viewport.camera3Wrapper, posNew);
		});
		
		handlers.add(event.currentTarget, "mouseup", () => {
			document.exitPointerLock();
			associatedToolButton(actions.pan3)?.classList.remove("subhighlighted");
			removeMousemove();
		}, {once: true});
	},

	pan4: ({event, viewport}) => {
		event.currentTarget.requestPointerLock();
		associatedToolButton(actions.pan4)?.classList.add("subhighlighted");

		const rightVectorX = new Vector4(-1, 0, 0, 0);
		const rightVectorZ = new Vector4(0, 0, -1, 0);
		const removeMousemove = handlers.add(event.currentTarget, "mousemove", event => {
			const right = viewport.camera.localVector(ctrlPressed ? rightVectorZ : rightVectorX); // local right vector
			const up = viewport.camera.localUp(); // local up vector

			const posNew = viewport.camera.pos
					.add(right.scale(event.movementX * movementSensitivity))
					.add(up.scale(event.movementY * movementSensitivity));

			tiedActions.setObjectPos(viewport.camera, posNew);
		});
		
		handlers.add(event.currentTarget, "mouseup", () => {
			document.exitPointerLock();
			associatedToolButton(actions.pan4)?.classList.remove("subhighlighted");
			removeMousemove();
		}, {once: true});
	},

	// TODO refactor duplicate code
	translate: ({event, viewport}) => {
		const object = userSelection.objectPrimary;

		transforming = true;
		event.currentTarget.requestPointerLock();
		associatedToolButton(actions.translate)?.classList.add("subhighlighted");

		const initialPos = object.pos.clone();

		const {up, right} = localUpAndRight(viewport, object);

		let movementX = 0;
		let movementY = 0;
		const removeMousemove = handlers.add(event.currentTarget, "mousemove", mousemoveEvent => {
			movementX += mousemoveEvent.movementX;
			movementY += mousemoveEvent.movementY;

			const newPos = initialPos
					.add(right.multScalar(movementX * movementSensitivity))
					.add(up.multScalar(-movementY * movementSensitivity));

			tiedActions.setObjectPos(object, newPos);
		});

		const removeMousedown = handlers.add(event.currentTarget, "mousedown", mousedownEvent => {
			if (mousedownEvent.button === 2) { // If right-click, reset
				tiedActions.setObjectPos(object, initialPos);

				// Don't show context menu on right-click
				handlers.add(mousedownEvent.currentTarget, "contextmenu", preventDefault, {once: true});
			} else if (mousedownEvent.button !== 0) { // If not left-click, ignore
				return;
			}

			transforming = false;
			document.exitPointerLock();
			associatedToolButton(actions.translate)?.classList.remove("subhighlighted");
			removeMousemove();
			removeMousedown();
		});
	},

	rotate: ({event, viewport}) => {
		const object = userSelection.objectPrimary;

		transforming = true;
		event.currentTarget.requestPointerLock();
		associatedToolButton(actions.rotate)?.classList.add("subhighlighted");

		const initialRot = object.rot.clone();

		// Bivector represents current viewing plane of 3D camera
		const {up, right} = localUpAndRight(viewport, object);
		const bivector = new Vector4(up.x, up.y, up.z).outer(new Vector4(right.x, right.y, right.z));

		let movementX = 32; // Arbitrary offset so that user starts at 0° and does not rotate wildly at start
		let movementY = 0;
		const removeMousemove = handlers.add(event.currentTarget, "mousemove", mousemoveEvent => {
			movementX += mousemoveEvent.movementX;
			movementY += mousemoveEvent.movementY;

			const angle = Math.atan2(movementY, movementX);

			// TODO take influence from 4D camera rotation
			tiedActions.setObjectRot(object, initialRot.mult(Rotor4.planeAngle(bivector, angle)));
		});

		const removeMousedown = handlers.add(event.currentTarget, "mousedown", mousedownEvent => {
			if (mousedownEvent.button === 2) { // If right-click, reset
				tiedActions.setObjectRot(object, initialRot);
				// Don't show context menu on right-click
				handlers.add(mousedownEvent.currentTarget, "contextmenu", preventDefault, {once: true});
			} else if (mousedownEvent.button !== 0) { // If not left-click, ignore
				return;
			}

			transforming = false;
			document.exitPointerLock();
			associatedToolButton(actions.rotate)?.classList.remove("subhighlighted");
			removeMousemove();
			removeMousedown();
		});
	},

	scale: ({event}) => {
		const object = userSelection.objectPrimary;

		transforming = true;
		event.currentTarget.requestPointerLock();
		associatedToolButton(actions.scale)?.classList.add("subhighlighted");

		const initialScale = object.scl.clone();

		let movementX = 0;
		const removeMousemove = handlers.add(event.currentTarget, "mousemove", mousemoveEvent => {
			movementX += mousemoveEvent.movementX;

			tiedActions.setObjectScl(object, initialScale.multScalar(movementX * movementSensitivity + 1));
		});

		const removeMousedown = handlers.add(event.currentTarget, "mousedown", mousedownEvent => {
			if (mousedownEvent.button === 2) { // If right-click, reset
				tiedActions.setObjectScl(object, initialScale);
				// Don't show context menu on right-click
				handlers.add(mousedownEvent.currentTarget, "contextmenu", preventDefault, {once: true});
			} else if (mousedownEvent.button !== 0) { // If not left-click, ignore
				return;
			}

			transforming = false;
			document.exitPointerLock();
			associatedToolButton(actions.scale)?.classList.remove("subhighlighted");
			removeMousemove();
			removeMousedown();
		});
	},
};

function angleFromMovement(mousemoveEvent) {
	return Math.sqrt(mousemoveEvent.movementX ** 2 + mousemoveEvent.movementY ** 2) / (2 * Math.PI) * movementSensitivity;
}
/**
 * Semantically, which actions are "associated" with which tool modes.
 * @type Map<Function, ToolMode>
 */
const actionAssociations = new Map([
	[actions.select, ToolMode.SELECTION],
	[actions.pan3, ToolMode.PAN3],
	[actions.turn3, ToolMode.TURN3],
	[actions.pan4, ToolMode.PAN4],
	[actions.turn4, ToolMode.TURN4],
	[actions.translate, ToolMode.TRANSLATE],
	[actions.rotate, ToolMode.ROTATE],
	[actions.scale, ToolMode.SCALE],
]);
function associatedToolButton(action) {
	return toolModeButtons.get(actionAssociations.get(action));
}

export function attachViewportControls(viewport) {
	const canvas = viewport.canvas;

	// Coords recorder
	// let x;
	// let y;
	// element.addEventListener("mousemove", event => {
	// 	x = event.clientX;
	// 	y = event.clientY;
	// });

	viewport.tabIndex = -1; // element must have tabIndex to be focusable (for keyboard events to fire)

	// Scroll to move forward

	canvas.addEventListener("wheel", event => {
		if (altPressed) {
			if (viewport.camera.usingPerspective) {
				viewport.camera.translateForward(event.deltaY * -.5 * movementSensitivity);
				tiedActions.setObjectPos(viewport.camera, viewport.camera.pos, {resetting: false});
			} else {
				tiedActions.setCameraRadius(viewport.camera, viewport.camera.radius * 1.25 ** (event.deltaY / 100));
			}
		} else {
			if (viewport.camera3Wrapper.usingPerspective) {
				viewport.camera3.translateZ(event.deltaY * .5 * movementSensitivity);
				tiedActions.setObjectPos(viewport.camera3Wrapper, viewport.camera3.position.toArray(new Vector4()), {resetting: false});

				// viewport.camera3.updateProjectionMatrix();
			} else {
				tiedActions.setCameraRadius(viewport.camera3Wrapper, viewport.camera3Wrapper.radius * 1.25 ** (event.deltaY / 100));
			}
		}
		event.preventDefault();
	});

	// DEL to delete the selected object

	viewport.addEventListener("keydown", event => {
		if (event.target !== event.currentTarget || event.repeat || event.key !== "Delete" || userSelection.size === 0) return;
		
		tiedActions.removeObject(...userSelection.objects());
		tiedActions.replaceSelection();
	});

	// G to move the selected object

	viewport.addEventListener("keydown", keydownEvent => {
		if (keydownEvent.target !== event.currentTarget
				|| keydownEvent.repeat
				|| keydownEvent.key !== "g"
				|| !userSelection.objectPrimary
				|| transforming
		) {
			return;
		}

		actions.translate({
			event: keydownEvent,
			viewport,
		});
	});

	// R to rotate the selected object

	viewport.addEventListener("keydown", keydownEvent => {
		if (keydownEvent.target !== event.currentTarget
				|| keydownEvent.repeat
				|| keydownEvent.key !== "r"
				|| !userSelection.objectPrimary
				|| transforming
		) {
			return;
		}

		actions.rotate({
			event: keydownEvent,
			viewport,
		});
	});

	// S to scale the selected object

	viewport.addEventListener("keydown", keydownEvent => {
		if (keydownEvent.target !== event.currentTarget
				|| keydownEvent.repeat
				|| keydownEvent.key !== "s"
				|| !userSelection.objectPrimary
				|| transforming
		) {
			return;
		}

		actions.scale({
			event: keydownEvent,
			viewport,
		});
	});
	

	// Build toolbar

	const toolbar = qs("toolbar-", viewport);

	const toolbarSelectionSection = toolbar.section().label("Selection");
	linkToolModeButton(toolbarSelectionSection.button("Select"), ToolMode.SELECTION, viewport);

	toolbar.separator();

	const toolbarCameraColumn = toolbar.column();

	const toolbarCamera4Section = toolbarCameraColumn.section().label("4D camera controls");
	linkToolModeButton(toolbarCamera4Section.button("Pan 4D"), ToolMode.PAN4, viewport);
	linkToolModeButton(toolbarCamera4Section.button("Turn 4D"), ToolMode.TURN4, viewport);
	toolbarCamera4Section.button("Zoom 4D");

	const toolbarCamera3Section = toolbarCameraColumn.section().label("3D camera controls");
	linkToolModeButton(toolbarCamera3Section.button("Pan 3D"), ToolMode.PAN3, viewport);
	linkToolModeButton(toolbarCamera3Section.button("Turn 3D"), ToolMode.TURN3, viewport);
	toolbarCamera3Section.button("Zoom 3D");

	toolbar.separator();

	const toolbarObjectSection = toolbar.section().label("Object transforms");
	linkToolModeButton(toolbarObjectSection.button("Translate"), ToolMode.TRANSLATE, viewport);
	linkToolModeButton(toolbarObjectSection.button("Rotate"), ToolMode.ROTATE, viewport);
	linkToolModeButton(toolbarObjectSection.button("Scale"), ToolMode.SCALE, viewport);
	viewport.toolbarObjectSection = toolbarObjectSection;

	handlers.setToolMode(ToolMode.SELECTION, viewport);
}

// Aux function for event handlers
function preventDefault(event) {
	event.preventDefault();
}

function localUpAndRight(viewport, object) {
	// `distance3` allows zoom to affect movement speed
	let distance3 = viewport.camera3Wrapper.viewboxDistanceFrom(object.pos);
	if (viewport.camera3Wrapper.usingPerspective) {
		distance3 /= 4; // Arbitrary correction constant
	}
	
	const directions = [
		new Three.Vector3(0, distance3, 0).applyQuaternion(viewport.camera3.quaternion).toArray(new Vector4()),
		new Three.Vector3(distance3, 0, 0).applyQuaternion(viewport.camera3.quaternion).toArray(new Vector4()),
	];

	// `distance4` allows unprojection to work correctly
	const distance4 = viewport.camera.viewboxDistanceFrom(object.pos);
	directions[0][3] = distance4;
	directions[1][3] = distance4;

	const [up, right] = viewport.camera.unprojectVector4(directions);
	return {up, right};
}

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