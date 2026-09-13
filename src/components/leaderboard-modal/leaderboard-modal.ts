import "./leaderboard-modal.css";
import { el } from "../../helpers/dom";
import { createButton } from "../button/button";
import { openModal } from "../modal/modal";
import { fetchTopScores, submitScore, LeaderboardEntry } from "../../systems/leaderboard";
import { state } from "../../systems/state";

function renderList(entries: LeaderboardEntry[]): HTMLElement {
	if (entries.length === 0) {
		return el("div.leaderboard-empty", "No scores yet - be the first!");
	}

	return el(
		"div.leaderboard-list",
		entries.map((entry, i) => {
			const row = el("div.leaderboard-row", [
				el("span.leaderboard-rank", `${i + 1}`),
				el("span.leaderboard-name", entry.name),
				el("span.leaderboard-depth", [el("span.leaderboard-depth-icon", "☁️"), el("span", `${entry.depth}`)]),
			]);
			if (i < 3) row.classList.add("top-three", `rank-${i + 1}`);
			return row;
		}),
	);
}

export async function openLeaderboardModal(container: HTMLElement) {
	const listPanel = el("div.leaderboard-panel", el("div.leaderboard-empty", "Loading..."));
	const nameInput = el("input.leaderboard-name-input") as HTMLInputElement;
	nameInput.maxLength = 16;
	nameInput.placeholder = "Your name";
	nameInput.value = state.playerName.value;

	const submitButton = createButton(
		"Submit Score",
		async () => {
			const name = nameInput.value.trim();
			if (!name) return;

			state.playerName.value = name;
			submitButton.face.disabled = true;
			const entries = await submitScore(name, state.depth.value);
			listPanel.replaceChildren(renderList(entries));
			submitButton.face.disabled = false;
		},
		"primary",
		"md",
	);

	const currentDepthRow = el("div.leaderboard-current-depth", [
		el("span", "Your current cloud: "),
		el("span.leaderboard-current-depth-value", `${state.depth.value}`),
	]);

	const content = el("div.leaderboard-content", [
		listPanel,
		currentDepthRow,
		el("div.leaderboard-submit-row", [nameInput, submitButton]),
	]);

	openModal(container, "Leaderboard", content, [{ content: "Close", type: "normal", onClickCallback: null }], null);

	const entries = await fetchTopScores();
	listPanel.replaceChildren(renderList(entries));
}
