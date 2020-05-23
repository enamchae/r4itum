/**
 * @file
 */

import {createElement, declade} from "./util.js";

const submenuDelay = 500;

export class ContextMenuContainer extends HTMLElement {
	addMenu() {
		const wasEmpty = this.isEmpty;

		const menu = new ContextMenu();
		this.append(menu);

		if (wasEmpty) {
			this.listenForClickOff();
		}

		return menu;
	}

	clear() {
		declade(this);
		return this;
	}

	listenForClickOff() {
		const handler = event => {
			if (!event.path.includes(this)) {
				this.clear();
				removeEventListener("mousedown", handler);
			}
		};

		addEventListener("mousedown", handler);
		return this;
	}

	get isEmpty() {
		return this.children.length === 0;
	}
}

export class ContextMenu extends HTMLElement {

	/**
	 * @type ContextMenu
	 */
	activeSubmenu = null;

	constructor() {
		super();
	}

	positionFromEvent(mouseEvent, offset=1) {
		this.position(mouseEvent.pageX + offset, mouseEvent.pageY + offset);
		return this;
	}

	position(x, y) {
		this.style.cssText = `
left: ${x}px;
top: ${y}px;`;
		return this;
	}

	element(element) {
		this.append(element);
		return element;
	}

	separator() {
		return this.element(createElement("separator-"));
	}

	label(text) {
		return this.element(createElement("label", {
			textContent: text,
		}));
	}

	/**
	 * 
	 * @param {string} label 
	 * @param {function} clickHandler 
	 */
	button(label, clickHandler) {
		return this.element(createElement("button", {
			listeners: {
				click: [
					[clickHandler],
				],
			},

			classes: ["row-item"],

			children: [
				createElement("div", {
					textContent: label,
				}),
			],
		}));
	}

	/**
	 * 
	 * @param {string} label 
	 * @param {function} submenuBuilder Function used to add content to the submenu when it is created.
	 */
	buttonSubmenu(label, submenuBuilder) {
		let timeout;

		const button = createElement("button", {
			listeners: {
				mouseover: [
					[() => {
						timeout = setTimeout(() => {
							this.createAndSetSubmenu(submenuBuilder, button);
						}, submenuDelay);
					}],
				],

				mouseout: [
					[() => {
						clearTimeout(timeout);
					}],
				],

				click: [
					[() => {
						clearTimeout(timeout);
						this.createAndSetSubmenu(submenuBuilder, button);
					}],
				],
			},

			classes: ["row-item", "submenu-switch"],

			children: [
				createElement("div", {
					textContent: label,
				}),
			],
		});

		return this.element(button);
	}

	/**
	 * 
	 * @param {function} submenuBuilder 
	 * @param {HTMLLIElement} offsetElement Element determining the position of the submenu.
	 */
	createAndSetSubmenu(submenuBuilder, offsetElement) {
		const menu = new ContextMenu();
		submenuBuilder?.(menu);
		this.setSubmenu(menu, offsetElement);
		return menu;
	}

	/**
	 * 
	 * @param {ContextMenu} submenu 
	 * @param {HTMLLIElement} offsetElement 
	 */
	setSubmenu(submenu, offsetElement) {
		this.clearSubmenu();

		this.activeSubmenu = submenu;

		const rect = offsetElement.getBoundingClientRect();

		submenu.position(rect.left + rect.width, rect.top);
		this.insertAdjacentElement("afterend", submenu);
		return this;
	}

	clearSubmenu() {
		this.activeSubmenu?.delete();
		this.activeSubmenu = null;
		return this;
	}

	/**
	 * Recursively deletes this menu and its submenus
	 */
	delete() {
		this.remove();
		this.clearSubmenu();
		return this;
	}
}
