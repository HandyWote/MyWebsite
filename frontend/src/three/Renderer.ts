import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import type { Camera } from './Camera';
import type { Sizes } from './Sizes';

export class Renderer {
  readonly webgl: THREE.WebGLRenderer;
  readonly css: CSS3DRenderer;
  readonly cssPaper: CSS3DRenderer;
  private destroyed = false;

  constructor(
    webglMount: HTMLElement,
    cssMount: HTMLElement,
    paperMount: HTMLElement,
    private readonly sizes: Sizes,
  ) {
    this.webgl = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.setClearColor(0x000000, 0);
    this.webgl.domElement.dataset.threeCanvas = 'public';
    this.webgl.domElement.className = 'public-scene-canvas';
    webglMount.appendChild(this.webgl.domElement);

    this.css = new CSS3DRenderer();
    this.css.domElement.dataset.threeCssRenderer = 'public';
    this.css.domElement.className = 'public-css-renderer';
    cssMount.appendChild(this.css.domElement);

    this.cssPaper = new CSS3DRenderer();
    this.cssPaper.domElement.dataset.threeCssRenderer = 'paper';
    this.cssPaper.domElement.className = 'public-paper-renderer';
    paperMount.appendChild(this.cssPaper.domElement);
    this.resize();
  }

  resize(): void {
    if (this.destroyed) return;
    this.webgl.setSize(this.sizes.width, this.sizes.height);
    this.webgl.setPixelRatio(this.sizes.pixelRatio);
    this.css.setSize(this.sizes.width, this.sizes.height);
    this.cssPaper.setSize(this.sizes.width, this.sizes.height);
  }

  render(scene: THREE.Scene, cssScene: THREE.Scene, paperCssScene: THREE.Scene, camera: Camera): void {
    if (this.destroyed) return;
    camera.instance.updateProjectionMatrix();
    this.webgl.render(scene, camera.instance);
    this.css.render(cssScene, camera.instance);
    this.cssPaper.render(paperCssScene, camera.instance);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.webgl.renderLists.dispose();
    this.webgl.dispose();
    this.webgl.forceContextLoss();
    this.webgl.domElement.remove();
    this.css.domElement.remove();
    this.cssPaper.domElement.remove();
  }
}
