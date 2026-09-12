import "./home-screen.css";
import { el, svgEl } from "../../helpers/dom";
import { createButton, ButtonElement } from "../button/button";
import { CLOUD_SVG } from "../progress-bar/progress-bar";
import { state } from "../../systems/state";
import { createItemCard, Item, RARITY_COLORS, STAT_LABELS, STATS } from "../../systems/items";
import { getEffectiveStats, getInventoryStats } from "../../systems/combat";
import { playSound, sounds } from "../../systems/music";
import { BattleScreen } from "../battle-screen/battle-screen";

const INVENTORY_SIZE = 8;

export class HomeScreen {
	element: HTMLElement;
	depthLabel: HTMLElement;
	magicButton: ButtonElement;
	private depthCloud: HTMLElement;
	private statValues: Partial<Record<(typeof STATS)[number], HTMLElement>> = {};
	private slots: HTMLElement[] = [];
	private featurePanel: HTMLElement;
	private featurePanelInner: HTMLElement;
	private battleScreen: BattleScreen;
	private buttonSlot: HTMLElement;
	private idle = true;
	private viewingSlot: number | null = null;

	constructor(onMagic: () => void) {
		this.magicButton = createButton("Magic", onMagic, "primary", "md", true, 18, 1.5);
		this.buttonSlot = el("div.home-button-slot", this.magicButton);

		this.depthCloud = svgEl(CLOUD_SVG.replace("[fill]", "#fff"));
		this.depthCloud.classList.add("home-depth-cloud");
		this.depthLabel = el("span.home-depth-value");

		const depthRow = el("div.home-depth", [this.depthCloud, this.depthLabel]);

		this.featurePanelInner = el("div.home-feature-panel-inner");
		this.featurePanel = el("div.home-feature-panel", this.featurePanelInner);
		this.battleScreen = new BattleScreen();

		const statsRow = el(
			"div.home-stats-row",
			STATS.map((stat) => {
				const value = el("span.home-stat-value", "0");
				this.statValues[stat] = value;
				return el("div.home-stat", [el("span.home-stat-label", STAT_LABELS[stat]), value]);
			}),
		);
		const statsPanel = el("div.home-stats-panel", statsRow);

		this.slots = Array.from({ length: INVENTORY_SIZE }, (_, index) => {
			const slot = el("div.home-slot.empty");
			slot.onclick = () => this.openSlot(index);
			return slot;
		});
		const inventoryPanel = el("div.home-inventory-panel", this.slots);

		const actions = el("div.home-actions", [this.featurePanel, depthRow, statsPanel, inventoryPanel, this.buttonSlot]);

		this.element = el("div.home-screen", [actions]);
	}

	// the panel is always full size; only its content fades. Fades the current
	// content out (skipped when empty - nothing to fade from), swaps, fades in.
	private crossfadeContent(content: HTMLElement | HTMLElement[]): Promise<void> {
		return new Promise((resolve) => {
			const swap = () => {
				this.featurePanelInner.replaceChildren(...(Array.isArray(content) ? content : [content]));

				const fadeIn = this.featurePanelInner.animate([{ opacity: 0 }, { opacity: 1 }], {
					duration: 220,
					easing: "ease",
					fill: "forwards",
				});
				fadeIn.onfinish = () => resolve();
			};

			if (!this.featurePanelInner.hasChildNodes()) {
				swap();
				return;
			}

			const fadeOut = this.featurePanelInner.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: 180,
				easing: "ease",
				fill: "forwards",
			});
			fadeOut.onfinish = swap;
		});
	}

	// fades the current content out and leaves the panel empty (still full size)
	private fadeOutContent(): Promise<void> {
		if (!this.featurePanelInner.hasChildNodes()) {
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			const fadeOut = this.featurePanelInner.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: 180,
				easing: "ease",
				fill: "forwards",
			});
			fadeOut.onfinish = () => {
				this.featurePanelInner.replaceChildren();
				resolve();
			};
		});
	}

	// runs a battle inline in the feature panel above the cloud; Magic stays visible
	// (just disabled) until the crossfade finishes, so it doesn't vanish instantly
	// and can't be double-tapped. Once the fight resolves, shows Continue and
	// resolves the outcome on tap
	async runBattle(): Promise<boolean> {
		this.idle = false;
		if (this.viewingSlot !== null) {
			this.slots[this.viewingSlot].classList.remove("highlighted");
			this.viewingSlot = null;
		}
		await this.crossfadeContent(this.battleScreen.element);
		this.buttonSlot.replaceChildren();

		return new Promise((resolve) => {
			this.battleScreen.run((won) => {
				this.buttonSlot.replaceChildren(createButton("Continue", () => resolve(won), "primary", "md"));
			});
		});
	}

	// fades the panel content out and restores the Magic button
	async hideBattle() {
		await this.fadeOutContent();
		this.buttonSlot.replaceChildren(this.magicButton);
		this.idle = true;
	}

	setMagicEnabled(enabled: boolean) {
		this.magicButton.face.disabled = !enabled;
	}

	refreshDepth() {
		this.depthLabel.textContent = `${state.depth.value}`;
	}

	// bumps the cloud level with a pop animation; resolves once it settles
	levelUp(): Promise<void> {
		this.refreshDepth();
		playSound(sounds.cloudPop);

		const cloudAnim = this.depthCloud.animate(
			[
				{ transform: "scale(1) rotate(0deg)" },
				{ transform: "scale(1.35) rotate(-8deg)", offset: 0.3 },
				{ transform: "scale(1) rotate(0deg)" },
			],
			{ duration: 500, easing: "cubic-bezier(.34,1.2,.64,1)" },
		);
		this.depthLabel.animate(
			[{ transform: "scale(1)" }, { transform: "scale(1.5)", offset: 0.3 }, { transform: "scale(1)" }],
			{ duration: 500, easing: "cubic-bezier(.34,1.2,.64,1)" },
		);

		return new Promise((resolve) => {
			cloudAnim.onfinish = () => resolve();
		});
	}

	refreshStats() {
		const totals = getInventoryStats(state.inventory.value);
		const effective = getEffectiveStats(totals, state.depth.value);

		this.setStatText("power", `${effective.power}`);
		this.setStatText("guard", `${effective.guardPercent.toFixed(0)}%`);
		this.setStatText("crit", `${effective.critPercent.toFixed(0)}%`);
		this.setStatText("critDamage", `${effective.critDamage.toFixed(1)}x`);
		this.setStatText("dodge", `${effective.dodgePercent.toFixed(0)}%`);
		this.setStatText("vitality", `${effective.vitality}`);
	}

	private setStatText(stat: (typeof STATS)[number], text: string) {
		const valueEl = this.statValues[stat];
		if (valueEl) valueEl.textContent = text;
	}

	refreshInventory() {
		state.inventory.value.forEach((_, index) => this.refreshSlot(index));
	}

	// crossfades to the found item (or a keep/equip choice vs the occupied slot)
	// in the feature panel above the cloud, dimming every slot but the target
	async showLoot(slotIndex: number, item: Item, onResolved: (equip: boolean) => void) {
		this.idle = false;
		const currentItem = state.inventory.value[slotIndex];

		this.slots.forEach((slot, index) => slot.classList.toggle("dimmed", index !== slotIndex));
		this.slots[slotIndex].classList.add("highlighted");

		this.buttonSlot.replaceChildren();

		if (!currentItem) {
			await this.crossfadeContent(createItemCard(item, "loot"));
			this.buttonSlot.replaceChildren(createButton("Equip New", () => onResolved(true), "success", "md"));
			return;
		}

		await this.crossfadeContent(
			el("div.home-loot-compare", [
				el("div.home-loot-side", [
					el("span.home-loot-side-label", "Current"),
					createItemCard(currentItem, "loot", "", item),
				]),
				el("div.home-loot-vs", "→"),
				el("div.home-loot-side", [el("span.home-loot-side-label", "New"), createItemCard(item, "loot", "", currentItem)]),
			]),
		);

		const keepButton = createButton("Keep Old", () => onResolved(false), "normal", "md");
		const equipButton = createButton("Equip New", () => onResolved(true), "success", "md");
		this.buttonSlot.replaceChildren(el("div.home-loot-choice", [keepButton, equipButton]));
	}

	// fades the panel content out, clears the slot highlight, and restores the Magic button
	async hideLoot() {
		await this.fadeOutContent();
		this.slots.forEach((slot) => slot.classList.remove("dimmed", "highlighted"));
		this.buttonSlot.replaceChildren(this.magicButton);
		this.idle = true;
	}

	private refreshSlot(index: number) {
		const item = state.inventory.value[index];
		const slot = this.slots[index];

		slot.classList.toggle("empty", !item);
		slot.classList.toggle("emoji-glyph", !!item);
		slot.textContent = item ? item.emoji : "";
		slot.style.borderColor = item ? RARITY_COLORS[item.rarity] : "";
	}

	// idle only: tapping a filled slot opens it inline in the feature panel;
	// tapping the same slot again (or any slot while empty) closes it
	private async openSlot(index: number) {
		if (!this.idle) return;

		const item = state.inventory.value[index];
		if (!item) return;

		if (this.viewingSlot === index) {
			this.viewingSlot = null;
			this.slots[index].classList.remove("highlighted");
			await this.fadeOutContent();
			return;
		}

		if (this.viewingSlot !== null) this.slots[this.viewingSlot].classList.remove("highlighted");
		this.viewingSlot = index;
		this.slots[index].classList.add("highlighted");
		await this.crossfadeContent(createItemCard(item, "loot"));
	}
}
