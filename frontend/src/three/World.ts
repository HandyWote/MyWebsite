import type { Group } from "@tweenjs/tween.js";
import * as THREE from "three";
import type { Camera } from "./Camera";
import { Computer } from "./Computer";
import { Decor } from "./Decor";
import { disposeObject, disposeTexture } from "./dispose";
import { Environment } from "./Environment";
import { MonitorScreen } from "./MonitorScreen";
import { PaperScreen } from "./PaperScreen";
import type { Resources } from "./Resources";
import { COMPUTER_MODEL_NAME, DECOR_MODEL_NAME } from "./sources";
import type {
	LoadedTexture,
	ModelSource,
	ModelSourceName,
	ResourceErrorEvent,
	ResourceLoadedEvent,
	TextureSourceName,
} from "./types";

const modelTexture: Partial<Record<ModelSourceName, TextureSourceName>> = {
	computerSetupModel: "computerSetupTexture",
	environmentModel: "environmentTexture",
	decorModel: "decorTexture",
};

export class World {
	private readonly subscriptions: Array<() => void> = [];
	private readonly textures = new Map<TextureSourceName, LoadedTexture>();
	private readonly models = new Map<
		ModelSourceName,
		Computer | Environment | Decor
	>();
	private monitor: MonitorScreen | null = null;
	private paperScreen: PaperScreen | null = null;
	private paperMesh: THREE.Mesh | null = null;
	private destroyed = false;

	constructor(
		private readonly scene: THREE.Scene,
		cssScene: THREE.Scene,
		paperCssScene: THREE.Scene,
		resources: Resources,
		private readonly camera: Camera,
		private readonly tweens: Group,
		private readonly screenHost: HTMLElement,
		private readonly paperHost: HTMLElement,
		private readonly parkingNode: HTMLElement,
		private readonly onComputerError: (error: Error) => void,
		private readonly onComputerReady: () => void,
	) {
		this.cssScene = cssScene;
		this.paperCssScene = paperCssScene;
		this.subscriptions.push(
			resources.on("modelLoaded", (event) => this.handleModel(event)),
			resources.on("textureLoaded", (event) =>
				this.handleTexture(event.source.name, event.value),
			),
			resources.on("resourceError", (event) => this.handleError(event)),
		);
	}

	private readonly cssScene: THREE.Scene;
	private readonly paperCssScene: THREE.Scene;

	update(): void {
		this.monitor?.update();
		const environment = this.models.get("environmentModel");
		if (environment instanceof Environment) environment.update();
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		for (const unsubscribe of this.subscriptions) unsubscribe();
		this.subscriptions.length = 0;
		this.monitor?.destroy();
		this.monitor = null;
		this.paperScreen?.destroy();
		this.paperScreen = null;
		this.paperMesh = null;
		for (const model of this.models.values()) {
			this.scene.remove(model.object);
			disposeObject(model.object);
		}
		this.models.clear();
		for (const texture of this.textures.values()) disposeTexture(texture);
		this.textures.clear();
	}

	private handleModel(event: ResourceLoadedEvent<ModelSource>): void {
		if (this.destroyed) return;
		const { source, value } = event;
		let model: Computer | Environment | Decor;
		if (source.name === "computerSetupModel")
			model = new Computer(value, this.tweens);
		else if (source.name === "environmentModel")
			model = new Environment(value, this.tweens);
		else model = new Decor(value, this.tweens);

		const previous = this.models.get(source.name);
		if (previous) {
			this.scene.remove(previous.object);
			disposeObject(previous.object);
		}
		this.models.set(source.name, model);
		this.scene.add(model.object);

		const textureName = modelTexture[source.name];
		const cachedTexture = textureName
			? this.textures.get(textureName)
			: undefined;
		if (cachedTexture) model.applyTexture(cachedTexture, true);

		if (source.name === COMPUTER_MODEL_NAME) {
			this.monitor?.destroy();
			this.monitor = new MonitorScreen(
				this.scene,
				this.cssScene,
				this.screenHost,
				this.parkingNode,
				this.camera,
				this.tweens,
			);
			const smudge = this.textures.get("monitorSmudgeTexture");
			const shadow = this.textures.get("monitorShadowTexture");
			if (smudge) this.monitor.addSmudge(smudge, true);
			if (shadow) this.monitor.addShadow(shadow, true);
			this.camera.transition("idle");
			this.onComputerReady();
		} else if (source.name === DECOR_MODEL_NAME) {
			this.attachPaper(model.object);
		}
	}

	getPaperMesh(): THREE.Mesh | null {
		return this.paperMesh;
	}

	// Locates the flat desk paper inside the decor model and feeds its real
	// world-space center to the camera's paper keyframe. Degrades gracefully
	// when the model has no node named 'paper'.
	private attachPaper(model: THREE.Group): void {
		this.paperMesh = null;
		const mesh = model.getObjectByName("paper");
		if (!(mesh instanceof THREE.Mesh)) {
			// No paper node: tear down any overlay left by a previous model
			// and keep the existing graceful degradation (no screen built).
			this.paperScreen?.destroy();
			this.paperScreen = null;
			return;
		}
		this.paperMesh = mesh;

		mesh.geometry.computeBoundingBox();
		mesh.updateWorldMatrix(true, false);
		const bounds = mesh.geometry
			.boundingBox!.clone()
			.applyMatrix4(mesh.matrixWorld);
		this.camera.setPaperTarget(
			bounds.getCenter(new THREE.Vector3()),
			this.paperContentUp(mesh),
		);

		// Transparent CSS3D overlay aligned to the paper mesh — the mount
		// point for future mini-games (same host pattern as MonitorScreen).
		this.paperScreen?.destroy();
		this.paperScreen = new PaperScreen(
			this.paperCssScene,
			this.paperHost,
			mesh.geometry,
			mesh.matrixWorld,
		);
	}

	// World-space direction of the paper's printed content "up" edge: the
	// vertex with the largest UV v minus the smallest (UV v runs up the page).
	// Falls back to the longest geometry edge when the mesh has no UVs.
	private paperContentUp(mesh: THREE.Mesh): THREE.Vector3 {
		const position = mesh.geometry.getAttribute("position");
		const uv =
			mesh.geometry.getAttribute("uv") ??
			mesh.geometry.getAttribute("TEXCOORD_0");
		if (uv && uv.count >= 2) {
			let maxI = 0;
			let minI = 0;
			for (let i = 1; i < uv.count; i++) {
				if (uv.getY(i) > uv.getY(maxI)) maxI = i;
				if (uv.getY(i) < uv.getY(minI)) minI = i;
			}
			if (maxI !== minI) {
				return (
					new THREE.Vector3()
						.subVectors(
							new THREE.Vector3().fromBufferAttribute(position, maxI),
							new THREE.Vector3().fromBufferAttribute(position, minI),
						)
						.transformDirection(mesh.matrixWorld)
						.normalize()
						// The baked decor texture stores the paper content head-down
						// (content "up" points toward the smaller UV v, verified in
						// the rendered scene), so flip the derived direction 180°.
						.multiplyScalar(-1)
				);
			}
		}
		// Fallback: the longest edge between any two vertices.
		let best = new THREE.Vector3(0, 0, 1);
		let bestLength = -1;
		for (let i = 0; i < position.count; i++) {
			for (let j = i + 1; j < position.count; j++) {
				const direction = new THREE.Vector3()
					.subVectors(
						new THREE.Vector3().fromBufferAttribute(position, j),
						new THREE.Vector3().fromBufferAttribute(position, i),
					)
					.transformDirection(mesh.matrixWorld);
				if (direction.lengthSq() > bestLength) {
					bestLength = direction.lengthSq();
					best = direction;
				}
			}
		}
		return best.normalize();
	}

	private handleTexture(name: TextureSourceName, texture: LoadedTexture): void {
		if (this.destroyed) return;
		this.textures.set(name, texture);

		for (const [modelName, textureName] of Object.entries(modelTexture)) {
			if (textureName === name)
				this.models
					.get(modelName as ModelSourceName)
					?.applyTexture(texture, false);
		}
		if (name === "monitorSmudgeTexture")
			this.monitor?.addSmudge(texture, false);
		if (name === "monitorShadowTexture")
			this.monitor?.addShadow(texture, false);
	}

	private handleError(event: ResourceErrorEvent): void {
		if (event.source.name === COMPUTER_MODEL_NAME)
			this.onComputerError(event.error);
	}
}
