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
	button(content) {
		return createElement("button", {
			textContent: content,
			parent: this,
		});
	}
}