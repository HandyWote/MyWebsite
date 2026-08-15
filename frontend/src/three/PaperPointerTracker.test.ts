import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Camera } from "./Camera";
import { PaperPointerTracker } from "./PaperPointerTracker";

const RECT = {
	left: 0,
	top: 0,
	width: 100,
	height: 100,
	right: 100,
	bottom: 100,
	x: 0,
	y: 0,
	toJSON: () => ({}),
} as DOMRect;

function setup() {
	const host = document.createElement("div");
	const canvas = document.createElement("canvas");
	canvas.getBoundingClientRect = () => RECT;
	document.body.appendChild(host);
	document.body.appendChild(canvas);

	// Camera directly above a flat paper lying at y = -10 (world center 0,0,0).
	const camera = new THREE.PerspectiveCamera(35, 1, 1, 100000);
	camera.position.set(0, 100, 0);
	camera.lookAt(0, 0, 0);
	camera.updateProjectionMatrix();
	camera.updateMatrixWorld(true);

	const paper = new THREE.Mesh(new THREE.PlaneGeometry(40, 40));
	paper.rotateX(-Math.PI / 2);
	paper.position.set(0, -10, 0);
	paper.updateMatrixWorld(true);

	const cameraMock = {
		instance: camera,
		enterPaper: vi.fn(),
		toggleDeskView: vi.fn(),
	} as unknown as Camera;

	const tracker = new PaperPointerTracker(
		document,
		host,
		canvas,
		cameraMock,
		() => paper,
	);
	tracker.start();
	return { tracker, host, canvas, paper, cameraMock };
}

function cleanup(tracker: PaperPointerTracker) {
	tracker.destroy();
	document.body.replaceChildren();
}

afterEach(() => {
	document.body.replaceChildren();
});

describe("PaperPointerTracker", () => {
	it("enters the paper view exactly once while hovering and re-enters after leaving", () => {
		const { tracker, canvas, cameraMock } = setup();

		canvas.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: 50,
				clientY: 50,
			}),
		);
		canvas.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: 50,
				clientY: 50,
			}),
		);
		expect(cameraMock.enterPaper).toHaveBeenCalledTimes(1);

		// Top-left corner of the view misses the paper entirely.
		canvas.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: 0,
				clientY: 0,
			}),
		);
		expect(cameraMock.enterPaper).toHaveBeenCalledTimes(1);

		canvas.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: 50,
				clientY: 50,
			}),
		);
		expect(cameraMock.enterPaper).toHaveBeenCalledTimes(2);
		cleanup(tracker);
	});

	it("swallows pointerdown on the paper so later listeners never fire", () => {
		const { tracker, canvas, cameraMock } = setup();
		const later = vi.fn();
		document.addEventListener("pointerdown", later);

		canvas.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: 50,
				clientY: 50,
			}),
		);
		canvas.dispatchEvent(
			new PointerEvent("pointerdown", {
				bubbles: true,
				clientX: 50,
				clientY: 50,
			}),
		);

		expect(later).not.toHaveBeenCalled();
		expect(cameraMock.toggleDeskView).not.toHaveBeenCalled();

		document.removeEventListener("pointerdown", later);
		cleanup(tracker);
	});

	it("leaves clicks outside the paper to the monitor tracker", () => {
		const { tracker, canvas, cameraMock } = setup();
		const later = vi.fn();
		document.addEventListener("pointerdown", later);

		canvas.dispatchEvent(
			new PointerEvent("pointerdown", {
				bubbles: true,
				clientX: 0,
				clientY: 0,
			}),
		);

		expect(later).toHaveBeenCalledTimes(1);
		expect(cameraMock.toggleDeskView).not.toHaveBeenCalled();

		document.removeEventListener("pointerdown", later);
		cleanup(tracker);
	});

	it("swallows pointerdown inside the paper host so game clicks never toggle the desk view", () => {
		const { tracker, host, cameraMock } = setup();
		const later = vi.fn();
		document.addEventListener("pointerdown", later);
		const inside = document.createElement("div");
		host.appendChild(inside);

		inside.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: 50,
				clientY: 50,
			}),
		);
		inside.dispatchEvent(
			new PointerEvent("pointerdown", {
				bubbles: true,
				clientX: 50,
				clientY: 50,
			}),
		);

		expect(cameraMock.enterPaper).not.toHaveBeenCalled();
		// 旧行为：host 内点击会漏给 monitor tracker 触发 toggleDeskView，
		// 导致每次在画板起笔相机就切视角；现在一并吞掉。
		expect(later).not.toHaveBeenCalled();

		document.removeEventListener("pointerdown", later);
		cleanup(tracker);
	});

	it("degrades safely without a paper mesh", () => {
		const host = document.createElement("div");
		const canvas = document.createElement("canvas");
		canvas.getBoundingClientRect = () => RECT;
		document.body.appendChild(canvas);
		const cameraMock = {
			instance: new THREE.PerspectiveCamera(),
			enterPaper: vi.fn(),
		} as unknown as Camera;
		const tracker = new PaperPointerTracker(
			document,
			host,
			canvas,
			cameraMock,
			() => null,
		);
		tracker.start();

		canvas.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: 50,
				clientY: 50,
			}),
		);

		expect(cameraMock.enterPaper).not.toHaveBeenCalled();
		cleanup(tracker);
	});

	it("removes its document listeners on destroy", () => {
		const { tracker, canvas, cameraMock } = setup();
		cleanup(tracker);

		canvas.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: 50,
				clientY: 50,
			}),
		);
		expect(cameraMock.enterPaper).not.toHaveBeenCalled();
	});
});
