import type { Group } from '@tweenjs/tween.js';
import * as THREE from 'three';
import type { Camera } from './Camera';
import { Computer } from './Computer';
import { Decor } from './Decor';
import { disposeObject, disposeTexture } from './dispose';
import { Environment } from './Environment';
import { MonitorScreen } from './MonitorScreen';
import type { Resources } from './Resources';
import { COMPUTER_MODEL_NAME } from './sources';
import type {
  LoadedTexture,
  ModelSource,
  ModelSourceName,
  ResourceErrorEvent,
  ResourceLoadedEvent,
  TextureSourceName,
} from './types';

const modelTexture: Partial<Record<ModelSourceName, TextureSourceName>> = {
  computerSetupModel: 'computerSetupTexture',
  environmentModel: 'environmentTexture',
  decorModel: 'decorTexture',
};

export class World {
  private readonly subscriptions: Array<() => void> = [];
  private readonly textures = new Map<TextureSourceName, LoadedTexture>();
  private readonly models = new Map<ModelSourceName, Computer | Environment | Decor>();
  private monitor: MonitorScreen | null = null;
  private destroyed = false;

  constructor(
    private readonly scene: THREE.Scene,
    cssScene: THREE.Scene,
    private readonly resources: Resources,
    private readonly camera: Camera,
    private readonly tweens: Group,
    private readonly screenHost: HTMLElement,
    private readonly parkingNode: HTMLElement,
    private readonly onComputerError: (error: Error) => void,
    private readonly onComputerReady: () => void,
  ) {
    this.cssScene = cssScene;
    this.subscriptions.push(
      resources.on('modelLoaded', (event) => this.handleModel(event)),
      resources.on('textureLoaded', (event) => this.handleTexture(event.source.name, event.value)),
      resources.on('resourceError', (event) => this.handleError(event)),
    );
  }

  private readonly cssScene: THREE.Scene;

  update(): void {
    this.monitor?.update();
    const environment = this.models.get('environmentModel');
    if (environment instanceof Environment) environment.update();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const unsubscribe of this.subscriptions) unsubscribe();
    this.subscriptions.length = 0;
    this.monitor?.destroy();
    this.monitor = null;
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
    if (source.name === 'computerSetupModel') model = new Computer(value, this.tweens);
    else if (source.name === 'environmentModel') model = new Environment(value, this.tweens);
    else model = new Decor(value, this.tweens);

    const previous = this.models.get(source.name);
    if (previous) {
      this.scene.remove(previous.object);
      disposeObject(previous.object);
    }
    this.models.set(source.name, model);
    this.scene.add(model.object);

    const textureName = modelTexture[source.name];
    const cachedTexture = textureName ? this.textures.get(textureName) : undefined;
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
      const smudge = this.textures.get('monitorSmudgeTexture');
      const shadow = this.textures.get('monitorShadowTexture');
      if (smudge) this.monitor.addSmudge(smudge, true);
      if (shadow) this.monitor.addShadow(shadow, true);
      this.camera.transition('idle');
      this.onComputerReady();
    }
  }

  private handleTexture(name: TextureSourceName, texture: LoadedTexture): void {
    if (this.destroyed) return;
    this.textures.set(name, texture);

    for (const [modelName, textureName] of Object.entries(modelTexture)) {
      if (textureName === name) this.models.get(modelName as ModelSourceName)?.applyTexture(texture, false);
    }
    if (name === 'monitorSmudgeTexture') this.monitor?.addSmudge(texture, false);
    if (name === 'monitorShadowTexture') this.monitor?.addShadow(texture, false);
  }

  private handleError(event: ResourceErrorEvent): void {
    if (event.source.name === COMPUTER_MODEL_NAME) this.onComputerError(event.error);
  }
}
