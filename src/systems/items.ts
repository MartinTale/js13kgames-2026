import { formatNumber, randomInteger } from "../helpers/numbers";
import { el } from "../helpers/dom";

export type Stat = "power" | "guard" | "crit" | "critDamage" | "dodge" | "vitality";
export const STATS: Stat[] = ["power", "guard", "crit", "critDamage", "dodge", "vitality"];
export const STAT_LABELS: Record<Stat, string> = {
	"power": "ATK",
	"guard": "DEF",
	"crit": "CRIT",
	"critDamage": "CRIT DMG",
	"dodge": "DODGE",
	"vitality": "HP",
};

export type Rarity = "common" | "rare" | "epic" | "legendary";
export const RARITY_COLORS: Record<Rarity, string> = {
	"common": "#9CA3AF",
	"rare": "#8FD9FF",
	"epic": "#C896FF",
	"legendary": "#FFB84D",
};
// total stats on the item: 1 guaranteed primary + N bonus stats by rarity
const RARITY_BONUS_STATS: Record<Rarity, number> = { "common": 0, "rare": 1, "epic": 2, "legendary": 3 };
const RARITY_WEIGHTS: Record<Rarity, number> = { "common": 55, "rare": 33, "epic": 10, "legendary": 2 };
const RARITY_WEIGHTS_BOOSTED: Record<Rarity, number> = { "common": 15, "rare": 35, "epic": 30, "legendary": 20 };

export type AbilityId = "lifesteal" | "thorns" | "secondWind";
export const ABILITIES: Record<AbilityId, { name: string; description: string }> = {
	"lifesteal": { name: "Vampiric", description: "Heal 15% of damage you deal" },
	"thorns": { name: "Thorned", description: "Reflect 20% of damage you take" },
	"secondWind": { name: "Second Wind", description: "Survive one killing blow per battle at 1 HP" },
};
const ABILITY_IDS = Object.keys(ABILITIES) as AbilityId[];

export type Quality = "dull" | "shiny" | "glowing" | "radiant" | "iridescent" | "prismatic";
// [minRoll, maxRoll, statMultiplier, weight]
const QUALITY_TABLE: Record<Quality, [number, number, number, number]> = {
	"dull": [70, 79, 0.7, 22],
	"shiny": [80, 89, 1, 35],
	"glowing": [90, 94, 1.4, 25],
	"radiant": [95, 98, 1.9, 14],
	"iridescent": [99, 100, 2.4, 3.5],
	"prismatic": [100, 105, 2.9, 0.5],
};
const QUALITY_TABLE_BOOSTED: Record<Quality, [number, number, number, number]> = {
	"dull": [70, 79, 0.7, 5],
	"shiny": [80, 89, 1, 20],
	"glowing": [90, 94, 1.4, 30],
	"radiant": [95, 98, 1.9, 25],
	"iridescent": [99, 100, 2.4, 15],
	"prismatic": [100, 105, 2.9, 5],
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
	ability?: AbilityId;
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

// 0 at depth 1, ramping smoothly toward 1 by depth ~75 - blends the base
// weight tables toward their "boosted" counterparts so higher clouds drop
// better rarity/quality more often, not just bigger numbers on the same odds
const DEPTH_LUCK_RAMP_DEPTH = 74;

function depthLuck(depth: number): number {
	return Math.min(1, Math.max(0, depth - 1) / DEPTH_LUCK_RAMP_DEPTH);
}

function blendWeights<key extends string>(base: Record<key, number>, boosted: Record<key, number>, t: number): Record<key, number> {
	const blended = {} as Record<key, number>;
	for (const key of Object.keys(base) as key[]) {
		blended[key] = base[key] + (boosted[key] - base[key]) * t;
	}
	return blended;
}

// current drop odds (%) per rarity at this depth, for display in the info modal
export function getRarityOdds(depth: number): Record<Rarity, number> {
	const weights = blendWeights(RARITY_WEIGHTS, RARITY_WEIGHTS_BOOSTED, depthLuck(depth));
	const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
	return Object.fromEntries(Object.entries(weights).map(([k, w]) => [k, (w / total) * 100])) as Record<Rarity, number>;
}

export function generateItem(depth: number): Item {
	const luck = depthLuck(depth);
	const rarity = weightedPick(blendWeights(RARITY_WEIGHTS, RARITY_WEIGHTS_BOOSTED, luck));
	const qualityWeights = blendWeights(
		Object.fromEntries(Object.entries(QUALITY_TABLE).map(([k, v]) => [k, v[3]])) as Record<Quality, number>,
		Object.fromEntries(Object.entries(QUALITY_TABLE_BOOSTED).map(([k, v]) => [k, v[3]])) as Record<Quality, number>,
		luck,
	);
	const quality = weightedPick(qualityWeights);

	const [minRoll, maxRoll, statMultiplier] = QUALITY_TABLE[quality];
	const qualityRoll = randomInteger(minRoll, maxRoll);
	const bonusCount = RARITY_BONUS_STATS[rarity];
	const rarityMultiplier = { "common": 1, "rare": 1.5, "epic": 2.2, "legendary": 3 }[rarity];
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
	const ability = rarity === "legendary" ? ABILITY_IDS[randomInteger(0, ABILITY_IDS.length - 1)] : undefined;

	return { emoji, rarity, quality, qualityRoll, depth, primaryStat, affixes, upgradeLevel: 0, ability };
}

export function getItemScore(item: Item | null): number {
	if (!item) return 0;
	return Object.values(item.affixes).reduce((sum, value) => sum + (value || 0), 0);
}

export function getInventoryScore(inventory: (Item | null)[]): number {
	return inventory.reduce((sum, item) => sum + getItemScore(item), 0);
}

const UPGRADE_BASE_COST = 5;
const UPGRADE_COST_GROWTH = 1.5;
const UPGRADE_STAT_GROWTH = 0.15;

// dust cost to upgrade the item at its current level - grows so repeated
// upgrades on one item get progressively pricier
export function getUpgradeCost(item: Item): number {
	return Math.round(UPGRADE_BASE_COST * Math.pow(UPGRADE_COST_GROWTH, item.upgradeLevel || 0));
}

// spends nothing itself - caller deducts dust; bumps every rolled stat on the
// item by a fixed fraction of its current value and increments upgrade level
export function upgradeItem(item: Item): Item {
	const affixes: Partial<Record<Stat, number>> = {};
	for (const [stat, value] of Object.entries(item.affixes) as [Stat, number][]) {
		affixes[stat] = value + Math.max(1, Math.round(value * UPGRADE_STAT_GROWTH));
	}

	return { ...item, affixes, upgradeLevel: (item.upgradeLevel || 0) + 1 };
}

// compareItem: when given, each stat line and the score are colored by how item's
// value compares to compareItem's for that stat (green upgrade / red downgrade).
// previewItem: when given (e.g. the result of upgradeItem(item)), each stat line
// shows "current -> after" in muted green instead, previewing a pending purchase
export function createItemCard(
	item: Item | null,
	cls: string,
	label = "Item Found",
	compareItem?: Item | null,
	previewItem?: Item,
): HTMLElement {
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
			const previewValue = previewItem?.affixes[stat];
			const text =
				previewValue !== undefined && previewValue !== item.affixes[stat]
					? `+${formatNumber(item.affixes[stat]!)} → +${formatNumber(previewValue)} ${STAT_LABELS[stat]}`
					: `+${formatNumber(item.affixes[stat]!)} ${STAT_LABELS[stat]}`;

			const line = el(`div.${cls}-stat`, text);
			if (stat === item.primaryStat) line.classList.add("primary-stat");
			if (previewValue !== undefined && previewValue !== item.affixes[stat]) line.classList.add("stat-preview");

			if (compareItem !== undefined) {
				const diff = (item.affixes[stat] || 0) - (compareItem?.affixes[stat] || 0);
				if (diff > 0) line.classList.add("stat-up");
				else if (diff < 0) line.classList.add("stat-down");
			}

			return line;
		}),
	);

	const score = getItemScore(item);
	const scoreEl = el(`div.${cls}-score`, formatNumber(score));
	if (compareItem !== undefined) {
		const compareScore = getItemScore(compareItem ?? null);
		if (score > compareScore) scoreEl.classList.add("stat-up");
		else if (score < compareScore) scoreEl.classList.add("stat-down");
	}

	const rarityEl = el(
		`div.${cls}-rarity`,
		`${item.rarity} (${item.qualityRoll}%)${item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : ""}`,
	);
	rarityEl.style.color = RARITY_COLORS[item.rarity];

	const abilityEl = item.ability
		? [
				el(`div.${cls}-ability`, [
					el("span.ability-name", `${ABILITIES[item.ability].name}: `),
					el("span", ABILITIES[item.ability].description),
				]),
			]
		: [];

	return el(`div.${cls}-card`, [
		...labelEl,
		emoji,
		rarityEl,
		el(`div.${cls}-found`, `Found on Cloud ${item.depth}`),
		stats,
		...abilityEl,
		el(`div.${cls}-score-row`, [scoreEl, el(`div.${cls}-score-label`, "Sparkles")]),
	]);
}

export function getQualityGlow(quality: Quality): string {
	const glowByQuality: Record<Quality, string> = {
		"dull": "none",
		"shiny": "0 0 4px var(--shadow)",
		"glowing": "0 0 8px var(--shadow)",
		"radiant": "0 0 12px 2px var(--shadow)",
		"iridescent": "0 0 16px 3px var(--shadow)",
		"prismatic": "0 0 20px 4px var(--shadow), 0 0 30px 6px var(--color)",
	};
	return glowByQuality[quality];
}
