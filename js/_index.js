/**
 * @file Called directly from the page. Sets up all the necessary imports and performs other initiation work.
 * 
 * This file should not be imported from any other module.
 */

import "./ce.js";
import {qs} from "./util.js";

const loadingScreen = qs("loading-screen");
qs("loading-spinner").classList.remove("transparent");

addEventListener("load", () => {
	loadingScreen.addEventListener("transitionend", event => {
		if (event.target !== event.currentTarget) return; // No bubble
		loadingScreen.classList.remove("transparent");
		loadingScreen.classList.add("hidden");
	}, {once: true});

	loadingScreen.classList.add("transparent");
}, {once: true});

addEventListener("beforeunload", () => {
	return true;
});