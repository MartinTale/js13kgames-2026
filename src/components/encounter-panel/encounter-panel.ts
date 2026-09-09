import "./encounter-panel.css";
import { el, mount } from "../../helpers/dom";
import { combatTick, CombatEvent, createPlayerFighter, createStormling } from "../../systems/combat";
import { state } from "../../systems/state";
import { getItemScore, getQualityGlow, Item, RARITY_COLORS, STAT_LABELS, Stat, STATS } from "../../systems/items";
import { createButton, ButtonElement } from "../button/button";
import { burstFromStadium } from "../../systems/confetti";

const TICK_MS = 400;

export class EncounterPanel {
	content: HTMLElement;
	actions: HTMLElement;
	magicButton: ButtonElement;
	private fadeAnim: Animation | null = null;

	constructor(private onMagic: () => void) {
		this.content = el("div.encounter-content");
		this.actions = el("div.encounter-actions");

		this.magicButton = createButton("Magic", () => this.tapMagic(), "primary", "md", true);
		mount(this.actions, this.magicButton);
	}

	mountContent(parent: HTMLElement) {
		mount(parent, this.content);
	}

	mountActions(parent: HTMLElement) {
		mount(parent, this.actions);
	}

	private tapMagic() {
		this.magicButton.face.disabled = true;

		const svg = this.magicButton.querySelector("svg.button-confetti") as SVGSVGElement | null;
		if (svg) {
			const w = this.magicButton.offsetWidth;
			const h = this.magicButton.offsetHeight;
			const inset = -parseFloat(getComputedStyle(svg).left);
			burstFromStadium(svg, inset + w / 2, inset + h / 2, w, h, -90, 320, 60, 2, 1.8, 1.8);
		}

		setTimeout(() => {
			this.fadeAnim = this.magicButton.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: 1000,
				fill: "forwards",
			});
		}, 250);

		this.onMagic();
	}

	setMagicEnabled(enabled: boolean) {
		this.magicButton.face.disabled = !enabled;

		if (enabled) {
			this.fadeAnim?.cancel();
			this.fadeAnim = null;
		}
	}

	private clearContent() {
		this.content.replaceChildren();
	}

	private clearActions() {
		this.actions.replaceChildren();
	}

	runCombat(onDone: (won: boolean) => void) {
		this.clearContent();
		this.clearActions();

		const player = createPlayerFighter(state.inventory.value);
		const enemy = createStormling(state.depth.value);

		const playerBar = el("div.hp-fill");
		const enemyBar = el("div.hp-fill");
		const playerHpText = el("span", `${player.hp}/${player.maxHp}`);
		const enemyHpText = el("span", `${enemy.hp}/${enemy.maxHp}`);
		const log = el("div.combat-log");

		mount(
			this.content,
			el("div.combat-view", [
				el("div.hp-row", [
					el("span.hp-label", [el("span", player.name), playerHpText]),
					el("div.hp-track", playerBar),
				]),
				el("div.hp-row", [
					el("span.hp-label", [el("span", enemy.name), enemyHpText]),
					el("div.hp-track", enemyBar),
				]),
				log,
			]),
		);

		const updateBars = () => {
			playerBar.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
			enemyBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
			playerHpText.textContent = `${Math.max(0, player.hp)}/${player.maxHp}`;
			enemyHpText.textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp}`;
		};

		const logLine = (text: string, cls = "") => {
			mount(log, el(`div.combat-line${cls ? "." + cls : ""}`, text));
			log.scrollTop = log.scrollHeight;
		};

		updateBars();
		logLine(`A wild ${enemy.name} appears!`);

		let playerActs = true;
		const interval = setInterval(() => {
			const event: CombatEvent | null = combatTick(player, enemy, playerActs);
			playerActs = !playerActs;

			if (!event) {
				clearInterval(interval);
				const won = enemy.hp <= 0 && player.hp > 0;
				logLine(won ? `${enemy.name} is defeated!` : `You were defeated...`, won ? "win" : "loss");
				updateBars();

				setTimeout(() => {
					this.clearContent();
					this.restoreMagicButton();
					onDone(won);
				}, 1200);
				return;
			}

			if (event.dodged) {
				logLine(`${event.defender} dodges ${event.attacker}'s attack!`);
			} else {
				logLine(
					`${event.attacker} hits ${event.defender} for ${event.damage}${event.crit ? " (crit!)" : ""}`,
					event.crit ? "crit" : "",
				);
			}

			updateBars();
		}, TICK_MS);
	}

	showLootReveal(slotIndex: number, newItem: Item, onResolved: () => void) {
		this.clearContent();
		this.clearActions();

		const oldItem = state.inventory.value[slotIndex];
		const oldScore = getItemScore(oldItem);
		const newScore = getItemScore(newItem);
		const scoreDelta = newScore - oldScore;

		const rows = STATS.map((stat) => diffRow(stat, oldItem, newItem)).filter((row): row is HTMLElement => row != null);

		const viewChildren: HTMLElement[] = [
			el("div.loot-title", "Loot!"),
			el("div.loot-compare", [
				el("div.loot-side", [el("div.loot-side-label", "Current"), itemCard(oldItem)]),
				el("div.loot-vs", "→"),
				el("div.loot-side", [el("div.loot-side-label", "New"), itemCard(newItem)]),
			]),
		];

		if (rows.length > 0) {
			viewChildren.push(el("div.loot-diffs", rows));
		}

		viewChildren.push(
			el(
				"div.loot-score-delta" + (scoreDelta >= 0 ? ".up" : ".down"),
				`Score ${oldScore} → ${newScore} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta})`,
			),
		);

		mount(this.content, el("div.loot-view", viewChildren));

		const resolve = () => {
			this.clearContent();
			this.restoreMagicButton();
			onResolved();
		};

		const keepButton = createButton("Keep Current", resolve, "normal", "md");
		const equipButton = createButton(
			"Equip New",
			() => {
				const inventory = [...state.inventory.value];
				inventory[slotIndex] = newItem;
				state.inventory.value = inventory;
				resolve();
			},
			"primary",
			"md",
		);

		mount(this.actions, keepButton);
		mount(this.actions, equipButton);
	}

	private restoreMagicButton() {
		this.clearActions();
		mount(this.actions, this.magicButton);
	}
}

function itemCard(item: Item | null): HTMLElement {
	if (!item) {
		return el("div.loot-card", [
			el("div.loot-emoji.empty", "?"),
			el("div.loot-rarity", " "),
			el("div.loot-stats", el("div.loot-stat", "Empty slot")),
			el("div.loot-score", "Score: 0"),
		]);
	}

	const emoji = el("div.loot-emoji", item.emoji);
	emoji.style.borderColor = RARITY_COLORS[item.rarity];
	emoji.style.boxShadow = getQualityGlow(item.quality);

	const stats = el(
		"div.loot-stats",
		STATS.filter((stat) => item.affixes[stat]).map((stat) =>
			el("div.loot-stat", `${STAT_LABELS[stat]} +${item.affixes[stat]}`),
		),
	);

	return el("div.loot-card", [
		emoji,
		el("div.loot-rarity", `${item.rarity} · ${item.quality}`),
		stats,
		el("div.loot-score", `Score: ${getItemScore(item)}`),
	]);
}

function diffRow(stat: Stat, oldItem: Item | null, newItem: Item): HTMLElement | null {
	const oldValue = oldItem?.affixes[stat] || 0;
	const newValue = newItem.affixes[stat] || 0;
	if (!oldValue && !newValue) return null;

	const delta = newValue - oldValue;
	const cls = delta > 0 ? "up" : delta < 0 ? "down" : "";

	return el(
		"div.loot-diff-row" + (cls ? "." + cls : ""),
		`${STAT_LABELS[stat]}: ${oldValue} → ${newValue}${delta !== 0 ? ` (${delta > 0 ? "+" : ""}${delta})` : ""}`,
	);
}
