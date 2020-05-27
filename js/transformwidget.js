/**
 * @file Controls display of transform widgets.
 */

import {declade, createElement} from "./util.js";

export class TransformWidget extends HTMLElement {
	static WidgetMode = {
		TRANSLATE: 0,
		ROTATE: 1,
		SCALE: 2,
	};

	/**
	 * @type SVGSVGElement
	 */
	svg = null;

	constructor() {
		super();
		
		this.svg = createElement("svg", {
			namespace: "http://www.w3.org/2000/svg",
			attributes: [
				["width", "300"],
				["height", "300"],
			],
			parent: this,
		});
	}

	setMode(mode) {
		declade(this.svg);

		switch (mode) {
			case TransformWidget.WidgetMode.ROTATE:
				createElement("rect", {
					namespace: "http://www.w3.org/2000/svg",
					attributes: [
						["width", "80"],
						["height", "80"],
						["fill", "#aaa"],
					],
					parent: this.svg,
				});
				break;

			default:
				throw new RangeError("Unsupported mode");
		}
		return this;
	}
}