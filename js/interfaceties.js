/**
 * @file Links 4D operations to items in the interface.
 */

import {scene, Viewport, ObjectPropertiesControl, ObjectList} from "./interface.js";
import {SceneConverter} from "./sceneconverter.js";
import userSelection from "./userselection.js";

export default {
	addObject(...objects) {
		scene.addObject(...objects);
		for (const objectList of ObjectList.members) {
			objectList.addItem(...objects);
		}
	
		Viewport.queueAllRerender();
	},

	removeObject(...objects) {
		scene.removeObject(...objects);
		for (const objectList of ObjectList.members) {
			objectList.removeItem(...objects);
		}

		for (const object of objects) {
			for (const viewport of Viewport.members) {
				viewport.converter.clearObject(object);
			}
		}
	
		Viewport.queueAllRerender();
	},

	replaceSelection(...objects) {
		// Indicate that all current selections are unselected
		for (const object of userSelection.objects()) {
			for (const viewport of Viewport.members) {
				const rep = viewport.converter.objectReps.get(object);
				rep?.setViewportState(SceneConverter.ViewportStates.DEFAULT);
			}
		}

		userSelection.replace(...objects);

		// Indicate that all current selections are selected
		for (let i = 0; i < objects.length; i++) {
			for (const viewport of Viewport.members) {
				const rep = viewport.converter.objectReps.get(objects[i]);
				rep?.setViewportState(i === 0
						? SceneConverter.ViewportStates.SELECTED_PRIMARY
						: SceneConverter.ViewportStates.SELECTED);
			}
		}

		// Update object info panels
		for (const panel of ObjectPropertiesControl.members) {
			panel.setTargetObject(userSelection.objectPrimary);
		}

		Viewport.queueAllRerender();
	},

	setObjectPos(object, pos, resetting=true) {
		if (resetting) {
			object.setPos(pos);
		}
		for (const panel of ObjectPropertiesControl.members) {
			if (panel.hasAsTargetObject(object)) {
				panel.posEditor.refill(pos);
			}
		}
		Viewport.queueAllRerender();
	},

	setObjectRot(object, rot, resetting=true) {
		if (resetting) {
			object.setRot(rot);
		}
		for (const panel of ObjectPropertiesControl.members) {
			if (panel.hasAsTargetObject(object)) {
				panel.rotEditor.refill(rot);
			}
		}
		Viewport.queueAllRerender();
	},

	setObjectScl(object, scl, resetting=true) {
		if (resetting) {
			object.setScl(scl);
		}
		for (const panel of ObjectPropertiesControl.members) {
			if (panel.hasAsTargetObject(object)) {
				panel.sclEditor.refill(scl);
			}
		}
		Viewport.queueAllRerender();
	},

	setCameraRadius(camera, radius) {
		camera.radius = radius;
		for (const panel of ObjectPropertiesControl.members) {
			if (panel.hasAsTargetObject(camera)) {
				panel.radiusEditor?.refill(radius);
			}
		}
		Viewport.queueAllRerender();
	}
};