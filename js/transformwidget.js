/**
 * @file Controls display of transform widgets.
 */

import {declade, createElement} from "./util.js";

const height = 200;
const svgns = "http://www.w3.org/2000/svg";

export class TransformWidget extends HTMLElement {
	static WidgetMode = {
		NONE: -1,
		TRANSLATE: 0,
		ROTATE: 1,
		SCALE: 2,
	};

	mode = TransformWidget.WidgetMode.NONE;

	/**
	 * @type SVGSVGElement
	 */
	svg = null;
	main = null;

	elements = {};

	constructor() {
		super();
		
		this.svg = createElement("svg", {
			namespace: svgns,
			attributes: [
				["width", height],
				["height", height],
			],
			parent: this,
		});

		this.main = createElement("g", {
			namespace: svgns,
			attributes: [
				["transform", `translate(${height / 2}, ${height / 2})`],
			],
			parent: this.svg,
		});
	}

	setMode(mode) {
		declade(this.main);

		this.elements = {};

		switch (mode) {
			case TransformWidget.WidgetMode.NONE:
				break;

			case TransformWidget.WidgetMode.ROTATE:
				createElement("circle", {
					namespace: svgns,
					attributes: [
						["r", "100"],
						["stroke", "var(--col-green-2-7f)"],
						["fill", "#0000"],
					],
					parent: this.main,
				}); // Boundary ring

				createElement("circle", {
					namespace: svgns,
					attributes: [
						["r", "3"],
						["fill", "var(--col-green-2-7f)"],
					],
					parent: this.main,
				}); // Origin

				this.elements.radius = createElement("line", {
					namespace: svgns,
					attributes: [
						["x1", "0"],
						["y1", "0"],
						["x2", height / 2],
						["y2", "0"],
						["stroke", "var(--col-green-2-7f)"],
					],
					parent: this.main,
				}); // Radius

				this.elements.cursor = createElement("circle", {
					namespace: svgns,
					attributes: [
						["r", "8"],
						["cx", "20"],
						["cy", "50"],
						["fill", "var(--col-green-0-cf)"],
					],
					parent: this.main,
				}); // Cursor
				break;

			default:
				throw new RangeError("Unsupported mode");
		}

		this.mode = mode;

		return this;
	}

	setCursorPosition(x, y) {
		switch (this.mode) {
			case TransformWidget.WidgetMode.NONE:
				break;

			case TransformWidget.WidgetMode.ROTATE:
				this.elements.cursor.setAttribute("cx", x);
				this.elements.cursor.setAttribute("cy", y);
				this.elements.radius.setAttribute("transform", `rotate(${Math.atan2(y, x) * 180 / Math.PI})`);
				break;

			default:
				throw new RangeError("Unsupported mode");
		}
		return this;
	}
}