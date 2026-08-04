import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { disposeModel, disposeTexture } from './dispose';
import { TypedEventEmitter } from './events';
import { COMPUTER_MODEL_NAME } from './sources';
import type {
  LoadedModel,
  LoadedTexture,
  ModelSource,
  ResourceEventMap,
  ResourceLoader,
  ResourceSource,
  TextureSource,
} from './types';

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function basePath(path: string): string {
  return path.slice(0, path.lastIndexOf('/') + 1);
}

async function decodeImage(blob: Blob, signal: AbortSignal): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) return window.createImageBitmap(blob);

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);
    const cleanup = () => {
      signal.removeEventListener('abort', onAbort);
      URL.revokeObjectURL(objectUrl);
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException('The operation was aborted', 'AbortError'));
    };
    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('Unable to decode texture image'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    image.src = objectUrl;
  });
}

export function createBrowserResourceLoader(): ResourceLoader {
  const gltfLoader = new GLTFLoader();

  return {
    async loadModel(source, signal) {
      const response = await fetch(source.path, { signal });
      if (!response.ok) throw new Error(`${source.path} returned ${response.status}`);
      const data = await response.arrayBuffer();
      if (signal.aborted) throw new DOMException('The operation was aborted', 'AbortError');
      return new Promise<LoadedModel>((resolve, reject) => {
        gltfLoader.parse(data, basePath(source.path), resolve, reject);
      });
    },
    async loadTexture(source, signal) {
      const response = await fetch(source.path, { signal });
      if (!response.ok) throw new Error(`${source.path} returned ${response.status}`);
      const image = await decodeImage(await response.blob(), signal);
      if (signal.aborted) {
        if ('close' in image) image.close();
        throw new DOMException('The operation was aborted', 'AbortError');
      }
      const texture = new THREE.Texture(image as unknown as HTMLImageElement);
      texture.encoding = THREE.sRGBEncoding;
      texture.needsUpdate = true;
      return texture;
    },
    disposeModel,
    disposeTexture,
  };
}

export class Resources extends TypedEventEmitter<ResourceEventMap> {
  private readonly attempts = new Map<ResourceSource['name'], number>();
  private readonly controllers = new Map<ResourceSource['name'], AbortController>();
  private readonly loaded = new Map<ResourceSource['name'], LoadedModel | LoadedTexture>();
  private generation = 0;
  private started = false;
  private destroyed = false;

  constructor(
    private readonly sourceList: readonly ResourceSource[],
    private readonly loader: ResourceLoader,
  ) {
    super();
  }

  start(): void {
    if (this.started || this.destroyed) return;
    this.started = true;
    for (const source of this.sourceList) void this.load(source);
  }

  retryComputer(): void {
    if (this.destroyed) return;
    const source = this.sourceList.find((candidate) => candidate.name === COMPUTER_MODEL_NAME);
    if (!source || source.type !== 'model') return;
    this.controllers.get(source.name)?.abort();
    void this.load(source);
  }

  get(name: ResourceSource['name']): LoadedModel | LoadedTexture | undefined {
    return this.loaded.get(name);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.generation += 1;
    for (const controller of this.controllers.values()) controller.abort();
    this.controllers.clear();
    this.clear();
  }

  private async load(source: ResourceSource): Promise<void> {
    const generation = this.generation;
    const attempt = (this.attempts.get(source.name) ?? 0) + 1;
    this.attempts.set(source.name, attempt);
    const controller = new AbortController();
    this.controllers.set(source.name, controller);

    try {
      const value = source.type === 'model'
        ? await this.loader.loadModel(source as ModelSource, controller.signal)
        : await this.loader.loadTexture(source as TextureSource, controller.signal);

      if (this.destroyed || generation !== this.generation || this.controllers.get(source.name) !== controller) {
        this.dispose(source, value);
        return;
      }

      const previous = this.loaded.get(source.name);
      if (previous) this.dispose(source, previous);
      this.loaded.set(source.name, value);
      if (source.type === 'model') {
        this.emit('modelLoaded', { source, value: value as LoadedModel });
      } else {
        this.emit('textureLoaded', { source, value: value as LoadedTexture });
      }
    } catch (error) {
      if (!controller.signal.aborted && !this.destroyed && generation === this.generation) {
        this.emit('resourceError', { source, error: asError(error), attempt });
      }
    } finally {
      if (this.controllers.get(source.name) === controller) this.controllers.delete(source.name);
    }
  }

  private dispose(source: ResourceSource, value: LoadedModel | LoadedTexture): void {
    if (source.type === 'model') this.loader.disposeModel(value as LoadedModel);
    else this.loader.disposeTexture(value as LoadedTexture);
  }
}
