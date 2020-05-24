/**
 * @file Toolbar controls and functions.
 */

import {createElement} from "./util.js";

export class Toolbar extends HTMLElement {
	element(element) {
		this.append(element);
		return element;
	}

	column() {
		return this.element(new ToolbarColumn());
	}

	section() {
		return this.element(new ToolbarSection());
	}

	separator() {
		return createElement("separator-", {
			parent: this,
		});
	}
}

export class ToolbarColumn extends HTMLElement {
	section(section=new ToolbarSection()) {
		this.append(section);
		return section;
	}
}

export class ToolbarSection extends HTMLElement {
	buttonRack;
	labelContainer;

	constructor() {
		super();

		this.buttonRack = createElement("toolbar-button-rack", {parent: this});
		this.labelContainer = createElement("label", {parent: this});
	}

	button(content, clickHandler) {
		return createElement("button", {
			textContent: content,

			listeners: {
				click: [
					[clickHandler],
				],
			},

			parent: this.buttonRack,
		});
	}

	label(text) {
		this.labelContainer.textContent = text;
		return this;
	}

	disable(disabled=true) {
		this.buttonRack.classList.toggle("disabled", disabled);
		return this;
	}
}