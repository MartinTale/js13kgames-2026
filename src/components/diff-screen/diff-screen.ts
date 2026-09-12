import "./diff-screen.css";
import { el } from "../../helpers/dom";
import { createButton } from "../button/button";
import { createItemCard, Item } from "../../systems/items";
import { state } from "../../systems/state";

export class DiffScreen {
	element: HTMLElement;
	depthLabel: HTMLElement;
	private body: HTMLElement;
	private actions: HTMLElement;

	constructor() {
		this.depthLabel = el("div.screen-depth");
		this.body = el("div.diff-body");
		this.actions = el("div.diff-actions");
		this.element = el("div.diff-screen", [this.depthLabel, this.body, this.actions]);
	}

	refreshDepth() {
		this.depthLabel.textContent = `Depth ${state.depth.value}`;
	}

	show(slotIndex: number, newItem: Item, onResolved: (equip: boolean) => void) {
		this.body.replaceChildren();
		this.actions.replaceChildren();

		const oldItem = state.inventory.value[slotIndex];

		this.body.append(
			el("div.diff-title", "Loot!"),
			el("div.diff-compare", [
				el("div.diff-side", [el("div.diff-side-label", "Current"), createItemCard(oldItem, "diff")]),
				el("div.diff-vs", "→"),
				el("div.diff-side", [el("div.diff-side-label", "New"), createItemCard(newItem, "diff")]),
			]),
		);

		const keepButton = createButton("Keep Current", () => onResolved(false), "normal", "md");
		const equipButton = createButton("Equip New", () => onResolved(true), "primary", "md");

		this.actions.append(keepButton, equipButton);
	}
}
