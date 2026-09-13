import { state } from "./state";

const WORKER_URL = "https://cloudclimb-leaderboard.me-0ab.workers.dev";

export type LeaderboardEntry = { name: string; depth: number };
export type LeaderboardResult = { entries: LeaderboardEntry[]; rank: number | null };

// each player gets one persistent random id on first submit, so renaming
// updates their existing entry instead of creating a duplicate, and no one
// else can overwrite their score by submitting the same display name
function getPlayerId(): string {
	if (!state.playerId.value) {
		state.playerId.value = crypto.randomUUID();
	}
	return state.playerId.value;
}

const EMPTY_RESULT: LeaderboardResult = { entries: [], rank: null };

export async function fetchTopScores(): Promise<LeaderboardResult> {
	try {
		const res = await fetch(`${WORKER_URL}/top?id=${encodeURIComponent(getPlayerId())}`);
		if (!res.ok) return EMPTY_RESULT;
		return await res.json();
	} catch {
		return EMPTY_RESULT;
	}
}

export async function submitScore(name: string, depth: number): Promise<LeaderboardResult> {
	try {
		const res = await fetch(`${WORKER_URL}/submit`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: getPlayerId(), name, depth }),
		});
		if (!res.ok) return EMPTY_RESULT;
		return await res.json();
	} catch {
		return EMPTY_RESULT;
	}
}
