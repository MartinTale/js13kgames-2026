import "./reveal-screen.css";
import { el } from "../../helpers/dom";
import { getItemScore, getQualityGlow, Item, RARITY_COLORS, STAT_LABELS, STATS } from "../../systems/items";
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

		const emoji = el("div.reveal-emoji", item.emoji);
		emoji.style.borderColor = RARITY_COLORS[item.rarity];
		emoji.style.boxShadow = getQualityGlow(item.quality);

		const stats = el(
			"div.reveal-stats",
			STATS.filter((stat) => item.affixes[stat]).map((stat) =>
				el("div.reveal-stat", `${STAT_LABELS[stat]} +${item.affixes[stat]}`),
			),
		);

		this.body.append(
			emoji,
			el("div.reveal-rarity", `${item.rarity} · ${item.quality}`),
			el("div.reveal-found", `Found at Depth ${item.depth}`),
			stats,
			el("div.reveal-score-row", [el("div.reveal-score", `${getItemScore(item)}`), el("div.reveal-score-label", "Sparkles")]),
		);
	}
}
