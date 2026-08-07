import { Group } from '@tweenjs/tween.js';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { Camera } from './Camera';
import { Resources } from './Resources';
import type { LoadedModel, ResourceLoader, ResourceSource } from './types';
import { World } from './World';

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
  const model = { scene, scenes: [], animations: [], cameras: [], asset: {} } as unknown as LoadedModel;
  return { model, mesh: scene.children[0] as THREE.Mesh };
}

function setup(sourceList: readonly ResourceSource[]) {
  const modelLoads = new Map<string, ReturnType<typeof deferred<LoadedModel>>>();
  const textureLoads = new Map<string, ReturnType<typeof deferred<THREE.Texture>>>();
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
  const parking = document.createElement('div');
  const host = document.createElement('div');
  host.id = 'screen-host';
  parking.appendChild(host);
  document.body.appendChild(parking);
  const camera = {
    instance: new THREE.PerspectiveCamera(),
    enterMonitor: vi.fn(),
    transition: vi.fn(),
  } as unknown as Camera;
  const ready = vi.fn();
  const computerError = vi.fn();
  const world = new World(
    scene,
    cssScene,
    resources,
    camera,
    new Group(),
    host,
    parking,
    computerError,
    ready,
  );
  resources.start();
  return { resources, scene, cssScene, modelLoads, textureLoads, ready, computerError, world, host, camera };
}

const computerSources: readonly ResourceSource[] = [
  { name: 'computerSetupModel', type: 'model', path: '/computer.glb' },
  { name: 'computerSetupTexture', type: 'texture', path: '/computer.webp' },
];

describe('World progressive creation', () => {
  it('caches a texture that wins the race, then creates and fades its model immediately', async () => {
    const setupResult = setup(computerSources);
    const texture = new THREE.Texture();
    setupResult.textureLoads.get('computerSetupTexture')?.resolve(texture);
    await Promise.resolve();
    expect(setupResult.scene.children.some((child) => child.type === 'Group')).toBe(false);

    const { model, mesh } = loadedModel();
    setupResult.modelLoads.get('computerSetupModel')?.resolve(model);
    await Promise.resolve();

    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(setupResult.scene.children).toContain(model.scene);
    expect(material.map).toBe(texture);
    expect(material.opacity).toBe(0);
    expect(setupResult.cssScene.children[0]).toMatchObject({ element: setupResult.host });
    expect(setupResult.camera.transition).toHaveBeenCalledWith('idle');
    expect(setupResult.camera.enterMonitor).not.toHaveBeenCalled();
    expect(setupResult.ready).toHaveBeenCalledTimes(1);
  });

  it('applies a late texture immediately without recreating the model', async () => {
    const setupResult = setup(computerSources);
    const { model, mesh } = loadedModel();
    setupResult.modelLoads.get('computerSetupModel')?.resolve(model);
    await Promise.resolve();
    expect((mesh.material as THREE.MeshBasicMaterial).map).toBeNull();
    const sceneObject = model.scene;

    const texture = new THREE.Texture();
    setupResult.textureLoads.get('computerSetupTexture')?.resolve(texture);
    await Promise.resolve();

    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material.map).toBe(texture);
    expect(material.opacity).toBe(1);
    expect(setupResult.scene.children).toContain(sceneObject);
    expect(setupResult.scene.children.filter((child) => child === sceneObject)).toHaveLength(1);
  });

  it('does not let an environment failure block computer attachment', async () => {
    const setupResult = setup([
      { name: 'computerSetupModel', type: 'model', path: '/computer.glb' },
      { name: 'environmentModel', type: 'model', path: '/environment.glb' },
    ]);
    setupResult.modelLoads.get('environmentModel')?.reject(new Error('optional environment failed'));
    setupResult.modelLoads.get('computerSetupModel')?.resolve(loadedModel().model);
    await Promise.resolve();
    await Promise.resolve();

    expect(setupResult.ready).toHaveBeenCalledTimes(1);
    expect(setupResult.computerError).not.toHaveBeenCalled();
    expect(setupResult.cssScene.children).toHaveLength(1);
  });
});
