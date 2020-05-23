/**
 * @file Handles definition and handling of custom elements.
 */

import {Viewport, ObjectList, ObjectPropertiesControl, CameraPropertiesControl} from "./interface.js";
import {VectorEditor, RotorEditor, AngleEditor, PositiveNumberEditor} from "./vectoredit.js";
import {ContextMenuContainer, ContextMenu} from "./contextmenu.js";
import {Toolbar} from "./toolbar.js";

customElements.define("viewport-", Viewport);
customElements.define("object-list", ObjectList);
customElements.define("object-properties", ObjectPropertiesControl);
customElements.define("camera-properties", CameraPropertiesControl);

customElements.define("vector-editor", VectorEditor);
customElements.define("rotor-editor", RotorEditor);
customElements.define("angle-editor", AngleEditor);
customElements.define("positive-n-editor", PositiveNumberEditor);

customElements.define("context-menus", ContextMenuContainer);
customElements.define("context-menu", ContextMenu);

customElements.define("toolbar-", Toolbar);

// Semantic elements
for (const tagName of [
	"menu-bar",
	"workspace-",
	"overlays-",
	"tool-button",
	"context-menu-separator",
]) {
	customElements.define(tagName, class extends HTMLElement {});
}