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
	const secondsPassed = (newProcessingTime - state.lastProcessedAt.value) / 1000;

	Object.values(tweens).forEach((updateTween) => updateTween(newProcessingTime));
	// console.log(secondsPassed);

	state.level.value += secondsPassed;

	state.lastProcessedAt.value = newProcessingTime;
	requestAnimationFrame(processGameState);
}
