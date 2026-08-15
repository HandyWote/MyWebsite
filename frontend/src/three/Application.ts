import { Group } from "@tweenjs/tween.js";
import * as THREE from "three";
import { Camera } from "./Camera";
import { disposeObject } from "./dispose";
import { MonitorPointerTracker } from "./MonitorPointerTracker";
import { Mouse } from "./Mouse";
import { PaperPointerTracker } from "./PaperPointerTracker";
import { Renderer } from "./Renderer";
import { createBrowserResourceLoader, Resources } from "./Resources";
import { Sizes } from "./Sizes";
import { sources } from "./sources";
import { Time } from "./Time";
import type { ThreeExperience, ThreeExperienceOptions } from "./types";
import { World } from "./World";

// r152+ defaults to color-managed rendering, which changes every material and
// baked-texture color vs the pre-upgrade r137 visuals (sRGB design values were
// previously treated as linear and re-encoded, brightening the scene). Keep the
// legacy pipeline so the upgrade is pixel-identical to the shipped experience.
THREE.ColorManagement.enabled = false;

export class Application implements ThreeExperience {
	private readonly scene = new THREE.Scene();
	private readonly cssScene = new THREE.Scene();
	private readonly paperCssScene = new THREE.Scene();
	private readonly tweens = new Group();
	private readonly sizes = new Sizes();
	private readonly mouse = new Mouse();
	private readonly time = new Time();
	private readonly resources = new Resources(
		sources,
		createBrowserResourceLoader(),
	);
	private readonly camera: Camera;
	private readonly renderer: Renderer;
	private readonly world: World;
	private readonly pointerTracker: MonitorPointerTracker;
	private readonly paperPointerTracker: PaperPointerTracker;
	private readonly unsubscribeResize: () => void;
	private readonly unsubscribeTick: () => void;
	private started = false;
	private destroyed = false;

	constructor(options: ThreeExperienceOptions) {
		this.camera = new Camera(
			this.scene,
			this.sizes,
			this.mouse,
			this.time,
			this.tweens,
		);
		this.renderer = new Renderer(
			options.webglMount,
			options.cssMount,
			options.paperMount,
			this.sizes,
		);
		this.camera.createControls(this.renderer.webgl.domElement);
		this.world = new World(
			this.scene,
			this.cssScene,
			this.paperCssScene,
			this.resources,
			this.camera,
			this.tweens,
			options.screenHost,
			options.paperHost,
			options.parkingNode,
			options.onComputerError,
			options.onComputerReady,
		);
		this.pointerTracker = new MonitorPointerTracker(
			document,
			options.screenHost,
			this.camera,
			this.mouse,
		);
		this.paperPointerTracker = new PaperPointerTracker(
			document,
			options.screenHost,
			options.paperHost,
			this.renderer.webgl.domElement,
			this.camera,
			() => this.world.getPaperMesh(),
		);
		this.unsubscribeResize = this.sizes.onChange(() => this.resize());
		this.unsubscribeTick = this.time.onTick(() => this.update());
	}

	start(): void {
		if (this.started || this.destroyed) return;
		this.started = true;
		// Paper must be registered first: it swallows clicks on the paper via
		// stopImmediatePropagation so the monitor tracker never sees them.
		this.paperPointerTracker.start();
		this.pointerTracker.start();
		this.time.start();
		// World is fully subscribed before any request can settle.
		this.resources.start();
	}

	retryComputer(): void {
		if (!this.destroyed) this.resources.retryComputer();
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;

		// World parks the real ScreenHost before renderer/CSS scene teardown.
		this.world.destroy();
		this.resources.destroy();
		this.unsubscribeTick();
		this.time.stop();
		this.paperPointerTracker.destroy();
		this.pointerTracker.destroy();
		this.unsubscribeResize();
		this.camera.destroy();
		this.tweens.removeAll();
		disposeObject(this.scene);
		this.scene.clear();
		this.cssScene.clear();
		disposeObject(this.paperCssScene);
		this.paperCssScene.clear();
		this.renderer.destroy();
		this.sizes.destroy();
	}

	private resize(): void {
		if (this.destroyed) return;
		this.camera.resize();
		this.renderer.resize();
	}

	private update(): void {
		if (this.destroyed) return;
		this.tweens.update();
		this.camera.update();
		this.world.update();
		this.renderer.render(this.scene, this.cssScene, this.paperCssScene, this.camera);
	}
}
