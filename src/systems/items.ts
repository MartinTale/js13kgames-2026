import { randomInteger } from "../helpers/numbers";
import { el } from "../helpers/dom";

export type Stat = "power" | "guard" | "crit" | "critDamage" | "dodge" | "vitality";
export const STATS: Stat[] = ["power", "guard", "crit", "critDamage", "dodge", "vitality"];
export const STAT_LABELS: Record<Stat, string> = {
	power: "ATK",
	guard: "DEF",
	crit: "CRIT",
	critDamage: "CRIT DMG",
	dodge: "DODGE",
	vitality: "HP",
};

export type Rarity = "common" | "rare" | "epic";
export const RARITY_COLORS: Record<Rarity, string> = {
	common: "#9CA3AF",
	rare: "#8FD9FF",
	epic: "#C896FF",
};
// total stats on the item: 1 guaranteed primary + N bonus stats by rarity
const RARITY_BONUS_STATS: Record<Rarity, number> = { common: 0, rare: 1, epic: 2 };
const RARITY_WEIGHTS: Record<Rarity, number> = { common: 65, rare: 27, epic: 8 };
const RARITY_WEIGHTS_BOOSTED: Record<Rarity, number> = { common: 30, rare: 45, epic: 25 };

export type Quality = "dull" | "shiny" | "glowing" | "radiant" | "iridescent" | "prismatic";
// [minRoll, maxRoll, statMultiplier, weight]
const QUALITY_TABLE: Record<Quality, [number, number, number, number]> = {
	dull: [70, 79, 0.7, 22],
	shiny: [80, 89, 1, 35],
	glowing: [90, 94, 1.4, 25],
	radiant: [95, 98, 1.9, 14],
	iridescent: [99, 100, 2.4, 3.5],
	prismatic: [100, 105, 2.9, 0.5],
};
const QUALITY_TABLE_BOOSTED: Record<Quality, [number, number, number, number]> = {
	dull: [70, 79, 0.7, 5],
	shiny: [80, 89, 1, 20],
	glowing: [90, 94, 1.4, 30],
	radiant: [95, 98, 1.9, 25],
	iridescent: [99, 100, 2.4, 15],
	prismatic: [100, 105, 2.9, 5],
};

// Unicode 13-safe (2020 or earlier) so glyphs render consistently across browsers;
// shared across all rarities - border color + glow communicate rarity/quality, not the emoji.
// Unicorn/rainbow themed, purely cosmetic - not tied to any particular stat
const EMOJI_POOL = ["🦄", "🌈", "☁️", "✨", "⭐", "💖", "🍀", "🔮"];

export type Item = {
	emoji: string;
	rarity: Rarity;
	quality: Quality;
	qualityRoll: number;
	depth: number;
	primaryStat: Stat;
	affixes: Partial<Record<Stat, number>>;
	upgradeLevel: number;
};

function weightedPick<key extends string>(weights: Record<key, number>): key {
	const entries = Object.entries(weights) as [key, number][];
	const total = entries.reduce((sum, [, w]) => sum + w, 0);
	let roll = randomInteger(1, Math.round(total * 100)) / 100;

	for (const [key, weight] of entries) {
		if (roll <= weight) {
			return key;
		}
		roll -= weight;
	}

	return entries[entries.length - 1][0];
}

function rollStats(pool: Stat[], count: number): Stat[] {
	const remaining = [...pool];
	const picked: Stat[] = [];

	for (let i = 0; i < count && remaining.length > 0; i++) {
		const index = randomInteger(0, remaining.length - 1);
		picked.push(remaining.splice(index, 1)[0]);
	}

	return picked;
}

export function generateItem(depth: number, boosted = false): Item {
	const rarity = weightedPick(boosted ? RARITY_WEIGHTS_BOOSTED : RARITY_WEIGHTS);
	const quality = weightedPick(
		Object.fromEntries(
			Object.entries(boosted ? QUALITY_TABLE_BOOSTED : QUALITY_TABLE).map(([k, v]) => [k, v[3]]),
		) as Record<Quality, number>,
	);

	const [minRoll, maxRoll, statMultiplier] = (boosted ? QUALITY_TABLE_BOOSTED : QUALITY_TABLE)[quality];
	const qualityRoll = randomInteger(minRoll, maxRoll);
	const bonusCount = RARITY_BONUS_STATS[rarity];
	const rarityMultiplier = rarity === "common" ? 1 : rarity === "rare" ? 1.5 : 2.2;
	const baseMin = 2 + depth * 0.6;
	const baseMax = 4 + depth * 1.1;

	const rollValue = () => {
		const base = randomInteger(Math.round(baseMin), Math.round(baseMax));
		return Math.max(1, Math.round(base * rarityMultiplier * statMultiplier));
	};

	const [primaryStat] = rollStats(STATS, 1);
	const affixes: Partial<Record<Stat, number>> = { [primaryStat]: rollValue() };

	const bonusPool = STATS.filter((stat) => stat !== primaryStat);
	for (const stat of rollStats(bonusPool, bonusCount)) {
		affixes[stat] = rollValue();
	}

	const emoji = EMOJI_POOL[randomInteger(0, EMOJI_POOL.length - 1)];

	return { emoji, rarity, quality, qualityRoll, depth, primaryStat, affixes, upgradeLevel: 0 };
}

export function getItemScore(item: Item | null): number {
	if (!item) return 0;
	return Object.values(item.affixes).reduce((sum, value) => sum + (value || 0), 0);
}

const UPGRADE_BASE_COST = 5;
const UPGRADE_COST_GROWTH = 1.5;
const UPGRADE_STAT_GROWTH = 0.15;

// dust cost to upgrade the item at its current level - grows so repeated
// upgrades on one item get progressively pricier
export function getUpgradeCost(item: Item): number {
	return Math.round(UPGRADE_BASE_COST * Math.pow(UPGRADE_COST_GROWTH, item.upgradeLevel || 0));
}

// spends nothing itself - caller deducts dust; bumps the primary stat by a
// fixed fraction of its current value and increments the item's upgrade level
export function upgradeItem(item: Item): Item {
	const currentValue = item.affixes[item.primaryStat] || 0;
	const increase = Math.max(1, Math.round(currentValue * UPGRADE_STAT_GROWTH));

	return {
		...item,
		affixes: { ...item.affixes, [item.primaryStat]: currentValue + increase },
		upgradeLevel: (item.upgradeLevel || 0) + 1,
	};
}

// compareItem: when given, each stat line and the score are colored by how item's
// value compares to compareItem's for that stat (green upgrade / red downgrade)
export function createItemCard(item: Item | null, cls: string, label = "Item Found", compareItem?: Item | null): HTMLElement {
	const labelEl = label ? [el(`div.${cls}-label`, label)] : [];

	if (!item) {
		return el(`div.${cls}-card`, [
			...labelEl,
			el(`div.${cls}-emoji.empty`),
			el(`div.${cls}-rarity`, "Empty Slot"),
			el(`div.${cls}-score-row`, [el(`div.${cls}-score`, "0"), el(`div.${cls}-score-label`, "Sparkles")]),
		]);
	}

	const emoji = el(`div.${cls}-emoji.emoji-glyph`, item.emoji);
	emoji.style.borderColor = RARITY_COLORS[item.rarity];
	emoji.style.boxShadow = getQualityGlow(item.quality);

	const stats = el(
		`div.${cls}-stats`,
		STATS.filter((stat) => item.affixes[stat]).map((stat) => {
			const line = el(`div.${cls}-stat`, `+${item.affixes[stat]} ${STAT_LABELS[stat]}`);
			if (stat === item.primaryStat) line.classList.add("primary-stat");

			if (compareItem !== undefined) {
				const diff = (item.affixes[stat] || 0) - (compareItem?.affixes[stat] || 0);
				if (diff > 0) line.classList.add("stat-up");
				else if (diff < 0) line.classList.add("stat-down");
			}

			return line;
		}),
	);

	const score = getItemScore(item);
	const scoreEl = el(`div.${cls}-score`, `${score}`);
	if (compareItem !== undefined) {
		const compareScore = getItemScore(compareItem ?? null);
		if (score > compareScore) scoreEl.classList.add("stat-up");
		else if (score < compareScore) scoreEl.classList.add("stat-down");
	}

	return el(`div.${cls}-card`, [
		...labelEl,
		emoji,
		el(
			`div.${cls}-rarity`,
			`${item.rarity} (${item.qualityRoll}%)${item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : ""}`,
		),
		el(`div.${cls}-found`, `Found on Cloud ${item.depth}`),
		stats,
		el(`div.${cls}-score-row`, [scoreEl, el(`div.${cls}-score-label`, "Sparkles")]),
	]);
}

export function getQualityGlow(quality: Quality): string {
	const glowByQuality: Record<Quality, string> = {
		dull: "none",
		shiny: "0 0 4px var(--shadow)",
		glowing: "0 0 8px var(--shadow)",
		radiant: "0 0 12px 2px var(--shadow)",
		iridescent: "0 0 16px 3px var(--shadow)",
		prismatic: "0 0 20px 4px var(--shadow), 0 0 30px 6px var(--color)",
	};
	return glowByQuality[quality];
}
