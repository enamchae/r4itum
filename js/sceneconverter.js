/**
 * @file Converts 4D objects into objects in a renderable 3D scene.
 */

import {Mesh4, Camera4} from "./4d/objects.js";
import {projectVector4} from "./4d/projection.js";
import * as Three from "./_libraries/three.module.js";
import * as ThreeMeshLine from "./_libraries/threeMeshLine.js";

const meshMats = [ // Indexed by `SceneConverter.ViewportStates`
	[0x777777],
	[0xFF7700],
	[0xFFAA00],
].map(colors => ({
	wire: new ThreeMeshLine.MeshLineMaterial({color: colors[0], /* sizeAttenuation: 0, */ lineWidth: 1}),
}));

// const axisMats = [
// 	// {hsv(n * 360° / 4, 1, 1) | n ∈ ℤ}
// 	0xFF0000, // X
// 	0x80FF00, // Y
// 	0x00FFFF, // Z
// 	0x8000FF, // W
// ].map(color => new Three.LineBasicMaterial({color}));

const vertGeometry = new Three.SphereBufferGeometry(.03, 4, 2);
const vertMat = new Three.MeshLambertMaterial({color: 0xFFCC44});

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
	}

	refresh(camera) {
		for (const object of this.scene4.objectsAll()) {
			this.refreshObject(object, camera);
		}
	}

	refreshObject(object, camera) {
		let rep = this.objectReps.get(object);

		if (object instanceof Mesh4) {
			if (!rep) {
				rep = new Mesh4Rep(object, this);
				this.objectReps.set(object, rep);
			}

			rep.updateInThreeScene(camera);
		}

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
	static material(viewportState=SceneConverter.ViewportStates.DEFAULT) {
		const faceColor = [SceneConverter.ViewportStates.SELECTED, SceneConverter.ViewportStates.SELECTED_PRIMARY].includes(viewportState)
				? "1, 1, .875"
				: "1, 1, 1";
		
		return new Three.RawShaderMaterial({
			vertexShader: `
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute mediump vec4 position;

varying float faceShouldBeClipped;
varying vec4 vPosition;

void main() {
	faceShouldBeClipped = position.w <= 0. ? 1. : 0.;
	vPosition = position;

	gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1);
}`,
			fragmentShader: `
varying lowp float faceShouldBeClipped;
varying mediump vec4 vPosition;

void main() {
	// \`faceShouldBeClipped\` is interpolated for the triangle; as long as one vertex is clipped, this will be true
	if (faceShouldBeClipped > 0.) {
		// discard might have performance issues (though \`depthWrite: false\` might be doing that anyway)
		discard;
	}

	// temp coloring based on distance from camera
	gl_FragColor = vec4(${faceColor}, .25);
}`,

			transparent: true,
			side: Three.DoubleSide,
			depthWrite: false,
		});
	}

	geometry;

	verts = [];

	constructor(geometry) {
		this.geometry = geometry;
	}

	asBufferGeometry() {
		const bufferGeometry = new Three.BufferGeometry();

		// Copy all vertices
		const positions = [];
		for (const face of this.geometry.faces()) {
			positions.push(...face.flatMap(index => this.verts[index]));
		}

		const attribute = new Three.Float32BufferAttribute(new Float32Array(positions), 4, false);
		bufferGeometry.setAttribute("position", attribute);

		return bufferGeometry;
	}
}

class Mesh4Rep {
	object;
	converter;

	geometryProjected;

	mesh3;
	wire;
	verts = [];

	viewportState = SceneConverter.ViewportStates.DEFAULT;

	constructor(object, converter) {
		this.object = object;
		this.converter = converter;

		this.geometryProjected = new GeometryProjected(object.geometry);
	}

	/**
	 * Sets up the meshes used to represent this object's vertices
	 */
	initializeThreeMeshes() {
		// Vertex meshes, placed at the polytope's vertices
		for (let i = 0; i < this.object.geometry.verts.length; i++) {
			const sphere = new Three.Mesh(vertGeometry, vertMat);
			this.verts.push(sphere);
		}

		this.mesh3 = new Three.Mesh();
		this.converter.objectClickboxes.set(this.mesh3, this);
		
		return this;
	}

	destructThreeMeshes() {
		this.converter.scene3.remove(this.mesh3);
		for (const vert of this.verts) {
			this.converter.scene3.remove(vert);
		}
		this.converter.scene3.remove(this.wire);

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

		// console.log(new Error());
		// console.time(" - faces presence");
		this.updateFacesPresence();
		// console.timeEnd(" - faces presence");
		// console.time(" - faces projection");
		this.updateFacesProjection(camera);
		// console.timeEnd(" - faces projection");
		// console.time(" - wireframe");
		this.updateWireframe();
		// console.timeEnd(" - wireframe");

		return this;
	}
	
	/**
	 * Removes the Three mesh used to show this object's faces if there are none to be shown.
	 */
	updateFacesPresence() {
		if (this.object.geometry.faces().length === 0) {
			this.converter.scene3.remove(this.mesh3);
			// scene.remove(this.wireframe3);
		} else {
			this.converter.scene3.add(this.mesh3);
			// scene.add(this.wireframe3);
		}

		return this;
	}

	/**
	 * Updates the position of the vertices in this object's Three mesh and the position of the vertex meshes, based on
	 * its and the camera's transforms. 
	 * @param {Camera4} camera 
	 */
	updateFacesProjection(camera) {
		this.geometryProjected.verts = projectVector4(this.object.transformedVerts(), camera, {
			callback: (vert, i) => {
				// TODO ThreeJS throws when the coordinates have Infinity/NaN values (distance was 0 in a perspective projection); handle this
		
				// Move each vertex mesh to the new position
		
				const sphere = this.verts[i];

				// temp solution
				const scale = Math.max(0, 1 / vert[3]);
		
				this.converter.scene3.add(sphere);
				sphere.position.set(...vert);
				sphere.scale.copy(new Three.Vector3(scale, scale, scale)); // resizing gives depthcue
			},
		});

		this.mesh3.geometry = this.geometryProjected.asBufferGeometry();
		this.mesh3.material = GeometryProjected.material(this.viewportState);

		// this.mesh3.geometry.verticesNeedUpdate = true; // Must be marked for update for positions to change
		this.mesh3.updateMatrixWorld(); // Matrix must be updated for the mesh to be found during raycast selection
		
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
	setViewportState(viewportState) {
		this.viewportState = viewportState;

		this.wire.material = meshMats[viewportState].wire;
		return this;
	}
}

// this.mesh3 = new Three.Line(new Three.BufferGeometry().setFromPoints(points), material);