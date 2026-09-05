import "./progress-bar.css";
import { el, mount, svgEl } from "../../helpers/dom";
import { burstFromStadium } from "../../systems/confetti";

const CLOUD_SVG =
	'<svg viewBox="0 0 32 20" xmlns="http://www.w3.org/2000/svg">' +
	'<path d="M8 16C4 16 2 13.5 2 11C2 8.5 4 6.5 6.5 6.5C7 3.5 9.5 1 13 1C16.5 1 19 3.2 19.7 6.2C20 6.1 20.4 6 20.8 6C24.3 6 27 8.6 27 11.8C27 15 24.3 17 20.8 17" fill="[fill]" stroke="none" />' +
	"</svg>";

export class ProgressBar {
	container: HTMLElement;
	track: HTMLElement;
	progress: HTMLElement;
	fx: SVGSVGElement;
	cloud: HTMLElement;

	constructor(
		parent: HTMLElement,
		public min: number,
		public max: number,
		public value: number,
	) {
		this.progress = el("div.progress");
		this.track = el("div.progress-track", this.progress);
		this.fx = document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as SVGSVGElement;
		this.fx.classList.add("progress-fx");
		this.cloud = svgEl(CLOUD_SVG.replace("[fill]", "#fff"));
		this.cloud.classList.add("progress-cloud");

		this.container = el("div.progress-bar", [this.track, this.fx as unknown as HTMLElement, this.cloud]);

		this.setValue(value);

		mount(parent, this.container);
	}

	getProgress() {
		return Math.min(100, Math.max(0, ((this.value - this.min) / (this.max - this.min)) * 100));
	}

	setValue(value: number) {
		this.value = value;
		const to = this.getProgress();

		this.progress.style.width = `${to}%`;

		if (to >= 100) {
			this.cloudBurst();
		}
	}

	private cloudBurst() {
		const w = this.container.offsetWidth;
		const h = this.container.offsetHeight;
		const inset = -parseFloat(getComputedStyle(this.fx).left);
		const x = inset + w + 10;
		const y = inset + h / 2;

		burstFromStadium(this.fx, x, y, 0, h, -90, 300, 20);

		this.cloud.animate(
			[
				{ transform: "translate(50%, -50%) scale(1)" },
				{ transform: "translate(50%, -50%) scale(1.35)", offset: 0.35 },
				{ transform: "translate(50%, -50%) scale(1)" },
			],
			{ duration: 420, easing: "cubic-bezier(.34,1.56,.64,1)" },
		);
	}
}
