// import { gameContainer, soundToggle } from '../systems/game';
import { initAudioContext, zzfx, zzfxP, zzfxX } from "../third-party-libraries/zzfx";
import { zzfxM } from "../third-party-libraries/zzfxm";
// import { openModal } from './components/modal';
import { state } from "./state";
import { bodyElement, gameContainer, soundToggle } from "..";
import { openModal } from "../components/modal/modal";

const musicVolume = 0.5;

let musicStarted = false;

export const sounds = {
	tap: [1.03, 0.5, 355, , , 0, , 0.71, 12, , -752, 0.03, , , , , , 0.22, 0.01],
	cloudPop: [1.1, 0.3, 220, , 0.03, 0.1, 1, 1.2, , , -80, 0.05, , , , , , 0.6, 0.05],
	beam: [0.9, , 200, , 0.1, 0.4, , 1.9, , , 200, 0.06, 0.03, , , , 0.2, 0.75, 0.2],
	// combat
	hit: [0.8, 0.1, 120, , 0.02, 0.08, , 1.4, , , , , , 0.3, , 0.1, , 0.6, 0.02],
	crit: [1, 0.1, 180, , 0.02, 0.12, , 1.8, -5, , , , , 0.4, , 0.2, , 0.7, 0.02],
	dodge: [0.7, 0.2, 500, , 0.01, 0.06, , 0.3, 10, , , , , , , , , 0.4, 0.01],
	win: [1.2, , 400, , 0.08, 0.3, , 1.3, , , 250, 0.06, 0.05, , , , , 0.7, 0.15],
	loss: [1, , 200, , 0.1, 0.4, 1, 0.6, -8, , -100, 0.1, , , , , , 0.4, 0.2],
	// economy
	buy: [0.9, , 660, , 0.03, 0.1, , 1.6, , , 400, 0.03, , , , , , 0.5, 0.03],
};

// cheerful looping melody (C major pentatonic) over a soft root-note bass -
// two instruments (lead triangle, soft sine bass), one pattern, looped by
// zzfxP. 4 bars (A-A'-B-A'') so it doesn't repeat as quickly, ends back on
// the root note (C) to match the opening note, and closes with two rest
// steps so the last note's release fully decays before the loop wraps
// (avoids a click/pop at the seam - the previous 1-bar version cut the
// tail off mid-release)
const leadInstrument = [musicVolume * 0.5, 0, 220, , 0.02, 0.3, 1, 1.2, , , , , , , , , , 0.85, 0.02];
const bassInstrument = [musicVolume * 0.6, 0, 110, , 0.05, 0.4, , 0.9, , , , , , , , , , 0.9, 0.04];

const C = 12,
	D = 14,
	E = 16,
	F = 17,
	G = 19,
	A = 21,
	C5 = 24;

// each note plays for 2 sixteenth-steps (note, then a rest step) so both
// channels line up on the same step count
function buildSteps(notes: (number | undefined)[]): (number | undefined)[] {
	return [, , ...notes.flatMap((n) => [n, undefined])];
}

const leadNotes = [
	C, E, G, A, G, E, D, C, // bar A
	D, E, G, A, C5, A, G, E, // bar A'
	G, A, C5, A, G, E, D, E, // bar B
	C, D, E, G, A, G, E, C, // bar A'' - ends on root, matches opening note
	, , // trailing rest so the final note's release fully decays before the loop wraps
];
const bassNotes = [
	C, , , , G, , , , // bar A: root, fifth
	D, , , , G, , , , // bar A'
	F, , , , C, , , , // bar B (subdominant colour)
	C, , , , C, , , , // bar A'' - settle back on root for the loop
	, , // trailing rest, matches lead's tail
];

const leadPattern = buildSteps(leadNotes);
const bassPattern = buildSteps(bassNotes);

export const music = zzfxM([leadInstrument, bassInstrument], [[leadPattern, bassPattern]], [0], 110);

export function playSound(sound: (number | undefined)[]) {
	if (state.sound.value && zzfxX != null) {
		zzfx(...sound);
	}
}

export function initMusic() {
	if (state.sound.value == null) {
		openModal(
			gameContainer,
			"Play with sound?",
			"",
			[
				{
					type: "danger",
					content: "No",
					onClickCallback: () => {
						state.sound.value = false;
					},
				},
				{
					type: "primary",
					content: "Rock ON!",
					onClickCallback: () => {
						state.sound.value = true;
						if (soundToggle) {
							soundToggle.renderState(state.sound.value);
						}
					},
				},
			],
			null,
		);
	}

	bodyElement.onclick = () => {
		if (!musicStarted) {
			musicStarted = true;
			initAudioContext();
			zzfxP(...music).loop = true;

			if (state.sound.value) {
				zzfxX!.resume();
			} else {
				zzfxX!.suspend();
			}
		}
	};
}
