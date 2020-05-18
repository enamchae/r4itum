/**
 * @file Handles definition and handling of custom elements.
 */

import {Viewport, ObjectList, ObjectPropertiesControl, CameraPropertiesControl} from "./interface.js";
import {VectorEditor, RotorEditor, AngleEditor, PositiveNumberEditor} from "./vectoredit.js";

customElements.define("viewport-", Viewport);
customElements.define("object-list", ObjectList);
customElements.define("object-properties", ObjectPropertiesControl);
customElements.define("camera-properties", CameraPropertiesControl);

customElements.define("vector-editor", VectorEditor);
customElements.define("rotor-editor", RotorEditor);
customElements.define("angle-editor", AngleEditor);
customElements.define("positive-n-editor", PositiveNumberEditor);

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