import * as THREE from 'three';
import type { Mouse } from './Mouse';
import type { Sizes } from './Sizes';
import type { Time } from './Time';

export type CameraKey = 'idle' | 'monitor' | 'loading' | 'desk' | 'orbitControlsStart';

export type CameraFrame = {
  position: THREE.Vector3;
  focalPoint: THREE.Vector3;
  update(): void;
};

const frame = (position: THREE.Vector3, focalPoint: THREE.Vector3): CameraFrame => ({
  position,
  focalPoint,
  update() {},
});

export function createCameraKeyframes(
  sizes: Sizes,
  mouse: Mouse,
  time: Time,
): Record<CameraKey, CameraFrame> {
  const monitorOrigin = new THREE.Vector3(0, 950, 2000);
  const monitor = frame(monitorOrigin.clone(), new THREE.Vector3(0, 950, 0));
  monitor.update = () => {
    const aspect = sizes.height / sizes.width;
    monitor.position.z = monitorOrigin.z + aspect * 1200 - 600;
  };

  const deskOrigin = new THREE.Vector3(0, 1800, 5500);
  const desk = frame(deskOrigin.clone(), new THREE.Vector3(0, 500, 0));
  desk.update = () => {
    desk.focalPoint.x += (mouse.x - sizes.width / 2 - desk.focalPoint.x) * 0.05;
    desk.focalPoint.y += (-(mouse.y - sizes.height) - desk.focalPoint.y) * 0.05;
    desk.position.x += (mouse.x - sizes.width / 2 - desk.position.x) * 0.025;
    desk.position.y += (-(mouse.y - sizes.height * 2) - desk.position.y) * 0.025;
    desk.position.z = deskOrigin.z + (sizes.height / sizes.width) * 3000 - 1800;
  };

  const idleOrigin = new THREE.Vector3(-20000, 12000, 20000);
  const idle = frame(idleOrigin.clone(), new THREE.Vector3(0, -1000, 0));
  idle.update = () => {
    idle.position.x = Math.sin((time.elapsed + 19000) * 0.00008) * idleOrigin.x;
    idle.position.y = Math.sin((time.elapsed + 1000) * 0.000004) * 4000 + idleOrigin.y - 3000;
  };

  return {
    idle,
    monitor,
    desk,
    loading: frame(new THREE.Vector3(-35000, 35000, 35000), new THREE.Vector3(0, -5000, 0)),
    orbitControlsStart: frame(new THREE.Vector3(-15000, 10000, 15000), new THREE.Vector3(-100, 350, 0)),
  };
}
