import * as THREE from 'three';
import type { LoadedModel } from './types';

const disposed = new WeakSet<object>();

export function disposeTexture(texture: THREE.Texture): void {
  if (disposed.has(texture)) return;
  disposed.add(texture);
  texture.dispose();
  const image = texture.image as { close?: () => void } | undefined;
  image?.close?.();
}

export function disposeMaterial(material: THREE.Material): void {
  if (disposed.has(material)) return;
  disposed.add(material);

  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) disposeTexture(value);
  }
  material.dispose();
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry && !disposed.has(mesh.geometry)) {
      disposed.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (material) disposeMaterial(material);
    }
  });
}

export function disposeModel(model: LoadedModel): void {
  disposeObject(model.scene);
}
