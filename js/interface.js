/**
 * @file Handles the controls and display of the user interface. 
 */

import {Vector4, Rotor4} from "./4d/vector.js";
import {scene, Object4, Camera4, Mesh4} from "./4d/objects.js";
import {SceneConverter} from "./sceneconverter.js";
import {attachViewportControls} from "./viewportcontrols.js";
import {declade, createElement} from "./util.js";
import * as Three from "./_libraries/three.module.js";

export const user = {
	selectedObjects: [],

	get selectedObjectPrimary() {
		return this.selectedObjects[0];
	},

	replaceSelection(...objects) {
		// Indicate that all current selections are unselected
		for (const object of this.selectedObjects) {
			for (const {wrapper} of Panel.panels.get(Panel.Types.VIEWPORT)) {
				const rep = wrapper.converter.objectReps.get(object);
				rep.setViewportState(SceneConverter.ViewportStates.DEFAULT);
			}
		}

		// Replace selections
		this.selectedObjects = objects;

		// Indicate that all current selections are selected
		for (let i = 0; i < objects.length; i++) {
			for (const {wrapper} of Panel.panels.get(Panel.Types.VIEWPORT)) {
				const rep = wrapper.converter.objectReps.get(objects[i]);
				rep.setViewportState(i === 0 ? SceneConverter.ViewportStates.SELECTED_PRIMARY : SceneConverter.ViewportStates.SELECTED);
			}
		}

		// Update object info panels
		for (const {wrapper} of Panel.panels.get(Panel.Types.OBJECT_PROPERTIES)) {
			wrapper.setTargetObject(this.selectedObjectPrimary);
		}
	},
};


// Classes

export class Panel extends HTMLElement {
	/**
	 * Set of all active viewport panels, by their type.
	 * @type Map<string, Set<Panel>>
	 */
	static panels = new Map();
	/**
	 * The panel types and the `name` attribute values that refer to them.
	 * @enum
	 */
	static Types = Object.freeze({
		VIEWPORT: "viewport",
		OBJECT_PROPERTIES: "object-properties",
	});

	wrapper = null;

	/**
	 * The panel type this panel had the previous time it was refreshed.
	 * @type string
	 */
	typeLastRefreshed = null;
	
	connectedCallback() {
		this.refreshType();
	}

	disconnectedCallback() {
		Panel.viewportPanels.delete(this);
	}

	get type() {
		return this.getAttribute("name");
	}

	get parentSetLastRefreshed() {
		return Panel.panels.get(this.typeLastRefreshed);
	}

	refreshType() {
		// Type did not change
		if (this.type === this.typeLastRefreshed) return;

		declade(this); // Clear this panel
		this.wrapper = null; // Remove the wrapper

		// Remove the panel from the set it is currently in
		this.parentSetLastRefreshed?.delete(this);

		switch (this.type) {
			case Panel.Types.VIEWPORT: {
				this.wrapper = new Viewport(this);
				break;
			}
			
			case Panel.Types.OBJECT_PROPERTIES: {
				this.wrapper = new ObjectPropertiesControl(this);
				break;
			}

		}

		this.typeLastRefreshed = this.type;

		// Add this to the set of panels of its type
		let set = Panel.panels.get(this.type);
		if (!set) {
			set = new Set();
			Panel.panels.set(this.type, set);
		}
		set.add(this);

		return this;
	}
}

class PanelWrapper {
	panelElement;
	
	constructor(panelElement) {
		this.panelElement = panelElement;
	}
}

// Multiple viewports currently not supported
class Viewport extends PanelWrapper {
	static renderQueue = new Set();
	static allNeedRerender = false;

	/**
	 * @type Camera4
	 */
	camera;
	camera3;

	converter = new SceneConverter(scene);
	
	renderer = new Three.WebGLRenderer({alpha: true, antialias: true});

	constructor(panelElement) {
		super(panelElement);

		// Scene setup
		// this.renderer.setClearColor(0xEEEEFF, 1);
		this.renderer.physicallyCorrectLights = true;

		this.camera3 = new Three.PerspectiveCamera(90, 1, .01, 1000);
		this.camera3.position.set(2, 3, 2);
		this.camera3.lookAt(0, 0, 0);

		this.refreshSize();

		const light = new Three.SpotLight(0xAC8C6C, 30);
		light.position.z = 10;
		this.converter.scene3.add(light);
		
		const ambientLight = new Three.AmbientLight(0xFFFFFF, 1);
		this.converter.scene3.add(ambientLight);

		this.camera = new Camera4(
			new Vector4(0, 0, 0, 3),
			new Rotor4(1, 0, 0, 0, 0, 0, 0, 0).normalize(),
		);

		// Connect renderer canvas, then attach events

		panelElement.appendChild(this.renderer.domElement);
		Viewport.renderQueue.add(this);

		this.attachControls();
	}

	attachControls() {
		attachViewportControls(this);
		return this;
	}

	/**
	 * Resets the size of the renderer canvas and the camera's aspect ratio.
	 */
	refreshSize() {
		this.renderer.setSize(this.panelElement.clientWidth, this.panelElement.clientHeight);
		
		this.camera3.aspect = this.panelElement.clientWidth / this.panelElement.clientHeight;
		this.camera3.updateProjectionMatrix(); // Refresh camera transform so it updates in render

		return this;
	}

	/**
	 * Updates all the 3D representatives of the objects in the scene and renders.
	 */
	render() {
		this.converter.refresh(this.camera);

		console.time("render");
		this.renderer.render(this.converter.scene3, this.camera3);
		console.timeEnd("render");

		return this;
	}

	raycastSelectFrom(mouseEvent, target) {
		// Get all elements at the click position
		const rect = (target ?? mouseEvent.currentTarget).getBoundingClientRect();
	
		// Maps element coordinates to [-1, 1] in both directions
		const mouse = new Three.Vector2(
			2 * (mouseEvent.clientX - rect.left) / rect.width - 1,
			-(2 * (mouseEvent.clientY - rect.top) / rect.height - 1),
		);
		raycaster.setFromCamera(mouse, this.camera3);
			
		const objects = raycaster.intersectObjects([...this.converter.objectClickboxes.keys()]);
		// Get the 4D object represented by the 3D object containing the closest clicked face
		const rep = this.converter.objectClickboxes.get(objects[0]?.object);

		console.time("select object");
		if (rep) {
			user.replaceSelection(rep.object);
		} else {
			user.replaceSelection();
		}
		console.timeEnd("select object");

		Viewport.renderQueue.add(this);

		return this;
	}
}

class ObjectPropertiesControl extends PanelWrapper {
	textContainer;

	constructor(panelElement) {
		super(panelElement);

		this.textContainer = createElement("form", {
			parent: panelElement,
		});
	}

	static vectorLabels = ["X", "Y", "Z", "W"];
	static rotorLabels = ["", "XY", "XZ", "XW", "YZ", "YW", "ZW", "XYZW"];

	static createPolymultivectorInputs(pmvector) {
		// TODO messy & inefficient

		// Map each input to the index it refers to
		const inputIndexes = new Map();

		const form = createElement("form", {
			listeners: {
				change: [
					[event => {
						const value = parseFloat(event.target.value);
		
						if (!isNaN(value)) {
							const index = inputIndexes.get(event.target);
							pmvector[index] = value;
							Viewport.allNeedRerender = true;
						}
		
						refresh();
					}],
				],
			},
		});

		function refresh() {
			for (const [input, index] of inputIndexes) {
				input.value = pmvector[index];
			}
		}

		// Set refresh/onchange callbacks
 		/* if (pmvector instanceof Vector4) {
			refresh = () => {
				for (const [input, index] of inputIndexes) {
					input.value = pmvector[index];
				}
			};

			onchange = input => {
				const value = parseFloat(input.value);

				if (!isNaN(value)) {
					const index = inputIndexes.get(input);
					pmvector[index] = value;
					Viewport.allNeedRerender = true;
				}

				refresh();
			};

			inputLabels = this.vectorLabels;

 		} else if (pmvector instanceof Rotor4) {
			refresh = () => {
				const angle = pmvector.angle;
				const plane = pmvector.plane;

				for (const [input, index] of inputIndexes) {
					if (index === 0) {
						input.value = angle * 180 / Math.PI;
					} else {
						input.value = plane[index - 1];
					}
				}
			};

			onchange = input => {
				const value = parseFloat(input.value);

				if (!isNaN(value)) {
					const plane = [];
					let angle;

					for (const input of inputIndexes.keys()) {
						if (inputIndexes.get(input) === 0) {
							angle = input.angle * Math.PI / 180;
						} else {
							plane.push(input.value);
						}
					}

					pmvector.set(Rotor4.planeAngle(plane, angle));
					Viewport.allNeedRerender = true;
				}

				refresh();
			};

			inputLabels = this.rotorLabels;

		} else {
			throw new TypeError("Polymultivector type not supported");
		} */

		let inputLabels;
		if (pmvector instanceof Vector4) {
			inputLabels = ObjectPropertiesControl.vectorLabels;
		} else if (pmvector instanceof Rotor4) {
			inputLabels = ObjectPropertiesControl.rotorLabels;
		}

		// One input for each dimension
		for (let i = 0; i < pmvector.length; i++) {
			inputIndexes.set(createElement("input", {
				properties: {type: "text"},
				parent: form,
			}), i);

			createElement("label", {
				textContent: inputLabels[i],
				parent: form,
			});

			createElement("br", {
				parent: form,
			});
		}

		refresh();

		return form;
	}

	setTargetObject(object) {
		declade(this.textContainer);

		if (object instanceof Mesh4) {
			createElement("h3", {
				textContent: "Position",
				parent: this.textContainer,
			});
			this.textContainer.appendChild(ObjectPropertiesControl.createPolymultivectorInputs(object.pos));

			createElement("h3", {
				textContent: "Rotation",
				parent: this.textContainer,
			});
			this.textContainer.appendChild(ObjectPropertiesControl.createPolymultivectorInputs(object.rot));

			createElement("h3", {
				textContent: "Scale",
				parent: this.textContainer,
			});
			this.textContainer.appendChild(ObjectPropertiesControl.createPolymultivectorInputs(object.scl));
		}
	}
}


// Other

// Raycaster, used in object selection
const raycaster = new Three.Raycaster();

// Refresh the viewport panels whenever the window resizes
addEventListener("resize", () => {
	for (const {wrapper} of Panel.panels.get(Panel.Types.VIEWPORT)) {
		wrapper.refreshSize();
		Viewport.renderQueue.add(wrapper);
	}
});

// Constantly check if any of the viewports need to be updated
function viewportRerenderLoop() {
	if (Viewport.allNeedRerender) {
		for (const {wrapper} of Panel.panels.get(Panel.Types.VIEWPORT)) {
			wrapper.render();
		}

		Viewport.renderQueue.clear();
		Viewport.allNeedRerender = false;

	} else {
		for (const wrapper of Viewport.renderQueue) {
			wrapper.render();
			Viewport.renderQueue.delete(wrapper);
		}
	}

	requestAnimationFrame(viewportRerenderLoop);
}
requestAnimationFrame(viewportRerenderLoop);