/**
 * @file Converts 4D objects into objects in a renderable 3D scene.
 */

import {Mesh4, Camera4} from "./4d/objects.js";
import {projectVector4} from "./4d/projection.js";
import * as Three from "./_libraries/three.module.js";
import * as ThreeMeshLine from "./_libraries/threeMeshLine.js";

const meshMats = [ // Indexed by `SceneConverter.ViewportStates`
	[0xFFFFFF, 0x777777],
	[0xFFEEDD, 0xFF7700],
	[0xFFEEDD, 0xFFAA00],
].map(colors => ({
	mesh: new Three.MeshBasicMaterial({color: colors[0], transparent: true, opacity: .25, depthWrite: false, side: Three.DoubleSide}),
	wire: new ThreeMeshLine.MeshLineMaterial({color: colors[1], /* sizeAttenuation: 0, */ lineWidth: 1}),
}));

// const axisMats = [
// 	// {hsv(n * 360° / 4, 1, 1) | n ∈ ℤ}
// 	0xFF0000, // X
// 	0x80FF00, // Y
// 	0x00FFFF, // Z
// 	0x8000FF, // W
// ].map(color => new Three.LineBasicMaterial({color}));

const transparentMat = new Three.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false});

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

			if (!rep.mesh3) {
				rep.initializeThreeMeshes();
			}

			rep.updateInThreeScene(camera);
		}
	}
}

class Mesh4Rep {
	object;
	converter;

	mesh3;
	wires = [];
	verts = [];

	vertsToHide = [];

	constructor(object, converter) {
		this.object = object;
		this.converter = converter;
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

		this.mesh3 = new Three.Mesh(new Three.Geometry(), [meshMats[SceneConverter.ViewportStates.DEFAULT].mesh, transparentMat]);
		// Setup faces
		this.mesh3.geometry.faces = this.object.geometry.faces().map(indexList => new Three.Face3(...indexList, 0));
		this.converter.objectClickboxes.set(this.mesh3, this);
		
		return this;
	}

	/**
	 * Updates the data of the Three objects that represent this mesh.
	 * @param {Camera4} camera 
	 */
	updateInThreeScene(camera) {
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
		this.updateClipping();

		return this;
	}
	
	/**
	 * Removes the Three mesh used to show this object's faces if there are none to be shown.
	 */
	updateFacesPresence() {
		if (this.mesh3.geometry.faces.length === 0) {
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
		this.vertsToHide = [];
		
		projectVector4(this.object.transformedVerts(), camera, this.converter.scene4, {
			destinationPoints: this.mesh3.geometry.vertices,
			
			callback: (vert, i) => {
				// TODO ThreeJS throws when the coordinates have Infinity/NaN values (distance was 0 in a perspective projection); handle this
		
				// Move each vertex mesh to the new position
		
				const sphere = this.verts[i];
		
				this.converter.scene3.add(sphere);
				sphere.position.copy(vert);
				sphere.scale.copy(new Three.Vector3(1, 1, 1).divideScalar(vert.distance)); // resizing gives depthcue
		
				// Hide faces that are too close to or behind the camera
				if (vert.distance < .1) {
					this.vertsToHide.push(i);
				}
			},
		});

		this.mesh3.geometry.verticesNeedUpdate = true; // Must be marked for update for positions to change
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

		for (let i = 0; i < this.object.geometry.edges().length; i++) {
			// Create new wire if it does not exist
			const wire = this.wires[i] || new Three.Mesh(new ThreeMeshLine.MeshLine(), meshMats[SceneConverter.ViewportStates.DEFAULT].wire);

			const edge = this.object.geometry.edges()[i];

			// Set wire to current edge
			// MeshLine is a buffer geometry, so its vertices must be refreshed
			wire.geometry.setVertices([
				this.mesh3.geometry.vertices[edge[0]],
				this.mesh3.geometry.vertices[edge[1]],

				// Gets the stored distance for the endpoints
				// Since there are only two endpoints for a wire, `p` will be 0 then 1
				// arbitrary constant
			], p => .03 / this.mesh3.geometry.vertices[edge[p]].distance);

			if (!this.wires[i]) {
				// Add wire to scene and save it
				this.wires.push(wire);
				this.converter.scene3.add(wire);
			} else {
				// Must be marked for update
				wire.geometry.attributes.position.needsUpdate = true;
			}
		}

		return this;
	}

	updateClipping() {
		for (let i = 0; i < this.object.geometry.verts.length; i++) {
			this.verts[i].visible = true;
		}
		for (let i = 0; i < this.object.geometry.edges().length; i++) {
			this.wires[i].visible = true;
		}
		for (const face of this.mesh3.geometry.faces) {
			face.materialIndex = 0;
		}

		for (const vertIndex of this.vertsToHide) {
			this.verts[vertIndex].visible = false;

			const connectedEdges = this.object.geometry.vertsToEdges().get(vertIndex);
			for (const edgeIndex of connectedEdges) {
				this.wires[edgeIndex].visible = false;
			}

			const connectedFaces = this.object.geometry.vertsToFaces().get(vertIndex);
			for (const faceIndex of connectedFaces) {
				this.mesh3.geometry.faces[faceIndex].materialIndex = 1;
			}
		}
		this.mesh3.geometry.groupsNeedUpdate = true; // Must be marked for update for materials to change

	}

	/**
	 * Alters the material of this mesh depending on the viewport state.
	 * @param {number} viewportState 
	 */
	setViewportState(viewportState) {
		this.mesh3.material = meshMats[viewportState].mesh;
		// Iterating through these could be avoided by cloning a wire material for this object only and then updating its color
		for (const wire of this.wires) {
			wire.material = meshMats[viewportState].wire;
		}
		return this;
	}
}

// this.mesh3 = new Three.Line(new Three.BufferGeometry().setFromPoints(points), material);