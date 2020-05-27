/**
 * @file Handles the controls and display of the user interface. 
 */

import {Vector4, Rotor4} from "./4d/vector.js";
import {Scene4, Object4, Camera4, Mesh4, Axis4} from "./4d/objects.js";
import construct from "./4d/construction.js";
import {SceneConverter, Camera3Wrapper4} from "./sceneconverter.js";
import {VectorEditor, RotorEditor, AngleEditor, PositiveNumberEditor} from "./vectoredit.js";
import {attachViewportControls} from "./viewportcontrols.js";
import {Toolbar} from "./toolbar.js";
import {TransformWidget} from "./transformwidget.js";
import {qs, declade, createElement} from "./util.js";
import tiedActions from "./interfaceties.js";
import userSelection from "./userselection.js";
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

const lastSelectedViewport = qs("viewport-"); // temp

const contextMenus = qs("context-menus");

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

	static queueAllRerender() {
		this.allNeedRerender = true;
		return this;
	}

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

	overlaysContainer = null;
	/**
	 * @type Toolbar
	 */
	toolbar = null;
	transformWidget = null;
	panelsContainer = null;

	constructor() {
		super();

		// Camera setup
		this.camera = new Camera4(
			new Vector4(0, 0, 0, 3),
			new Rotor4(1, 0, 0, 0, 0, 0, 0, 0).normalize(),
		).setName("4D-to-3D camera").saveDefaultTransforms();

		this.camera3Wrapper = new Camera3Wrapper4().setName("3D-to-viewport camera");
		this.camera3.position.set(0, 0, 3);
		this.camera3.lookAt(0, 0, 0);
		this.camera3Wrapper.saveDefaultTransforms();

		this.camera.nameEditable = false;
		this.camera3Wrapper.nameEditable = false;

		Viewport.camera3Wrappers.set(this.camera3Wrapper, this);
	}

	connectedCallback() {
		declade(this);

		// Connect renderer canvas, then attach events

		this.refreshSize();

		this.prepend(this.renderer.domElement);

		this.overlaysContainer = createElement("overlays-", {
			parent: this,
			
			children: [
				createElement("div", {
					attributes: [
						["name", "bottom-row"],
					],

					children: [
						(this.transformWidget = new TransformWidget().setMode(TransformWidget.WidgetMode.ROTATE)),
						(this.toolbar = new Toolbar()),
					],
				}),

				(this.panelsContainer = createElement("panels-", {
					children: [
						createElement(ObjectList, {
							classes: ["panel"]
						}).initializeElements(),
						createElement(ObjectPropertiesControl, {
							classes: ["panel"]
						}).initializeElements(),
						createElement(CameraPropertiesControl, {
							classes: ["panel"]
						}).initializeElements(),
					],
				})),
			],
		});

		this.queueRender();

		this.attachControls();

		this.toolbarObjectSection.disable(!userSelection.objectPrimary);

		Viewport.members.add(this);
	}

	disconnectedCallback() {
		Viewport.members.delete(this);
	}

	attachControls() {
		attachViewportControls(this);
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
		// console.time("refresh");
		// console.groupCollapsed();
		this.converter.refresh(this.camera);
		// console.groupEnd();
		// console.timeEnd("refresh");

		// console.time("render");
		this.renderer.render(this.converter.scene3, this.camera3);
		// console.timeEnd("render");

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
			tiedActions.replaceSelection(rep.object);
		} else {
			tiedActions.replaceSelection();
		}
		// console.timeEnd("select object");

		return this;
	}

	get aspectRatio() {
		return this.clientWidth / this.clientHeight;
	}

	get camera3() {
		return this.camera3Wrapper.object3;
	}

	get canvas() {
		return this.renderer.domElement;
	}

	get toolbarObjectSection() {
		return qs(`toolbar-section[name="object-transforms"]`);
	}
}

function createObject(geometry, name) {
	const object = new Mesh4(geometry).setName(name).saveDefaultTransforms();
	tiedActions.addObject(object);
	tiedActions.replaceSelection(object);
	contextMenus.clear();

	lastSelectedViewport.focus();
}

export class ObjectList extends HTMLElement {
	/**
	 * @type Set<ObjectList>
	 */
	static members = new Set();

	/**
	 * @type WeakMap<Object4, HTMLLIElement>
	 */
	bars = new WeakMap();

	textContainer;
	list;

	initializeElements() {
		createElement("h2", {
			textContent: "Object list",
			parent: this,
		});

		this.textContainer = createElement("div", {
			classes: ["panel-content"],
			parent: this,
		});
		this.createInputs();

		ObjectList.members.add(this);

		return this;
	}

	createInputs() {
		this.list = createElement("ul", {
			classes: ["bars"],
			attributes: [
				["data-empty-text", "nothing"],
			],

			parent: this.textContainer,
		});

		createElement("button", {
			textContent: "Add mesh",
			parent: this.textContainer,

			listeners: {
				click: [
					[event => {
						const menu = contextMenus.addMenu();
						menu.positionFromEvent(event);

						// menu.buttonSubmenu("Construct", menu => {
						// menu.button("Point", () => {
						// 	createObject(construct.point(), "Point");
						// });

						menu.button("Segment", () => {
							createObject(construct.segment(), "Segment");
						});

						menu.buttonSubmenu("2D", menu => {
							menu.label("Regular polygon");
							
							const editor = new PositiveNumberEditor(6).override({
								inputStepValue() {
									return 1;
								},
						
								isValidValue(value) {
									return value > 0 && value % 1 === 0;
								},
							});
							menu.element(editor);

							menu.button("n-gon", () => {
								createObject(construct.polygon(editor.value), "Polygon");
							});
						});

						menu.buttonSubmenu("3D", menu => {
							menu.label("Regular polyhedron");
							menu.button("Tetrahedron", () => {
								createObject(construct.tetrahedron(), "Tetrahedron");
							});
							menu.button("Cube", () => {
								createObject(construct.hexahedron(), "Cube");
							});
							menu.button("Octahedron", () => {
								createObject(construct.octahedron(), "Octahedron");
							});
							menu.button("Dodecahedron", () => {
								createObject(construct.dodecahedron(), "Dodecahedron");
							});
							menu.button("Icosahedron", () => {
								createObject(construct.icosahedron(), "Icosahedron");
							});
							menu.separator();
							menu.button("Möbius strip", () => {
								createObject(construct.mobiusStrip(), "Möbius strip");
							});
							menu.button("Lat-long sphere", () => {
								createObject(construct.latlongsphere(), "Sphere");
							});
						});

						menu.buttonSubmenu("4D", menu => {
							menu.label("Regular polychoron");
							menu.button("5-cell", () => {
								createObject(construct.pentachoron(), "5-cell");
							});
							menu.button("Tesseract", () => {
								createObject(construct.octachoron(), "Tesseract");
							});
							menu.button("16-cell", () => {
								createObject(construct.hexadecachoron(), "16-cell");
							});
							menu.button("24-cell", () => {
								createObject(construct.icositetrachoron(), "24-cell");
							});
							menu.button("120-cell", () => {
								createObject(construct.hecatonicosachoron(), "120-cell");
							});
							menu.button("600-cell", () => {
								createObject(construct.hexacosichoron(), "600-cell");
							});
							menu.separator();
							menu.button("Klein bottle", () => {
								createObject(construct.kleinBottle(), "Klein bottle");
							});
						});
						// });

						// menu.buttonSubmenu("Import");
					}],
				],
			},
		});
	}

	addItem(...objects) {
		for (const object of objects) {
			const bar = createElement("li", {
				children: [
					createElement("div", {
						textContent: object.name,
					}),
				],
				parent: this.list,

				classes: ["button"],

				listeners: {
					click: [
						[() => {
							tiedActions.replaceSelection(object);
						}],
					],
				},
			});

			this.bars.set(object, bar);
		}

		return this;
	}

	getBar(object) {
		return this.bars.get(object);
	}

	highlightBar(object) {
		const bar = this.getBar(object);

		if (bar) {
			bar.classList.add("highlighted");
			bar.scrollIntoView();
		}

		return this;
	}

	unhighlightBar(object) {
		this.getBar(object)?.classList.remove("highlighted");
		return this;
	}

	removeItem(...objects) {
		for (const object of objects) {
			this.getBar(object)?.remove();
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
	radiusEditor = null;

	targetObject = null;

	constructor() {
		super();

		this.classList.add("inactive");
	}

	initializeElements() {
		createElement("h2", {
			textContent: "Object properties",
			parent: this,
		});

		this.textContainer = createElement("div", {
			classes: ["panel-content"],
			parent: this,
		});

		ObjectPropertiesControl.members.add(this);

		return this;
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
			this.radiusEditor = null;
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
		this.appendHeading("Name");
		createElement("input", {
			properties: {
				type: "text",
				value: object.name,
			},
			listeners: {
				change: [
					[event => {
						object.setName(event.target.value);
						for (const objectList of ObjectList.members) {
							const bar = objectList.bars.get(object);
							if (bar) {
								bar.textContent = event.target.value;
							}
						}
					}],
				],
			},
			classes: object.nameEditable ? [] : ["disabled"],
			parent: this.textContainer,
		});

		if (object instanceof Mesh4) {
			// Tint
			this.appendHeading("Display");

			createElement("div", {
				classes: ["panel-content"],
				parent: this.textContainer,

				children: [
					this.appendHeading("Tint", null),
					createElement("input", {
						properties: {
							type: "color",
							value: `#${object.tint.toString(16)}`,
						},
						listeners: {
							change: [
								[event => {
									object.tint = parseInt(event.currentTarget.value.slice(1), 16);
									Viewport.queueAllRerender();
								}],
							],
						},
						parent: this.textContainer,
					}),

					this.appendHeading("Face opacity", null),
					createElement(new PositiveNumberEditor(object.opacity).override({
						isValidValue(value, index) {
							return 0 <= value && value <= 1;
						},

						inputStepValue() {
							return 0.05;
						},
					}), {
						listeners: {
							update: [
								[({detail}) => {
									tiedActions.setObjectOpacity(object, detail.valueUsed);
								}],
							],
						},
					}),
				],
			});
		}

		if (object instanceof Camera4 || object instanceof Camera3Wrapper4) {
			const radioName = "dist-type";

			this.appendHeading("Distance handling");
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
							Viewport.queueAllRerender();

							perspectiveSettings.classList.toggle("hidden", !value);
							parallelSettings.classList.toggle("hidden", value);
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
								properties: {
									title: "Objects are distorted depending on their distance from the camera's viewing frame",
								},
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
								properties: {
									title: "Objects are treated as if they all have the same distance from the camera's viewing frame",
								},
							}),
						],
					}),
				],

				classes: ["horizontal"],

				parent: this.textContainer,
			});
			
			const perspectiveSettings = createElement("div", {
				classes: ["panel-content"],
				parent: this.textContainer,

				children: [
					this.appendHeading("FOV angle", null, `Angle representing the wideness of the camera's viewbox
Equivalent to zoom for perspective cameras [closer to 0° is larger, closer to 180° is smaller]`),
					createElement(new AngleEditor(object.fovAngle * 180 / Math.PI)
							.override({
								isValidValue(value) {
									return 0 < value && value < 180;
								},
							}), {
								listeners: {
									update: [
										[({detail}) => {
											object.fovAngle = detail.valueUsed * Math.PI / 180;
											Viewport.queueAllRerender();
										}],
									],
								},
							}),
						],
					});

			this.radiusEditor = createElement(new PositiveNumberEditor(object.radius), {
				listeners: {
					update: [
						[({detail}) => {
							object.radius = detail.valueUsed;
							Viewport.queueAllRerender();
						}],
					],
				},
			});
			
			const parallelSettings = createElement("div", {
				classes: ["panel-content"],
				parent: this.textContainer,

				children: [
					this.appendHeading("Distance", null , `Apparent distance of all points
Equivalent to zoom for parallel cameras [closer to 0 is larger]`),
					this.radiusEditor,
				],
			});

			perspectiveSettings.classList.toggle("hidden", !object.usingPerspective);
			parallelSettings.classList.toggle("hidden", object.usingPerspective);
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
						Viewport.queueAllRerender();
					}],
				],
			},
		});

		this.rotEditor = createElement(new RotorEditor(object.rot, object instanceof Camera3Wrapper4), {
			listeners: {
				update: [
					[({detail}) => {
						object.setRot(detail.currentTarget.value);
						Viewport.queueAllRerender();
					}],
				],
			},
			parent: this.textContainer,
		});

		const transformsChildren = [
			this.appendHeading("Position", null),
			this.posEditor,
			createElement("button", {
				textContent: "Reset",
				listeners: {
					click: [
						[() => {
							tiedActions.setObjectPos(object, object.defaultTransforms.pos);
						}],
					],
				},
			}),

			this.appendHeading("Simple rotation", null, `Orientations of an object may be represented as a plane of rotation paired with an angle
A plane can be represented as a collection of coefficients which determine how much influence each basis plane has on the plane of rotation
The plane must not be all zeros in order for the angle to have an effect`),
			this.rotEditor,
			createElement("button", {
				textContent: "Reset",
				listeners: {
					click: [
						[() => {
							tiedActions.setObjectRot(object, object.defaultTransforms.rot);
						}],
					],
				},
			}),
		];

		if (object instanceof Mesh4) { // Cameras are not affected by scale
			this.sclEditor = createElement(new VectorEditor(object.scl), {
				listeners: {
					update: [
						[({detail}) => {
							object.scl[detail.index] = detail.valueUsed;
							Viewport.queueAllRerender();
						}],
					],
				},
			});

			transformsChildren.push(
				this.appendHeading("Scale", null),
				this.sclEditor,
				createElement("button", {
					textContent: "Reset",
					listeners: {
						click: [
							[() => {
								tiedActions.setObjectScl(object, object.defaultTransforms.scl);
							}],
						],
					},
				}),
			);
		}


		this.appendHeading("Transformation");
		createElement("div", {
			classes: ["panel-content"],
			parent: this.textContainer,

			children: transformsChildren,
		});
	}

	appendHeading(label, parent=this.textContainer, title="") {
		return createElement("h3", {
			textContent: label,
			parent,
			properties: !title ? null : {title},
		});
	}
}

export class CameraPropertiesControl extends HTMLElement {
	static members = new Set();

	initializeElements() {
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

								tiedActions.replaceSelection(viewport.camera);
							}],
						],

						mousedown: [
							[focusLastViewport],
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

								tiedActions.replaceSelection(viewport.camera3Wrapper);
							}],
						],

						mousedown: [
							[focusLastViewport],
						],
					},
				}),
			],
		});

		CameraPropertiesControl.members.add(this);

		return this;
	}
}

function focusLastViewport(event) {
	event.preventDefault();
	lastSelectedViewport.focus();
}


// Other

// Raycaster, used in object selection
const raycaster = new Three.Raycaster();

// Refresh the viewport panels whenever the window resizes
addEventListener("resize", () => {
	for (const viewport of Viewport.members) {
		viewport.refreshSize();
	}

	Viewport.queueAllRerender();
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