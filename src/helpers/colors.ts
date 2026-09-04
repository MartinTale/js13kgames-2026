import { updateFireflyColor } from "../components/fireflies/fireflies";

type RGB = { r: number; g: number; b: number };

// unicorn/rainbow pastel palette: bubblegum pink, lavender, sky, mint, banana, peach
export const colors = ["#FF8FC7", "#C896FF", "#8FD9FF", "#8FFFC9", "#FFF48F", "#FFB98F", "#FF8FC7"];

// const colorsPerIndex = 20;
// let colorIndex = 0;
// setInterval(() => {
// 	colorIndex++;

// 	const realColorIndex = Math.min(colors.length - 1, Math.floor(colorIndex / colorsPerIndex));
// 	const color = getColorFromRange(
// 		hexToRgb(colors[realColorIndex]),
// 		hexToRgb(colors[Math.min(colors.length - 1, realColorIndex + 1)]),
// 		(colorIndex % colorsPerIndex) / colorsPerIndex,
// 	);

// 	setGameColor(rgbToHex(color.r, color.g, color.b));

// 	if (realColorIndex === colors.length - 1) {
// 		colorIndex = 0;
// 	}
// }, 100);

// deep night-sky purple that every game color's background darkens toward
const NIGHT_BG = { r: 26, g: 12, b: 36 };

export function setGameColor(newHexColor: string) {
	const rgbColor = hexToRgb(newHexColor);

	// dark night-sky background: mostly a deep purple, lightly tinted by the game color
	const bg =
		"rgb(" +
		lerpChannel(NIGHT_BG.r, rgbColor.r, 0.12) +
		"," +
		lerpChannel(NIGHT_BG.g, rgbColor.g, 0.12) +
		"," +
		lerpChannel(NIGHT_BG.b, rgbColor.b, 0.12) +
		")";
	const color = newHexColor;
	// bright glow: same hue pushed brighter, pops against the dark background
	const shadow =
		"rgb(" +
		Math.min(255, Math.round(rgbColor.r * 1.15)) +
		"," +
		Math.min(255, Math.round(rgbColor.g * 1.15)) +
		"," +
		Math.min(255, Math.round(rgbColor.b * 1.15)) +
		")";

	document.documentElement.style.setProperty("--bg", bg);
	document.documentElement.style.setProperty("--color", color);
	document.documentElement.style.setProperty("--shadow", shadow);

	updateFireflyColor(newHexColor);
}

function lerpChannel(from: number, to: number, amount: number) {
	return Math.round(from + (to - from) * amount);
}

globalThis.setGameColor = setGameColor;

export function hexToRgb(hex: string) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return {
		r: parseInt(result![1], 16),
		g: parseInt(result![2], 16),
		b: parseInt(result![3], 16),
	};
}

function componentToHex(c) {
	var hex = Math.floor(c).toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}

export function rgbToHex(r, g, b) {
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function getColorFromRange(first: RGB, second: RGB, percentage: number) {
	let result: RGB = { r: 0, g: 0, b: 0 };
	Object.keys(first).forEach((key) => {
		let start = first[key];
		let end = second[key];
		let offset = (start - end) * percentage;
		if (offset >= 0) {
			Math.abs(offset);
		}
		result[key] = start - offset;
	});
	return result;
}
