/**
 * @file Handles definition and handling of custom elements.
 */

import {Viewport, ObjectPropertiesControl, ObjectList} from "./interface.js";
import {VectorEditor, RotorEditor} from "./vectoredit.js";

customElements.define("viewport-", Viewport);
customElements.define("object-properties", ObjectPropertiesControl);
customElements.define("object-list", ObjectList);

customElements.define("vector-editor", VectorEditor);
customElements.define("rotor-editor", RotorEditor);

// Semantic elements
for (const tagName of [
	"menu-bar",
	"workspace-",
	"overlays-",
	"toolbar-",
	"tool-button",
]) {
	customElements.define(tagName, class extends HTMLElement {});
}