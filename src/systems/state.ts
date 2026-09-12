import { rng } from "../helpers/numbers";
import { Signal, createSignal } from "./signals";
import { Item } from "./items";

const STATE_KEY = "js13k26_save";

export type Path = "sound" | "screen";

export type State = {
	seed: Signal<number>;
	lastProcessedAt: Signal<number>;
	sound: Signal<boolean | null>;
	level: Signal<number>;
	depth: Signal<number>;
	inventory: Signal<(Item | null)[]>;
	tapsToFill: Signal<number>;
};

export const emptyState: State = {
	seed: createSignal(12),
	// seed: createSignal(Date.now()),
	lastProcessedAt: createSignal(Date.now()),
	sound: createSignal(null),
	level: createSignal(0),
	depth: createSignal(1),
	inventory: createSignal(Array(8).fill(null)),
	tapsToFill: createSignal(3),
};

export let state: State;

let stateLoaded = false;
let autoSaveInterval: number;

export function initState() {
	loadState();

	autoSaveInterval = setInterval(saveState, 15000);
	globalThis.onbeforeunload = () => {
		saveState();
	};
}

export function resetState() {
	clearInterval(autoSaveInterval);
	globalThis.onbeforeunload = null;
	localStorage.removeItem(STATE_KEY);

	setTimeout(() => {
		globalThis.location.reload();
	}, 500);
}

// btoa/atob only handle Latin1, but saved state (item emojis) can contain
// characters outside that range, so UTF-8 encode/decode around them
function encodeState(json: string): string {
	return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
}

function decodeState(encoded: string): string {
	return decodeURIComponent(
		atob(encoded)
			.split("")
			.map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
			.join(""),
	);
}

function loadState() {
	const encodedState = localStorage.getItem(STATE_KEY);
	const decodedState = encodedState ? decodeState(encodedState) : "{}";
	const jsonState = JSON.parse(decodedState) as State | undefined;

	state = Object.entries(emptyState).reduce((acc, [key, signal]) => {
		acc[key] = jsonState?.[key] !== undefined ? createSignal(jsonState[key]) : signal;
		return acc;
	}, {} as State);

	rng.setSeed(state.seed.value);

	stateLoaded = true;
}

function saveState() {
	if (!stateLoaded) {
		return;
	}

	state.seed.value = rng.getSeed();

	const jsonState = Object.entries(state).reduce(
		(acc, [key, signal]) => {
			acc[key] = signal.value;
			return acc;
		},
		{} as Record<string, any>,
	);

	const encodedState = encodeState(JSON.stringify(jsonState));
	localStorage.setItem(STATE_KEY, encodedState);
}
