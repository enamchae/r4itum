/**
 * @file Converts 4D objects into objects in a renderable 3D scene.
 */

import {Geometry4} from "./4d/meshgeometry.js";
import {Vector4, Rotor4, Space3_4, Line4} from "./4d/vector.js";
import {Object4, Mesh4, Camera4, PlaneRef4, Axis4} from "./4d/objects.js";
import userSelection from "./userselection.js";
import {privMap} from "./util.js";
import * as Three from "./_libraries/three.module.js";
import * as ThreeMeshLine from "./_libraries/threeMeshLine.js";

const meshMats = [ // Indexed by `SceneConverter.ViewportState`
	[0x6A8177],
	[0xFF7700],
	[0xFFAA00],
].map(colors => ({
	wire: new ThreeMeshLine.MeshLineMaterial({color: colors[0], /* sizeAttenuation: 0, */ lineWidth: 1}),
}));

export class SceneConverter {
	static ViewportState = Object.freeze({
		DEFAULT: 0,
		SELECTED: 1,
		SELECTED_PRIMARY: 2,
	});
		
	scene4;

	/**
	 * The 3D scene that the 4D space is projected onto. It is unique to this converter since the 4D objects
	 * may be deformed differently depending on the camera transform.
	 * @type Three.Scene
	 */
	scene3 = new Three.Scene();

	objectReps = new WeakMap();
	objectClickboxes = new Map();

	static selectionState(object) {
		if (object === userSelection.objectPrimary) {
			return this.ViewportState.SELECTED_PRIMARY;
		} else if (userSelection.objectsSubordinate.has(object)) {
			return this.ViewportState.SELECTED;
		}
		return this.ViewportState.DEFAULT;
	}

	constructor(scene4) {
		this.scene4 = scene4;

		priv.set(this, {
			lastCamera: null,
			lastObjects: new WeakMap(),
		});
	}

	/**
	 * 
	 * @param {Camera4} camera 
	 */
	refresh(camera) {
		const cameraNotUpdated = _(this).lastCamera?.eq(camera);

		for (const object of this.scene4.objectsAll()) {
			const objectNotUpdated = _(this).lastObjects.get(object)?.eq(object);
			if (cameraNotUpdated && objectNotUpdated) continue; // Don't rerender if the projection has not updated

			this.refreshObject(object, camera);
			_(this).lastObjects.set(object, object.clone());
		}

		_(this).lastCamera = camera.clone();

		return this;
	}

	refreshObject(object, camera) {
		let rep = this.objectReps.get(object);

		if (object instanceof Mesh4 && !rep) {
			rep = new Mesh4Rep(object, this);
			this.objectReps.set(object, rep);

		} else if (object instanceof PlaneRef4 && !rep) {
			rep = new PlaneRef4Rep(object, this);
			this.objectReps.set(object, rep);

		} else if (object instanceof Axis4 && !rep) {
			rep = new Axis4Rep(object, this);
			this.objectReps.set(object, rep);
		}

		rep?.updateInThreeScene(camera);

		return this;
	}

	clearObject(object) {
		const rep = this.objectReps.get(object);

		if (rep) {
			rep.destructThreeMeshes();
			this.objectClickboxes.delete(rep.mesh3);
		}

		return this;
	}
}

class GeometryProjected {
	/**
	 * @type Geometry4
	 */
	geometry;

	verts = [];

	constructor(geometry) {
		this.geometry = geometry;
	}

	// TODO repeated code, `position4` does not line up with `position3`, etc.

	/**
	 * @param {object} [settings] 
	 * @param {boolean} [settings.fromProjection] Determines whether the vertex positions come from the original points or the projected points.
	 * @param {boolean} [settings.fromFaces] Determines whether vertices should be duplicated for each face that includes them.
	 * @param {boolean} [settings.allowingBehindCamera] Determines whether to include vertices with a nonpositive W coordinate (distance from the
	 * camera space for projected vertices). Meant to be set to `true` when `fromProjection` is `true`. If `fromFaces` is true, then faces will be
	 * excluded if any of their vertices contain such vertices.
	 * @returns {Three.Float32BufferAttribute} 
	 */
	positionAttribute({
		fromProjection=true,
		fromFaces=true,
		allowingBehindCamera=true,
	}={}) {
		const verts = fromProjection ? this.verts : this.geometry.verts;

		// Copy all vertices
		const positions = [];

		if (fromFaces) {
			if (allowingBehindCamera) {
				for (const face of this.geometry.faces()) {
					positions.push(...face.flatMap(index => verts[index]));
				}

			} else {
				facesLoop:
				for (const face of this.geometry.faces()) {
					const vertsFace = [];

					for (const index of face) {
						const vert = verts[index];
						// Discard the array and check the next face if any vertex is behind
						if (!vert) {
							throw new RangeError(`Vertex index ${index} does not exist in verts array of length ${verts.length}`);
						} else if (vert[3] <= 0) {
							continue facesLoop;
						}
						vertsFace.push(vert);
					}

					positions.push(...vertsFace.flat());
				}
			}

		} else {
			if (allowingBehindCamera) {
				for (const vert of verts) {
					positions.push(...vert);
				}

			} else {
				for (const vert of verts) {
					if (vert[3] <= 0) continue;
					positions.push(...vert);
				}
			}
		}

		return new Three.Float32BufferAttribute(new Float32Array(positions), 4, false);
	}

	normalAttribute({
		allowingBehindCamera=true,
	}={}) {
		const verts = this.verts;

		const normals = [];

		facesLoop:
		for (const face of this.geometry.faces()) {
			if (allowingBehindCamera) {
				for (const index of face) {
					if (verts[index][3] <= 0) {
						continue facesLoop;
					}
				}
			}

			const dir0 = new Three.Vector3(...verts[face[1]].subtract(verts[face[0]]));
			const dir1 = new Three.Vector3(...verts[face[2]].subtract(verts[face[0]]));

			const normal = new Three.Vector3().crossVectors(dir0, dir1).normalize().toArray();
			normals.push(...normal, ...normal, ...normal); // Same value for each vertex
		}

		return new Three.Float32BufferAttribute(new Float32Array(normals), 3, false);
	}
}

class Mesh4Rep {
	object;
	converter;

	/**
	 * @type GeometryProjected
	 */
	geometryProjected;

	mesh3;
	wire;
	locus;

	viewportState = SceneConverter.ViewportState.DEFAULT;

	constructor(object, converter) {
		this.object = object;
		this.converter = converter;

		this.geometryProjected = new GeometryProjected(object.geometry);
	}

	get faceColor() {
		if ([SceneConverter.ViewportState.SELECTED, SceneConverter.ViewportState.SELECTED_PRIMARY].includes(this.viewportState)) {
			return "vec3(1, 1, .875)";
		} else {
			const tint = this.object.tint;
			// Convert integer color into vector components
			return `vec3(${(0xFF & tint >>> 16) / 0xFF}, ${(0xFF & tint >>> 8) / 0xFF}, ${(0xFF & tint) / 0xFF})`;
		}
	}

	faceMat() {
		return new Three.RawShaderMaterial({
			vertexShader: `
uniform mediump mat4 modelViewMatrix;
uniform mediump mat4 projectionMatrix;
// uniform mediump mat4 viewMatrix;

attribute mediump vec4 position;
attribute mediump vec3 normal;

varying mediump float faceShouldBeClipped;
// varying mediump vec4 vPosition;
// varying mediump float cosineFactor;

void main() {
	faceShouldBeClipped = position.w <= 0. ? 1. : 0.;
	// vPosition = position;

	// mediump vec3 direction = (normalMatrix * vec4(0, 0, -1, 0)).xyz;

	// mediump float cosine = abs(dot(direction, normal)); // \`abs\` removes distinction between facing firectly torward/away from camera
	// cosineFactor = cosine; // Deintensify effect of factor

	gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1);
}`,
			fragmentShader: `
varying lowp float faceShouldBeClipped;
// varying mediump vec4 vPosition;
// varying mediump float cosineFactor;

void main() {
	// \`faceShouldBeClipped\` is interpolated for the triangle; as long as one vertex is clipped, this will be true
	if (faceShouldBeClipped > 0.) {
		// discard might have performance issues (though \`depthWrite: false\` might be doing that anyway)
		discard;
	}

	gl_FragColor = vec4(${this.faceColor}, ${this.object.opacity});
}`,

			transparent: this.object.opacity < 1,
			depthWrite: this.object.opacity >= 1,
			side: Three.DoubleSide,
		});
	}

	wireMat() {
		return meshMats[this.viewportState].wire;
	}

	locusMat() {
		const color = [SceneConverter.ViewportState.SELECTED, SceneConverter.ViewportState.SELECTED_PRIMARY].includes(this.viewportState)
				? "1, .65, 0"
				: ".4, .5, .45";

		return new Three.RawShaderMaterial({
			vertexShader: `
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute mediump vec4 position;

// varying lowp float distance;

void main() {
	// distance = position.w;

	mediump vec4 pos3 = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1);

	gl_PointSize = 50. / pos3.z / position.w; // arbitrary constant
	gl_Position = pos3;
}`,
			fragmentShader: `
// varying lowp float distance;

// lowp float sigmoid(lowp float x) {
// 	return 2. / (1. + exp(-x)) - 1.;
// }

void main() {
	// lowp float colorDepthcue = 1. - sigmoid(distance);

	gl_FragColor = vec4(${color}, 1);
}`,
		});
	}

	/**
	 * Sets up the meshes used to represent this object's vertices
	 */
	initializeThreeMeshes() {
		this.mesh3 = new Three.Mesh();
		this.wire = new Three.Mesh();
		this.locus = new Three.Points();

		this.converter.objectClickboxes.set(this.mesh3, this);

		this.setViewportStateBySelection();
		
		return this;
	}

	destructThreeMeshes() {
		this.converter.scene3.remove(this.mesh3);
		this.converter.scene3.remove(this.wire);
		this.converter.scene3.remove(this.locus);

		return this;
	}

	/**
	 * Updates the data of the Three objects that represent this mesh.
	 * @param {Camera4} camera 
	 */
	updateInThreeScene(camera) {
		if (!this.mesh3) {
			this.initializeThreeMeshes();
		}

		// console.time(" - presence");
		this.updatePresence();
		// console.timeEnd(" - presence");
		// console.time(" - projection");
		this.updateProjection(camera);
		// console.timeEnd(" - projection");
		// console.time(" - wireframe");
		this.updateWireframe();
		// console.timeEnd(" - wireframe");

		return this;
	}
	
	/**
	 * Removes the Three mesh used to show this object's faces if there are none to be shown.
	 */
	updatePresence() {
		this.converter.scene3.add(this.locus);
		this.converter.scene3.add(this.wire);
		
		if (this.object.geometry.faces().length === 0) {
			this.converter.scene3.remove(this.mesh3);
		} else {
			this.converter.scene3.add(this.mesh3);
		}

		return this;
	}

	/**
	 * Updates the position of the vertices in this object's Three mesh and the position of the vertex meshes, based on
	 * its and the camera's transforms. 
	 * @param {Camera4} camera 
	 */
	updateProjection(camera) {
		this.geometryProjected.verts = camera.projectVector4(this.object.transformedVerts());

		this.mesh3.geometry = new Three.BufferGeometry();
		this.mesh3.geometry.setAttribute("position", this.geometryProjected.positionAttribute({
			fromProjection: true,
			fromFaces: true,
			allowingBehindCamera: false,
		}));
		// this.mesh3.geometry.setAttribute("normal", this.geometryProjected.normalAttribute({
		// 	allowingBehindCamera: false,
		// }));
		this.mesh3.updateMatrixWorld(); // Matrix must be updated for the mesh to be found during raycast selection

		this.locus.geometry = new Three.BufferGeometry();
		this.locus.geometry.setAttribute("position", this.geometryProjected.positionAttribute({
			fromProjection: true,
			fromFaces: false,
			allowingBehindCamera: false,
		}));
		
		return this;
	}

	/**
	 * Resyncs this object's wireframe's vertices' positions, or creates a wireframe if there is not one present.
	 */
	updateWireframe() {
		// this.wireframe3.geometry = new Three.EdgesGeometry(this.mesh3.geometry);

		// Ignore if there are no facets to be drawn
		if (this.object.geometry.facets.length === 0) return this;

		// const edges = this.object.geometry.edgesMerged();
		const edges = this.object.geometry.edges();
		const verts = this.geometryProjected.verts;

		this.wire.geometry = new ThreeMeshLine.MeshLine();
		this.wire.material = this.wireMat();
		this.wire.frustumCulled = false;
		const wireVerts = []; // [4n, 4n + 1] are rendered verts, [4n + 2, 4n + 3] are not

		for (const edge of edges) {
			// Check if the edge goes behind the camera; if so, do not add this edge
			if (verts[edge[0]][3] <= 0 || verts[edge[1]][3] <= 0) {
				continue;
			}

			const prevEdgeLast = wireVerts[wireVerts.length - 1];
			const currEdgeFirst = new Three.Vector4(...verts[edge[0]]); // `Vector4` to store distance information
			if (wireVerts.length !== 0) { // Only add an intermediary connecting edge if there is a previous edge
				wireVerts.push(prevEdgeLast, currEdgeFirst);
			}

			const currEdgeLast = new Three.Vector4(...verts[edge[1]]);
			wireVerts.push(currEdgeFirst, currEdgeLast);
		}

		const taperCallback = p => {
			const i = Math.round(p * (wireVerts.length - 1)); // Converts the percentage into an index

			if (i % 4 === 2 || i % 4 === 3) { // Intermediary connecting edge. Do not render
				return 0;
			}

			// Get a width based on the distance
			// arbitrary constant
			return .03 / wireVerts[i].w;
		};

		this.wire.geometry.setVertices(wireVerts, taperCallback);
		
		return this;
	}

	/**
	 * Alters the material of this mesh depending on the viewport state.
	 * @param {number} viewportState 
	 */
	setViewportState(viewportState=this.viewportState) {
		this.viewportState = viewportState;
		this.setMaterials();
		return this;
	}

	setViewportStateBySelection() {
		this.setViewportState(SceneConverter.selectionState(this.object));
		return this;
	}

	setMaterials() {
		this.mesh3.material = this.faceMat();
		this.wire.material = this.wireMat();
		this.locus.material = this.locusMat();
		return this;
	}
}

class PlaneRef4Rep {
	object;
	converter;

	geometryProjected;

	mesh3;

	constructor(object, converter) {
		this.object = object;
		this.converter = converter;

		this.geometryProjected = new GeometryProjected(object.geometry);
	}

	// Grid shader technique from https://github.com/Fyrestar/THREE.InfiniteGridHelper/blob/master/InfiniteGridHelper.js
	// Trapezoid texturing technique from https://stackoverflow.com/a/56919100
	faceMat() {
		return new Three.RawShaderMaterial({
			vertexShader: `
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute mediump vec4 position4;
attribute mediump vec4 position;

varying mediump vec4 vPosition4;
varying mediump vec4 vPosition3;

varying mediump vec3 texCoord; // 3-dimensional texture coordinate, used to account for trapezoid texturing

void main() {
	vPosition4 = position4;
	vPosition3 = position;
	
	texCoord = vec3(vPosition4.xz, 1.) * abs(position.x);

	gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1);
}`,
			fragmentShader: `
varying mediump vec4 vPosition4;
varying mediump vec4 vPosition3;

varying mediump vec3 texCoord;

mediump vec2 texCoord2; // 2-dimensional texture coordinate, which the 3D texcoord is converted to when generating the grid

mediump float getGrid(mediump float gridStep) {
	mediump vec2 r = texCoord2 / gridStep;
	
	mediump vec2 grid = abs(fract(r - .5) - .5) / fwidth(r);
	mediump float line = min(grid.x, grid.y);

	return 1. - min(line, 1.);
}

void main() {
	if (vPosition3.w <= 0.) {
		discard;
	}

	texCoord2 = texCoord.xy / texCoord.z;

	mediump float grid = getGrid(1.) / 8.;

	gl_FragColor = vec4(.5, .5, .5, grid);
}`,

			transparent: true,
			side: Three.DoubleSide,
			depthWrite: false,

			extensions: {
				derivatives: true,
			},
		});
	}

	initializeThreeMeshes() {
		this.mesh3 = new Three.Mesh();
		this.mesh3.material = this.faceMat();
		this.converter.scene3.add(this.mesh3);
		return this;
	}

	destructThreeMeshes() {
		this.converter.scene3.remove(this.mesh3);
		return this;
	}

	/**
	 * Updates the data of the Three objects that represent this mesh.
	 * @param {Camera4} camera 
	 */
	updateInThreeScene(camera) {
		if (!this.mesh3) {
			this.initializeThreeMeshes();
		}

		console.time(" - projection");
		this.updateProjection(camera);
		console.timeEnd(" - projection");

		return this;
	}

	/**
	 * Updates the position of the vertices in this object's Three mesh and the position of the vertex meshes, based on
	 * its and the camera's transforms. 
	 * @param {Camera4} camera 
	 */
	updateProjection(camera) {
		this.geometryProjected.verts = camera.projectVector4(this.object.transformedVerts());
		this.mesh3.geometry = new Three.BufferGeometry();
		this.mesh3.geometry.setAttribute("position4", this.geometryProjected.positionAttribute({
			fromProjection: false,
			fromFaces: true,
		}));
		this.mesh3.geometry.setAttribute("position", this.geometryProjected.positionAttribute({
			fromProjection: true,
			fromFaces: true,
			allowingBehindCamera: false,
		}));
		
		return this;
	}
}

class Axis4Rep {
	object;
	converter;

	/**
	 * @type GeometryProjected
	 */
	geometryProjected;

	line;

	constructor(object, converter) {
		this.object = object;
		this.converter = converter;

		this.geometryProjected = new GeometryProjected(object.geometry);
	}

	lineMat() {
		return new Three.LineBasicMaterial({color: this.object.color});
	}

	initializeThreeMeshes() {
		this.line = new Three.Line();
		this.line.material = this.lineMat();
		this.converter.scene3.add(this.line);
		return this;
	}

	destructThreeMeshes() {
		this.converter.scene3.remove(this.line);
		return this;
	}

	/**
	 * Updates the data of the Three objects that represent this mesh.
	 * @param {Camera4} camera 
	 */
	updateInThreeScene(camera) {
		if (!this.line) {
			this.initializeThreeMeshes();
		}

		// console.time(" - projection");
		this.updateProjection(camera);
		// console.timeEnd(" - projection");

		return this;
	}

	/**
	 * Updates the position of the vertices in this object's Three mesh and the position of the vertex meshes, based on
	 * its and the camera's transforms. 
	 * @param {Camera4} camera 
	 */
	updateProjection(camera) {
		// camera.localSpace().intersectionWithLine(this.object.line);

		this.geometryProjected.verts = camera.projectVector4(this.object.transformedVerts());
		this.line.geometry = new Three.BufferGeometry();
		this.line.geometry.setAttribute("position4", this.geometryProjected.positionAttribute({
			fromProjection: false,
			fromFaces: false,
		}));
		this.line.geometry.setAttribute("position", this.geometryProjected.positionAttribute({
			fromProjection: true,
			fromFaces: false,
			allowingBehindCamera: false,
		}));
		
		return this;
	}
}

/**
 * Provides `Object4` properties for a Three camera.
 */
export class Camera3Wrapper4 extends Object4 {
	/**
	 * @type Three.Camera
	 */
	object3;

	constructor(camera=new Three.PerspectiveCamera(90, 1, .01, 1000)) {
		super();

		this.object3 = camera;
		priv.set(this, {
			fovAngle: camera?.fov * Math.PI / 180 ?? Math.PI / 2,
			focalLength: 1,
		});
	}

	localForward() {
		return this.object3.getWorldDirection().toArray(new Vector4());
	}

	get pos() {
		return this.object3.position.toArray(new Vector4());
	}

	setPos(pos) {
		this.object3.position.set(...pos);
		return this;
	}

	get rot() {
		const quat = this.object3.quaternion;
		return new Rotor4(quat.w, quat.z, -quat.y, 0, quat.x, 0, 0, 0);
	}

	setRot(rot) {
		this.object3.quaternion.set(rot[4], -rot[2], rot[1], rot[0]);
		return this;
	}

	get scl() {
		return this.object3.scale.toArray(new Vector4());
	}

	setScl(scl) {
		// this.object3.scale.set(...scl);
		return this;
	}

	// `radius` and `fovAngle` are stored privately since they cannot be saved on the camera when switching

	get fovAngle() {
		return _(this).fovAngle;
	}

	set fovAngle(fovAngle) {
		_(this).fovAngle = fovAngle;

		const fov = fovAngle * 180 / Math.PI;

		this.object3.fov = fov;
		this.object3.updateProjectionMatrix();
	}

	get focalLength() {
		return _(this).focalLength;
	}

	set focalLength(focalLength) {
		_(this).focalLength = focalLength;

		this.object3.zoom = 1 / focalLength;
		this.object3.updateProjectionMatrix();
	}

	get usingPerspective() {
		return this.object3 instanceof Three.PerspectiveCamera;
	}

	/**
	 * 
	 * @param {boolean} value 
	 * @param {number} aspectRatio 
	 */
	setUsingPerspective(value, aspectRatio) {
		if (value === this.usingPerspective) return;

		let camera;
		if (value) {
			camera = new Three.PerspectiveCamera(this.fovAngle * 180 / Math.PI, aspectRatio, .01, 1000);
		} else {
			const size = 4;
			camera = new Three.OrthographicCamera(-size, size, size / aspectRatio, -size / aspectRatio, -100, 1000);
			camera.zoom = 1 / this.focalLength;
			camera.updateProjectionMatrix();
		}

		camera.position.copy(this.object3.position);
		camera.quaternion.copy(this.object3.quaternion);

		this.object3 = camera;

		return this;
	}

	/**
	 * Calculates the distance of a point from this object's viewbox.
	 * @param {Vector4} vector
	 * @returns {number}  
	 */
	viewboxDistanceFrom(vector) {
		return this.usingPerspective
				? this.localForward().dot(vector.subtract(this.pos))
				: this.focalLength;
	}
}

const {priv, _} = privMap();

// this.mesh3 = new Three.Line(new Three.BufferGeometry().setFromPoints(points), material);