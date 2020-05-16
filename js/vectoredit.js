/**
 * @file Provides widgets for users to view and edit vectors.
 */

import {Vector4} from "./4d/vector.js";
import {declade, createElement} from "./util.js";

/**
 * @fires VectorEditor#update When any value is changed.
 * @fires VectorEditor#commit When an input loses focus or ENTER is pressed.
 */
export class VectorEditor extends HTMLElement {
	static axisLabels = ["X", "Y", "Z", "W"];

	/**
	 * Maps each element in this vector editor to the axis that it represents, as a number.
	 * @type Map<HTMLInputElement, number>
	 */
	inputs = new Map();
	lastAcceptedValues = [];

	constructor(vector=new Vector4()) {
		super();

		this.fillElements(vector);
	}
	
	getChangeEventDetail(event) {
		const index = this.inputs.get(event.target);
		const value = parseFloat(event.target.value);
		const isValid = !isNaN(value);
	
		return {
			inputTarget: event.target,
			index,
			valueAttempted: value,
			valueUsed: isValid ? value : this.lastAcceptedValues[index],
			isValid,
		};
	}

	fillElements(vector) {
		const form = createElement("form", {
			listeners: {
				input: [
					[event => {
						const customEvent = new CustomEvent("update", {
							detail: this.getChangeEventDetail(event),
						});
						this.dispatchEvent(customEvent);
					}],
				],
				
				change: [
					[event => {
						const detail = this.getChangeEventDetail(event);

						const customEvent = new CustomEvent("commit", {detail});
						this.dispatchEvent(customEvent);

						if (!detail.isValid) {
							// Briefly flash red
							detail.inputTarget.classList.add("error-flash");
							detail.inputTarget.addEventListener("animationend", () => {
								detail.inputTarget.classList.remove("error-flash");
							}, {once: true});
						}

						detail.inputTarget.value = detail.valueUsed;
						this.lastAcceptedValues[detail.index] = detail.valueUsed;
					}],
				],
			},
			parent: this,
		});

		for (let i = 0; i < 4; i++) {
			const value = isNaN(vector[i]) ? 0 : vector[i];
			this.lastAcceptedValues[i] = value;

			createElement("label", {
				textContent: VectorEditor.axisLabels[i],
				parent: form,
			});
			
			this.inputs.set(createElement("input", {
				properties: {
					type: "number",
					value,
					step: .1,
				},
				parent: form,
			}), i);
		}
	}

	refill(vector) {
		for (const [input, i] of this.inputs) {
			const value = isNaN(vector[i]) ? 0 : vector[i];
			this.lastAcceptedValues[i] = value;

			input.value = value;
		}
	}

	get value() {
		return new Vector4(...this.lastAcceptedValues);
	}

	set value(vector) {
		this.refill(vector);
	}
}

export class RotorEditor extends HTMLElement {
	connectedCallback() {
		declade(this);

		
	}

	get value() {

	}

	set value(value) {

	}
}