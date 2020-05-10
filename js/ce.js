/**
 * @file Handles definition and handling of custom elements.
 */

import {Panel} from "./interface.js";

customElements.define("panel-", Panel);

// Semantic elements
for (const tagName of [
	"menu-bar",
	"workspace-",
]) {
	customElements.define(tagName, class extends HTMLElement {});
}