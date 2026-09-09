import "./combat.css";
import { el, mount } from "../../helpers/dom";
import { combatTick, CombatEvent, createPlayerFighter, createStormling, Fighter } from "../../systems/combat";
import { state } from "../../systems/state";

const TICK_MS = 400;

export function runCombat(container: HTMLElement, onDone: (won: boolean) => void) {
	const player = createPlayerFighter(state.inventory.value);
	const enemy = createStormling(state.depth.value);

	const playerBar = el("div.hp-fill");
	const enemyBar = el("div.hp-fill");
	const log = el("div.combat-log");

	const overlay = el("div.combat-overlay", [
		el("div.combat-panel", [
			el("div.hp-row", [el("span.hp-label", player.name), el("div.hp-track", playerBar)]),
			el("div.hp-row", [el("span.hp-label", enemy.name), el("div.hp-track", enemyBar)]),
			log,
		]),
	]);

	mount(container, overlay);
	requestAnimationFrame(() => overlay.classList.add("active"));

	function updateBars() {
		playerBar.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
		enemyBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
	}

	function logLine(text: string, cls = "") {
		const line = el(`div.combat-line${cls ? "." + cls : ""}`, text);
		mount(log, line);
		log.scrollTop = log.scrollHeight;
	}

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
				overlay.classList.remove("active");
				setTimeout(() => {
					overlay.remove();
					onDone(won);
				}, 300);
			}, 900);
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

export type { Fighter };
