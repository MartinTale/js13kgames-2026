import { tweens } from "../systems/animation";
import { state } from "../systems/state";
import "./game.css";

export function initGame() {
	console.log("init game");
}

export function startGameLoop() {
	processGameState();
}

function processGameState() {
	const newProcessingTime = Date.now();

	Object.values(tweens).forEach((updateTween) => updateTween(newProcessingTime));

	state.lastProcessedAt.value = newProcessingTime;
	requestAnimationFrame(processGameState);
}
