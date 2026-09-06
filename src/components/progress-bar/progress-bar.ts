import "./progress-bar.css";
import { el, mount, svgEl } from "../../helpers/dom";
import { burstFromStadium } from "../../systems/confetti";
import { mathRandomInteger } from "../../helpers/numbers";

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

		burstFromStadium(this.fx, x, y, 0, h, -90, 300, 20);

		this.cloud.style.setProperty("--cloud-progress-scale", "1");
		// grows and holds large while the rainbow beam plays (beam starts at 500ms, runs 1200ms),
		// then shrinks back down to its resting size
		this.cloud.animate(
			[
				{ transform: "translate(50%, -50%) scale(1) rotate(0deg)" },
				{ transform: "translate(50%, -50%) scale(1.5) rotate(-18deg)", offset: 0.2 },
				{ transform: "translate(50%, -50%) scale(1.4) rotate(-10deg)", offset: 0.85 },
				{ transform: "translate(50%, -50%) scale(1) rotate(0deg)" },
			],
			{ duration: 1700, easing: "cubic-bezier(.34,1.2,.64,1)" },
		);

		setTimeout(() => this.spawnItemAtNextSlot(), 500);
	}

	private spawnItemAtNextSlot() {
		const slot = this.slots[this.filledCount % this.slots.length];
		this.filledCount++;

		const item = ITEMS[mathRandomInteger(0, ITEMS.length - 1)];

		const cloudRect = this.cloud.getBoundingClientRect();
		const slotRect = slot.getBoundingClientRect();
		const originRect = this.container.getBoundingClientRect();

		const startX = cloudRect.left + cloudRect.width / 2 - originRect.left;
		const startY = cloudRect.top + cloudRect.height / 2 - originRect.top;
		const endX = slotRect.left + slotRect.width / 2 - originRect.left;
		const endY = slotRect.top + slotRect.height / 2 - originRect.top;

		this.drawRainbowBeam(startX, startY, endX, endY, slotRect.width, slotRect.height);

		const overlay = el("div.inventory-slot-overlay");
		overlay.style.background = `conic-gradient(${RAINBOW.join(", ")})`;
		mount(slot, overlay);

		slot.classList.add("burning");
		setTimeout(() => {
			mount(slot, el("span.inventory-slot-item", item));
		}, 220);
		setTimeout(() => {
			slot.classList.remove("burning");
			overlay.remove();
		}, 1200);
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

		// each rainbow color is drawn as its own line from the cloud to its own point along
		// the slot's edge, fanning out into a bundle of parallel-ish beams instead of a solid wedge
		RAINBOW.forEach((color, i) => {
			const t = RAINBOW.length === 1 ? 0 : i / (RAINBOW.length - 1) - 0.5;
			const lineEndX = endX + nx * halfW * t;
			const lineEndY = endY + ny * halfW * t;

			const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
			line.setAttribute("x1", `${startX}`);
			line.setAttribute("y1", `${startY}`);
			line.setAttribute("x2", `${lineEndX}`);
			line.setAttribute("y2", `${lineEndY}`);
			line.setAttribute("stroke", color);
			line.setAttribute("stroke-width", "2.5");
			line.setAttribute("stroke-linecap", "round");
			svg.appendChild(line);
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
