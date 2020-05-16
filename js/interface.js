/**
 * @file Handles the controls and display of the user interface. 
 */

import {Vector4, Rotor4} from "./4d/vector.js";
import {Scene4, Object4, Camera4, Mesh4} from "./4d/objects.js";
import {SceneConverter} from "./sceneconverter.js";
import {attachViewportControls} from "./viewportcontrols.js";
import {declade, createElement} from "./util.js";
import * as Three from "./_libraries/three.module.js";

export const scene = new Scene4();

export const user = {
	/**
	 * @type Object4[]
	 */
	selectedObjects: [],

	get selectedObjectPrimary() {
		return this.selectedObjects[0];
	},

	/**
	 * 
	 * @param  {...Object4} objects 
	 */
	replaceSelection(...objects) {
		// Indicate that all current selections are unselected
		for (const object of this.selectedObjects) {
			for (const viewport of Viewport.members) {
				const rep = viewport.converter.objectReps.get(object);
				rep.setViewportState(SceneConverter.ViewportStates.DEFAULT);
			}
		}

		// Replace selections
		this.selectedObjects = objects;

		// Indicate that all current selections are selected
		for (let i = 0; i < objects.length; i++) {
			for (const viewport of Viewport.members) {
				const rep = viewport.converter.objectReps.get(objects[i]);
				rep.setViewportState(i === 0 ? SceneConverter.ViewportStates.SELECTED_PRIMARY : SceneConverter.ViewportStates.SELECTED);
			}
		}

		// Update object info panels
		for (const panel of ObjectPropertiesControl.members) {
			panel.setTargetObject(this.selectedObjectPrimary);
		}

		return this;
	},
};

// Classes

// Multiple viewports currently not supported
export class Viewport extends HTMLElement {
	static members = new Set();

	static renderQueue = new Set();
	static allNeedRerender = false;

	/**
	 * @type Camera4
	 */
	camera;
	camera3;

	converter = new SceneConverter(scene);
	
	renderer = new Three.WebGLRenderer({alpha: true, antialias: true});

	constructor() {
		super();

		// Scene setup
		// this.renderer.setClearColor(0xEEEEFF, 1);
		this.renderer.physicallyCorrectLights = true;

		this.camera3 = new Three.PerspectiveCamera(90, 1, .01, 1000);
		this.camera3.position.set(0, 0, 3);
		this.camera3.lookAt(0, 0, 0);

		const light = new Three.SpotLight(0xAC8C6C, 30);
		light.position.z = 10;
		this.converter.scene3.add(light);
		
		const ambientLight = new Three.AmbientLight(0xFFFFFF, 1);
		this.converter.scene3.add(ambientLight);

		this.camera = new Camera4(
			new Vector4(0, 0, 0, 3),
			new Rotor4(1, 0, 0, 0, 0, 0, 0, 0).normalize(),
		);

	}

	connectedCallback() {
		// Connect renderer canvas, then attach events

		this.refreshSize();

		this.attachShadow({mode: "open"});
		this.shadowRoot.appendChild(this.renderer.domElement);
		this.queueRender();

		this.attachControls();

		Viewport.members.add(this);
	}

	disconnectedCallback() {
		Viewport.members.delete(this);
	}

	attachControls() {
		attachViewportControls(this, user);
		return this;
	}

	/**
	 * Resets the size of the renderer canvas and the camera's aspect ratio.
	 */
	refreshSize() {
		this.renderer.setSize(this.clientWidth, this.clientHeight);
		
		this.camera3.aspect = this.clientWidth / this.clientHeight;
		this.camera3.updateProjectionMatrix(); // Refresh camera transform so it updates in render

		return this;
	}

	/**
	 * Updates all the 3D representatives of the objects in the scene and renders.
	 */
	render() {
		console.time("refresh");
		console.groupCollapsed();
		this.converter.refresh(this.camera);
		console.groupEnd();
		console.timeEnd("refresh");

		console.time("render");
		this.renderer.render(this.converter.scene3, this.camera3);
		console.timeEnd("render");

		return this;
	}

	queueRender() {
		Viewport.renderQueue.add(this);
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
			
		const intersections = raycaster.intersectObjects([...this.converter.objectClickboxes.keys()]);

		let rep = null;
		objectsLoop:
		for (const intersection of intersections) {
			// Get the 4D object's 3D representative from the intersected face
			const repPotential = this.converter.objectClickboxes.get(intersection?.object);

			const positions = repPotential.mesh3.geometry.getAttribute("position").array;
			for (const index of ["a", "b", "c"]) {
				// If any of the vertices is behind the camera, reject this face
				if (positions[4 * intersection.face[index] + 3] <= 0) {
					continue objectsLoop;
				}
			}

			// If all the vertices are in front, set the rep to be selected as this rep
			rep = repPotential;
			break;
		}

		// console.time("select object");
		if (rep) {
			user.replaceSelection(rep.object);
		} else {
			user.replaceSelection();
		}
		// console.timeEnd("select object");

		this.queueRender();

		return this;
	}
}

export class ObjectPropertiesControl extends HTMLElement {
	static members = new Set();

	textContainer;

	constructor() {
		super();

		this.classList.add("inactive");
	}

	connectedCallback() {
		createElement("h2", {
			textContent: "Object properties",
			parent: this,
		});

		this.textContainer = createElement("form", {
			classes: ["panel-content"],
			parent: this,
		});

		ObjectPropertiesControl.members.add(this);
	}

	static createPolymultivectorInputs(pmvector) {
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

		// One input for each dimension
		for (let i = 0; i < pmvector.length; i++) {
			inputIndexes.set(createElement("input", {
				properties: {type: "text"},
				parent: form,
			}), i);
		}

		refresh();

		return form;
	}

	setTargetObject(object) {
		declade(this.textContainer);

		if (!object) {
			this.classList.add("inactive");
			return;
		}
		this.classList.remove("inactive");

		if (object instanceof Mesh4) {
			createElement("h3", {
				textContent: "Tint",
				parent: this.textContainer,
			});
			createElement("input", {
				properties: {
					type: "color",
					value: `#${object.tint.toString(16)}`,
				},
				listeners: {
					change: [
						[event => {
							object.tint = parseInt(event.currentTarget.value.slice(1), 16);
							Viewport.allNeedRerender = true;
						}],
					],
				},
				parent: this.textContainer,
			});

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

export class ObjectList extends HTMLElement {
	static members = new Set();

	bars = new WeakMap();

	textContainer;
	list;

	constructor() {
		super();
	}

	connectedCallback() {
		createElement("h2", {
			textContent: "Object list",
			parent: this,
		});

		this.textContainer = createElement("div", {
			classes: ["panel-content"],
			parent: this,
		});

		this.list = createElement("ul", {
			classes: ["bars"],
			attributes: [
				["data-empty-text", "nothing"],
			],
			parent: this.textContainer,
		});

		ObjectList.members.add(this);
	}

	addItem(...objects) {
		for (const object of objects) {
			const bar = createElement("li", {
				textContent: object.name,
				parent: this.list,

				listeners: {
					click: [
						[() => {
							user.replaceSelection(object);
							Viewport.allNeedRerender = true;
						}],
					],

					mousedown: [
						[event => {
							event.preventDefault(); // Prevent losing focus from viewport
						}],
					]
				},
			});

			this.bars.set(object, bar);
		}

		return this;
	}

	removeItem(...objects) {
		for (const object of objects) {
			this.bars.get(object).remove();
		}

		return this;
	}
}


// Other

// Raycaster, used in object selection
const raycaster = new Three.Raycaster();

// Refresh the viewport panels whenever the window resizes
addEventListener("resize", () => {
	for (const viewport of Viewport.members) {
		viewport.refreshSize();
	}

	Viewport.allNeedRerender = true;
});

// Constantly check if any of the viewports need to be updated
function viewportRerenderLoop() {
	if (Viewport.allNeedRerender) {
		for (const viewport of Viewport.members) {
			viewport.render();
		}

		Viewport.renderQueue.clear();
		Viewport.allNeedRerender = false;

	} else {
		for (const viewport of Viewport.renderQueue) {
			viewport.render();
			Viewport.renderQueue.delete(viewport);
		}
	}

	requestAnimationFrame(viewportRerenderLoop);
}
requestAnimationFrame(viewportRerenderLoop);