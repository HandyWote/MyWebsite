import { Group } from '@tweenjs/tween.js';
import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import type { Camera } from './Camera';
import { disposeMaterial } from './dispose';
import { TextureLayers } from './TextureLayers';

const SCREEN_SIZE = new THREE.Vector2(1280, 1024);
const SCREEN_POSITION = new THREE.Vector3(0, 950, 255);
const SCREEN_ROTATION = new THREE.Euler(-3 * THREE.MathUtils.DEG2RAD, 0, 0);
const SMUDGE_OFFSET = 96;

type AttributeSnapshot = string | null;

export class MonitorScreen {
  readonly object: CSS3DObject;
  private readonly styleBefore: AttributeSnapshot;
  private readonly draggableBefore: AttributeSnapshot;
  private readonly attachedBefore: AttributeSnapshot;
  private readonly meshes: THREE.Mesh[] = [];
  private readonly textureLayers: TextureLayers;
  private destroyed = false;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly cssScene: THREE.Scene,
    private readonly host: HTMLElement,
    private readonly parkingNode: HTMLElement,
    private readonly camera: Camera,
    tweens: Group,
  ) {
    this.styleBefore = host.getAttribute('style');
    this.draggableBefore = host.getAttribute('draggable');
    this.attachedBefore = host.getAttribute('data-three-screen-attached');

    this.object = new CSS3DObject(host);
    host.dataset.threeScreenAttached = 'true';
    host.style.width = `${SCREEN_SIZE.width}px`;
    host.style.height = `${SCREEN_SIZE.height}px`;
    host.style.minHeight = '0';
    host.style.overflow = 'hidden';
    host.style.pointerEvents = 'auto';
    host.style.userSelect = 'text';
    this.object.position.copy(SCREEN_POSITION);
    this.object.rotation.copy(SCREEN_ROTATION);
    this.cssScene.add(this.object);

    this.textureLayers = new TextureLayers(
      scene,
      SCREEN_SIZE,
      SCREEN_POSITION,
      SCREEN_ROTATION,
      tweens,
    );
    this.createOcclusionPlane();
    this.createEnclosingPlanes();
    this.createDimmer();
  }

  addSmudge(texture: THREE.Texture, fade: boolean): void {
    this.textureLayers.addSmudge(texture, fade);
  }

  addShadow(texture: THREE.Texture, fade: boolean): void {
    this.textureLayers.addShadow(texture, fade);
  }

  update(): void {
    const dimmer = this.meshes.at(-1);
    if (!dimmer) return;
    const material = dimmer.material as THREE.MeshBasicMaterial;
    const view = this.camera.instance.position.clone().sub(SCREEN_POSITION).normalize();
    const dot = view.dot(new THREE.Vector3(0, 0, 1));
    const distance = this.camera.instance.position.distanceTo(dimmer.position);
    const distanceOpacity = 1 / Math.max(distance / 10000, 0.001);
    material.opacity = Math.max(0, Math.min(1, (1 - distanceOpacity) * 0.7 + (1 - dot) * 0.7));
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // r137 removes CSS3DObject.element on the Object3D `removed` event. Point it
    // at a sacrificial node before parking React's real host synchronously.
    const removalMarker = document.createElement('div');
    this.object.element = removalMarker;
    this.restoreHost();
    this.parkingNode.appendChild(this.host);
    this.cssScene.remove(this.object);

    this.textureLayers.destroy();
    for (const mesh of this.meshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) disposeMaterial(material);
    }
    this.meshes.length = 0;
  }

  private restoreHost(): void {
    this.restoreAttribute('style', this.styleBefore);
    this.restoreAttribute('draggable', this.draggableBefore);
    this.restoreAttribute('data-three-screen-attached', this.attachedBefore);
  }

  private restoreAttribute(name: string, value: AttributeSnapshot): void {
    if (value === null) this.host.removeAttribute(name);
    else this.host.setAttribute(name, value);
  }

  private addMesh(mesh: THREE.Mesh): void {
    this.scene.add(mesh);
    this.meshes.push(mesh);
  }

  private createOcclusionPlane(): void {
    const material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      opacity: 0,
      transparent: true,
      blending: THREE.NoBlending,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_SIZE.x, SCREEN_SIZE.y), material);
    mesh.position.copy(SCREEN_POSITION);
    mesh.rotation.copy(SCREEN_ROTATION);
    this.addMesh(mesh);
  }

  private createEnclosingPlanes(): void {
    const definitions = [
      [new THREE.Vector2(SMUDGE_OFFSET, SCREEN_SIZE.y), new THREE.Vector3(-SCREEN_SIZE.x / 2, 0, SMUDGE_OFFSET / 2), new THREE.Euler(0, Math.PI / 2, 0)],
      [new THREE.Vector2(SMUDGE_OFFSET, SCREEN_SIZE.y), new THREE.Vector3(SCREEN_SIZE.x / 2, 0, SMUDGE_OFFSET / 2), new THREE.Euler(0, Math.PI / 2, 0)],
      [new THREE.Vector2(SCREEN_SIZE.x, SMUDGE_OFFSET), new THREE.Vector3(0, SCREEN_SIZE.y / 2, SMUDGE_OFFSET / 2), new THREE.Euler(Math.PI / 2, 0, 0)],
      [new THREE.Vector2(SCREEN_SIZE.x, SMUDGE_OFFSET), new THREE.Vector3(0, -SCREEN_SIZE.y / 2, SMUDGE_OFFSET / 2), new THREE.Euler(Math.PI / 2, 0, 0)],
    ] as const;

    for (const [size, offset, rotation] of definitions) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(size.x, size.y),
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x48493f }),
      );
      mesh.position.copy(SCREEN_POSITION).add(offset);
      mesh.rotation.copy(rotation);
      this.addMesh(mesh);
    }
  }

  private createDimmer(): void {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN_SIZE.x, SCREEN_SIZE.y),
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        color: 0x000000,
        transparent: true,
        blending: THREE.AdditiveBlending,
      }),
    );
    mesh.position.copy(SCREEN_POSITION).add(new THREE.Vector3(0, 0, SMUDGE_OFFSET - 5));
    mesh.rotation.copy(SCREEN_ROTATION);
    this.addMesh(mesh);
  }
}
