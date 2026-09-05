import "./button.css";
import { el, mount } from "../../helpers/dom";
import { mathRandomInteger } from "../../helpers/numbers";
import { playSound, sounds } from "../../systems/music";

export type ButtonType = "normal" | "primary" | "danger" | "disabled" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export type Button = {
	type: ButtonType;
	content: string | HTMLElement | HTMLElement[];
	onClickCallback: ((e: Event) => void) | null;
	size?: ButtonSize;
};

// button element with a .face property pointing at the inner <button>,
// so callers can still set text / attach tweens to the actual clickable face
export type ButtonElement = HTMLElement & { face: HTMLButtonElement };

const PARTICLE_SHAPES = [
	(r: number) => `<circle r="${r}" fill="currentColor" />`,
	(r: number) => `<circle r="${r * 0.85}" fill="none" stroke="currentColor" stroke-width="1.5" />`,
	(r: number) => `<rect x="${-r}" y="${-r}" width="${r * 2}" height="${r * 2}" fill="currentColor" />`,
	(r: number) =>
		`<rect x="${-r * 0.8}" y="${-r * 0.8}" width="${r * 1.6}" height="${
			r * 1.6
		}" fill="none" stroke="currentColor" stroke-width="1.5" />`,
	(r: number) => `<path d="M${-r} 0H${r}M0 ${-r}V${r}" fill="none" stroke="currentColor" stroke-width="1.5" />`,
	(r: number) =>
		`<path d="M${-r * 0.75} ${-r * 0.75}L${r * 0.75} ${r * 0.75}M${r * 0.75} ${-r * 0.75}L${-r * 0.75} ${
			r * 0.75
		}" fill="none" stroke="currentColor" stroke-width="1.5" />`,
	(r: number) => `<polygon points="0,${-r} ${r},${r * 0.875} ${-r},${r * 0.875}" fill="currentColor" />`,
	(r: number) =>
		`<polygon points="0,${-r * 0.8} ${r * 0.8},${r * 0.7} ${-r * 0.8},${
			r * 0.7
		}" fill="none" stroke="currentColor" stroke-width="1.5" />`,
];

// distance from the center of a w x h stadium/pill (rect with semicircular caps of radius h/2)
// to its outline along a ray at angle `rad`, so burst particles hug the actual pill edge
function stadiumEdgeDistance(rad: number, w: number, h: number): number {
	const r = h / 2;
	const straightHalfWidth = w / 2 - r;
	const dx = Math.cos(rad);
	const dy = Math.sin(rad);

	if (straightHalfWidth <= 0) {
		return r;
	}

	// does the ray exit through the flat top/bottom edge (within the straight section)?
	if (Math.abs(dy) > 1e-6) {
		const tFlat = r / Math.abs(dy);
		const xAtFlat = Math.abs(dx) * tFlat;
		if (xAtFlat <= straightHalfWidth) {
			return tFlat;
		}
	}

	// otherwise it exits through one of the rounded end caps: solve for intersection
	// with a circle of radius r centered at (+-straightHalfWidth, 0)
	const cx = straightHalfWidth * Math.sign(dx || 1);
	const b = -2 * cx * dx;
	const c = cx * cx - r * r;
	const disc = Math.max(0, b * b - 4 * c);
	return (-b + Math.sqrt(disc)) / 2;
}

function burst(wrapper: HTMLElement) {
	const svg = wrapper.querySelector("svg.button-confetti") as SVGSVGElement;
	if (!svg) return;

	// layout sizes, not getBoundingClientRect: the svg has no viewBox so its units are
	// unscaled css px, while client rects are scaled by the scaleable container
	const w = wrapper.offsetWidth;
	const h = wrapper.offsetHeight;
	const cx = w / 2;
	const cy = h / 2;
	const inset = -parseFloat(getComputedStyle(svg).left);
	const offX = inset;
	const offY = inset;

	const count = 12;
	const direction = -90; // burst upward
	const spread = 220;

	for (let i = 0; i < count; i++) {
		const angle = direction - spread / 2 + (i + Math.random()) * (spread / count);
		const rad = (angle * Math.PI) / 180;
		const edgeDist = stadiumEdgeDistance(rad, w, h);
		const startX = offX + cx + Math.cos(rad) * edgeDist;
		const startY = offY + cy + Math.sin(rad) * edgeDist;

		const radius = mathRandomInteger(32, 52);
		const curvature = mathRandomInteger(-10, 14);
		const duration = mathRandomInteger(320, 520);
		const size = mathRandomInteger(10, 15);
		const spins = mathRandomInteger(-75, 75) / 100;
		const shape = PARTICLE_SHAPES[mathRandomInteger(0, PARTICLE_SHAPES.length - 1)];

		const endX = startX + Math.cos(rad) * radius;
		const endY = startY + Math.sin(rad) * radius;
		const midX = (startX + endX) / 2;
		const midY = (startY + endY) / 2;
		const outX = Math.cos(rad);
		const outY = Math.sin(rad);
		const ctrlX = midX - -outY * curvature;
		const ctrlY = midY + outX * curvature;

		const path = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;

		const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
		g.style.color = "var(--color)";
		g.innerHTML = shape(size / 2);
		svg.appendChild(g);

		g.style.offsetPath = `path('${path}')`;
		g.style.offsetRotate = "0deg";

		const anim = g.animate(
			[
				{ offsetDistance: "0%", transform: "rotate(0deg) scale(1)", opacity: 1 },
				{
					offsetDistance: "22%",
					transform: `rotate(${spins * 79.2}deg) scale(.8075)`,
					opacity: 1,
					offset: 0.2,
				},
				{ offsetDistance: "100%", transform: `rotate(${spins * 360}deg) scale(.125)`, opacity: 0 },
			],
			{ duration, easing: "linear", fill: "forwards" },
		);

		anim.onfinish = () => g.remove();
	}
}

function ripple(face: HTMLButtonElement, clientX: number, clientY: number) {
	const rect = face.getBoundingClientRect();
	const scale = rect.width / face.offsetWidth;
	const size = Math.max(face.offsetWidth, face.offsetHeight) * 2;

	const span = el("span.button-ripple");
	span.style.width = `${size}px`;
	span.style.height = `${size}px`;
	span.style.left = `${(clientX - rect.left) / scale}px`;
	span.style.top = `${(clientY - rect.top) / scale}px`;
	mount(face, span);

	const anim = span.animate(
		[
			{ transform: "translate(-50%, -50%) scale(.05)", opacity: 0.75 },
			{ transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
		],
		{ duration: 900, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" },
	);
	anim.onfinish = () => span.remove();
}

export function createButton(
	content: string | HTMLElement | HTMLElement[],
	onClickCallback: (e: any) => void,
	type: ButtonType,
	size: ButtonSize = "md",
	withEffects = false,
): ButtonElement {
	const face = el("button." + type + "." + size) as HTMLButtonElement;
	if (typeof content === "string") {
		face.textContent = content;
	} else if (Array.isArray(content)) {
		content.forEach((item) => mount(face, item));
	} else if (content != null) {
		mount(face, content);
	}

	const depth = el("span.button-depth");
	const children: HTMLElement[] = [depth];

	if (withEffects) {
		const confetti = document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as HTMLElement;
		confetti.classList.add("button-confetti");
		children.push(confetti);
	}

	children.push(face);

	const wrapper = el("span.button-wrap." + type, children) as ButtonElement;
	wrapper.face = face;

	face.onpointerdown = (e) => {
		playSound(sounds.tap);
		if (withEffects) {
			burst(wrapper);
			ripple(face, e.clientX, e.clientY);
		}
	};
	face.onclick = (e) => {
		onClickCallback(e);
	};

	return wrapper;
}
