import "./home-screen.css";
import { el, svgEl } from "../../helpers/dom";
import { createButton, ButtonElement } from "../button/button";
import { CLOUD_SVG } from "../progress-bar/progress-bar";
import { state } from "../../systems/state";
import {
	createItemCard,
	getRarityOdds,
	getUpgradeCost,
	Item,
	RARITY_COLORS,
	STAT_LABELS,
	STATS,
	upgradeItem,
} from "../../systems/items";
import { getEffectiveStats, getInventoryStats } from "../../systems/combat";
import { playSound, sounds } from "../../systems/music";
import { BattleScreen } from "../battle-screen/battle-screen";
import { openModal } from "../modal/modal";

// small inline "info" button that opens a modal with the given content on tap
function infoButton(container: HTMLElement, header: string, getContent: () => HTMLElement | HTMLElement[]): HTMLElement {
	const btn = el("span.home-info-btn", "?");
	btn.onclick = (e) => {
		e.stopPropagation();
		openModal(container, header, getContent(), [], null);
	};
	return btn;
}

const INVENTORY_SIZE = 8;

export class HomeScreen {
	element: HTMLElement;
	depthLabel: HTMLElement;
	magicButton: ButtonElement;
	private dustValue: HTMLElement;
	private depthCloud: HTMLElement;
	private statValues: Partial<Record<(typeof STATS)[number], HTMLElement>> = {};
	private slots: HTMLElement[] = [];
	private featurePanel: HTMLElement;
	private featurePanelInner: HTMLElement;
	private battleScreen: BattleScreen;
	private buttonSlot: HTMLElement;
	private idle = true;
	private viewingSlot: number | null = null;

	constructor(
		private container: HTMLElement,
		onMagic: () => void,
	) {
		this.magicButton = createButton("Magic", onMagic, "primary", "md", true, 18, 1.5);
		this.buttonSlot = el("div.home-button-slot", this.magicButton);

		this.depthCloud = svgEl(CLOUD_SVG.replace("[fill]", "#fff"));
		this.depthCloud.classList.add("home-depth-cloud");
		this.depthLabel = el("span.home-depth-value");

		const dropRatesInfo = infoButton(this.container, "Drop Rates", () => this.renderDropRatesInfo());
		const depthRow = el("div.home-depth", [this.depthCloud, this.depthLabel, dropRatesInfo]);

		this.dustValue = el("span.home-dust-value", "0");
		const upgradeInfo = infoButton(this.container, "Magic Dust", () =>
			el(
				"p",
				"Every battle earns Magic Dust, win or lose. Spend it to upgrade an equipped item, boosting all of its stats. Cost rises each time you upgrade the same item.",
			),
		);
		const dustRow = el("div.home-dust", [
			el("span.home-dust-icon", "✨"),
			this.dustValue,
			el("span", "Magic Dust"),
			upgradeInfo,
		]);

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

		const actions = el("div.home-actions", [
			this.featurePanel,
			depthRow,
			dustRow,
			statsPanel,
			inventoryPanel,
			this.buttonSlot,
		]);

		this.element = el("div.home-screen", [actions]);

		// tapping anywhere outside the inventory grid/feature panel closes the
		// open item view - only relevant while idle, since that's the only
		// time openSlot can have set viewingSlot
		this.element.addEventListener("click", (e) => {
			if (this.viewingSlot === null) return;
			const target = e.target as HTMLElement;
			if (inventoryPanel.contains(target) || this.featurePanel.contains(target) || this.buttonSlot.contains(target)) {
				return;
			}
			this.closeItemView();
		});
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

	// builds the current rarity-odds list for the info modal, read live each open
	// so it reflects whatever cloud the player is on right now
	private renderDropRatesInfo(): HTMLElement {
		const odds = getRarityOdds(state.depth.value);
		return el(
			"div.home-drop-rates",
			(Object.entries(odds) as [keyof typeof odds, number][]).map(([rarity, pct]) => {
				const row = el("div.home-drop-rate-row", [
					el("span.home-drop-rate-label", rarity),
					el("span.home-drop-rate-value", `${pct.toFixed(1)}%`),
				]);
				row.style.color = RARITY_COLORS[rarity];
				return row;
			}),
		);
	}

	refreshDust() {
		this.dustValue.textContent = `${state.magicDust.value}`;
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
			this.buttonSlot.replaceChildren(
				createButton(
					"Equip New",
					() => {
						playSound(sounds.buy);
						onResolved(true);
					},
					"success",
					"md",
				),
			);
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
		const equipButton = createButton(
			"Equip New",
			() => {
				playSound(sounds.buy);
				onResolved(true);
			},
			"success",
			"md",
		);
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

	// idle only: tapping a filled slot opens it inline in the feature panel
	// (dimming every other slot, like the loot/diff view), with an Upgrade
	// action spending Magic Dust; tapping the same slot again, tapping outside
	// the inventory/feature panel, or emptying the inventory closes it
	private async openSlot(index: number) {
		if (!this.idle) return;

		const item = state.inventory.value[index];
		if (!item) return;

		if (this.viewingSlot === index) {
			await this.closeItemView();
			return;
		}

		this.viewingSlot = index;
		this.slots.forEach((slot, i) => slot.classList.toggle("dimmed", i !== index));
		this.slots[index].classList.add("highlighted");
		await this.crossfadeContent(createItemCard(item, "loot", "Item Found", undefined, upgradeItem(item)));
		this.renderUpgradeAction(index);
	}

	private async closeItemView() {
		this.viewingSlot = null;
		this.slots.forEach((slot) => slot.classList.remove("dimmed", "highlighted"));
		this.buttonSlot.replaceChildren(this.magicButton);
		await this.fadeOutContent();
	}

	// shows the Upgrade button for the item currently being viewed, spending
	// Magic Dust to bump its primary stat; re-renders in place after a purchase
	private renderUpgradeAction(index: number) {
		const item = state.inventory.value[index];
		if (!item || this.viewingSlot !== index) return;

		const cost = getUpgradeCost(item);
		const canAfford = state.magicDust.value >= cost;

		const upgradeButton = createButton(
			"Upgrade",
			() => {
				playSound(sounds.buy);
				state.magicDust.value -= cost;
				const inventory = [...state.inventory.value];
				inventory[index] = upgradeItem(item);
				state.inventory.value = inventory;

				this.refreshDust();
				this.refreshStats();
				this.refreshSlot(index);
				const upgraded = inventory[index]!;
				this.crossfadeContent(createItemCard(upgraded, "loot", "Item Found", undefined, upgradeItem(upgraded))).then(() =>
					this.renderUpgradeAction(index),
				);
			},
			canAfford ? "success" : "disabled",
			"md",
		);
		upgradeButton.face.disabled = !canAfford;

		this.buttonSlot.replaceChildren(
			el("div.home-item-view-actions", [upgradeButton, el("span.home-upgrade-cost", `✨ ${cost} Magic Dust`)]),
		);
	}
}
