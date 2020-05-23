/**
 * @file Tracks user selection.
 */

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
	get objectsSecondary() {
		return objectsSecondary;
	},

	*objects() {
		if (this.objectPrimary) {
			yield this.objectPrimary;
		}

		yield* this.objectsSecondary;
	},

	contains(object) {
		return objectPrimary === object || objectsSecondary.has(object);
	},

	get size() {
		return (this.objectPrimary !== null ? 1 : 0) + this.objectsSecondary.size;
	},

	/**
	 * 
	 * @param  {...Object4} objects 
	 */
	replace(...objects) {
		// Replace selections
		objectPrimary = objects.shift() ?? null;

		this.objectsSecondary.clear();
		for (const object of objects) {
			this.objectPrimary.add(object);
		}

		return this;
	},
};

let objectPrimary = null;
const objectsSecondary = new Set();