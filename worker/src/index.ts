export interface Env {
	LEADERBOARD: KVNamespace;
}

const KEY = "scores";
const MAX_ENTRIES = 50;
const MAX_NAME_LENGTH = 16;
const ID_LENGTH = 20;

type Entry = { id: string; name: string; depth: number };
type PublicEntry = { name: string; depth: number };

function toPublic({ name, depth }: Entry): PublicEntry {
	return { name, depth };
}

function withRank(scores: Entry[], id: string): { entries: PublicEntry[]; rank: number | null } {
	const rank = scores.findIndex((entry) => entry.id === id);
	return { entries: scores.map(toPublic), rank: rank === -1 ? null : rank + 1 };
}

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json", ...corsHeaders },
	});
}

async function getScores(env: Env): Promise<Entry[]> {
	return (await env.LEADERBOARD.get<Entry[]>(KEY, "json")) ?? [];
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		if (request.method === "GET" && url.pathname === "/top") {
			const scores = await getScores(env);
			const id = url.searchParams.get("id") ?? "";
			return json(withRank(scores, id));
		}

		if (request.method === "POST" && url.pathname === "/submit") {
			let body: { id?: unknown; name?: unknown; depth?: unknown };
			try {
				body = await request.json();
			} catch {
				return json({ error: "invalid body" }, 400);
			}

			const id = typeof body.id === "string" ? body.id.trim().slice(0, ID_LENGTH) : "";
			const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME_LENGTH) : "";
			const depth = typeof body.depth === "number" ? Math.floor(body.depth) : NaN;

			if (!id || !name || !Number.isFinite(depth) || depth <= 0) {
				return json({ error: "invalid id, name or depth" }, 400);
			}

			const scores = await getScores(env);
			const existing = scores.find((entry) => entry.id === id);

			if (existing) {
				existing.name = name;
				if (depth > existing.depth) existing.depth = depth;
			} else {
				scores.push({ id, name, depth });
			}

			scores.sort((a, b) => b.depth - a.depth);
			const trimmed = scores.slice(0, MAX_ENTRIES);

			await env.LEADERBOARD.put(KEY, JSON.stringify(trimmed));
			return json(withRank(trimmed, id));
		}

		return json({ error: "not found" }, 404);
	},
};
