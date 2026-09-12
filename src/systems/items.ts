import { randomInteger } from "../helpers/numbers";
import { el } from "../helpers/dom";

export type Stat = "power" | "guard" | "crit" | "dodge" | "vitality";
export const STATS: Stat[] = ["power", "guard", "crit", "dodge", "vitality"];
export const STAT_LABELS: Record<Stat, string> = {
	power: "Power",
	guard: "Guard",
	crit: "Crit",
	dodge: "Dodge",
	vitality: "Vitality",
};

export type Rarity = "common" | "rare" | "epic";
export const RARITY_COLORS: Record<Rarity, string> = {
	common: "#9CA3AF",
	rare: "#8FD9FF",
	epic: "#C896FF",
};
const RARITY_AFFIX_COUNT: Record<Rarity, number> = { common: 1, rare: 2, epic: 3 };
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
// shared across all rarities - border color + glow communicate rarity/quality, not the emoji
const EMOJI_POOL = [
	"☁️", "🍀", "🌙", "🐚", "🌸", "🍯", "🌤️", "🌱", "💧", "🍃",
	"⭐", "🧿", "🔮", "🪄", "❄️", "🔥", "🌊", "🌻", "🦋", "🎐",
	"🌈", "🦄", "✨", "💎", "⚡", "👑", "🌟", "🔱", "🪐", "🎇",
];

export type Item = {
	emoji: string;
	rarity: Rarity;
	quality: Quality;
	depth: number;
	affixes: Partial<Record<Stat, number>>;
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

function rollStats(count: number): Stat[] {
	const pool = [...STATS];
	const picked: Stat[] = [];

	for (let i = 0; i < count && pool.length > 0; i++) {
		const index = randomInteger(0, pool.length - 1);
		picked.push(pool.splice(index, 1)[0]);
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

	const [, , statMultiplier] = (boosted ? QUALITY_TABLE_BOOSTED : QUALITY_TABLE)[quality];
	const affixCount = RARITY_AFFIX_COUNT[rarity];
	const rarityMultiplier = rarity === "common" ? 1 : rarity === "rare" ? 1.5 : 2.2;
	const baseMin = 2 + depth * 0.6;
	const baseMax = 4 + depth * 1.1;

	const affixes: Partial<Record<Stat, number>> = {};
	for (const stat of rollStats(affixCount)) {
		const base = randomInteger(Math.round(baseMin), Math.round(baseMax));
		affixes[stat] = Math.max(1, Math.round(base * rarityMultiplier * statMultiplier));
	}

	const emoji = EMOJI_POOL[randomInteger(0, EMOJI_POOL.length - 1)];

	return { emoji, rarity, quality, depth, affixes };
}

export function getItemScore(item: Item | null): number {
	if (!item) return 0;
	return Object.values(item.affixes).reduce((sum, value) => sum + (value || 0), 0);
}

export function createItemCard(item: Item | null, cls: string): HTMLElement {
	if (!item) {
		return el(`div.${cls}-card`, [
			el(`div.${cls}-emoji.empty`),
			el(`div.${cls}-rarity`, " "),
			el(`div.${cls}-stats`, el(`div.${cls}-stat`, "Empty slot")),
			el(`div.${cls}-score-row`, [el(`div.${cls}-score`, "0"), el(`div.${cls}-score-label`, "Sparkles")]),
		]);
	}

	const emoji = el(`div.${cls}-emoji.emoji-glyph`, item.emoji);
	emoji.style.borderColor = RARITY_COLORS[item.rarity];
	emoji.style.boxShadow = getQualityGlow(item.quality);

	const stats = el(
		`div.${cls}-stats`,
		STATS.filter((stat) => item.affixes[stat]).map((stat) => el(`div.${cls}-stat`, `${STAT_LABELS[stat]} +${item.affixes[stat]}`)),
	);

	return el(`div.${cls}-card`, [
		emoji,
		el(`div.${cls}-rarity`, `${item.rarity} · ${item.quality}`),
		el(`div.${cls}-found`, `Cloud ${item.depth}`),
		stats,
		el(`div.${cls}-score-row`, [el(`div.${cls}-score`, `${getItemScore(item)}`), el(`div.${cls}-score-label`, "Sparkles")]),
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
