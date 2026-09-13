import { js13kViteConfig } from "js13k-vite-plugins";
import { defineConfig } from "vite";

// @ts-ignore
export default defineConfig(() => {
	return js13kViteConfig({
		roadrollerOptions: false,
		viteOptions: { minify: false },
	});
});
