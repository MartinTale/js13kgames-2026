import "./loot-popup.css";
import { el } from "../../helpers/dom";
import { openModal, closeModal } from "../modal/modal";
import { getItemScore, getQualityGlow, Item, RARITY_COLORS, STAT_LABELS, Stat, STATS } from "../../systems/items";
import { state } from "../../systems/state";

function itemCard(item: Item): HTMLElement {
	const emoji = el("div.loot-emoji", item.emoji);
	emoji.style.borderColor = RARITY_COLORS[item.rarity];
	emoji.style.boxShadow = getQualityGlow(item.quality);

	const stats = el(
		"div.loot-stats",
		STATS.filter((stat) => item.affixes[stat]).map((stat) => el("div.loot-stat", `${STAT_LABELS[stat]} +${item.affixes[stat]}`)),
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

export function showLootPopup(container: HTMLElement, slotIndex: number, newItem: Item, onResolved: () => void) {
	const oldItem = state.inventory.value[slotIndex];
	const oldScore = getItemScore(oldItem);
	const newScore = getItemScore(newItem);
	const scoreDelta = newScore - oldScore;

	const rows = STATS.map((stat) => diffRow(stat, oldItem, newItem)).filter((row): row is HTMLElement => row != null);

	const content = el("div.loot-popup-content", [
		el("div.loot-compare", [
			el("div.loot-side", [el("div.loot-side-label", "Current"), oldItem ? itemCard(oldItem) : el("div.loot-empty", "Empty")]),
			el("div.loot-side", [el("div.loot-side-label", "New"), itemCard(newItem)]),
		]),
		el("div.loot-diffs", rows),
		el("div.loot-score-delta" + (scoreDelta >= 0 ? ".up" : ".down"), `Score: ${oldScore} → ${newScore} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta})`),
	]);

	openModal(
		container,
		"Loot!",
		content,
		[
			{
				content: "Keep Current",
				type: "normal",
				onClickCallback: () => onResolved(),
			},
			{
				content: "Equip New",
				type: "primary",
				onClickCallback: () => {
					const inventory = [...state.inventory.value];
					inventory[slotIndex] = newItem;
					state.inventory.value = inventory;
					onResolved();
				},
			},
		],
		null,
		"loot-modal",
		false,
	);
}

export { closeModal };
