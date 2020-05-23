/**
 * @file Handles definition and handling of custom elements.
 */

import {Toolbar, ToolbarSection, ToolbarColumn} from "./toolbar.js";
customElements.define("toolbar-", Toolbar);
customElements.define("toolbar-column", ToolbarColumn);
customElements.define("toolbar-section", ToolbarSection);

import {ContextMenuContainer, ContextMenu} from "./contextmenu.js";
customElements.define("context-menus", ContextMenuContainer);
customElements.define("context-menu", ContextMenu);

import {Viewport, ObjectList, ObjectPropertiesControl, CameraPropertiesControl} from "./interface.js";
customElements.define("viewport-", Viewport);
customElements.define("object-list", ObjectList);
customElements.define("object-properties", ObjectPropertiesControl);
customElements.define("camera-properties", CameraPropertiesControl);

import {VectorEditor, RotorEditor, AngleEditor, PositiveNumberEditor} from "./vectoredit.js";
customElements.define("vector-editor", VectorEditor);
customElements.define("rotor-editor", RotorEditor);
customElements.define("angle-editor", AngleEditor);
customElements.define("positive-n-editor", PositiveNumberEditor);

// Semantic elements
for (const tagName of [
	"menu-bar",
	"workspace-",
	"overlays-",
	"tool-button",
	"separator-",
]) {
	customElements.define(tagName, class extends HTMLElement {});
}