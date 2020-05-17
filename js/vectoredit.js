/**
 * @file Provides widgets for users to view and edit vectors.
 */

import {Vector4, Rotor4} from "./4d/vector.js";
import {declade, createElement} from "./util.js";

/**
 * Allows a user to edit the components of a vector.
 * @fires VectorEditor#update When any value is changed.
 * @fires VectorEditor#commit When an input loses focus or ENTER is pressed.
 */
export class VectorEditor extends HTMLElement {
	static basisLabels = ["X", "Y", "Z", "W"];

	/**
	 * Maps each element in this vector editor to the axis that it represents, as a number.
	 * @type Map<HTMLInputElement, number>
	 */
	inputs = new Map();
	/**
	 * Stores the previous accepted values in this editor's inputs.
	 * @type number[]
	 */
	lastAcceptedValues = [];

	/**
	 * 
	 * @param {Vector4} [vector] The vector used to initiate the inputs' values.
	 */
	constructor(vector) {
		super();

		this.fillElements(vector);
	}
	
	/**
	 * Produces the detail object given to a `CustomEvent` emitted from this editor.
	 * @param {Event} event 
	 */
	getChangeEventDetail(event) {
		const index = this.inputs.get(event.target);
		const value = /* event.target.value === "" ? 0 :  */parseFloat(event.target.value);
		const isValid = !isNaN(value);
	
		return {
			currentTarget: this,
			inputTarget: event.target,
			index,
			valueAttempted: value,
			valueUsed: isValid ? value : this.lastAcceptedValues[index],
			isValid,
		};
	}

	/**
	 * Creates the elements used in this editor.
	 * @param {Vector4} [vector] The vector used to initiate the inputs' values.
	 */
	fillElements(vector=new Vector4()) {
		declade(this);

		// Create the form that catches and passes on the events
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

						this.lastAcceptedValues[detail.index] = detail.valueUsed;
						detail.inputTarget.value = round(detail.valueUsed);

						const customEvent = new CustomEvent("commit", {detail});
						this.dispatchEvent(customEvent);

						if (!detail.isValid) {
							// Briefly flash red
							detail.inputTarget.classList.add("error-flash");
							detail.inputTarget.addEventListener("animationend", () => {
								detail.inputTarget.classList.remove("error-flash");
							}, {once: true});
						}
					}],
				],
			},
			parent: this,
		});

		// Create the inputs
		for (let i = 0; i < 4; i++) {
			const value = isNaN(vector[i]) ? 0 : vector[i];
			this.lastAcceptedValues[i] = value;

			createElement("label", {
				textContent: VectorEditor.basisLabels[i],
				parent: form,
			});
			
			this.inputs.set(createElement("input", {
				properties: {
					type: "number",
					value: round(value),
					step: .1,
				},
				parent: form,
			}), i);
		}

		return this;
	}

	refill(vector) {
		for (const [input, i] of this.inputs) {
			const value = isNaN(vector[i]) ? 0 : vector[i];
			this.lastAcceptedValues[i] = value;
			input.value = round(value);
		}

		return this;
	}

	get value() {
		return new Vector4(...this.lastAcceptedValues);
	}

	set value(vector) {
		this.refill(vector);
	}
}

/**
 * Allows a user to edit the angle and plane of a rotor.
 */
export class RotorEditor extends HTMLElement {
	static basisLabels = ["XY", "XZ", "XW", "YZ", "YW", "ZW", "XYZW"];
	static gridRows = [2, 2, 2, 3, 3, 4];
	static gridCols = [1, 2, 3, 2, 3, 3];

	angleEditor;
	/**
	 * Maps each input in this rotor editor to the axis that it represents, as a number.
	 * 
	 * This only contains values for the plane coefficient fields.
	 * @type Map<HTMLInputElement, number>
	 */
	inputs = new Map();
	/**
	 * Stores the previous accepted values in this editor's inputs.
	 * 
	 * This only contains values for the plane coefficients.
	 * @type number[]
	 */
	lastAcceptedValues = [];

	constructor(rotor) {
		super();

		this.fillElements(rotor);
	}
	
	/**
	 * Produces the detail object given to a `CustomEvent` emitted from this editor.
	 * @param {Event} event 
	 */
	getChangeEventDetail(event) {
		const index = this.inputs.get(event.target);
		const value = parseFloat(event.target.value);
		const isValid = !isNaN(value);
	
		return {
			currentTarget: this,
			inputTarget: event.target,
			index,
			valueAttempted: value,
			valueUsed: isValid ? value : this.lastAcceptedValues[index],
			isValid,
		};
	}

	/**
	 * Creates the elements used in this editor.
	 * @param {Rotor4} [rotor] The rotor used to initiate the inputs' values.
	 */
	fillElements(rotor=new Rotor4()) {
		declade(this);

		// Create the form that catches and passes on the events
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

						this.lastAcceptedValues[detail.index] = detail.valueUsed;
						detail.inputTarget.value = round(detail.valueUsed);

						const customEvent = new CustomEvent("commit", {detail});
						this.dispatchEvent(customEvent);

						if (!detail.isValid) {
							// Briefly flash red
							detail.inputTarget.classList.add("error-flash");
							detail.inputTarget.addEventListener("animationend", () => {
								detail.inputTarget.classList.remove("error-flash");
							}, {once: true});
						}
					}],
				],
			},
			parent: this,
		});

		// Create the inputs

		this.angleEditor = new AngleEditor(rotor.angle);
		form.appendChild(this.angleEditor);

		const plane = rotor.plane;
		for (let i = 0; i < 7; i++) {
			const value = isNaN(plane[i]) ? 0 : plane[i]; // Verify the value
			this.lastAcceptedValues[i] = value;

			const input = createElement("input", {
				properties: {
					type: "number",
					value: round(value),
					step: .1,
				},
			});
			this.inputs.set(input, i); // Connect this input to its index

			// Group the input and label into a block
			const inputBlock = createElement("input-block", {
				children: [
					input,
					createElement("label", {
						textContent: RotorEditor.basisLabels[i],
					}),
				],

				parent: form,
			});
			// XYZW input fills row
			if (i === 6) {
				inputBlock.classList.add("fill-row");
			} else {
				inputBlock.style.cssText = `
					grid-row: ${RotorEditor.gridRows[i]};
					grid-column: ${RotorEditor.gridCols[i]};`;
			}
		}
	}

	refill(rotor) {
		for (const [input, i] of this.inputs) {
			const value = isNaN(rotor[i]) ? 0 : rotor[i];
			this.lastAcceptedValues[i] = value;
			input.value = round(value);
		}
	}

	get value() {
		return Rotor4.planeAngle(this.lastAcceptedValues, this.angleEditor.value).normalize();
	}

	set value(rotor) {
		this.refill(rotor);
	}
}

/**
 * Allows a user to edit an angle value.
 */
export class AngleEditor extends HTMLElement {
	input;
	lastAcceptedValue = 0;

	constructor(angle) {
		super();

		this.fillElements(angle);
	}
	
	/**
	 * Produces the detail object given to a `CustomEvent` emitted from this editor.
	 * @param {Event} event 
	 */
	getChangeEventDetail(event) {
		const value = mod(parseFloat(event.target.value) / 180 * Math.PI, 2 * Math.PI);
		const isValid = !isNaN(value);
	
		return {
			inputTarget: event.target,
			valueAttempted: value,
			valueUsed: isValid ? value : this.lastAcceptedValue,
			isValid,
		};
	}

	/**
	 * Creates the elements used in this editor.
	 * @param {number} [angle=0] 
	 */
	fillElements(angle=0) {
		declade(this);

		// Create the form that catches and passes on the events
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

						this.lastAcceptedValue = detail.valueUsed;
						this.input.value = round(detail.valueUsed * 180 / Math.PI);

						const customEvent = new CustomEvent("commit", {detail});
						this.dispatchEvent(customEvent);

						if (!detail.isValid) {
							// Briefly flash red
							this.input.classList.add("error-flash");
							this.input.addEventListener("animationend", () => {
								this.input.classList.remove("error-flash");
							}, {once: true});
						}
					}],
				],
			},
			parent: this,
		});

		// Create the inputs

		const value = isNaN(angle) ? 0 : mod(angle, 2 * Math.PI); // Verify the value
		this.lastAcceptedValue = value;

		this.input = createElement("input", {
			properties: {
				type: "number",
				value: round(value * 180 / Math.PI),
				step: 15,
			},
			parent: form,
		});
		createElement("label", {
			textContent: "°",
			parent: form,
		});
	}

	refill(angle) {
		const value = isNaN(angle) ? 0 : mod(angle, 2 * Math.PI);
		this.lastAcceptedValue = value;
		this.input.value = round(value * 180 / Math.PI);
	}

	get value() {
		return this.lastAcceptedValue;
	}

	set value(angle) {
		this.refill(angle);
	}
}

function mod(a, b) {
	return (a % b + b) % b;
}

function round(n) {
	return Number(n.toPrecision(12)); // arbitrary, somewhat based on double precision limit
}