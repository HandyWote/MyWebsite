import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrowserResourceLoader, Resources } from './Resources';
import type { LoadedModel, ResourceLoader, ResourceSource, TextureSource } from './types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function model(): LoadedModel {
  return { scene: new THREE.Group(), scenes: [], animations: [], cameras: [], asset: {} } as unknown as LoadedModel;
}

const sources: readonly ResourceSource[] = [
  { name: 'computerSetupModel', type: 'model', path: '/computer.glb' },
  { name: 'environmentModel', type: 'model', path: '/environment.glb' },
  { name: 'computerSetupTexture', type: 'texture', path: '/computer.webp' },
];

describe('Resources', () => {
  let pendingModels: Map<string, ReturnType<typeof deferred<LoadedModel>>>;
  let pendingTextures: Map<string, ReturnType<typeof deferred<THREE.Texture>>>;
  let loader: ResourceLoader;

  beforeEach(() => {
    pendingModels = new Map();
    pendingTextures = new Map();
    loader = {
      loadModel: vi.fn((source) => {
        const pending = deferred<LoadedModel>();
        pendingModels.set(source.name, pending);
        return pending.promise;
      }),
      loadTexture: vi.fn((source) => {
        const pending = deferred<THREE.Texture>();
        pendingTextures.set(source.name, pending);
        return pending.promise;
      }),
      disposeModel: vi.fn(),
      disposeTexture: vi.fn(),
    };
  });

  it('launches every model and texture request concurrently and emits each completion immediately', async () => {
    const resources = new Resources(sources, loader);
    const events: string[] = [];
    resources.on('modelLoaded', ({ source }) => events.push(`model:${source.name}`));
    resources.on('textureLoaded', ({ source }) => events.push(`texture:${source.name}`));
    resources.start();

    expect(loader.loadModel).toHaveBeenCalledTimes(2);
    expect(loader.loadTexture).toHaveBeenCalledTimes(1);

    pendingTextures.get('computerSetupTexture')?.resolve(new THREE.Texture());
    await Promise.resolve();
    expect(events).toEqual(['texture:computerSetupTexture']);

    pendingModels.get('computerSetupModel')?.resolve(model());
    await Promise.resolve();
    expect(events).toEqual(['texture:computerSetupTexture', 'model:computerSetupModel']);
  });

  it('reports independent failures without holding successful resources', async () => {
    const resources = new Resources(sources, loader);
    const failures: string[] = [];
    const successes: string[] = [];
    resources.on('resourceError', ({ source, error }) => failures.push(`${source.name}:${error.message}`));
    resources.on('modelLoaded', ({ source }) => successes.push(source.name));
    resources.start();

    pendingModels.get('environmentModel')?.reject(new Error('environment failed'));
    pendingModels.get('computerSetupModel')?.resolve(model());
    await Promise.resolve();
    await Promise.resolve();

    expect(failures).toEqual(['environmentModel:environment failed']);
    expect(successes).toEqual(['computerSetupModel']);
  });

  it('retries only the computer model and suppresses the superseded attempt', async () => {
    const firstComputer = deferred<LoadedModel>();
    const secondComputer = deferred<LoadedModel>();
    let computerAttempt = 0;
    vi.mocked(loader.loadModel).mockImplementation((source) => {
      if (source.name === 'computerSetupModel') {
        computerAttempt += 1;
        return computerAttempt === 1 ? firstComputer.promise : secondComputer.promise;
      }
      const pending = deferred<LoadedModel>();
      pendingModels.set(source.name, pending);
      return pending.promise;
    });
    const resources = new Resources(sources, loader);
    const loaded = vi.fn();
    resources.on('modelLoaded', loaded);
    resources.start();
    resources.retryComputer();

    expect(loader.loadModel).toHaveBeenCalledTimes(3);
    firstComputer.resolve(model());
    await Promise.resolve();
    expect(loaded).not.toHaveBeenCalled();
    expect(loader.disposeModel).toHaveBeenCalledTimes(1);

    secondComputer.resolve(model());
    await Promise.resolve();
    expect(loaded).toHaveBeenCalledTimes(1);
    expect(loaded.mock.calls[0][0].source.name).toBe('computerSetupModel');
  });

  it('rejects browser texture paths outside the static 3D asset allowlist before fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const loader = createBrowserResourceLoader();
    const source = {
      name: 'computerSetupTexture',
      type: 'texture',
      path: 'https://example.com/texture.webp',
    } satisfies TextureSource;

    await expect(loader.loadTexture(source, new AbortController().signal)).rejects.toThrow(
      'Unsupported texture asset path',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('disposes settled cache entries during teardown', async () => {
    const resources = new Resources(sources, loader);
    resources.start();
    const texture = new THREE.Texture();
    pendingTextures.get('computerSetupTexture')?.resolve(texture);
    await Promise.resolve();

    resources.destroy();
    expect(loader.disposeTexture).toHaveBeenCalledWith(texture);
  });

  it('aborts teardown requests and disposes loader results that settle late', async () => {
    const resources = new Resources(sources, loader);
    const loaded = vi.fn();
    resources.on('modelLoaded', loaded);
    resources.start();
    resources.destroy();

    const lateModel = model();
    pendingModels.get('computerSetupModel')?.resolve(lateModel);
    await Promise.resolve();

    expect(loaded).not.toHaveBeenCalled();
    expect(loader.disposeModel).toHaveBeenCalledWith(lateModel);
  });
});
