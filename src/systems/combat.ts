import { randomInteger } from "../helpers/numbers";
import { Item, Stat, STATS } from "./items";

export const BASE_HP = 100;

export type Fighter = {
	name: string;
	hp: number;
	maxHp: number;
	power: number;
	guard: number;
	crit: number;
	dodge: number;
};

const STORMLINGS = ["Thunderhead", "Sleetfang", "Grimcloud", "Hailmane", "Fogspite", "Squallhorn"];

export function getInventoryStats(inventory: (Item | null)[]): Record<Stat, number> {
	const totals: Record<Stat, number> = { power: 0, guard: 0, crit: 0, dodge: 0, vitality: 0 };

	for (const item of inventory) {
		if (!item) continue;
		for (const stat of STATS) {
			totals[stat] += item.affixes[stat] || 0;
		}
	}

	return totals;
}

export function createPlayerFighter(inventory: (Item | null)[]): Fighter {
	const stats = getInventoryStats(inventory);

	return {
		name: "You",
		hp: BASE_HP + stats.vitality,
		maxHp: BASE_HP + stats.vitality,
		power: 5 + stats.power,
		guard: stats.guard,
		crit: Math.min(50, stats.crit),
		dodge: Math.min(35, stats.dodge),
	};
}

export function createStormling(depth: number): Fighter {
	const name = STORMLINGS[randomInteger(0, STORMLINGS.length - 1)];
	const scale = 1 + depth * 0.15;

	return {
		name,
		hp: Math.round((60 + depth * 8) * scale),
		maxHp: Math.round((60 + depth * 8) * scale),
		power: Math.round((4 + depth * 1.2) * scale),
		guard: Math.round(depth * 0.8),
		crit: Math.min(50, 5 + depth),
		dodge: Math.min(35, depth * 0.5),
	};
}

export type CombatEvent = { attacker: string; defender: string; damage: number; crit: boolean; dodged: boolean };

function resolveHit(attacker: Fighter, defender: Fighter): CombatEvent {
	const dodged = randomInteger(1, 100) <= defender.dodge;

	if (dodged) {
		return { attacker: attacker.name, defender: defender.name, damage: 0, crit: false, dodged: true };
	}

	const crit = randomInteger(1, 100) <= attacker.crit;
	const rawDamage = Math.max(1, attacker.power - defender.guard);
	const damage = crit ? Math.round(rawDamage * 2) : rawDamage;

	defender.hp = Math.max(0, defender.hp - damage);

	return { attacker: attacker.name, defender: defender.name, damage, crit, dodged: false };
}

// alternates attacker each tick; returns null once one side is defeated
export function combatTick(player: Fighter, enemy: Fighter, playerActs: boolean): CombatEvent | null {
	if (player.hp <= 0 || enemy.hp <= 0) return null;

	return playerActs ? resolveHit(player, enemy) : resolveHit(enemy, player);
}
