/**
 * @file Controls display of transform widgets.
 */

import {declade, createElement} from "./util.js";

const circleWidth = 3;
const scaleSpacing = 64;
const scaleTicks = 2;
const svgns = "http://www.w3.org/2000/svg";

export class TransformWidget extends HTMLElement {
	static WidgetMode = {
		NONE: -1,
		TRANSLATE: 0,
		ROTATE: 1,
		SCALE: 2,
	};

	static height = 200;

	mode = TransformWidget.WidgetMode.NONE;

	/**
	 * @type SVGSVGElement
	 */
	svg = null;
	main = null;

	// TODO cleanup element storage system
	elements = {};

	constructor() {
		super();

		this.classList.add("unused");
		
		this.svg = createElement("svg", {
			namespace: svgns,
			attributes: [
				["width", TransformWidget.height],
				["height", TransformWidget.height],
			],
			parent: this,
		});

		this.main = createElement("g", {
			namespace: svgns,
			attributes: [
				["transform", `translate(${TransformWidget.height / 2}, ${TransformWidget.height / 2})`],
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
				this.classList.remove("unused");
				createElement("circle", {
					namespace: svgns,
					attributes: [
						["r", (TransformWidget.height - circleWidth) / 2],
						["stroke-width", circleWidth],
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
						["x2", TransformWidget.height / 2],
						["y2", "0"],
						["stroke", "var(--col-green-2-7f)"],
					],
					parent: this.main,
				}); // Radius

				this.elements.cursor = createElement("circle", {
					namespace: svgns,
					attributes: [
						["r", "8"],
						["fill", "var(--col-green-0-cf)"],
					],
					parent: this.main,
				}); // Cursor
				break;

			case TransformWidget.WidgetMode.SCALE:
				this.classList.remove("unused");

				this.elements.ticks = new Map();
				for (let i = -scaleTicks; i <= scaleTicks; i++) {
					this.elements.ticks.set(i, createElement("line", {
						namespace: svgns,
						attributes: [
							["x1", "0"],
							["y1", "8"],
							["x2", "0"],
							["y2", "-8"],
							["transform", `translate(${i * scaleSpacing}, 0)`],
							["stroke", "var(--col-green-2-7f)"],
						],
						parent: this.main,
					}));
				}
				
				createElement("line", {
					namespace: svgns,
					attributes: [
						["x1", -TransformWidget.height / 2],
						["y1", "0"],
						["x2", TransformWidget.height / 2],
						["y2", "0"],
						["stroke", "var(--col-green-2-7f)"],
					],
					parent: this.main,
				}); // Axis

				this.elements.cursor = createElement("circle", {
					namespace: svgns,
					attributes: [
						["r", "8"],
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

	clearMode() {
		this.classList.add("unused");
		return this;
	}

	setCursorPosition(x=0, y=0) {
		switch (this.mode) {
			case TransformWidget.WidgetMode.NONE:
				break;

			case TransformWidget.WidgetMode.ROTATE:
				this.elements.cursor.setAttribute("cx", x);
				this.elements.cursor.setAttribute("cy", y);
				this.elements.radius.setAttribute("transform", `rotate(${Math.atan2(y, x) * 180 / Math.PI})`);
				break;

			case TransformWidget.WidgetMode.SCALE: {
				let iNearest = Math.round(x);

				for (let i = -scaleTicks; i <= scaleTicks; i++) {
					const tick = this.elements.ticks.get(i);

					// Adding `iNearest` offsets the ticks depending on the scrolled position
					// Subtracting `x` causes the ticks to move
					tick.setAttribute("transform", `translate(${(i + iNearest - x) * scaleSpacing}, 0)`);
				}
				
				break;
			}

			default:
				throw new RangeError("Unsupported mode");
		}
		return this;
	}
}