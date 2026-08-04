import { Easing, Group, Tween } from '@tweenjs/tween.js';
import * as THREE from 'three';
import type { LoadedModel, LoadedTexture } from './types';

export class BakedModel {
  readonly material = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true });
  readonly object: THREE.Group;

  constructor(
    model: LoadedModel,
    private readonly tweens: Group,
    scale = 900,
  ) {
    this.object = model.scene;
    this.object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.scale.set(scale, scale, scale);
      mesh.material = this.material;
    });
  }

  applyTexture(texture: LoadedTexture, fade: boolean): void {
    texture.flipY = false;
    this.material.map = texture;
    this.material.needsUpdate = true;

    if (!fade) {
      this.material.opacity = 1;
      return;
    }

    this.material.opacity = 0;
    new Tween(this.material, this.tweens)
      .to({ opacity: 1 }, 500)
      .easing(Easing.Quadratic.Out)
      .start();
  }
}
