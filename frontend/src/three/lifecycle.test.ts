import { Group, Tween } from "@tweenjs/tween.js";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { Camera } from "./Camera";
import { MonitorPointerTracker } from "./MonitorPointerTracker";
import { Mouse } from "./Mouse";
import { Sizes } from "./Sizes";
import { Time, type AnimationScheduler } from "./Time";

describe("runtime lifecycle services", () => {
	it("cancels the active RAF and does not schedule another frame after stop", () => {
		let frameCallback: FrameRequestCallback | undefined;
		const scheduler: AnimationScheduler = {
			request: vi.fn((callback) => {
				frameCallback = callback;
				return 42;
			}),
			cancel: vi.fn(),
			now: vi.fn(() => 10),
		};
		const time = new Time(scheduler);
		const tick = vi.fn();
		time.onTick(tick);
		time.start();
		time.stop();
		frameCallback?.(20);

		expect(scheduler.cancel).toHaveBeenCalledWith(42);
		expect(tick).not.toHaveBeenCalled();
		expect(scheduler.request).toHaveBeenCalledTimes(1);
	});

	it("keeps non-camera tweens when replacing a camera transition", () => {
		const group = new Group();
		const foreignState = { opacity: 0 };
		const foreignTween = new Tween(foreignState, group)
			.to({ opacity: 1 }, 500)
			.start(0);
		const sizes = new Sizes(window);
		const camera = new Camera(
			new THREE.Scene(),
			sizes,
			new Mouse(),
			new Time(),
			group,
		);

		camera.transition("desk", 100);
		camera.transition("idle", 100);

		expect(group.getAll()).toContain(foreignTween);
		camera.destroy();
		sizes.destroy();
	});

	it("removes its resize listener idempotently", () => {
		const add = vi.spyOn(window, "addEventListener");
		const remove = vi.spyOn(window, "removeEventListener");
		const sizes = new Sizes(window);
		sizes.destroy();
		sizes.destroy();

		const resizeListener = add.mock.calls.find(
			([name]) => name === "resize",
		)?.[1];
		expect(resizeListener).toBeDefined();
		expect(remove).toHaveBeenCalledWith("resize", resizeListener);
	});

	it("orients the paper view so the paper content stands upright", () => {
		const group = new Group();
		const sizes = new Sizes(window);
		const camera = new Camera(
			new THREE.Scene(),
			sizes,
			new Mouse(),
			new Time(),
			group,
		);
		const center = new THREE.Vector3(-2063.7, -444.6, 986.4);
		const contentUp = new THREE.Vector3(0.568, 0, 0.789).normalize();
		camera.setPaperTarget(center, contentUp);

		const paper = (
			camera as unknown as {
				keyframes: {
					paper: {
						position: THREE.Vector3;
						focalPoint: THREE.Vector3;
						up: THREE.Vector3;
					};
				};
			}
		).keyframes.paper;

		// Camera sits above the paper and looks straight down at its center.
		expect(paper.focalPoint).toEqual(center);
		expect(paper.position.distanceTo(center)).toBeGreaterThan(1500);
		// The view direction must stay away from the degenerate up-parallel case.
		const view = paper.position.clone().sub(paper.focalPoint).normalize();
		expect(Math.abs(paper.up.dot(view))).toBeLessThan(1e-4);

		// With the camera applied, the content-up direction must be exactly
		// vertical on screen: no component along the camera's local x axis.
		camera.instance.position.copy(paper.position);
		camera.instance.up.copy(paper.up);
		camera.instance.lookAt(paper.focalPoint);
		camera.instance.updateMatrixWorld(true);
		const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
			camera.instance.quaternion,
		);
		expect(contentUp.dot(right)).toBeCloseTo(0, 6);
		camera.destroy();
		sizes.destroy();
	});

	it("ignores scene pointer actions inside the host and removes document listeners", () => {
		const host = document.createElement("div");
		const link = document.createElement("a");
		host.appendChild(link);
		document.body.appendChild(host);
		const camera = {
			enterMonitor: vi.fn(),
			toggleDeskView: vi.fn(),
		} as unknown as Camera;
		const tracker = new MonitorPointerTracker(
			document,
			host,
			camera,
			new Mouse(),
		);
		tracker.start();

		link.dispatchEvent(
			new PointerEvent("pointerdown", {
				bubbles: true,
				clientX: 12,
				clientY: 16,
			}),
		);
		expect(camera.toggleDeskView).not.toHaveBeenCalled();
		document.body.dispatchEvent(
			new PointerEvent("pointerdown", {
				bubbles: true,
				clientX: 20,
				clientY: 30,
			}),
		);
		expect(camera.toggleDeskView).toHaveBeenCalledTimes(1);

		tracker.destroy();
		tracker.destroy();
		document.body.dispatchEvent(
			new PointerEvent("pointerdown", { bubbles: true }),
		);
		expect(camera.toggleDeskView).toHaveBeenCalledTimes(1);
	});
});
