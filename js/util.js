/**
 * @file Solely used to define a collection of utility methods to facilitate codewriting in any other file.
 * 
 * This module should have no imports.
 */

export const qs = (selector, context=document) => context.querySelector(selector);
export const qsa = (selector, context=document) => context.querySelectorAll(selector);

/**
 * Creates an element and specifies various properties regarding it in a single function call.
 * @param {string|function|HTMLElement} elementSource The tag name of the new element or the constructor that creates it.
 * @param {object} [options] Properties pertaining to the object.
 * @param {Document} [options.context] 
 * @param {string} [options.namespace] 
 * @param {string} [options.textContent] 
 * @param {Iterable<string>} [options.classes] 
 * @param {object} [options.properties] 
 * @param {Iterable<string[]>} [options.attributes] 
 * @param {Iterable<Node>} [options.children] 
 * @param {Node} [options.parent] 
 * @param {object} [options.listeners] 
 * @param {function} [options.callback] 
 */
export function createElement(elementSource="div", {
	context=document,
	namespace="",
	textContent="",
	classes=[],
	properties={},
	attributes=[],
	children=[],
	parent=null,
	listeners={},
	callback=null,
}={}) {
	let element;

	if (typeof elementSource === "string") { // tag name
		const tagName = elementSource;
		element = !namespace ? context.createElement(tagName) : context.createElementNS(namespace, tagName);

	} else if (typeof elementSource === "function") { // constructor
		element = new elementSource();
	
	} else if (elementSource instanceof HTMLElement) {
		element = elementSource;

	} else {
		throw new TypeError("Unsupported type");
	}

	if (textContent) {
		element.textContent = textContent;
	}

	for (const className of classes) {
		element.classList.add(className);
	}

	Object.assign(element, properties);

	for (const [key, value, namespace] of attributes) {
		if (!namespace) {
			element.setAttribute(key, value);
		} else {
			element.setAttributeNS(namespace, key, value);
		}
	}

	for (const child of children) {
		element.append(child);
	}

	parent?.append(element);

	for (const [eventType, handlers] of Object.entries(listeners)) {
		for (const [handler, options] of handlers) {
			element.addEventListener(eventType, handler, options);
		}
	}

	callback?.call(element);

	return element;
}

/**
 * Removes all the children of an element.
 */
export function declade(element) {
	element.innerHTML = "";
	return element;
}

export function privMap() {
	const priv = new WeakMap();
	return {
		priv,
		_: key => priv.get(key),
	};
}