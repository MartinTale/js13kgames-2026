import "./button.css";
import { el, mount } from "../../helpers/dom";
import { playSound, sounds } from "../../systems/music";
import { burstFromStadium } from "../../systems/confetti";

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

function burst(wrapper: HTMLElement, count: number, sizeScale: number) {
	const svg = wrapper.querySelector("svg.button-confetti") as SVGSVGElement;
	if (!svg) return;

	// layout sizes, not getBoundingClientRect: the svg has no viewBox so its units are
	// unscaled css px, while client rects are scaled by the scaleable container
	const w = wrapper.offsetWidth;
	const h = wrapper.offsetHeight;
	const inset = -parseFloat(getComputedStyle(svg).left);

	burstFromStadium(svg, inset + w / 2, inset + h / 2, w, h, -90, 220, count, sizeScale);
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
			{ transform: "translate(-50%, -50%) scale(.05)", opacity: 0.5 },
			{ transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
		],
		{ duration: 1200, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" },
	);
	anim.onfinish = () => span.remove();
}

export function createButton(
	content: string | HTMLElement | HTMLElement[],
	onClickCallback: (e: any) => void,
	type: ButtonType,
	size: ButtonSize = "md",
	withEffects = false,
	particleCount = 12,
	particleSizeScale = 1,
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
			burst(wrapper, particleCount, particleSizeScale);
			ripple(face, e.clientX, e.clientY);
		}
	};
	face.onclick = (e) => {
		onClickCallback(e);
	};

	return wrapper;
}
