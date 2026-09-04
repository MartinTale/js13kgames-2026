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

export function setGameColor(newHexColor: string) {
	const rgbColor = hexToRgb(newHexColor);

	// light blush-white background: mostly white, lightly tinted by the game color
	const bg =
		"rgb(" +
		lerpChannel(rgbColor.r, 255, 0.92) +
		"," +
		lerpChannel(rgbColor.g, 255, 0.92) +
		"," +
		lerpChannel(rgbColor.b, 255, 0.92) +
		")";
	const color = newHexColor;
	// soft glow: same hue, lightened toward white for a pastel shadow/highlight
	const shadow =
		"rgb(" +
		lerpChannel(rgbColor.r, 255, 0.35) +
		"," +
		lerpChannel(rgbColor.g, 255, 0.35) +
		"," +
		lerpChannel(rgbColor.b, 255, 0.35) +
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
