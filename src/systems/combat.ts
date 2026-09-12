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
	critDamage: number;
	dodge: number;
	depth: number;
};

const STORMLINGS = ["Thunderhead", "Sleetfang", "Grimcloud", "Hailmane", "Fogspite", "Squallhorn"];

export function getInventoryStats(inventory: (Item | null)[]): Record<Stat, number> {
	const totals: Record<Stat, number> = { power: 0, guard: 0, crit: 0, critDamage: 0, dodge: 0, vitality: 0 };

	for (const item of inventory) {
		if (!item) continue;
		for (const stat of STATS) {
			totals[stat] += item.affixes[stat] || 0;
		}
	}

	return totals;
}

// soft-cap curve: approaches `cap` asymptotically as stat grows, never reaches it -
// any amount of stacking stays safe, unlike a flat percentage
function softCap(stat: number, k: number, cap: number): number {
	return (stat / (stat + k)) * cap;
}

const DODGE_K = 150;
const DODGE_CAP = 45;
const CRIT_K = 90;
const CRIT_BASE = 5;
const CRIT_CAP_BONUS = 40;
// DEF's K scales with depth, so a fixed DEF total is worth progressively less against
// deeper enemies - keeps gear from trivializing damage taken forever on one roll
const DEF_K_PER_DEPTH = 8;

const BASE_PLAYER_POWER = 12;

export function createPlayerFighter(inventory: (Item | null)[], depth: number): Fighter {
	const stats = getInventoryStats(inventory);

	return {
		name: "You",
		hp: BASE_HP + stats.vitality,
		maxHp: BASE_HP + stats.vitality,
		power: BASE_PLAYER_POWER + stats.power,
		guard: stats.guard,
		crit: CRIT_BASE + softCap(stats.crit, CRIT_K, CRIT_CAP_BONUS),
		critDamage: 1.5 + stats.critDamage / 20,
		dodge: softCap(stats.dodge, DODGE_K, DODGE_CAP),
		depth,
	};
}

export function createStormling(depth: number): Fighter {
	const name = STORMLINGS[randomInteger(0, STORMLINGS.length - 1)];
	// gentle compounding on top of the linear terms below - a higher rate here
	// double-counts depth growth and outpaces player gear power by ~depth 20
	const scale = 1 + (depth - 1) * 0.08;

	return {
		name,
		hp: Math.round((40 + depth * 6) * scale),
		maxHp: Math.round((40 + depth * 6) * scale),
		power: Math.round((3 + depth * 0.9) * scale),
		guard: Math.round(depth * 3),
		crit: CRIT_BASE + softCap(depth * 4, CRIT_K, CRIT_CAP_BONUS),
		critDamage: 1.5,
		dodge: softCap(depth * 8, DODGE_K, DODGE_CAP),
		depth,
	};
}

// derives the effective (post-soft-cap) percentages shown on Home from raw item totals
export function getEffectiveStats(totals: Record<Stat, number>, depth: number) {
	return {
		power: totals.power + BASE_PLAYER_POWER,
		guardPercent: softCap(totals.guard, DEF_K_PER_DEPTH * Math.max(1, depth), 100),
		critPercent: CRIT_BASE + softCap(totals.crit, CRIT_K, CRIT_CAP_BONUS),
		critDamage: 1.5 + totals.critDamage / 20,
		dodgePercent: softCap(totals.dodge, DODGE_K, DODGE_CAP),
		vitality: totals.vitality + BASE_HP,
	};
}

export type CombatEvent = { attacker: string; defender: string; damage: number; crit: boolean; dodged: boolean };

function resolveHit(attacker: Fighter, defender: Fighter): CombatEvent {
	const dodged = randomInteger(1, 10000) / 100 <= defender.dodge;

	if (dodged) {
		return { attacker: attacker.name, defender: defender.name, damage: 0, crit: false, dodged: true };
	}

	const crit = randomInteger(1, 10000) / 100 <= attacker.crit;
	const defReduction = softCap(defender.guard, DEF_K_PER_DEPTH * Math.max(1, defender.depth), 100) / 100;
	const rawDamage = Math.max(1, attacker.power * (1 - defReduction));
	const damage = Math.max(1, Math.round(crit ? rawDamage * attacker.critDamage : rawDamage));

	defender.hp = Math.max(0, defender.hp - damage);

	return { attacker: attacker.name, defender: defender.name, damage, crit, dodged: false };
}

// alternates attacker each tick; returns null once one side is defeated
export function combatTick(player: Fighter, enemy: Fighter, playerActs: boolean): CombatEvent | null {
	if (player.hp <= 0 || enemy.hp <= 0) return null;

	return playerActs ? resolveHit(player, enemy) : resolveHit(enemy, player);
}
