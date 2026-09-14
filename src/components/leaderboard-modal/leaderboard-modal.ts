import "./leaderboard-modal.css";
import { el } from "../../helpers/dom";
import { formatNumber } from "../../helpers/numbers";
import { createButton } from "../button/button";
import { openModal } from "../modal/modal";
import { fetchTopScores, submitScore, LeaderboardEntry } from "../../systems/leaderboard";
import { state } from "../../systems/state";

const PAGE_SIZE = 10;

function renderPage(entries: LeaderboardEntry[], page: number, localRank: number | null): HTMLElement {
	if (entries.length === 0) {
		return el("div.leaderboard-empty", "No scores yet - be the first!");
	}

	const start = page * PAGE_SIZE;
	const pageEntries = entries.slice(start, start + PAGE_SIZE);

	return el(
		"div.leaderboard-list",
		pageEntries.map((entry, i) => {
			const rank = start + i + 1;
			const row = el("div.leaderboard-row", [
				el("span.leaderboard-rank", `${rank}`),
				el("span.leaderboard-name", entry.name),
				el("span.leaderboard-depth", [el("span.leaderboard-depth-icon", "☁️"), el("span", formatNumber(entry.depth))]),
			]);
			if (rank <= 3) row.classList.add("top-three", `rank-${rank}`);
			if (rank === localRank) row.classList.add("local-player");
			return row;
		}),
	);
}

export async function openLeaderboardModal(container: HTMLElement) {
	const listPanel = el("div.leaderboard-panel", el("div.leaderboard-empty", "Loading..."));
	const pageLabel = el("span.leaderboard-page-label", "");
	const prevButton = el("button.leaderboard-page-button", "<") as HTMLButtonElement;
	const nextButton = el("button.leaderboard-page-button", ">") as HTMLButtonElement;
	const pagination = el("div.leaderboard-pagination", [prevButton, pageLabel, nextButton]);

	const nameInput = el("input.leaderboard-name-input") as HTMLInputElement;
	nameInput.maxLength = 16;
	nameInput.placeholder = "Your name";
	nameInput.value = state.playerName.value;

	let entries: LeaderboardEntry[] = [];
	let localRank: number | null = null;
	let page = 0;

	function renderCurrentPage() {
		const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
		page = Math.min(page, pageCount - 1);
		listPanel.replaceChildren(renderPage(entries, page, localRank));
		pageLabel.textContent = `${page + 1} / ${pageCount}`;
		prevButton.disabled = page <= 0;
		nextButton.disabled = page >= pageCount - 1;
		pagination.classList.toggle("hidden", entries.length <= PAGE_SIZE);
	}

	prevButton.onclick = () => {
		page--;
		renderCurrentPage();
	};
	nextButton.onclick = () => {
		page++;
		renderCurrentPage();
	};

	const rankValue = el("span.leaderboard-stat-value", "-");

	const submitButton = createButton(
		"Submit Score",
		async () => {
			const name = nameInput.value.trim();
			if (!name) return;

			state.playerName.value = name;
			submitButton.face.disabled = true;
			const result = await submitScore(name, state.depth.value);
			entries = result.entries;
			localRank = result.rank;
			page = localRank ? Math.floor((localRank - 1) / PAGE_SIZE) : 0;
			renderCurrentPage();
			rankValue.textContent = result.rank ? `#${result.rank}` : "-";
			submitButton.face.disabled = false;
		},
		"primary",
		"md",
	);

	const statsRow = el("div.leaderboard-stats", [
		el("div.leaderboard-stat", [el("span.leaderboard-stat-label", "Current cloud"), el("span.leaderboard-stat-value", formatNumber(state.depth.value))]),
		el("div.leaderboard-stat", [el("span.leaderboard-stat-label", "Leaderboard rank"), rankValue]),
	]);

	const content = el("div.leaderboard-content", [
		listPanel,
		pagination,
		statsRow,
		el("div.leaderboard-submit-row", [nameInput, submitButton]),
	]);

	openModal(container, "Leaderboard", content, [{ content: "Close", type: "normal", onClickCallback: null }], null);

	const result = await fetchTopScores();
	entries = result.entries;
	localRank = result.rank;
	renderCurrentPage();
	rankValue.textContent = result.rank ? `#${result.rank}` : "-";
}
