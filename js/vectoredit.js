/**
 * @file Provides widgets for users to view and edit vectors.
 */

import {Polymultivector, Vector4, Rotor4} from "./4d/vector.js";
import {declade, createElement, privMap} from "./util.js";

/**
 * @fires ValueEditor#update When any value is changed.
 */
class ValueEditor extends HTMLElement {
	static defaultValue = 0;

	/**
	 * Maps each input in this editor to the value that it represents, as a number.
	 * @type Map<HTMLElement, number>
	 */
	inputs = new Map();
	/**
	 * Stores the previous accepted values in this editor's inputs.
	 * @type number[]
	 */
	lastAcceptedValues;

	initator;

	constructor(initiator) {
		super();

		this.initiator = initiator;
		this.lastAcceptedValues = new Polymultivector(undefined, initiator.length); // Hold off on filling the array; do some processing first
	}

	/**
	 * Creates the elements used in this editor.
	 * @param {number[]} [initiator] The values used to initiate the inputs' values.
	 */
	fillElements(initiator=[ValueEditor.defaultValue]) {
		declade(this);

		const form = this.createForm();
		this.createInputs(initiator, form);

		return this;
	}

	/**
	 * Create the form that catches and passes on the events.
	 * @returns {HTMLFormElement}
	 */
	createForm() {
		return createElement("form", {
			listeners: {
				input: [
					[event => this.oninput(event)],
				],
				
				change: [
					[event => this.onchange(event)],
				],
			},
			parent: this,
		});
	}

	createInputs(initiator, form) {
		// Create the inputs
		for (let i = 0; i < this.lastAcceptedValues.length; i++) {
			this.createInputBlock(initiator, i, form);
		}
	}

	/**
	 * Creates an input and any accompanying labels.
	 * @param {number[]} initiator 
	 * @param {number} i 
	 * @param {HTMLFormElement} form 
	 */
	createInputBlock(initiator, i, form) {
		this.createInput(initiator, i, form);
	}

	createInput(initiator, i, form) {
		const value = this.initiateValue(i, initiator);

		const input = createElement("input", {
			properties: {
				type: "number",
				value: this.convertForInput(value, i),
				step: this.inputStepValue(i),
				title: "",
			},
			classes: this.classListIfDisabled(i),
			parent: form,
		});
		this.inputs.set(input, i);
		return input;
	}

	oninput(event) {
		const detail = this.getChangeEventDetail(event);

		if (detail.isValid) {
			detail.inputTarget.classList.remove("erroneous");

			this.lastAcceptedValues[detail.index] = detail.valueUsed;

			const customEvent = new CustomEvent("update", {detail});
			this.dispatchEvent(customEvent);
		} else {
			detail.inputTarget.classList.add("erroneous");
		}

		event.stopPropagation(); // Prevent this event from being caught by any parent editors
	}

	onchange(event) {
		const detail = this.getChangeEventDetail(event);

		this.lastAcceptedValues[detail.index] = detail.valueUsed;
		detail.inputTarget.value = this.convertForInput(detail.valueUsed, detail.index);

		if (!detail.isValid) {
			detail.inputTarget.classList.remove("erroneous");

			// Briefly flash red
			detail.inputTarget.classList.add("error-flash");
			detail.inputTarget.addEventListener("animationend", () => {
				detail.inputTarget.classList.remove("error-flash");
			}, {once: true});

			// Only trigger an update event if there was a change
			const customEvent = new CustomEvent("update", {detail});
			this.dispatchEvent(customEvent);
		}

		event.stopPropagation();
	}
	
	/**
	 * Produces the detail object given to a `CustomEvent` emitted from this editor.
	 * @param {Event} event 
	 */
	getChangeEventDetail(event) {
		const index = this.inputs.get(event.target);
		const value = this.parseInputValue(event.target.value, index);
		const isValid = this.isValidValue(value, index);

		return {
			currentTarget: this,
			inputTarget: event.target,
			index,
			valueAttempted: value,
			valueUsed: isValid ? value : this.lastAcceptedValues[index],
			isValid,
		};
	}

	refill(initiator=[ValueEditor.defaultValue]) {
		for (const [input, i] of this.inputs) {
			const value = this.initiateValue(i, initiator);
			input.value = this.convertForInput(value, i);
		}

		return this;
	}

	/**
	 * Determines whether a value in an initiator is valid, or else uses a given default value. The final value is
	 * accepted and recorded.
	 * @param {number} i 
	 * @param {number[]} initiator 
	 * @returns {number} The accepted value.
	 */
	initiateValue(i, initiator) {
		const value = !this.isValidValue(initiator[i]) ? ValueEditor.defaultValue : initiator[i];
		this.lastAcceptedValues[i] = value;
		return value;
	}

	/**
	 * Determines whether a value at a given index should be accepted.
	 * @param {number} value 
	 * @param {number} index 
	 * @returns {boolean}
	 */
	isValidValue(value, index) {
		return !isNaN(value);
	}

	/**
	 * Determines the step to be used for the input at the given index during creation.
	 * @param {number} index 
	 * @returns {number}
	 */
	inputStepValue(index) {
		return 0.1;
	}

	/**
	 * Determines whether a field should be prevented from being edited.
	 * @param {number} index 
	 */
	isDisabled(index) {
		return false;
	}

	classListIfDisabled(index) {
		return this.isDisabled(index) ? ["disabled"] : [];
	}

	/**
	 * Parses an input value as a usable number.
	 * 
	 * Inverse of `convertForInput`.
	 * @param {number} value 
	 * @param {number} index 
	 */

	parseInputValue(value, index) {
		return /* value === "" ? 0 :  */parseFloat(value);
	}

	/**
	 * Determines how a value will be displayed in an input.
	 * 
	 * Inverse of `parseInputValue`.
	 * @param {number} value 
	 * @param {number} index 
	 */
	convertForInput(value, index) {
		return round(value);
	}

	get value() {
		return this.lastAcceptedValues;
	}

	set value(initiator) {
		this.refill(initiator);
	}

	/**
	 * Overrides properties on this object, to allow custom callbacks after instantiation.
	 * @param {object} properties 
	 * @returns {this}
	 */
	override(properties) {
		return Object.assign(this, properties);
	}
}

/**
 * Allows a user to edit the components of a vector.
 */
export class VectorEditor extends ValueEditor {
	static basisLabels = ["X", "Y", "Z", "W"];

	restrictingW;

	constructor(initiator, restrictingW=false) {
		super(initiator);

		this.restrictingW = restrictingW;
	}

	connectedCallback() {
		declade(this);
		this.fillElements(this.initiator);
	}

	createInputBlock(initiator, i, form) {
		createElement("label", {
			textContent: VectorEditor.basisLabels[i],
			parent: form,
			classes: this.classListIfDisabled(i),
		});

		this.createInput(initiator, i, form);
	}

	isDisabled(index) {
		return this.restrictingW && index === 3;
	}

	get value() {
		return new Vector4(...this.lastAcceptedValues);
	}
}

/**
 * Allows a user to edit the angle and plane of a rotor.
 * 
 * `inputs` and `lastAcceptedValues` only contain values for the plane coefficients.
 */
export class RotorEditor extends ValueEditor {
	static basisLabels = ["XY", "XZ", "XW", "YZ", "YW", "ZW", "XYZW"];
	static gridRows = [2, 2, 2, 3, 3, 4];
	static gridCols = [1, 2, 3, 2, 3, 3];

	restrictingW;
	// Field causes `angleEditor` to be undefined
	// angleEditor;

	/**
	 * Marks the angle editor as ineffective if the plane is all zeros.
	 */
	// markAngleEditor() {
	// 	if (this.lastAcceptedValues.isZero()) {
	// 		this.angleEditor.input.classList.add("ineffective");
	// 	} else {
	// 		this.angleEditor.input.classList.remove("ineffective");
	// 	}

	// 	return this;
	// }

	constructor(initiator, restrictingW=false) {
		super(initiator);

		this.restrictingW = restrictingW;
	}

	connectedCallback() {
		declade(this);
		this.fillElements(this.initiator);
	}

	onchange(event) {
		super.onchange(event);

		// this.markAngleEditor(); // If the plane is all zeros, mark the angle editor as ineffective
	}

	onanglechange(event) {
		const detailOld = event.detail;
		const detail = { // Repurpose the detail object for this rotor editor
			currentTarget: this,
			inputTarget: detailOld.inputTarget,
			index: 0,
			valueAttempted: detailOld.valueAttempted,
			valueUsed: detailOld.valueUsed,
			isValid: detailOld.isValid,
		};

		this.lastAcceptedValues[detail.index] = detail.valueUsed;
		// No need to do anything to the angle editor

		const customEvent = new CustomEvent("update", {detail});
		this.dispatchEvent(customEvent);
	}

	createInputs(rotor, form) {
		// Create the inputs

		const anglePlane = rotor.asAnglePlane();

		this.angleEditor = new AngleEditor(anglePlane[0] * 180 / Math.PI);
		this.angleEditor.addEventListener("update", event => {
			this.onanglechange(event);
		});
		form.appendChild(this.angleEditor);

		this.inputs.set(this.angleEditor, 0);
		this.lastAcceptedValues[0] = this.angleEditor.value;

		for (let i = 1; i < this.lastAcceptedValues.length; i++) {
			this.createInputBlock(anglePlane, i, form);
		}

		// this.markAngleEditor(); // If the plane is all zeros, mark the angle editor as ineffective
	}

	createInputBlock(plane, i, form) {
		const label = createElement("label", {
			// textContent: `% ${RotorEditor.basisLabels[i - 1]}`,
			textContent: RotorEditor.basisLabels[i - 1],
			classes: this.classListIfDisabled(i),
		});

		// Group the input and label into a block
		const inputBlock = createElement("input-block", {
			children: [
				this.createInput(plane, i, form, .1),
				label,
			],

			parent: form,
		});
		// XYZW input fills row
		if (i === 7) {
			inputBlock.classList.add("fill-row");
			label.title = `Not a basis plane, but rather an occasional side effect of rotating more than once`;
		} else {
			inputBlock.style.cssText = `
grid-row: ${RotorEditor.gridRows[i - 1]};
grid-column: ${RotorEditor.gridCols[i - 1]};`;
		}
	}

	refill(rotor) {
		const anglePlane = rotor.asAnglePlane();

		for (const [input, i] of this.inputs) {
			if (i === 0) { // Angle editor will process the value
				input.valueRad = anglePlane[0];
			} else {
				const value = this.initiateValue(i, anglePlane);
				input.value = this.convertForInput(value, i);
			}
		}

		return this;
	}

	isDisabled(index) {
		return this.restrictingW && [3, 5, 6, 7].includes(index);
	}

	// Linear percentages cannot represent negative coefficients
	/* parseInputValue(value) {
		return Math.sqrt(parseFloat(value) / 100);
	}

	convertForInput(value) {
		return round(value ** 2 * 100);
	} */

	get value() {
		return Rotor4.planeAngle(this.lastAcceptedValues.slice(1), this.lastAcceptedValues[0] * Math.PI / 180);
	}
}

/**
 * Allows a user to edit an angle value.
 */
export class AngleEditor extends ValueEditor {
	// input;

	constructor(angle) {
		const initiator = [angle];

		super(initiator);
	}

	connectedCallback() {
		declade(this);
		this.fillElements(this.initiator);
	}
	
	createInputs(initiator, form) {
		// Create the inputs

		const value = this.initiateValue(0, initiator);

		this.input = createElement("input", {
			properties: {
				type: "number",
				value: this.convertForInput(value),
				step: 5,
				title: "",
			},
			classes: this.classListIfDisabled(0),
			parent: form,
		});

		this.inputs.set(this.input, 0);
		createElement("label", {
			textContent: "°",
			parent: form,
		});
	}

	initiateValue(i, initiator) {
		const value = !this.isValidValue(initiator[i]) ? ValueEditor.defaultValue : mod(initiator[i], 360);
		this.lastAcceptedValues[i] = value;
		return value;
	}

	parseInputValue(value) {
		// The remainder operation causes unparsable string values to not be considered NaN. The input will not flash red
		return mod(value, 360);
	}

	get value() {
		return this.lastAcceptedValues[0];
	}

	set value(angle) {
		this.refill([angle]);
	}

	get valueRad() {
		return this.lastAcceptedValues[0] * Math.PI / 180;
	}

	set valueRad(angle) {
		this.refill([angle * 180 / Math.PI]);
	}
}

export class PositiveNumberEditor extends ValueEditor {
	constructor(value) {
		const initiator = [value];

		super(initiator);
	}

	connectedCallback() {
		declade(this);
		this.fillElements(this.initiator);
	}

	isValidValue(value) {
		return !isNaN(value) && value > 0;
	}

	refill(value) {
		super.refill([value]);
	}

	get value() {
		return this.lastAcceptedValues[0];
	}

	set value(value) {
		this.refill([value]);
	}
}

function mod(a, b) {
	return (a % b + b) % b;
}

function round(n) {
	return Number(n.toPrecision(12)); // arbitrary, somewhat based on double precision limit
}