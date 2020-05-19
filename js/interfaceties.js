/**
 * @file Links 4D operations to items in the interface.
 */

import {scene, Viewport, ObjectPropertiesControl, ObjectList} from "./interface.js";

export default {
	addObject(...objects) {
		scene.addObject(...objects);
		for (const objectList of ObjectList.members) {
			objectList.addItem(...objects);
		}
	
		Viewport.allNeedRerender = true;
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
	
		Viewport.allNeedRerender = true;
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
		Viewport.allNeedRerender = true;
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
		Viewport.allNeedRerender = true;
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
		Viewport.allNeedRerender = true;
	},
};