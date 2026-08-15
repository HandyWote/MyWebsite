import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaperFocusLayer } from "./PaperFocusLayer";
import { PaperScreen } from "./PaperScreen";

// Minimal flat quad (any orientation works — the layer only consumes mocked
// layout measurements, never real CSS3D projections).
function quadGeometry(): THREE.BufferGeometry {
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.BufferAttribute(
			new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 10, 0]),
			3,
		),
	);
	geometry.setAttribute(
		"uv",
		new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2),
	);
	return geometry;
}

// What CSS3DRenderer writes into the host's inline style every frame.
const CSS3D_TRANSFORM =
	"translate(-50%,-50%)matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,10,20,30,1)";

const LAYOUT_WIDTH = 624;
const LAYOUT_HEIGHT = 875;

type Rect = { left: number; top: number; width: number; height: number };

function mockRect(element: Element, rect: Rect): void {
	vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
		...rect,
		right: rect.left + rect.width,
		bottom: rect.top + rect.height,
		x: rect.left,
		y: rect.top,
		toJSON: () => ({}),
	} as DOMRect);
}

function mockLayoutSize(element: Element, width: number, height: number): void {
	Object.defineProperty(element, "offsetWidth", {
		configurable: true,
		value: width,
	});
	Object.defineProperty(element, "offsetHeight", {
		configurable: true,
		value: height,
	});
}

function setup() {
	const cssScene = new THREE.Scene();
	const host = document.createElement("div");
	const paperScreen = new PaperScreen(
		cssScene,
		host,
		quadGeometry(),
		new THREE.Matrix4(),
	);
	// Where the CSS3D renderer keeps the host between renders.
	const cssCameraElement = document.createElement("div");
	cssCameraElement.appendChild(host);
	const mount = document.createElement("div");
	document.body.appendChild(mount);
	const getPaperScreen = vi.fn(() => paperScreen);
	const layer = new PaperFocusLayer(mount, getPaperScreen);
	return { cssScene, host, paperScreen, cssCameraElement, mount, layer };
}

afterEach(() => {
	document.body.innerHTML = "";
	vi.restoreAllMocks();
});

describe("PaperFocusLayer", () => {
	it("engages: builds the 2D layer over the projected AABB and takes over the host", () => {
		const { host, paperScreen, cssCameraElement, mount, layer } = setup();
		host.style.transform = CSS3D_TRANSFORM;
		// Mount sits at (20, 10) in the viewport; the projected AABB at
		// (120, 60) → mount-local translate (100, 50), scale 750/875.
		mockRect(mount, { left: 20, top: 10, width: 1200, height: 800 });
		mockRect(host, { left: 120, top: 60, width: 600, height: 750 });
		mockLayoutSize(host, LAYOUT_WIDTH, LAYOUT_HEIGHT);

		layer.engage();

		expect(layer.engaged).toBe(true);
		const layerElement = mount.querySelector<HTMLElement>(
			"[data-paper-focus-layer]",
		);
		expect(layerElement).not.toBeNull();
		expect(layerElement!.style.position).toBe("absolute");
		// Pinned to the mount origin — not the static position after the
		// full-height CSS3D renderer root that shares the mount (e2e caught
		// the paper landing a full viewport too low without this).
		expect(layerElement!.style.top).toBe("0px");
		expect(layerElement!.style.left).toBe("0px");
		expect(layerElement!.style.transformOrigin).toBe("0 0");
		expect(layerElement!.style.width).toBe(`${LAYOUT_WIDTH}px`);
		expect(layerElement!.style.height).toBe(`${LAYOUT_HEIGHT}px`);
		expect(layerElement!.style.pointerEvents).toBe("auto");
		expect(layerElement!.style.zIndex).not.toBe("");
		expect(layerElement!.style.transform).toBe(
			`translate(100px, 50px) scale(${750 / LAYOUT_HEIGHT})`,
		);

		// The host moved out of the CSS3D DOM into the layer; the CSS3D
		// object now drives the placeholder and the host carries no transform.
		expect(host.parentElement).toBe(layerElement);
		expect(host.style.transform).toBe("");
		expect(paperScreen.object.element).not.toBe(host);
		expect(paperScreen.placeholderElement).toBe(paperScreen.object.element);
		expect(cssCameraElement.contains(host)).toBe(false);
	});

	it("releases: restores the CSS3D element + transform snapshot and removes the layer", () => {
		const { host, paperScreen, cssCameraElement, mount, layer } = setup();
		host.style.transform = CSS3D_TRANSFORM;
		mockRect(mount, { left: 0, top: 0, width: 1200, height: 800 });
		mockRect(host, { left: 120, top: 60, width: 600, height: 750 });
		mockLayoutSize(host, LAYOUT_WIDTH, LAYOUT_HEIGHT);

		layer.engage();
		layer.release();
		layer.release(); // idempotent

		expect(layer.engaged).toBe(false);
		// The host returns to its original CSS3D parent with the transform
		// snapshot restored — the projection continues where the 2D layer was.
		expect(paperScreen.object.element).toBe(host);
		expect(host.style.transform).toBe(CSS3D_TRANSFORM);
		expect(host.parentElement).toBe(cssCameraElement);
		expect(paperScreen.placeholderElement).toBeNull();
		expect(mount.querySelector("[data-paper-focus-layer]")).toBeNull();
	});

	it("realigns from the placeholder's re-measured projection while engaged", () => {
		const { host, paperScreen, mount, layer } = setup();
		mockRect(mount, { left: 0, top: 0, width: 1200, height: 800 });
		mockRect(host, { left: 100, top: 50, width: 600, height: 750 });
		mockLayoutSize(host, LAYOUT_WIDTH, LAYOUT_HEIGHT);
		layer.engage();
		const layerElement = mount.querySelector<HTMLElement>(
			"[data-paper-focus-layer]",
		)!;

		// Window resized: the placeholder (still in the CSS3D scene) reports
		// the new projected AABB.
		const placeholder = paperScreen.placeholderElement!;
		mockRect(placeholder, { left: 300, top: 200, width: 500, height: 625 });
		layer.realign();
		expect(layerElement.style.transform).toBe(
			`translate(300px, 200px) scale(${625 / LAYOUT_HEIGHT})`,
		);

		// Not engaged (or degenerate measurement) → no-op, no throw.
		layer.release();
		expect(() => layer.realign()).not.toThrow();
	});

	it("ignores engage without a paper screen or with a degenerate projection", () => {
		const mount = document.createElement("div");
		document.body.appendChild(mount);
		const layer = new PaperFocusLayer(mount, () => null);
		layer.engage();
		expect(layer.engaged).toBe(false);

		const screen = setup();
		mockRect(screen.mount, { left: 0, top: 0, width: 1200, height: 800 });
		mockRect(screen.host, { left: 0, top: 0, width: 0, height: 0 }); // never rendered
		mockLayoutSize(screen.host, LAYOUT_WIDTH, LAYOUT_HEIGHT);
		screen.layer.engage();
		expect(screen.layer.engaged).toBe(false);
		expect(
			screen.mount.querySelector("[data-paper-focus-layer]"),
		).toBeNull();
	});

	it("stays idempotent across repeated engage and destroy", () => {
		const { host, mount, layer } = setup();
		mockRect(mount, { left: 0, top: 0, width: 1200, height: 800 });
		mockRect(host, { left: 100, top: 50, width: 600, height: 750 });
		mockLayoutSize(host, LAYOUT_WIDTH, LAYOUT_HEIGHT);

		layer.engage();
		layer.engage(); // second call must not create another layer
		expect(mount.querySelectorAll("[data-paper-focus-layer]")).toHaveLength(1);

		layer.destroy(); // equivalent to release
		expect(layer.engaged).toBe(false);
		expect(mount.querySelectorAll("[data-paper-focus-layer]")).toHaveLength(0);

		layer.destroy(); // idempotent
		layer.engage(); // dead layer never re-engages
		expect(layer.engaged).toBe(false);
		expect(mount.querySelectorAll("[data-paper-focus-layer]")).toHaveLength(0);
	});
});
