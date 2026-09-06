import "./progress-bar.css";
import { el, mount, svgEl } from "../../helpers/dom";
import { burstFromStadium } from "../../systems/confetti";
import { mathRandomInteger } from "../../helpers/numbers";
import { getScaleableContainerScale } from "../scaleable-container/scaleable-container";

const CLOUD_SVG =
	'<svg viewBox="0 0 32 20" xmlns="http://www.w3.org/2000/svg">' +
	'<path d="M8 16C4 16 2 13.5 2 11C2 8.5 4 6.5 6.5 6.5C7 3.5 9.5 1 13 1C16.5 1 19 3.2 19.7 6.2C20 6.1 20.4 6 20.8 6C24.3 6 27 8.6 27 11.8C27 15 24.3 17 20.8 17" fill="[fill]" stroke="none" />' +
	"</svg>";

const ITEMS = ["🌟", "🍀", "🦄", "🌈", "🍄", "🧿", "🪄", "🔮", "🐚", "🍯", "🌙", "✨"];
const RAINBOW = ["#FF8FC7", "#FFB98F", "#FFF48F", "#8FFFC9", "#8FD9FF", "#C896FF"];

export class ProgressBar {
	container: HTMLElement;
	wrap: HTMLElement;
	inventory: HTMLElement;
	track: HTMLElement;
	progress: HTMLElement;
	fx: SVGSVGElement;
	cloud: HTMLElement;
	slots: HTMLElement[] = [];
	filledCount = 0;

	constructor(
		parent: HTMLElement,
		public min: number,
		public max: number,
		public value: number,
		public slotCount = 8,
	) {
		this.progress = el("div.progress");
		this.track = el("div.progress-track", this.progress);
		this.fx = document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as SVGSVGElement;
		this.fx.classList.add("progress-fx");
		this.cloud = svgEl(CLOUD_SVG.replace("[fill]", "#fff"));
		this.cloud.classList.add("progress-cloud");

		this.inventory = el(
			"div.inventory",
			Array.from({ length: this.slotCount }, () => {
				const slot = el("div.inventory-slot");
				this.slots.push(slot);
				return slot;
			}),
		);

		this.container = el("div.progress-bar", [this.track, this.fx as unknown as HTMLElement, this.cloud]);
		this.wrap = el("div.progress-bar-wrap", [this.inventory, this.container]);

		this.setValue(value);

		mount(parent, this.wrap);
	}

	getProgress() {
		return Math.min(100, Math.max(0, ((this.value - this.min) / (this.max - this.min)) * 100));
	}

	setValue(value: number) {
		this.value = value;
		const to = this.getProgress();

		this.progress.style.width = `${to}%`;
		this.cloud.style.setProperty("--cloud-progress-scale", `${1 + (to / 100) * 0.3}`);

		if (to >= 100) {
			this.cloudBurst();

			this.value = this.min;
			setTimeout(() => {
				this.progress.style.transition = "none";
				this.progress.style.width = "0%";
				requestAnimationFrame(() => {
					this.progress.style.transition = "";
				});
			}, 300);
		}
	}

	private cloudBurst() {
		const w = this.container.offsetWidth;
		const h = this.container.offsetHeight;
		const inset = -parseFloat(getComputedStyle(this.fx).left);
		const x = inset + w + 10;
		const y = inset + h / 2;

		burstFromStadium(this.fx, x, y, 0, h, -90, 300, 46, 1.7, 1.6, 1.6);

		this.cloud.style.setProperty("--cloud-progress-scale", "1");
		// grows and holds large while the rainbow beam plays (beam starts at 250ms, runs 1200ms),
		// then shrinks back down to its resting size
		this.cloud.animate(
			[
				{ transform: "translate(50%, -50%) scale(1) rotate(0deg)" },
				{ transform: "translate(50%, -50%) scale(1.5) rotate(-18deg)", offset: 0.2 },
				{ transform: "translate(50%, -50%) scale(1.4) rotate(-10deg)", offset: 0.85 },
				{ transform: "translate(50%, -50%) scale(1) rotate(0deg)" },
			],
			{ duration: 1450, easing: "cubic-bezier(.34,1.2,.64,1)" },
		);

		setTimeout(() => this.spawnItemAtNextSlot(), 250);
	}

	private spawnItemAtNextSlot() {
		const slot = this.slots[this.filledCount % this.slots.length];
		this.filledCount++;

		const item = ITEMS[mathRandomInteger(0, ITEMS.length - 1)];

		const cloudRect = this.cloud.getBoundingClientRect();
		const slotRect = slot.getBoundingClientRect();
		const originRect = this.container.getBoundingClientRect();
		// getBoundingClientRect() is in viewport (post-scale) space, but the beam svg lives
		// inside the same scaled ancestor, so its local coordinate system is pre-scale
		const scale = getScaleableContainerScale("game").final || 1;

		const startX = (cloudRect.left + cloudRect.width / 2 - originRect.left) / scale;
		const startY = (cloudRect.top + cloudRect.height / 2 - originRect.top) / scale;
		const endX = (slotRect.left + slotRect.width / 2 - originRect.left) / scale;
		const endY = (slotRect.top + slotRect.height / 2 - originRect.top) / scale;

		this.drawRainbowBeam(startX, startY, endX, endY, slotRect.width / scale, slotRect.height / scale);

		// conic-gradient angles are measured clockwise from north (0deg = up), unlike atan2's
		// east-based/counter-clockwise convention, so convert the beam's direction into that space
		const beamAngleDeg = (Math.atan2(endY - startY, endX - startX) * 180) / Math.PI + 90 + 180;
		const overlay = this.burnSlot(slot, beamAngleDeg);

		setTimeout(() => {
			slot.insertBefore(el("span.inventory-slot-item", item), overlay);
		}, 220);
	}

	// tints the slot with the beam's colors and flashes its border/glow, fading out
	// on the same curve as the rainbow beam so both effects read as one animation
	private burnSlot(slot: HTMLElement, angleDeg: number): HTMLElement {
		const overlay = el("div.inventory-slot-overlay");
		overlay.style.background = `conic-gradient(from ${angleDeg}deg, ${RAINBOW.join(", ")})`;
		mount(slot, overlay);

		// lift above the beam (which itself renders above every other slot) while it's the target
		slot.classList.add("beam-target");

		const keyframes = [
			{ opacity: 0, offset: 0 },
			{ opacity: 1, offset: 0.2 },
			{ opacity: 1, offset: 0.75 },
			{ opacity: 0, offset: 1 },
		];

		const overlayAnim = overlay.animate(keyframes, { duration: 1200, easing: "cubic-bezier(.2,.8,.3,1)" });
		const glowAnim = slot.animate(
			[
				{ boxShadow: "0 0 0 rgba(255, 255, 255, 0)", borderColor: "var(--shadow)", offset: 0 },
				{ boxShadow: "0 0 16px 4px var(--shadow)", borderColor: "#fff", offset: 0.2 },
				{ boxShadow: "0 0 16px 4px var(--shadow)", borderColor: "#fff", offset: 0.75 },
				{ boxShadow: "0 0 0 rgba(255, 255, 255, 0)", borderColor: "var(--shadow)", offset: 1 },
			],
			{ duration: 1200, easing: "cubic-bezier(.2,.8,.3,1)" },
		);

		overlayAnim.onfinish = () => overlay.remove();
		glowAnim.onfinish = () => {
			slot.style.boxShadow = "";
			slot.style.borderColor = "";
			slot.classList.remove("beam-target");
		};

		return overlay;
	}

	private drawRainbowBeam(startX: number, startY: number, endX: number, endY: number, slotW: number, slotH: number) {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as SVGSVGElement;
		svg.classList.add("progress-rainbow-beam");

		const dx = endX - startX;
		const dy = endY - startY;
		const len = Math.hypot(dx, dy) || 1;
		// perpendicular unit vector, half-width at the slot end covers the whole slot cell
		const nx = -dy / len;
		const ny = dx / len;
		const halfW = Math.max(slotW, slotH) / 2;

		// solid wedge from the cloud (narrow) to the slot (wide), with color bands running
		// lengthwise along the beam (radial, cloud to slot) rather than stacked across its width
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

		// insert before the cloud so it renders underneath within the same stacking context
		this.container.insertBefore(svg as unknown as HTMLElement, this.cloud);

		const anim = svg.animate(
			[
				{ opacity: 0, transform: "scale(0.3)", transformOrigin: `${startX}px ${startY}px` },
				{ opacity: 1, transform: "scale(1)", transformOrigin: `${startX}px ${startY}px`, offset: 0.2 },
				{ opacity: 1, offset: 0.75 },
				{ opacity: 0 },
			],
			{ duration: 1200, easing: "cubic-bezier(.2,.8,.3,1)" },
		);

		anim.onfinish = () => svg.remove();
	}
}
