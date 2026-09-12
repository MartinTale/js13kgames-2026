import { el, mount } from "../helpers/dom";
import { getScaleableContainerScale } from "../components/scaleable-container/scaleable-container";
import { playSound, sounds } from "./music";

const RAINBOW = ["#FF8FC7", "#FFB98F", "#FFF48F", "#8FFFC9", "#8FD9FF", "#C896FF"];
const BEAM_DURATION = 1200;

// fires a rainbow beam from originEl to targetEl (both within scaleContainerName's
// scaled space) and flashes targetEl's border/glow on the same timing
export function fireLootBeam(container: HTMLElement, originEl: HTMLElement, targetEl: HTMLElement, scaleContainerName: string) {
	const originRect = originEl.getBoundingClientRect();
	const targetRect = targetEl.getBoundingClientRect();
	const containerRect = container.getBoundingClientRect();
	const scale = getScaleableContainerScale(scaleContainerName).final || 1;

	const startX = (originRect.left + originRect.width / 2 - containerRect.left) / scale;
	const startY = (originRect.top + originRect.height / 2 - containerRect.top) / scale;
	const endX = (targetRect.left + targetRect.width / 2 - containerRect.left) / scale;
	const endY = (targetRect.top + targetRect.height / 2 - containerRect.top) / scale;

	playSound(sounds.beam);
	drawRainbowBeam(container, startX, startY, endX, endY, targetRect.width / scale, targetRect.height / scale);

	// conic-gradient angles are measured clockwise from north (0deg = up), unlike atan2's
	// east-based/counter-clockwise convention, so convert the beam's direction into that space
	const beamAngleDeg = (Math.atan2(endY - startY, endX - startX) * 180) / Math.PI + 90 + 180;
	burnSlot(targetEl, beamAngleDeg);
}

// tints the slot with the beam's colors and flashes its border/glow, fading out
// on the same curve as the rainbow beam so both effects read as one animation
function burnSlot(slot: HTMLElement, angleDeg: number) {
	const overlay = el("div.loot-beam-overlay");
	overlay.style.background = `conic-gradient(from ${angleDeg}deg, ${RAINBOW.join(", ")})`;
	mount(slot, overlay);

	slot.classList.add("beam-target");

	const keyframes = [
		{ opacity: 0, offset: 0 },
		{ opacity: 1, offset: 0.2 },
		{ opacity: 1, offset: 0.75 },
		{ opacity: 0, offset: 1 },
	];

	const overlayAnim = overlay.animate(keyframes, { duration: BEAM_DURATION, easing: "cubic-bezier(.2,.8,.3,1)" });
	const glowAnim = slot.animate(
		[
			{ boxShadow: "0 0 0 rgba(255, 255, 255, 0)", borderColor: "#fff", offset: 0 },
			{ boxShadow: "0 0 16px 4px #fff", borderColor: "#fff", offset: 0.2 },
			{ boxShadow: "0 0 16px 4px #fff", borderColor: "#fff", offset: 0.75 },
			{ boxShadow: "0 0 0 rgba(255, 255, 255, 0)", borderColor: "#fff", offset: 1 },
		],
		{ duration: BEAM_DURATION, easing: "cubic-bezier(.2,.8,.3,1)" },
	);

	overlayAnim.onfinish = () => overlay.remove();
	glowAnim.onfinish = () => {
		slot.style.boxShadow = "";
		slot.style.borderColor = "";
		slot.classList.remove("beam-target");
	};
}

function drawRainbowBeam(
	container: HTMLElement,
	startX: number,
	startY: number,
	endX: number,
	endY: number,
	slotW: number,
	slotH: number,
) {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as SVGSVGElement;
	svg.classList.add("loot-beam");

	const dx = endX - startX;
	const dy = endY - startY;
	const len = Math.hypot(dx, dy) || 1;
	// perpendicular unit vector, half-width at the slot end covers the whole slot cell
	const nx = -dy / len;
	const ny = dx / len;
	const halfW = Math.max(slotW, slotH) / 2;

	// solid wedge from the origin (narrow) to the slot (wide), with color bands running
	// lengthwise along the beam (radial, origin to slot) rather than stacked across its width
	RAINBOW.forEach((color, i) => {
		const t0 = i / RAINBOW.length - 0.5;
		const t1 = (i + 1) / RAINBOW.length - 0.5;
		const e0x = endX + nx * halfW * 2 * t0;
		const e0y = endY + ny * halfW * 2 * t0;
		const e1x = endX + nx * halfW * 2 * t1;
		const e1y = endY + ny * halfW * 2 * t1;

		const stripe = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
		stripe.setAttribute("points", `${startX},${startY} ${e0x},${e0y} ${e1x},${e1y}`);
		stripe.setAttribute("fill", color);
		svg.appendChild(stripe);
	});

	mount(container, svg as unknown as HTMLElement);

	const anim = svg.animate(
		[
			{ opacity: 0, transform: "scale(0.3)", transformOrigin: `${startX}px ${startY}px` },
			{ opacity: 1, transform: "scale(1)", transformOrigin: `${startX}px ${startY}px`, offset: 0.2 },
			{ opacity: 1, offset: 0.75 },
			{ opacity: 0 },
		],
		{ duration: BEAM_DURATION, easing: "cubic-bezier(.2,.8,.3,1)" },
	);

	anim.onfinish = () => svg.remove();
}
