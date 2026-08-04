import type * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type ModelSourceName =
  | 'computerSetupModel'
  | 'environmentModel'
  | 'decorModel';

export type TextureSourceName =
  | 'computerSetupTexture'
  | 'environmentTexture'
  | 'decorTexture'
  | 'monitorSmudgeTexture'
  | 'monitorShadowTexture';

export type ModelSource = {
  name: ModelSourceName;
  type: 'model';
  path: string;
};

export type TextureSource = {
  name: TextureSourceName;
  type: 'texture';
  path: string;
};

export type ResourceSource = ModelSource | TextureSource;
export type LoadedModel = GLTF;
export type LoadedTexture = THREE.Texture;

export type ResourceValue<S extends ResourceSource = ResourceSource> =
  S extends ModelSource ? LoadedModel : LoadedTexture;

export type ResourceLoadedEvent<S extends ResourceSource = ResourceSource> = {
  source: S;
  value: ResourceValue<S>;
};

export type ResourceErrorEvent = {
  source: ResourceSource;
  error: Error;
  attempt: number;
};

export type ResourceEventMap = {
  modelLoaded: ResourceLoadedEvent<ModelSource>;
  textureLoaded: ResourceLoadedEvent<TextureSource>;
  resourceError: ResourceErrorEvent;
};

export type ResourceLoader = {
  loadModel(source: ModelSource, signal: AbortSignal): Promise<LoadedModel>;
  loadTexture(source: TextureSource, signal: AbortSignal): Promise<LoadedTexture>;
  disposeModel(model: LoadedModel): void;
  disposeTexture(texture: LoadedTexture): void;
};

export type ThreeExperience = {
  start(): void;
  retryComputer(): void;
  destroy(): void;
};

export type ThreeExperienceOptions = {
  webglMount: HTMLElement;
  cssMount: HTMLElement;
  screenHost: HTMLElement;
  parkingNode: HTMLElement;
  onComputerError(error: Error): void;
  onComputerReady(): void;
};
