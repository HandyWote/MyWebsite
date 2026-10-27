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

  it('restores focus when the renderer reparents the host after construction', async () => {
    const scene = new THREE.Scene();
    const cssScene = new THREE.Scene();
    const parking = document.createElement('div');
    const cssRendererTree = document.createElement('div');
    const host = document.createElement('div');
    const input = document.createElement('input');
    host.appendChild(input);
    parking.appendChild(host);
    document.body.append(parking, cssRendererTree);
    input.focus();
    expect(document.activeElement).toBe(input);

    new MonitorScreen(scene, cssScene, host, parking, camera(), new Group());
    // First render frame: CSS3DRenderer moves the element into its own DOM.
    cssRendererTree.appendChild(host);

    await vi.waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('restores focus when destroy parks the host out of the CSS3D tree', async () => {
    const scene = new THREE.Scene();
    const cssScene = new THREE.Scene();
    const parking = document.createElement('div');
    const cssRendererTree = document.createElement('div');
    const host = document.createElement('div');
    const input = document.createElement('input');
    host.appendChild(input);
    parking.appendChild(host);
    document.body.append(parking, cssRendererTree);

    const monitor = new MonitorScreen(scene, cssScene, host, parking, camera(), new Group());
    cssRendererTree.appendChild(host);
    input.focus();
    expect(document.activeElement).toBe(input);

    monitor.destroy();

    // Parked synchronously, focus handed back on the next frame.
    expect(host.parentElement).toBe(parking);
    await vi.waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('never steals focus from an element outside the host', async () => {
    const scene = new THREE.Scene();
    const cssScene = new THREE.Scene();
    const parking = document.createElement('div');
    const cssRendererTree = document.createElement('div');
    const host = document.createElement('div');
    parking.appendChild(host);
    document.body.append(parking, cssRendererTree);

    const monitor = new MonitorScreen(scene, cssScene, host, parking, camera(), new Group());
    cssRendererTree.appendChild(host);
    const comment = document.createElement('textarea');
    document.body.appendChild(comment);
    comment.focus();

    monitor.destroy();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.activeElement).toBe(comment);
  });
});
