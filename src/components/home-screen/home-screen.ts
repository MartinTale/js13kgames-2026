import "./home-screen.css";
import { el } from "../../helpers/dom";
import { createButton, ButtonElement } from "../button/button";
import { ProgressBar, LootHandler } from "../progress-bar/progress-bar";
import { state } from "../../systems/state";

export class HomeScreen {
	element: HTMLElement;
	depthLabel: HTMLElement;
	bar: ProgressBar;
	magicButton: ButtonElement;

	constructor(onMagic: () => void, onLoot: LootHandler) {
		this.magicButton = createButton("Magic", onMagic, "primary", "md", true, 24);
		this.depthLabel = el("div.home-depth");

		const actions = el("div.home-actions", [this.magicButton, this.depthLabel]);

		this.bar = new ProgressBar(onLoot);
		this.bar.container.style.margin = "10px 10px 20px";

		this.element = el("div.home-screen", [this.bar.wrap, actions]);
	}

	setMagicEnabled(enabled: boolean) {
		this.magicButton.face.disabled = !enabled;
	}

	refreshDepth() {
		this.depthLabel.textContent = `Cloud ${state.depth.value}`;
	}
}
