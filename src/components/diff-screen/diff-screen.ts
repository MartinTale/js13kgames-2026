import "./diff-screen.css";
import { el } from "../../helpers/dom";
import { createButton } from "../button/button";
import { getItemScore, getQualityGlow, Item, RARITY_COLORS, STAT_LABELS, STATS } from "../../systems/items";
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
				el("div.diff-side", [el("div.diff-side-label", "Current"), itemCard(oldItem)]),
				el("div.diff-vs", "→"),
				el("div.diff-side", [el("div.diff-side-label", "New"), itemCard(newItem)]),
			]),
		);

		const keepButton = createButton("Keep Current", () => onResolved(false), "normal", "md");
		const equipButton = createButton("Equip New", () => onResolved(true), "primary", "md");

		this.actions.append(keepButton, equipButton);
	}
}

function itemCard(item: Item | null): HTMLElement {
	if (!item) {
		return el("div.diff-card", [
			el("div.diff-emoji.empty"),
			el("div.diff-rarity", " "),
			el("div.diff-stats", el("div.diff-stat", "Empty slot")),
			el("div.diff-score-row", [el("div.diff-score", "0"), el("div.diff-score-label", "Sparkles")]),
		]);
	}

	const emoji = el("div.diff-emoji.emoji-glyph", item.emoji);
	emoji.style.borderColor = RARITY_COLORS[item.rarity];
	emoji.style.boxShadow = getQualityGlow(item.quality);

	const stats = el(
		"div.diff-stats",
		STATS.filter((stat) => item.affixes[stat]).map((stat) => el("div.diff-stat", `${STAT_LABELS[stat]} +${item.affixes[stat]}`)),
	);

	return el("div.diff-card", [
		emoji,
		el("div.diff-rarity", `${item.rarity} · ${item.quality}`),
		el("div.diff-found", `Depth ${item.depth}`),
		stats,
		el("div.diff-score-row", [el("div.diff-score", `${getItemScore(item)}`), el("div.diff-score-label", "Sparkles")]),
	]);
}
