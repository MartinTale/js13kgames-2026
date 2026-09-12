import "./home-screen.css";
import { el, svgEl } from "../../helpers/dom";
import { createButton, ButtonElement } from "../button/button";
import { CLOUD_SVG } from "../progress-bar/progress-bar";
import { state } from "../../systems/state";
import { createItemCard, RARITY_COLORS, STAT_LABELS, STATS } from "../../systems/items";
import { getInventoryStats } from "../../systems/combat";
import { openModal } from "../modal/modal";

const INVENTORY_SIZE = 8;
const STAT_ROWS: (typeof STATS[number])[][] = [
	["power", "guard", "crit"],
	["dodge", "vitality"],
];

export class HomeScreen {
	element: HTMLElement;
	depthLabel: HTMLElement;
	magicButton: ButtonElement;
	private statValues: Partial<Record<(typeof STATS)[number], HTMLElement>> = {};
	private slots: HTMLElement[] = [];

	constructor(
		private container: HTMLElement,
		onMagic: () => void,
	) {
		this.magicButton = createButton("Magic", onMagic, "primary", "md", true, 18, 1.5);

		const depthCloud = svgEl(CLOUD_SVG.replace("[fill]", "#fff"));
		depthCloud.classList.add("home-depth-cloud");
		this.depthLabel = el("span.home-depth-value");

		const depthRow = el("div.home-depth", [depthCloud, this.depthLabel]);

		const statsRows = STAT_ROWS.map((row) =>
			el(
				"div.home-stats-row",
				row.map((stat) => {
					const value = el("span.home-stat-value", "0");
					this.statValues[stat] = value;
					return el("div.home-stat", [el("span.home-stat-label", STAT_LABELS[stat]), value]);
				}),
			),
		);
		const statsPanel = el("div.home-stats", statsRows);

		this.slots = Array.from({ length: INVENTORY_SIZE }, (_, index) => {
			const slot = el("div.home-slot.empty");
			slot.onclick = () => this.openSlot(index);
			return slot;
		});
		const inventoryGrid = el("div.home-inventory", this.slots);

		const actions = el("div.home-actions", [depthRow, statsPanel, inventoryGrid, this.magicButton]);

		this.element = el("div.home-screen", [actions]);
	}

	setMagicEnabled(enabled: boolean) {
		this.magicButton.face.disabled = !enabled;
	}

	refreshDepth() {
		this.depthLabel.textContent = `${state.depth.value}`;
	}

	refreshStats() {
		const totals = getInventoryStats(state.inventory.value);
		STATS.forEach((stat) => {
			const valueEl = this.statValues[stat];
			if (valueEl) valueEl.textContent = `${totals[stat]}`;
		});
	}

	refreshInventory() {
		state.inventory.value.forEach((item, index) => {
			const slot = this.slots[index];
			slot.classList.toggle("empty", !item);
			slot.classList.toggle("emoji-glyph", !!item);
			slot.textContent = item ? item.emoji : "";
			slot.style.borderColor = item ? RARITY_COLORS[item.rarity] : "";
		});
	}

	private openSlot(index: number) {
		const item = state.inventory.value[index];
		if (!item) return;

		openModal(this.container, "Item", createItemCard(item, "diff"), [], null);
	}
}
