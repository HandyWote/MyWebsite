import { Easing, Group, Tween } from "@tweenjs/tween.js";
import BezierEasing from "bezier-easing";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
	createCameraKeyframes,
	PAPER_VIEW_DISTANCE,
	PAPER_VIEW_TILT,
	type CameraKey,
} from "./CameraKeyframes";
import type { Mouse } from "./Mouse";
import type { Sizes } from "./Sizes";
import type { Time } from "./Time";

export class Camera {
	readonly instance: THREE.PerspectiveCamera;
	private readonly position = new THREE.Vector3();
	private readonly focalPoint = new THREE.Vector3();
	private readonly up = new THREE.Vector3(0, 1, 0);
	private readonly keyframes;
	private controls: OrbitControls | null = null;
	private positionTween: Tween<THREE.Vector3> | null = null;
	private focalPointTween: Tween<THREE.Vector3> | null = null;
	private upTween: Tween<THREE.Vector3> | null = null;
	private current: CameraKey | null = "loading";
	private target: CameraKey | null = null;
	private destroyed = false;

	constructor(
		scene: THREE.Scene,
		private readonly sizes: Sizes,
		mouse: Mouse,
		time: Time,
		private readonly tweens: Group,
	) {
		this.keyframes = createCameraKeyframes(sizes, mouse, time);
		this.instance = new THREE.PerspectiveCamera(
			35,
			sizes.width / sizes.height,
			10,
			900000,
		);
		this.position.copy(this.keyframes.loading.position);
		this.focalPoint.copy(this.keyframes.loading.focalPoint);
		this.instance.position.copy(this.position);
		this.instance.lookAt(this.focalPoint);
		scene.add(this.instance);
	}

	createControls(element: HTMLElement): void {
		if (this.controls || this.destroyed) return;
		this.controls = new OrbitControls(this.instance, element);
		const start = this.keyframes.orbitControlsStart;
		this.controls.target.copy(start.focalPoint);
		this.controls.enablePan = false;
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;
		this.controls.maxPolarAngle = Math.PI / 2;
		this.controls.minDistance = 4000;
		this.controls.maxDistance = 29000;
		this.controls.update();
	}

	transition(
		key: CameraKey,
		duration = 1000,
		easing: (amount: number) => number = Easing.Quintic.InOut,
	): void {
		if (this.destroyed || this.current === key || this.target === key) return;
		this.stopTransitionTweens();
		this.current = null;
		this.target = key;
		const destination = this.keyframes[key];

		this.positionTween = new Tween(this.position, this.tweens)
			.to(destination.position, duration)
			.easing(easing)
			.onComplete(() => {
				this.current = key;
				this.target = null;
				this.positionTween = null;
			})
			.start();
		this.focalPointTween = new Tween(this.focalPoint, this.tweens)
			.to(destination.focalPoint, duration)
			.easing(easing)
			.onComplete(() => {
				this.focalPointTween = null;
			})
			.start();
		this.upTween = new Tween(this.up, this.tweens)
			.to(
				{ x: destination.up.x, y: destination.up.y, z: destination.up.z },
				duration,
			)
			.easing(easing)
			.onUpdate(() => {
				// lerp between unit vectors shrinks the length; keep it a direction.
				this.up.normalize();
			})
			.onComplete(() => {
				this.upTween = null;
			})
			.start();
	}

	enterMonitor(): void {
		this.transition("monitor", 2000, BezierEasing(0.13, 0.99, 0, 1));
	}

	enterPaper(): void {
		// Quintic.InOut spreads the flight evenly over the full 2s so the
		// approach stays visible (Bezier(0.13, 0.99, 0, 1) front-loads the
		// movement and reads as a much shorter animation); position, focus and
		// roll also arrive together, removing the trailing rotation feel.
		this.transition("paper", 1000, Easing.Quintic.InOut);
	}

	// Refines the paper keyframe to the loaded model's actual paper center and
	// content direction (World calls this when the decor model arrives; defaults
	// cover the baked GLB geometry until then). contentUp is the world-space
	// direction of the paper's printed content "up" edge; projecting it onto
	// the view plane yields the roll (up vector) that makes the paper stand
	// upright on screen.
	setPaperTarget(center: THREE.Vector3, contentUp: THREE.Vector3): void {
		const frame = this.keyframes.paper;
		frame.focalPoint.copy(center);
		frame.position
			.copy(center)
			.add(PAPER_VIEW_TILT)
			.add(new THREE.Vector3(0, PAPER_VIEW_DISTANCE, 0));

		// up = contentUp projected onto the plane perpendicular to the view
		// direction; falls back to world z when the projection degenerates.
		const view = frame.position.clone().sub(frame.focalPoint).normalize();
		const projected = contentUp
			.clone()
			.sub(view.clone().multiplyScalar(contentUp.dot(view)));
		frame.up.copy(
			projected.lengthSq() > 1e-8
				? projected.normalize()
				: new THREE.Vector3(0, 0, 1),
		);
	}

	toggleDeskView(): void {
		if (this.current === "desk" || this.target === "desk")
			this.transition("idle");
		else this.transition("desk");
	}

	private stopTransitionTweens(): void {
		this.positionTween?.stop();
		this.focalPointTween?.stop();
		this.upTween?.stop();
		this.positionTween = null;
		this.focalPointTween = null;
		this.upTween = null;
	}

	resize(): void {
		this.instance.aspect = this.sizes.width / this.sizes.height;
		this.instance.updateProjectionMatrix();
	}

	update(): void {
		if (this.destroyed) return;
		for (const frame of Object.values(this.keyframes)) frame.update();
		if (this.current) {
			this.position.copy(this.keyframes[this.current].position);
			this.focalPoint.copy(this.keyframes[this.current].focalPoint);
			this.up.copy(this.keyframes[this.current].up);
		}
		this.instance.position.copy(this.position);
		this.instance.up.copy(this.up);
		this.instance.lookAt(this.focalPoint);
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		this.stopTransitionTweens();
		this.controls?.dispose();
		this.controls = null;
	}
}
