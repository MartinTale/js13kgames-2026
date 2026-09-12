import "./battle-screen.css";
import { el } from "../../helpers/dom";
import { combatTick, CombatEvent, createPlayerFighter, createStormling } from "../../systems/combat";
import { state } from "../../systems/state";
import { createButton } from "../button/button";

const TICK_MS = 400;

export class BattleScreen {
	element: HTMLElement;

	constructor() {
		this.element = el("div.combat-view");
	}

	run(onDone: (won: boolean) => void) {
		this.element.replaceChildren();

		const player = createPlayerFighter(state.inventory.value);
		const enemy = createStormling(state.depth.value);

		const playerBar = el("div.hp-fill");
		const enemyBar = el("div.hp-fill");
		const playerHpText = el("span", `${player.hp}/${player.maxHp}`);
		const enemyHpText = el("span", `${enemy.hp}/${enemy.maxHp}`);
		const log = el("div.combat-log");

		this.element.append(
			el("div.hp-row", [el("span.hp-label", [el("span", player.name), playerHpText]), el("div.hp-track", playerBar)]),
			el("div.hp-row", [el("span.hp-label", [el("span", enemy.name), enemyHpText]), el("div.hp-track", enemyBar)]),
			log,
		);

		const updateBars = () => {
			playerBar.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
			enemyBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
			playerHpText.textContent = `${Math.max(0, player.hp)}/${player.maxHp}`;
			enemyHpText.textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp}`;
		};

		const logLine = (text: string, cls = "") => {
			log.append(el(`div.combat-line${cls ? "." + cls : ""}`, text));
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
					const continueButton = createButton("Continue", () => onDone(won), "primary", "md");
					this.element.append(el("div.combat-continue", continueButton));
				}, 600);
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
}
