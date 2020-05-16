/**
 * @file Converts 4D objects into objects in a renderable 3D scene.
 */

import {Geometry4} from "./4d/meshgeometry.js";
import {Mesh4, Camera4, PlaneRef4, Axis4} from "./4d/objects.js";
import {projectVector4} from "./4d/projection.js";
import * as Three from "./_libraries/three.module.js";
import * as ThreeMeshLine from "./_libraries/threeMeshLine.js";

const meshMats = [ // Indexed by `SceneConverter.ViewportStates`
	[0x6A8177],
	[0xFF7700],
	[0xFFAA00],
].map(colors => ({
	wire: new ThreeMeshLine.MeshLineMaterial({color: colors[0], /* sizeAttenuation: 0, */ lineWidth: 1}),
}));

export class SceneConverter {
	static ViewportStates = Object.freeze({
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

	constructor(scene4) {
		this.scene4 = scene4;

		priv.set(this, {
			lastCamera: null,
		});
	}

	/**
	 * 
	 * @param {Camera4} camera 
	 */
	refresh(camera) {
		const cameraNotUpdated = _(this).lastCamera?.eq(camera);

		for (const object of this.scene4.objectsAll()) {
			if (false/* cameraNotUpdated */ /* && object needs update */) continue;

			this.refreshObject(object, camera);
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

const priv = new WeakMap();
const _ = key => priv.get(key);

class GeometryProjected {
	/**
	 * @type Geometry4
	 */
	geometry;

	verts = [];

	constructor(geometry) {
		this.geometry = geometry;
	}

	positionsAttribute(fromProjection=true, fromFaces=true) {
		// Determines whether the vertex positions come from the original points or the projected points
		const verts = fromProjection ? this.verts : this.geometry.verts;

		// Copy all vertices
		const positions = [];

		if (fromFaces) {
			for (const face of this.geometry.faces()) {
				positions.push(...face.flatMap(index => verts[index]));
			}
		} else {
			for (const vert of verts) {
				positions.push(...vert);
			}
		}

		return new Three.Float32BufferAttribute(new Float32Array(positions), 4, false);
	}
}

class Mesh4Rep {
	object;
	converter;

	geometryProjected;

	mesh3;
	wire;
	locus;

	viewportState = SceneConverter.ViewportStates.DEFAULT;

	constructor(object, converter) {
		this.object = object;
		this.converter = converter;

		this.geometryProjected = new GeometryProjected(object.geometry);
	}

	faceMat() {
		let color;
		if ([SceneConverter.ViewportStates.SELECTED, SceneConverter.ViewportStates.SELECTED_PRIMARY].includes(this.viewportState)) {
			color = "1, 1, .875";
		} else {
			const tint = this.object.tint;
			// Convert integer color into vector components
			color = `${(0xFF & tint >>> 16) / 0xFF}, ${(0xFF & tint >>> 8) / 0xFF}, ${(0xFF & tint) / 0xFF}`;
		}
		
		return new Three.RawShaderMaterial({
			vertexShader: `
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute mediump vec4 position;

varying float faceShouldBeClipped;
// varying vec4 vPosition;

void main() {
	faceShouldBeClipped = position.w <= 0. ? 1. : 0.;
	// vPosition = position;

	gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1);
}`,
			fragmentShader: `
varying lowp float faceShouldBeClipped;
// varying mediump vec4 vPosition;

void main() {
	// \`faceShouldBeClipped\` is interpolated for the triangle; as long as one vertex is clipped, this will be true
	if (faceShouldBeClipped > 0.) {
		// discard might have performance issues (though \`depthWrite: false\` might be doing that anyway)
		discard;
	}

	gl_FragColor = vec4(${color}, .2);
}`,

			transparent: true,
			side: Three.DoubleSide,
			depthWrite: false,
		});
	}

	locusMat() {
		const color = [SceneConverter.ViewportStates.SELECTED, SceneConverter.ViewportStates.SELECTED_PRIMARY].includes(this.viewportState)
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

	gl_PointSize = 75. / pos3.z / position.w; // arbitrary constant
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

		this.setViewportState();
		
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

		console.time(" - presence");
		this.updatePresence();
		console.timeEnd(" - presence");
		console.time(" - projection");
		this.updateProjection(camera);
		console.timeEnd(" - projection");
		console.time(" - wireframe");
		this.updateWireframe();
		console.timeEnd(" - wireframe");

		return this;
	}
	
	/**
	 * Removes the Three mesh used to show this object's faces if there are none to be shown.
	 */
	updatePresence() {
		this.converter.scene3.add(this.locus);
		
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
		this.geometryProjected.verts = projectVector4(this.object.transformedVerts(), camera);

		this.mesh3.geometry = new Three.BufferGeometry();
		this.mesh3.geometry.setAttribute("position", this.geometryProjected.positionsAttribute(true, true));
		this.mesh3.updateMatrixWorld(); // Matrix must be updated for the mesh to be found during raycast selection

		this.locus.geometry = new Three.BufferGeometry();
		this.locus.geometry.setAttribute("position", this.geometryProjected.positionsAttribute(true, false));
		
		return this;
	}

	/**
	 * Resyncs this object's wireframe's vertices' positions, or creates a wireframe if there is not one present.
	 */
	updateWireframe() {
		// this.wireframe3.geometry = new Three.EdgesGeometry(this.mesh3.geometry);

		// Ignore if there are no facets to be drawn
		if (this.object.geometry.facets.length === 0) return this;
		
		if (this.wire) {
			this.converter.scene3.remove(this.wire);
		}

		const edges = this.object.geometry.edges();
		const verts = this.geometryProjected.verts;

		const wire = new Three.Mesh(new ThreeMeshLine.MeshLine(), meshMats[this.viewportState].wire);
		wire.frustumCulled = false;
		const wireVerts = []; // [4n, 4n + 1] are rendered verts, [4n + 2, 4n + 3] are not

		for (let i = 0; i < edges.length; i++) {
			const edge = edges[i];

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

		wire.geometry.setVertices(wireVerts, taperCallback);

		this.wire = wire;
		this.converter.scene3.add(wire);
		
		return this;
	}

	/**
	 * Alters the material of this mesh depending on the viewport state.
	 * @param {number} viewportState 
	 */
	setViewportState(viewportState=this.viewportState) {
		this.viewportState = viewportState;

		this.mesh3.material = this.faceMat();
		this.wire.material = meshMats[viewportState].wire;
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
	faceMat() {
		return new Three.RawShaderMaterial({
			vertexShader: `
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute mediump vec4 position4;
attribute mediump vec4 position;

varying mediump vec4 vPosition4;
varying mediump vec4 vPosition3;

void main() {
	vPosition4 = position4;
	vPosition3 = position;

	gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1);
}`,
			fragmentShader: `
varying mediump vec4 vPosition4;
varying mediump vec4 vPosition3;

mediump float getGrid(mediump float gridStep) {
	mediump vec2 r = vPosition4.xw / gridStep;
	
	mediump vec2 grid = abs(fract(r - .5) - .5) / fwidth(r);
	mediump float line = min(grid.x, grid.y);

	return 1. - min(line, 1.);
}

void main() {
	if (vPosition3.w <= 0.) {
		discard;
	}

	mediump float grid = getGrid(1.);

	gl_FragColor = vec4(.3, .3, .3, grid * .5);
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
		this.geometryProjected.verts = projectVector4(this.object.transformedVerts(), camera);
		this.mesh3.geometry = new Three.BufferGeometry();
		this.mesh3.geometry.setAttribute("position4", this.geometryProjected.positionsAttribute(false, true));
		this.mesh3.geometry.setAttribute("position", this.geometryProjected.positionsAttribute(true, true));
		
		return this;
	}


}

class Axis4Rep {
	object;
	converter;

	geometryProjected;

	line;

	constructor(object, converter) {
		this.object = object;
		this.converter = converter;

		this.geometryProjected = new GeometryProjected(object.geometry);
	}

	// Grid shader technique from https://github.com/Fyrestar/THREE.InfiniteGridHelper/blob/master/InfiniteGridHelper.js
	lineMat() {
		return new Three.LineBasicMaterial({
// 			vertexShader: `
// uniform mat4 modelViewMatrix;
// uniform mat4 projectionMatrix;

// attribute mediump vec4 position4;
// attribute mediump vec4 position;

// varying mediump vec4 vPosition4;
// varying mediump vec4 vPosition3;

// void main() {
// 	vPosition4 = position4;
// 	vPosition3 = position;

// 	gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1);
// }`,
// 			fragmentShader: `
// varying mediump vec4 vPosition4;
// varying mediump vec4 vPosition3;

// void main() {
// 	if (vPosition3.w <= 0.) {
// 		discard;
// 	}

// 	gl_FragColor = vec4(1, 0, 0, 1);
// }`,
			color: this.object.color,
		});
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
		this.geometryProjected.verts = projectVector4(this.object.transformedVerts(), camera);
		this.line.geometry = new Three.BufferGeometry();
		this.line.geometry.setAttribute("position4", this.geometryProjected.positionsAttribute(false, false));
		this.line.geometry.setAttribute("position", this.geometryProjected.positionsAttribute(true, false));

		this.line.geometry.computeBoundingSphere();
		
		return this;
	}


}

// this.mesh3 = new Three.Line(new Three.BufferGeometry().setFromPoints(points), material);