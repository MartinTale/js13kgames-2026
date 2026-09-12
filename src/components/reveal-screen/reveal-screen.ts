import "./reveal-screen.css";
import { el } from "../../helpers/dom";
import { createItemCard, Item } from "../../systems/items";
import { state } from "../../systems/state";

export class RevealScreen {
	element: HTMLElement;
	depthLabel: HTMLElement;
	private body: HTMLElement;
	private onTap: (() => void) | null = null;

	constructor() {
		this.depthLabel = el("div.screen-depth");
		this.body = el("div.reveal-body");
		this.element = el("div.reveal-screen", [this.depthLabel, this.body, el("div.reveal-hint", "Tap to continue")]);

		this.element.onclick = () => this.onTap?.();
	}

	refreshDepth() {
		this.depthLabel.textContent = `Depth ${state.depth.value}`;
	}

	show(item: Item, onContinue: () => void) {
		this.onTap = onContinue;
		this.body.replaceChildren();

		this.body.append(createItemCard(item, "reveal"));
	}
}
