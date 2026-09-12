import "./battle-screen.css";
import { el } from "../../helpers/dom";
import { combatTick, CombatEvent, createPlayerFighter, createStormling } from "../../systems/combat";
import { state } from "../../systems/state";

const TICK_MS = 400;

export class BattleScreen {
	element: HTMLElement;

	constructor() {
		this.element = el("div.combat-view");
	}

	// calls onDone(won) once the fight resolves - the log stays visible, caller decides when to move on
	run(onDone: (won: boolean) => void) {
		this.element.replaceChildren();

		const player = createPlayerFighter(state.inventory.value);
		const enemy = createStormling(state.depth.value);

		const playerBar = el("div.hp-fill");
		const enemyBar = el("div.hp-fill");
		const playerHpText = el("span", `${player.hp}/${player.maxHp}`);
		const enemyHpText = el("span", `${enemy.hp}/${enemy.maxHp}`);
		const log = el("div.combat-log");

		const hpPanel = el("div.hp-panel", [
			el("div.hp-row", [el("span.hp-label", [el("span", player.name), playerHpText]), el("div.hp-track", playerBar)]),
			el("div.hp-row", [el("span.hp-label", [el("span", enemy.name), enemyHpText]), el("div.hp-track", enemyBar)]),
		]);

		this.element.append(hpPanel, log);

		// hpPanel is absolutely positioned so the log can scroll independently beneath
		// it; push the log down by its measured height once it's laid out
		requestAnimationFrame(() => {
			log.style.marginTop = `${hpPanel.offsetHeight}px`;
		});

		const updateBars = () => {
			playerBar.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
			enemyBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
			playerHpText.textContent = `${Math.max(0, player.hp)}/${player.maxHp}`;
			enemyHpText.textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp}`;
		};

		let round = 0;
		let roundBody: HTMLElement | null = null;

		// starts a new "Round N" block, so each player+enemy exchange reads as
		// one visually separated group in the log
		const startRound = () => {
			round++;
			roundBody = el("div.combat-round-body");
			log.append(el("div.combat-round", [el("div.combat-round-label", `Round ${round}`), roundBody]));
		};

		// intro/outro lines render loose, above/after the round blocks
		const logLine = (text: string, cls = "") => {
			const target = roundBody ?? log;
			target.append(el(`div.combat-line${cls ? "." + cls : ""}`, text));
			log.scrollTop = log.scrollHeight;
		};

		updateBars();
		logLine(`A wild ${enemy.name} appears!`);

		let playerActs = true;
		const interval = setInterval(() => {
			if (playerActs) startRound();

			const event: CombatEvent | null = combatTick(player, enemy, playerActs);
			playerActs = !playerActs;

			if (!event) {
				clearInterval(interval);
				const won = enemy.hp <= 0 && player.hp > 0;
				logLine(won ? `${enemy.name} is defeated!` : `You were defeated...`, won ? "win" : "loss");
				updateBars();

				onDone(won);
				return;
			}

			if (event.dodged) {
				const verb = event.defender === "You" ? "dodge" : "dodges";
				const possessive = event.attacker === "You" ? "your" : `${event.attacker}'s`;
				logLine(`${event.defender} ${verb} ${possessive} attack!`);
			} else {
				const verb = event.attacker === "You" ? "hit" : "hits";
				logLine(
					`${event.attacker} ${verb} ${event.defender} for ${event.damage}${event.crit ? " (crit!)" : ""}`,
					event.crit ? "crit" : "",
				);
			}

			updateBars();
		}, TICK_MS);
	}
}
