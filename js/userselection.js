/**
 * @file Tracks user selection.
 */

import {Object4} from "./4d/objects.js";

export default {
	/**
	 * @type Object4
	 */
	get objectPrimary() {
		return objectPrimary;
	},

	/**
	 * @type Set<Object4>
	 */
	get objectsSubordinate() {
		return objectsSubordinate;
	},

	*objects() {
		if (objectPrimary) {
			yield objectPrimary;
		}

		yield* objectsSubordinate;
	},

	/**
	 * 
	 * @param {Object4} object 
	 * @returns {boolean} 
	 */
	contains(object) {
		return objectPrimary === object || objectsSubordinate.has(object);
	},

	/**
	 * @type number
	 */
	get size() {
		return (objectPrimary !== null ? 1 : 0) + objectsSubordinate.size;
	},

	/**
	 * 
	 * @param  {...Object4} objects 
	 */
	replace(...objects) {
		// Replace selections
		objectPrimary = objects.shift() ?? null;

		objectsSubordinate.clear();
		for (const object of objects) {
			objectsSubordinate.add(object);
		}

		return this;
	},
};

let objectPrimary = null;
const objectsSubordinate = new Set();