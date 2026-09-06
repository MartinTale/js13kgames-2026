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
		this.cloud.animate(
			[
				{ transform: "translate(50%, -50%) scale(1) rotate(0deg)" },
				{ transform: "translate(50%, -50%) scale(1.5) rotate(-18deg)", offset: 0.35 },
				{ transform: "translate(50%, -50%) scale(1) rotate(0deg)" },
			],
			{ duration: 500, easing: "cubic-bezier(.34,1.56,.64,1)" },
		);

		this.spawnItemAtNextSlot();
	}

	private spawnItemAtNextSlot() {
		const slot = this.slots[this.filledCount % this.slots.length];
		this.filledCount++;

		const item = ITEMS[mathRandomInteger(0, ITEMS.length - 1)];

		const cloudRect = this.cloud.getBoundingClientRect();
		const slotRect = slot.getBoundingClientRect();

		const startX = cloudRect.left + cloudRect.width / 2;
		const startY = cloudRect.top + cloudRect.height / 2;
		const endX = slotRect.left + slotRect.width / 2;
		const endY = slotRect.top + slotRect.height / 2;

		const trail = el("div.progress-item-trail", item);
		trail.style.left = "0";
		trail.style.top = "0";
		mount(document.body, trail);

		const midX = (startX + endX) / 2;
		const midY = Math.min(startY, endY) - 60;

		const path = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
		trail.style.offsetPath = `path('${path}')`;
		trail.style.offsetRotate = "0deg";

		this.drawRainbowArc(path, startX, startY, endX, endY);

		const rainbowGlow = (color: string) =>
			RAINBOW.map((c, i) => `0 0 ${10 + i * 4}px ${i === 0 ? color : c}`).join(", ");

		const colorFrames = RAINBOW.map((color, i) => ({
			offsetDistance: `${(i / (RAINBOW.length - 1)) * 100}%`,
			filter: `drop-shadow(${rainbowGlow(color)})`,
			transform: i === 0 ? "scale(0.8)" : i === RAINBOW.length - 1 ? "scale(1.6)" : "scale(1.3)",
			opacity: 1,
		}));

		const anim = trail.animate(colorFrames, {
			duration: 1400,
			easing: "cubic-bezier(.34,1.2,.64,1)",
			fill: "forwards",
		});

		anim.onfinish = () => {
			trail.remove();
			slot.textContent = item;
			slot.classList.add("filled");
		};
	}

	private drawRainbowArc(path: string, startX: number, startY: number, endX: number, endY: number) {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as SVGSVGElement;
		svg.classList.add("progress-rainbow-arc");
		svg.setAttribute("width", `${window.innerWidth}`);
		svg.setAttribute("height", `${window.innerHeight}`);

		const stripeGap = 4;
		RAINBOW.forEach((color, i) => {
			const offset = (i - (RAINBOW.length - 1) / 2) * stripeGap;
			const nx = -(endY - startY);
			const ny = endX - startX;
			const len = Math.hypot(nx, ny) || 1;
			const ox = (nx / len) * offset;
			const oy = (ny / len) * offset;

			const stripe = document.createElementNS("http://www.w3.org/2000/svg", "path");
			stripe.setAttribute("d", path.replace(/M ([\d.-]+) ([\d.-]+) Q ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)/, (_m, mx, my, qx, qy, ex, ey) =>
				`M ${+mx + ox} ${+my + oy} Q ${+qx + ox} ${+qy + oy} ${+ex + ox} ${+ey + oy}`,
			));
			stripe.setAttribute("fill", "none");
			stripe.setAttribute("stroke", color);
			stripe.setAttribute("stroke-width", "3");
			stripe.setAttribute("stroke-linecap", "round");
			svg.appendChild(stripe);
		});

		mount(document.body, svg as unknown as HTMLElement);

		const anim = svg.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.15 }, { opacity: 0.9, offset: 0.7 }, { opacity: 0 }], {
			duration: 1400,
			easing: "ease-out",
		});

		anim.onfinish = () => svg.remove();
	}
}
