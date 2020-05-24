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
				rep?.setViewportState(SceneConverter.ViewportState.DEFAULT);
			}
			for (const objectList of ObjectList.members) {
				objectList.unhighlightBar(object);
			}
		}

		userSelection.replace(...objects);

		// Indicate that all current selections are selected
		for (const object of objects) {
			for (const viewport of Viewport.members) {
				const rep = viewport.converter.objectReps.get(object);
				rep?.setViewportStateBySelection();
			}

			for (const objectList of ObjectList.members) {
				objectList.highlightBar(object);
			}
		}

		// Update object info panels
		for (const panel of ObjectPropertiesControl.members) {
			panel.setTargetObject(userSelection.objectPrimary);
		}

		Viewport.queueAllRerender();
	},

	setObjectPos(object, pos, {resetting=true, rerendering=true}={}) {
		if (resetting) {
			object.setPos(pos);
		}
		for (const panel of ObjectPropertiesControl.members) {
			if (panel.hasAsTargetObject(object)) {
				panel.posEditor.refill(pos);
			}
		}
		if (rerendering) {
			Viewport.queueAllRerender();
		}
	},

	setObjectRot(object, rot, {resetting=true, rerendering=true}={}) {
		if (resetting) {
			object.setRot(rot);
		}
		for (const panel of ObjectPropertiesControl.members) {
			if (panel.hasAsTargetObject(object)) {
				panel.rotEditor.refill(rot);
			}
		}
		if (rerendering) {
			Viewport.queueAllRerender();
		}
	},

	setObjectScl(object, scl, {resetting=true, rerendering=true}={}) {
		if (resetting) {
			object.setScl(scl);
		}
		for (const panel of ObjectPropertiesControl.members) {
			if (panel.hasAsTargetObject(object)) {
				panel.sclEditor.refill(scl);
			}
		}
		if (rerendering) {
			Viewport.queueAllRerender();
		}
	},

	setCameraRadius(camera, radius, {resetting=true, rerendering=true}={}) {
		if (resetting) {
			camera.radius = radius;
		}
		for (const panel of ObjectPropertiesControl.members) {
			if (panel.hasAsTargetObject(camera)) {
				panel.radiusEditor?.refill(radius);
			}
		}
		if (rerendering) {
			Viewport.queueAllRerender();
		}
	}
};