import { state } from "./state";

const WORKER_URL = "https://cloudclimb-leaderboard.me-0ab.workers.dev";

export type LeaderboardEntry = { name: string; depth: number };

// each player gets one persistent random id on first submit, so renaming
// updates their existing entry instead of creating a duplicate, and no one
// else can overwrite their score by submitting the same display name
function getPlayerId(): string {
	if (!state.playerId.value) {
		state.playerId.value = crypto.randomUUID();
	}
	return state.playerId.value;
}

export async function fetchTopScores(): Promise<LeaderboardEntry[]> {
	try {
		const res = await fetch(`${WORKER_URL}/top`);
		if (!res.ok) return [];
		return await res.json();
	} catch {
		return [];
	}
}

export async function submitScore(name: string, depth: number): Promise<LeaderboardEntry[]> {
	try {
		const res = await fetch(`${WORKER_URL}/submit`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: getPlayerId(), name, depth }),
		});
		if (!res.ok) return [];
		return await res.json();
	} catch {
		return [];
	}
}
