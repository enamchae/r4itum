/**
 * @file Handles 4D objects and their properties, along with the world itself's.
 */

import {Vector4, Rotor4} from "./vector.js";
import {Geometry4} from "./meshgeometry.js";
import {projectVector4} from "../js/projection.js";
import * as Three from "./libraries/three.module.js";
import * as ThreeMeshLine from "./libraries/threeMeshLine.js";

export const world = {
    /**
     * Basis directions defined (arbitrarily) for the world as vectors. They can be used to define the *absolute* orientation for
     * directional objects (i.e. cameras and directional lights)
     */
    basis: {
        forward: new Vector4(0, 0, 0, -1),
        up: new Vector4(0, 1, 0, 0),
        over: new Vector4(0, 0, 1, 0),
    },
    
    vertMeshes: new WeakMap(),
};

const meshMatDefault = new Three.MeshBasicMaterial({color: 0xFFFFFF, transparent: true, side: Three.DoubleSide});
meshMatDefault.opacity = .5;

// const wireframeMat = new Three.LineBasicMaterial({color: 0x000000, linewidth: 10});
const wireMat = new ThreeMeshLine.MeshLineMaterial({color: 0x333333, sizeAttenuation: 0, lineWidth: 1});

const vertGeometry = new Three.SphereBufferGeometry(.1, 4, 2);
const vertMat = new Three.MeshLambertMaterial({color: 0xAA7744});

/**
 * Objects and operations for the 4D scene.
 */
export const scene = {
    /**
     * @type Set<Object4>
     */
    objects: new Set(),

    addObject(...objects) {
        for (const object of objects) {
            object.initializeThreeMeshes();
            this.objects.add(object);
        }
    },
};

export class Object4 {
    /**
     * Position of this object.
     * @type Vector4
     */
    pos;
    /**
     * Rotation of this object.
     * @type Rotor4
     */
    rot;

    /**
     * Whether or not this object's properties has been updated and needs to be updated in the render.
     * TODO
     * @type boolean
     */
    needsUpdate = false;

    constructor(pos=new Vector4(), rot=new Rotor4()) {
        this.pos = pos;
        this.rot = rot;
    }

    // Placeholder method
    initialize() {
        return this;
    }
}

export class Camera4 extends Object4 {
    usingPerspective = true;

    fovAngle = Math.PI / 2;
    radius = 1;

    constructor(pos, rot, options={}) {
        super(pos, rot);

        Object.assign(this, options);
    }

}

export class Mesh4 extends Object4 {
    /**
     * @type Geometry4
     */
    geometry;

    /**
     * @type Three.Mesh
     */
    mesh3;
    // wireframe3;

    wires = [];

    constructor(geometry, pos, rot) {
        super(pos, rot);

        this.geometry = geometry;

        this.mesh3 = new Three.Mesh(new Three.Geometry(), meshMatDefault);

        // this.wireframe3 = new Three.LineSegments(new Three.EdgesGeometry(this.mesh3.geometry), wireframeMat);
        // this.updateWireframe();
    }

    transformedVerts() {
        return this.geometry.verts.map(vert => {
            return this.rot.rotateVector(vert).add(this.pos);
        });
    }

    /**
     * Sets up the meshes used to represent this object's vertices
     */
    initializeThreeMeshes() {
		const meshes = [];

        // Vertex meshes, placed at the polytope's vertices
		for (let i = 0; i < this.geometry.verts.length; i++) {
			const sphere = new Three.Mesh(vertGeometry, vertMat);
			meshes.push(sphere);
		}

        // Setup faces
        this.mesh3.geometry.faces = this.geometry.faces().map(indexList => new Three.Face3(...indexList));

        world.vertMeshes.set(this, meshes);
        
        return this;
    }

    /**
     * Updates the data of the Three objects that represent this mesh.
     * @param {Three.Scene} scene3 
     * @param {Camera4} camera 
     */
    updateInThreeScene(scene3, camera) {
        this.updateFacesPresence(scene3);
        this.updateFacesProjection(scene3, camera);
        this.updateWireframe(scene3);

        return this;
    }
    
    /**
     * Removes the Three mesh used to show this object's faces if there are none to be shown.
     * @param {Three.Scene} scene3 
     */
    updateFacesPresence(scene3) {
        if (this.mesh3.geometry.faces.length === 0) {
            scene3.remove(this.mesh3);
            // scene.remove(this.wireframe3);
        } else {
            scene3.add(this.mesh3);
            // scene.add(this.wireframe3);
        }

        return this;
    }

    /**
     * Updates the position of the vertices in this object's Three mesh and the position of the vertex meshes, based on
     * its and the camera's transforms.
     * @param {Three.Scene} scene3 
     * @param {Camera4} camera 
     */
    updateFacesProjection(scene3, camera) {
        projectVector4(this.transformedVerts(), camera, {
            destinationPoints: this.mesh3.geometry.vertices,
            
            callback: (vert, i) => {
                // Move each vertex mesh to the new position

                const sphere = world.vertMeshes.get(this)[i];
        
                scene3.add(sphere);
                sphere.position.copy(vert);
                sphere.scale.copy(new Three.Vector3(1, 1, 1).divideScalar(vert.distance)); // resizing gives depthcue
            },
        });
	
		// Must be marked for update
        this.mesh3.geometry.verticesNeedUpdate = true;
        
        return this;
    }

    /**
     * Resyncs this object's wireframe's vertices' positions, or creates a wireframe if there is not one present.
     * @param {Three.Scene} scene3 
     */
    updateWireframe(scene3) {
        // this.wireframe3.geometry = new Three.EdgesGeometry(this.mesh3.geometry);

        // Ignore if there are no facets to be drawn
        if (this.geometry.facets.length === 0) return this;

        for (let i = 0; i < this.geometry.edges().length; i++) {
            // Create new wire if it does not exist
            const wire = this.wires[i] || new Three.Mesh(new ThreeMeshLine.MeshLine(), wireMat);

            const edge = this.geometry.edges()[i];

            // Set wire to current edge
            // MeshLine is a buffer geometry, so its vertices must be refreshed
            wire.geometry.setVertices([
                this.mesh3.geometry.vertices[edge[0]],
                this.mesh3.geometry.vertices[edge[1]],

                // Gets the stored distance for the endpoints
                // Since there are only two endpoints for a wire, `p` will be 0 then 1
                // arbitrary constant
            ], p => .05 / this.mesh3.geometry.vertices[edge[p]].distance);

            if (!this.wires[i]) {
                // Add wire to scene and save it
                this.wires.push(wire);
                scene3.add(wire);
            } else {
                // Must be marked for update
                wire.geometry.attributes.position.needsUpdate = true;
            }
        }

        return this;
    }
}