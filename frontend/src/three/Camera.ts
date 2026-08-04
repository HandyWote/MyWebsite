import { Easing, Group, Tween } from '@tweenjs/tween.js';
import BezierEasing from 'bezier-easing';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createCameraKeyframes, type CameraKey } from './CameraKeyframes';
import type { Mouse } from './Mouse';
import type { Sizes } from './Sizes';
import type { Time } from './Time';

export class Camera {
  readonly instance: THREE.PerspectiveCamera;
  private readonly position = new THREE.Vector3();
  private readonly focalPoint = new THREE.Vector3();
  private readonly keyframes;
  private controls: OrbitControls | null = null;
  private current: CameraKey | null = 'loading';
  private target: CameraKey | null = null;
  private destroyed = false;

  constructor(
    scene: THREE.Scene,
    private readonly sizes: Sizes,
    mouse: Mouse,
    time: Time,
    private readonly tweens: Group,
  ) {
    this.keyframes = createCameraKeyframes(sizes, mouse, time);
    this.instance = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 10, 900000);
    this.position.copy(this.keyframes.loading.position);
    this.focalPoint.copy(this.keyframes.loading.focalPoint);
    this.instance.position.copy(this.position);
    this.instance.lookAt(this.focalPoint);
    scene.add(this.instance);
  }

  createControls(element: HTMLElement): void {
    if (this.controls || this.destroyed) return;
    this.controls = new OrbitControls(this.instance, element);
    const start = this.keyframes.orbitControlsStart;
    this.controls.target.copy(start.focalPoint);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.minDistance = 4000;
    this.controls.maxDistance = 29000;
    this.controls.update();
  }

  transition(
    key: CameraKey,
    duration = 1000,
    easing: (amount: number) => number = Easing.Quintic.InOut,
  ): void {
    if (this.destroyed || this.current === key || this.target === key) return;
    this.tweens.removeAll();
    this.current = null;
    this.target = key;
    const destination = this.keyframes[key];

    new Tween(this.position, this.tweens)
      .to(destination.position, duration)
      .easing(easing)
      .onComplete(() => {
        this.current = key;
        this.target = null;
      })
      .start();
    new Tween(this.focalPoint, this.tweens)
      .to(destination.focalPoint, duration)
      .easing(easing)
      .start();
  }

  enterMonitor(): void {
    this.transition('monitor', 1600, BezierEasing(0.13, 0.99, 0, 1));
  }

  toggleDeskView(): void {
    if (this.current === 'desk' || this.target === 'desk') this.transition('idle');
    else this.transition('desk');
  }

  resize(): void {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  update(): void {
    if (this.destroyed) return;
    for (const frame of Object.values(this.keyframes)) frame.update();
    if (this.current) {
      this.position.copy(this.keyframes[this.current].position);
      this.focalPoint.copy(this.keyframes[this.current].focalPoint);
    }
    this.instance.position.copy(this.position);
    this.instance.lookAt(this.focalPoint);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.controls?.dispose();
    this.controls = null;
  }
}
