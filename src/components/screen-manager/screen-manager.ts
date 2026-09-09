import "./screen-manager.css";
import { el, mount } from "../../helpers/dom";

const FADE_MS = 300;

export class ScreenManager {
	container: HTMLElement;
	private screens = new Map<string, HTMLElement>();
	private current: string | null = null;

	constructor(parent: HTMLElement) {
		this.container = el("div.screen-manager");
		mount(parent, this.container);
	}

	register(name: string, screen: HTMLElement) {
		screen.classList.add("screen");
		mount(this.container, screen);
		this.screens.set(name, screen);
	}

	// crossfades to the named screen; resolves once the incoming screen is fully visible
	show(name: string): Promise<void> {
		const next = this.screens.get(name);
		if (!next) return Promise.resolve();

		const prev = this.current ? this.screens.get(this.current) : null;
		this.current = name;

		return new Promise((resolve) => {
			if (prev && prev !== next) {
				prev.classList.remove("screen-active");
			}

			if (!prev || prev === next) {
				next.classList.add("screen-active");
				setTimeout(resolve, FADE_MS);
				return;
			}

			setTimeout(() => {
				next.classList.add("screen-active");
				setTimeout(resolve, FADE_MS);
			}, FADE_MS);
		});
	}
}
