import { mathRandomInteger } from "../helpers/numbers";
import { colors } from "../helpers/colors";

// 5-point star polygon centered on origin
function starPoints(r: number): string {
	const points: string[] = [];
	for (let i = 0; i < 10; i++) {
		const rad = (Math.PI / 5) * i - Math.PI / 2;
		const rr = i % 2 === 0 ? r : r * 0.4;
		points.push(`${Math.cos(rad) * rr},${Math.sin(rad) * rr}`);
	}
	return points.join(" ");
}

export const PARTICLE_SHAPES = [
	(r: number) => `<circle r="${r}" fill="currentColor" />`,
	// 4-point sparkle/diamond
	(r: number) => `<polygon points="0,${-r} ${r * 0.35},${-r * 0.35} ${r},0 ${r * 0.35},${r * 0.35} 0,${r} ${
		-r * 0.35
	},${r * 0.35} ${-r},0 ${-r * 0.35},${-r * 0.35}" fill="currentColor" />`,
	// 5-point star
	(r: number) => `<polygon points="${starPoints(r)}" fill="currentColor" />`,
	// heart
	(r: number) =>
		`<path d="M0 ${r * 0.75}C${-r * 1.3} ${-r * 0.2} ${-r * 0.5} ${-r * 1.1} 0 ${-r * 0.35}C${r * 0.5} ${
			-r * 1.1
		} ${r * 1.3} ${-r * 0.2} 0 ${r * 0.75}Z" fill="currentColor" />`,
	// crescent moon
	(r: number) =>
		`<path d="M${r * 0.5} ${-r}A${r} ${r} 0 1 0 ${r * 0.5} ${r}A${r * 0.7} ${r * 0.7} 0 1 1 ${r * 0.5} ${
			-r
		}Z" fill="currentColor" />`,
	// rainbow arc (three nested stripes)
	(r: number) =>
		`<path d="M${-r} ${r * 0.2}A${r} ${r} 0 0 1 ${r} ${r * 0.2}" fill="none" stroke="currentColor" stroke-width="${
			r * 0.28
		}" stroke-linecap="round" />`,
];

// spawns one particle at (x, y) inside svg, flying outward along `angleDeg`
export function spawnParticle(svg: SVGSVGElement, x: number, y: number, angleDeg: number, sizeScale = 1) {
	const rad = (angleDeg * Math.PI) / 180;

	const radius = mathRandomInteger(32, 52);
	const curvature = mathRandomInteger(-10, 14);
	const duration = mathRandomInteger(320, 520);
	const size = mathRandomInteger(14, 20) * sizeScale;
	const spins = mathRandomInteger(-75, 75) / 100;
	const shape = PARTICLE_SHAPES[mathRandomInteger(0, PARTICLE_SHAPES.length - 1)];

	const endX = x + Math.cos(rad) * radius;
	const endY = y + Math.sin(rad) * radius;
	const midX = (x + endX) / 2;
	const midY = (y + endY) / 2;
	const outX = Math.cos(rad);
	const outY = Math.sin(rad);
	const ctrlX = midX - -outY * curvature;
	const ctrlY = midY + outX * curvature;

	const path = `M ${x} ${y} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;

	const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
	g.style.color = colors[mathRandomInteger(0, colors.length - 1)];
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

// distance from the center of a w x h stadium/pill (rect with semicircular caps of radius h/2)
// to its outline along a ray at angle `rad`, so burst particles hug the actual pill edge
export function stadiumEdgeDistance(rad: number, w: number, h: number): number {
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

// fires a burst of particles from the edge of a w x h stadium/pill shape,
// centered at (originX, originY) in svg coordinates
export function burstFromStadium(
	svg: SVGSVGElement,
	originX: number,
	originY: number,
	w: number,
	h: number,
	direction: number,
	spread: number,
	count = 12,
	sizeScale = 1,
) {
	for (let i = 0; i < count; i++) {
		const angle = direction - spread / 2 + (i + Math.random()) * (spread / count);
		const rad = (angle * Math.PI) / 180;
		const edgeDist = stadiumEdgeDistance(rad, w, h);
		const startX = originX + Math.cos(rad) * edgeDist;
		const startY = originY + Math.sin(rad) * edgeDist;

		spawnParticle(svg, startX, startY, angle, sizeScale);
	}
}
