import "./home-screen.css";
import { el, svgEl } from "../../helpers/dom";
import { createButton, ButtonElement } from "../button/button";
import { ProgressBar, LootHandler, CLOUD_SVG } from "../progress-bar/progress-bar";
import { state } from "../../systems/state";

export class HomeScreen {
	element: HTMLElement;
	depthLabel: HTMLElement;
	bar: ProgressBar;
	magicButton: ButtonElement;

	constructor(onMagic: () => void, onLoot: LootHandler) {
		this.magicButton = createButton("Magic", onMagic, "primary", "md", true, 18, 1.5);

		const depthCloud = svgEl(CLOUD_SVG.replace("[fill]", "#fff"));
		depthCloud.classList.add("home-depth-cloud");
		this.depthLabel = el("span.home-depth-value");

		const depthRow = el("div.home-depth", [depthCloud, this.depthLabel]);
		const actions = el("div.home-actions", [depthRow, this.magicButton]);

		this.bar = new ProgressBar(onLoot);

		this.element = el("div.home-screen", [this.bar.wrap, actions]);
	}

	setMagicEnabled(enabled: boolean) {
		this.magicButton.face.disabled = !enabled;
	}

	refreshDepth() {
		this.depthLabel.textContent = `${state.depth.value}`;
	}
}
