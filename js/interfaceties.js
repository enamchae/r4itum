/**
 * @file Links 4D operations to items in the interface.
 */

import {scene, Viewport, ObjectList} from "./interface.js";

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
};