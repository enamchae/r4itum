/**
 * @file Handles the controls and display of the user interface. 
 */

import {Vector4, Rotor4} from "./4d/vector.js";
import {Scene4, Object4, Camera4, Mesh4, Axis4} from "./4d/objects.js";
import {SceneConverter, Camera3Wrapper4} from "./sceneconverter.js";
import {VectorEditor, RotorEditor, AngleEditor, PositiveNumberEditor} from "./vectoredit.js";
import {attachViewportControls} from "./viewportcontrols.js";
import {declade, createElement} from "./util.js";
import * as Three from "./_libraries/three.module.js";

export const scene = new Scene4();
const axisColors = [
	// {hsv(n * 360° / 4, 0.7, 1) | n ∈ ℤ}, adjusted slightly for luminance
	0xFF4D4D, // X
	0x8DD941, // Y
	0x2BD9D9, // Z
	0xA767E6, // W
];
for (let i = 0; i < 4; i++) {
	scene.addObjectReference(new Axis4(i, 8, axisColors[i]));
}

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
				rep?.setViewportState(SceneConverter.ViewportStates.DEFAULT);
			}
		}

		// Replace selections
		this.selectedObjects = objects;

		// Indicate that all current selections are selected
		for (let i = 0; i < objects.length; i++) {
			for (const viewport of Viewport.members) {
				const rep = viewport.converter.objectReps.get(objects[i]);
				rep?.setViewportState(i === 0 ? SceneConverter.ViewportStates.SELECTED_PRIMARY : SceneConverter.ViewportStates.SELECTED);
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
	/**
	 * @type Set<Viewport>
	 */
	static members = new Set();

	/**
	 * @type Set<Viewport>
	 */
	static renderQueue = new Set();
	static allNeedRerender = false;

	/**
	 * @type WeakMap<Camera3Wrapper4, Viewport>
	 */
	static camera3Wrappers = new WeakMap();

	/**
	 * @type Camera4
	 */
	camera;
	/**
	 * @type Camera3Wrapper4
	 */
	camera3Wrapper;

	converter = new SceneConverter(scene);
	
	renderer = new Three.WebGLRenderer({alpha: true, antialias: true});

	constructor() {
		super();

		// Camera setup
		this.camera = new Camera4(
			new Vector4(0, 0, 0, 3),
			new Rotor4(1, 0, 0, 0, 0, 0, 0, 0).normalize(),
		).setName("4D-to-3D camera");

		this.camera3Wrapper = new Camera3Wrapper4().setName("3D-to-screen camera");
		this.camera3.position.set(0, 0, 3);
		this.camera3.lookAt(0, 0, 0);

		this.camera.nameEditable = false;
		this.camera3Wrapper.nameEditable = false;

		Viewport.camera3Wrappers.set(this.camera3Wrapper, this);
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
		
		this.camera3.aspect = this.aspectRatio;
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

	get aspectRatio() {
		return this.clientWidth / this.clientHeight;
	}

	get camera3() {
		return this.camera3Wrapper.object3;
	}
}

export class ObjectList extends HTMLElement {
	static members = new Set();

	bars = new WeakMap();

	textContainer;
	list;

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

			listeners: {
				mousedown: [ // Not click event!
					[preventDefault],
				],
			},

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

export class ObjectPropertiesControl extends HTMLElement {
	/**
	 * @type Set<ObjectPropertiesControl>
	 */
	static members = new Set();

	textContainer;

	posEditor = null;
	rotEditor = null;
	sclEditor = null;

	targetObject = null;

	constructor() {
		super();

		this.classList.add("inactive");
	}

	connectedCallback() {
		createElement("h2", {
			textContent: "Object properties",
			parent: this,
		});

		this.textContainer = createElement("div", {
			classes: ["panel-content"],
			parent: this,
		});

		ObjectPropertiesControl.members.add(this);
	}

	hasAsTargetObject(object) {
		return this.targetObject === object;
	}

	setTargetObject(object) {
		declade(this.textContainer);

		if (!object) {
			this.posEditor = null;
			this.rotEditor = null;
			this.sclEditor = null;
			this.targetObject = null;
			this.classList.add("inactive");
			return;
		}
		this.targetObject = object;
		this.classList.remove("inactive");

		this.createPropertyInputs(object);

		return this;
	}

	/**
	 * 
	 * @param {Object4} object 
	 */
	createPropertyInputs(object) {
		this.appendHeader("Name");
		createElement("input", {
			properties: {
				type: "text",
				value: object.name,
			},
			listeners: {
				change: [
					[event => {
						object.setName(event.target.value);
					}],
				],
			},
			classes: object.nameEditable ? [] : ["disabled"],
			parent: this.textContainer,
		});

		if (object instanceof Mesh4) {
			// Tint
			this.appendHeader("Tint");
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
		}

		if (object instanceof Camera4 || object instanceof Camera3Wrapper4) {
			const radioName = "dist-type";

			this.appendHeader("Distance handling");
			createElement("form", {
				listeners: {
					change: [
						[event => {
							const value = Boolean(Number(event.target.value));

							if (object instanceof Camera4) {
								object.usingPerspective = value;
							} else if (object instanceof Camera3Wrapper4) {
								const viewport = Viewport.camera3Wrappers.get(object);
								object.setUsingPerspective(value, viewport.aspectRatio);
							}
							Viewport.allNeedRerender = true;
						}],
					],
				},

				children: [
					createElement("input-block", {
						children: [
							createElement("input", {
								properties: {
									name: radioName,
									type: "radio", 
									value: "1",
									checked: object.usingPerspective,
								},
							}),
							createElement("label", {
								textContent: "Perspective",
							}),
						],
					}),
					
					createElement("input-block", {
						children: [
							createElement("input", {
								properties: {
									name: radioName,
									type: "radio", 
									value: "0", 
									checked: !object.usingPerspective,
								},
							}),
							createElement("label", {
								textContent: "Parallel",
							}),
						],
					}),
				],

				classes: ["horizontal"],

				parent: this.textContainer,
			});
			
			this.appendHeader("FOV angle");
			createElement(new AngleEditor(object.fovAngle * 180 / Math.PI), {
				listeners: {
					update: [
						[({detail}) => {
							object.fovAngle = detail.valueUsed * Math.PI / 180;
							Viewport.allNeedRerender = true;
						}],
					],
				},
				parent: this.textContainer,
			});
			
			this.appendHeader("Uniform distance");
			createElement(new PositiveNumberEditor(object.radius), {
				listeners: {
					update: [
						[({detail}) => {
							object.radius = detail.valueUsed;
							Viewport.allNeedRerender = true;
						}],
					],
				},
				parent: this.textContainer,
			});
		}

		// Transforms

		this.posEditor = createElement(new VectorEditor(object.pos, object instanceof Camera3Wrapper4), {
			listeners: {
				update: [
					[({detail}) => {
						if (object instanceof Camera3Wrapper4) { // Convert the value into a Three-understandable vector
							object.setPos(detail.currentTarget.value);
						} else { // Only set the changed value
							object.pos[detail.index] = detail.valueUsed;
						}
						Viewport.allNeedRerender = true;
					}],
				],
			},
		});

		this.rotEditor = createElement(new RotorEditor(object.rot, object instanceof Camera3Wrapper4), {
			listeners: {
				update: [
					[({detail}) => {
						object.setRot(detail.currentTarget.value);
						Viewport.allNeedRerender = true;
					}],
				],
			},
			parent: this.textContainer,
		});

		const transformsChildren = [
			this.appendHeader("Position", null),
			this.posEditor,
			this.appendHeader("Rotation", null),
			this.rotEditor,
		];

		if (object instanceof Mesh4) { // Cameras are not affected by scale
			this.sclEditor = createElement(new VectorEditor(object.scl), {
				listeners: {
					update: [
						[({detail}) => {
							object.scl[detail.index] = detail.valueUsed;
							Viewport.allNeedRerender = true;
						}],
					],
				},
			});

			transformsChildren.push(
				this.appendHeader("Scale", null),
				this.sclEditor,
			);
		}


		this.appendHeader("Transformation");
		createElement("div", {
			classes: ["panel-content"],
			parent: this.textContainer,

			children: transformsChildren,
		});
	}

	appendHeader(label, parent=this.textContainer) {
		return createElement("h3", {
			textContent: label,
			parent,
		});
	}
}

export class CameraPropertiesControl extends HTMLElement {
	static members = new Set();

	connectedCallback() {
		createElement("h2", {
			textContent: "Camera",
			parent: this,
		});

		this.textContainer = createElement("div", {
			classes: ["panel-content"],
			parent: this,

			children: [
				createElement("h3", {
					textContent: "4D camera",
				}),
				createElement("button", {
					textContent: "Select",
					listeners: {
						click: [
							[() => {
								// temp solution to get viewport
								const viewport = Viewport.members.values().next().value;

								user.replaceSelection(viewport.camera);
								Viewport.allNeedRerender = true;
							}],
						],

						mousedown: [ // Not click event!
							[preventDefault],
						],
					},
				}),

				createElement("h3", {
					textContent: "3D camera",
				}),
				createElement("button", {
					textContent: "Select",
					listeners: {
						click: [
							[() => {
								// temp solution to get viewport
								const viewport = Viewport.members.values().next().value;

								user.replaceSelection(viewport.camera3Wrapper);
								Viewport.allNeedRerender = true;
							}],
						],

						mousedown: [
							[preventDefault], // Prevent losing focus from viewport
						],
					},
				}),
			],
		});

		CameraPropertiesControl.members.add(this);
	}
}

function preventDefault(event) {
	event.preventDefault(); 
};


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