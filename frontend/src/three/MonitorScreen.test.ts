import { Group } from '@tweenjs/tween.js';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { Camera } from './Camera';
import { MonitorScreen } from './MonitorScreen';

function camera(): Camera {
  return { instance: new THREE.PerspectiveCamera() } as Camera;
}

describe('MonitorScreen', () => {
  it('wraps the exact ScreenHost and parks it before the r137 removed event', () => {
    const scene = new THREE.Scene();
    const cssScene = new THREE.Scene();
    const parking = document.createElement('div');
    const cssRendererTree = document.createElement('div');
    const host = document.createElement('div');
    host.id = 'screen-host';
    host.setAttribute('style', 'color: red');
    host.setAttribute('draggable', 'true');
    host.setAttribute('data-three-screen-attached', 'before');
    parking.appendChild(host);
    document.body.append(parking, cssRendererTree);

    const monitor = new MonitorScreen(scene, cssScene, host, parking, camera(), new Group());
    expect(monitor.object.element).toBe(host);
    expect(cssScene.children).toContain(monitor.object);
    const occluder = scene.children.find((child) => (
      child instanceof THREE.Mesh
      && child.geometry instanceof THREE.PlaneGeometry
      && child.geometry.parameters.width === 1280
      && child.geometry.parameters.height === 1024
    )) as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    expect(occluder.material.colorWrite).toBe(false);
    expect(occluder.material.depthTest).toBe(true);
    expect(occluder.material.depthWrite).toBe(true);
    cssRendererTree.appendChild(host);

    const originalRemove = cssScene.remove.bind(cssScene);
    const remove = vi.spyOn(cssScene, 'remove').mockImplementation((...objects) => {
      expect(host.parentElement).toBe(parking);
      return originalRemove(...objects);
    });

    monitor.destroy();
    monitor.destroy();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(host.parentElement).toBe(parking);
    expect(host.getAttribute('style')).toBe('color: red');
    expect(host.getAttribute('draggable')).toBe('true');
    expect(host.getAttribute('data-three-screen-attached')).toBe('before');
    expect(document.getElementById('screen-host')).toBe(host);
  });
});
