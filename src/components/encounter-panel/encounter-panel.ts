import "./encounter-panel.css";
import { el, mount } from "../../helpers/dom";
import { combatTick, CombatEvent, createPlayerFighter, createStormling } from "../../systems/combat";
import { state } from "../../systems/state";
import { getItemScore, getQualityGlow, Item, RARITY_COLORS, STAT_LABELS, STATS } from "../../systems/items";
import { createButton, ButtonElement } from "../button/button";

const TICK_MS = 400;
const ACTION_TRANSITION_MS = 500;

// tracks the latest transitionActions() call per container, so a stale pending
// timeout from an interrupted transition can't clobber a newer one's result
const actionsGeneration = new WeakMap<HTMLElement, number>();

// slides the current children of `container` down while fading out, then swaps in
// `next` sliding up while fading in - used whenever the bottom action row's buttons change
function transitionActions(container: HTMLElement, next: HTMLElement[]) {
	const generation = (actionsGeneration.get(container) ?? 0) + 1;
	actionsGeneration.set(container, generation);

	const outgoing = Array.from(container.children) as HTMLElement[];

	if (outgoing.length === 0) {
		mountActionsIn(container, next);
		return;
	}

	outgoing.forEach((child) => {
		child.getAnimations().forEach((anim) => anim.cancel());
		child.style.pointerEvents = "none";
		child.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(10px)", opacity: 0 }], {
			duration: ACTION_TRANSITION_MS,
			easing: "ease-in",
			fill: "forwards",
		});
	});

	setTimeout(() => {
		if (actionsGeneration.get(container) !== generation) return;
		container.replaceChildren();
		mountActionsIn(container, next);
	}, ACTION_TRANSITION_MS);
}

function mountActionsIn(container: HTMLElement, next: HTMLElement[]) {
	next.forEach((el) => mount(container, el));
	next.forEach((child) => {
		child.getAnimations().forEach((anim) => anim.cancel());
		child.style.pointerEvents = "";
		child.animate([{ transform: "translateY(10px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], {
			duration: ACTION_TRANSITION_MS,
			easing: "ease-out",
		});
	});
}

export class EncounterPanel {
	content: HTMLElement;
	actions: HTMLElement;
	magicButton: ButtonElement;

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
		this.onMagic();
	}

	setMagicEnabled(enabled: boolean) {
		this.magicButton.face.disabled = !enabled;
	}

	private clearContent() {
		this.content.replaceChildren();
	}

	runCombat(onDone: (won: boolean) => void) {
		this.clearContent();
		transitionActions(this.actions, []);

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
					transitionActions(this.actions, [this.magicButton]);
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

		const oldItem = state.inventory.value[slotIndex];

		mount(
			this.content,
			el("div.loot-view", [
				el("div.loot-title", "Loot!"),
				el("div.loot-compare", [
					el("div.loot-side", [el("div.loot-side-label", "Current"), itemCard(oldItem)]),
					el("div.loot-vs", "→"),
					el("div.loot-side", [el("div.loot-side-label", "New"), itemCard(newItem)]),
				]),
			]),
		);

		const resolve = () => {
			this.clearContent();
			transitionActions(this.actions, [this.magicButton]);
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

		transitionActions(this.actions, [keepButton, equipButton]);
	}
}

function itemCard(item: Item | null): HTMLElement {
	if (!item) {
		return el("div.loot-card", [
			el("div.loot-emoji.empty"),
			el("div.loot-rarity", " "),
			el("div.loot-stats", el("div.loot-stat", "Empty slot")),
			el("div.loot-score-row", [el("div.loot-score", "0"), el("div.loot-score-label", "Sparkles")]),
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
		el("div.loot-score-row", [el("div.loot-score", `${getItemScore(item)}`), el("div.loot-score-label", "Sparkles")]),
	]);
}
