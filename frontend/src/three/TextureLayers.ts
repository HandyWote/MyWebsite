import { Easing, Group, Tween } from '@tweenjs/tween.js';
import * as THREE from 'three';
import { disposeMaterial } from './dispose';

const SMUDGE_OFFSET = 96;
const SHADOW_OFFSET = 20;

export class TextureLayers {
  private readonly meshes: THREE.Mesh[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly screenSize: THREE.Vector2,
    private readonly position: THREE.Vector3,
    private readonly rotation: THREE.Euler,
    private readonly tweens: Group,
  ) {}

  addSmudge(texture: THREE.Texture, fade: boolean): void {
    this.add(texture, THREE.AdditiveBlending, 0.12, SMUDGE_OFFSET, fade);
  }

  addShadow(texture: THREE.Texture, fade: boolean): void {
    this.add(texture, THREE.NormalBlending, 1, SHADOW_OFFSET, fade);
  }

  destroy(): void {
    for (const mesh of this.meshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      disposeMaterial(mesh.material as THREE.Material);
    }
    this.meshes.length = 0;
  }

  private add(
    texture: THREE.Texture,
    blending: THREE.Blending,
    targetOpacity: number,
    offset: number,
    fade: boolean,
  ): void {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      blending,
      side: THREE.DoubleSide,
      opacity: fade ? 0 : targetOpacity,
      transparent: true,
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(this.screenSize.width, this.screenSize.height),
      material,
    );
    mesh.position.copy(this.position).add(new THREE.Vector3(0, 0, offset));
    mesh.rotation.copy(this.rotation);
    this.scene.add(mesh);
    this.meshes.push(mesh);

    if (fade) {
      new Tween(material, this.tweens)
        .to({ opacity: targetOpacity }, 500)
        .easing(Easing.Quadratic.Out)
        .start();
    }
  }
}
