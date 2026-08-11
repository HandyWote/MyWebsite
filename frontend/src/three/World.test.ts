import { Group } from "@tweenjs/tween.js";
import * as THREE from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { describe, expect, it, vi } from "vitest";
import type { Camera } from "./Camera";
import { Resources } from "./Resources";
import type { LoadedModel, ResourceLoader, ResourceSource } from "./types";
import { World } from "./World";

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

function loadedModel() {
	const scene = new THREE.Group();
	scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
	const model = {
		scene,
		scenes: [],
		animations: [],
		cameras: [],
		asset: {},
	} as unknown as LoadedModel;
	return { model, mesh: scene.children[0] as THREE.Mesh };
}

function setup(sourceList: readonly ResourceSource[]) {
	const modelLoads = new Map<
		string,
		ReturnType<typeof deferred<LoadedModel>>
	>();
	const textureLoads = new Map<
		string,
		ReturnType<typeof deferred<THREE.Texture>>
	>();
	const loader: ResourceLoader = {
		loadModel: vi.fn((source) => {
			const pending = deferred<LoadedModel>();
			modelLoads.set(source.name, pending);
			return pending.promise;
		}),
		loadTexture: vi.fn((source) => {
			const pending = deferred<THREE.Texture>();
			textureLoads.set(source.name, pending);
			return pending.promise;
		}),
		disposeModel: vi.fn(),
		disposeTexture: vi.fn(),
	};
	const resources = new Resources(sourceList, loader);
	const scene = new THREE.Scene();
	const cssScene = new THREE.Scene();
	const paperCssScene = new THREE.Scene();
	const parking = document.createElement("div");
	const host = document.createElement("div");
	host.id = "screen-host";
	parking.appendChild(host);
	const paperHost = document.createElement("div");
	document.body.appendChild(parking);
	const camera = {
		instance: new THREE.PerspectiveCamera(),
		enterMonitor: vi.fn(),
		transition: vi.fn(),
		setPaperTarget: vi.fn(),
	} as unknown as Camera;
	const ready = vi.fn();
	const computerError = vi.fn();
	const world = new World(
		scene,
		cssScene,
		paperCssScene,
		resources,
		camera,
		new Group(),
		host,
		paperHost,
		parking,
		computerError,
		ready,
	);
	resources.start();
	return {
		resources,
		scene,
		cssScene,
		paperCssScene,
		modelLoads,
		textureLoads,
		ready,
		computerError,
		world,
		host,
		paperHost,
		camera,
	};
}

const computerSources: readonly ResourceSource[] = [
	{ name: "computerSetupModel", type: "model", path: "/computer.glb" },
	{ name: "computerSetupTexture", type: "texture", path: "/computer.webp" },
];

describe("World progressive creation", () => {
	it("caches a texture that wins the race, then creates and fades its model immediately", async () => {
		const setupResult = setup(computerSources);
		const texture = new THREE.Texture();
		setupResult.textureLoads.get("computerSetupTexture")?.resolve(texture);
		await Promise.resolve();
		expect(
			setupResult.scene.children.some((child) => child.type === "Group"),
		).toBe(false);

		const { model, mesh } = loadedModel();
		setupResult.modelLoads.get("computerSetupModel")?.resolve(model);
		await Promise.resolve();

		const material = mesh.material as THREE.MeshBasicMaterial;
		expect(setupResult.scene.children).toContain(model.scene);
		expect(material.map).toBe(texture);
		expect(material.opacity).toBe(0);
		expect(setupResult.cssScene.children[0]).toMatchObject({
			element: setupResult.host,
		});
		expect(setupResult.camera.transition).toHaveBeenCalledWith("idle");
		expect(setupResult.camera.enterMonitor).not.toHaveBeenCalled();
		expect(setupResult.ready).toHaveBeenCalledTimes(1);
	});

	it("applies a late texture immediately without recreating the model", async () => {
		const setupResult = setup(computerSources);
		const { model, mesh } = loadedModel();
		setupResult.modelLoads.get("computerSetupModel")?.resolve(model);
		await Promise.resolve();
		expect((mesh.material as THREE.MeshBasicMaterial).map).toBeNull();
		const sceneObject = model.scene;

		const texture = new THREE.Texture();
		setupResult.textureLoads.get("computerSetupTexture")?.resolve(texture);
		await Promise.resolve();

		const material = mesh.material as THREE.MeshBasicMaterial;
		expect(material.map).toBe(texture);
		expect(material.opacity).toBe(1);
		expect(setupResult.scene.children).toContain(sceneObject);
		expect(
			setupResult.scene.children.filter((child) => child === sceneObject),
		).toHaveLength(1);
	});

	it("does not let an environment failure block computer attachment", async () => {
		const setupResult = setup([
			{ name: "computerSetupModel", type: "model", path: "/computer.glb" },
			{ name: "environmentModel", type: "model", path: "/environment.glb" },
		]);
		setupResult.modelLoads
			.get("environmentModel")
			?.reject(new Error("optional environment failed"));
		setupResult.modelLoads
			.get("computerSetupModel")
			?.resolve(loadedModel().model);
		await Promise.resolve();
		await Promise.resolve();

		expect(setupResult.ready).toHaveBeenCalledTimes(1);
		expect(setupResult.computerError).not.toHaveBeenCalled();
		expect(setupResult.cssScene.children).toHaveLength(1);
	});

	it("tracks the decor paper mesh and feeds its world center to the camera", async () => {
		const setupResult = setup([
			{ name: "decorModel", type: "model", path: "/decor.glb" },
		]);
		const scene = new THREE.Group();
		const paper = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
		paper.name = "paper";
		paper.position.set(1, 2, 3);
		scene.add(paper);
		const model = {
			scene,
			scenes: [],
			animations: [],
			cameras: [],
			asset: {},
		} as unknown as LoadedModel;
		setupResult.modelLoads.get("decorModel")?.resolve(model);
		await Promise.resolve();

		expect(setupResult.world.getPaperMesh()).toBe(paper);
		expect(setupResult.camera.setPaperTarget).toHaveBeenCalledWith(
			expect.objectContaining({ x: 1, y: 2, z: 3 }),
			expect.any(THREE.Vector3),
		);
		// The transparent CSS3D game-mount overlay follows the paper mesh, in the
		// paper-dedicated CSS layer (second CSS3DRenderer), not the monitor's
		// cssScene.
		const overlay = setupResult.paperCssScene.children.find(
			(child) => child instanceof CSS3DObject,
		) as CSS3DObject | undefined;
		expect(overlay).toBeDefined();
		expect(overlay!.element).toBe(setupResult.paperHost);
		expect(overlay!.element).toBeInstanceOf(HTMLElement);
		expect(
			setupResult.cssScene.children.some(
				(child) => child instanceof CSS3DObject,
			),
		).toBe(false);
	});

	it("derives the paper content-up direction from its UVs", async () => {
		const setupResult = setup([
			{ name: "decorModel", type: "model", path: "/decor.glb" },
		]);
		// The real decor.glb paper: an oblique quad in the xz plane whose UV v
		// runs along the B→A edge (the printed content "up" direction).
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(
				[
					-2.29,
					-0.494,
					1.693, // A, v=0.6901
					-2.858,
					-0.494,
					0.904, // B, v=0.0325
					-1.728,
					-0.494,
					1.288, // C, v=0.6901
					-2.296,
					-0.494,
					0.499, // D, v=0.0325
				],
				3,
			),
		);
		geometry.setAttribute(
			"uv",
			new THREE.Float32BufferAttribute(
				[0.0138, 0.6901, 0.0138, 0.0325, 0.4829, 0.6901, 0.4829, 0.0325],
				2,
			),
		);
		geometry.computeBoundingBox();
		const scene = new THREE.Group();
		const paper = new THREE.Mesh(geometry);
		paper.name = "paper";
		paper.scale.set(900, 900, 900);
		scene.add(paper);
		const model = {
			scene,
			scenes: [],
			animations: [],
			cameras: [],
			asset: {},
		} as unknown as LoadedModel;
		setupResult.modelLoads.get("decorModel")?.resolve(model);
		await Promise.resolve();

		const contentUp = vi.mocked(setupResult.camera.setPaperTarget).mock
			.calls[0][1] as THREE.Vector3;
		// B→A = (0.568, 0, 0.789), normalized, flipped 180° because the baked
		// texture stores the content head-down (verified in the rendered scene).
		expect(contentUp.x).toBeCloseTo(-0.584, 2);
		expect(contentUp.y).toBeCloseTo(0, 6);
		expect(contentUp.z).toBeCloseTo(-0.811, 2);
	});

	it("degrades when the decor model has no paper node", async () => {
		const setupResult = setup([
			{ name: "decorModel", type: "model", path: "/decor.glb" },
		]);
		setupResult.modelLoads.get("decorModel")?.resolve(loadedModel().model);
		await Promise.resolve();

		expect(setupResult.world.getPaperMesh()).toBeNull();
		expect(setupResult.camera.setPaperTarget).not.toHaveBeenCalled();
		expect(
			setupResult.paperCssScene.children.some(
				(child) => child instanceof CSS3DObject,
			),
		).toBe(false);
	});
});
