import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import Application from '../Application';
import Debug from '../Utils/Debug';
import Resources from '../Utils/Resources';
import Sizes from '../Utils/Sizes';
import Camera from '../Camera/Camera';
import EventEmitter from '../Utils/EventEmitter';

const SCREEN_SIZE = { w: 1280, h: 1024 };
const IFRAME_PADDING = 32;
const IFRAME_SIZE = {
    w: SCREEN_SIZE.w - IFRAME_PADDING,
    h: SCREEN_SIZE.h - IFRAME_PADDING,
};

const SMUDGE_OFFSET = 96;
const SHADOW_OFFSET = 20;

export default class MonitorScreen extends EventEmitter {
    application: Application;
    scene: THREE.Scene;
    cssScene: THREE.Scene;
    resources: Resources;
    debug: Debug;
    sizes: Sizes;
    debugFolder: unknown;
    screenSize: THREE.Vector2;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    camera: Camera;
    prevInComputer: boolean;
    shouldLeaveMonitor: boolean;
    inComputer: boolean;
    mouseClickInProgress: boolean;
    dimmingPlane: THREE.Mesh;
    iframe: HTMLIFrameElement | null;
    iframeWheelCleanup: (() => void) | null;
    cachedIframeScrollTarget: HTMLElement | null;

    constructor() {
        super();
        this.application = new Application();
        this.scene = this.application.scene;
        this.cssScene = this.application.cssScene;
        this.sizes = this.application.sizes;
        this.resources = this.application.resources;
        this.screenSize = new THREE.Vector2(SCREEN_SIZE.w, SCREEN_SIZE.h);
        this.camera = this.application.camera;
        this.position = new THREE.Vector3(0, 950, 255);
        this.rotation = new THREE.Euler(-3 * THREE.MathUtils.DEG2RAD, 0, 0);
        this.mouseClickInProgress = false;
        this.shouldLeaveMonitor = false;
        this.iframe = null;
        this.iframeWheelCleanup = null;
        this.cachedIframeScrollTarget = null;

        // Create screen (no texture layers yet)
        this.initializeScreenEvents();
        this.createIframe();
        this.createEnclosingPlanes(SMUDGE_OFFSET);
        this.createPerspectiveDimmer(SMUDGE_OFFSET);
    }

    initializeScreenEvents() {
        document.addEventListener(
            'mousemove',
            (event) => {
                // @ts-ignore
                const id = event.target.id;
                if (id === 'computer-screen') {
                    // @ts-ignore
                    event.inComputer = true;
                }

                // @ts-ignore
                this.inComputer = event.inComputer;

                if (this.inComputer && !this.prevInComputer) {
                    this.camera.trigger('enterMonitor');
                }

                if (
                    !this.inComputer &&
                    this.prevInComputer &&
                    !this.mouseClickInProgress
                ) {
                    this.camera.trigger('leftMonitor');
                }

                if (
                    !this.inComputer &&
                    this.mouseClickInProgress &&
                    this.prevInComputer
                ) {
                    this.shouldLeaveMonitor = true;
                } else {
                    this.shouldLeaveMonitor = false;
                }

                this.application.mouse.trigger('mousemove', [event]);

                this.prevInComputer = this.inComputer;
            },
            false
        );
        document.addEventListener(
            'mousedown',
            (event) => {
                // @ts-ignore
                this.inComputer = event.inComputer;
                this.application.mouse.trigger('mousedown', [event]);

                this.mouseClickInProgress = true;
                this.prevInComputer = this.inComputer;
            },
            false
        );
        document.addEventListener(
            'mouseup',
            (event) => {
                // @ts-ignore
                this.inComputer = event.inComputer;
                this.application.mouse.trigger('mouseup', [event]);

                if (this.shouldLeaveMonitor) {
                    this.camera.trigger('leftMonitor');
                    this.shouldLeaveMonitor = false;
                }

                this.mouseClickInProgress = false;
                this.prevInComputer = this.inComputer;
            },
            false
        );
    }

    attachIframeWheelBridge() {
        this.iframeWheelCleanup?.();
        this.iframeWheelCleanup = null;

        const doc = this.getIframeDocument();
        if (!doc) return;
        this.cachedIframeScrollTarget = null;

        const handleWheel = (event: WheelEvent) => {
            const { deltaX, deltaY } = this.getWheelDelta(event);
            if (deltaX === 0 && deltaY === 0) return;

            const target = this.findScrollTarget(event, doc);
            if (!target) return;

            event.preventDefault();
            target.scrollBy({ top: deltaY, left: deltaX, behavior: 'auto' });
        };

        doc.addEventListener('wheel', handleWheel, { passive: false });
        this.iframeWheelCleanup = () => {
            doc.removeEventListener('wheel', handleWheel);
        };
    }

    getWheelDelta(event: WheelEvent) {
        let { deltaX, deltaY } = event;

        if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
            deltaX *= 40;
            deltaY *= 40;
        } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
            // DOM_DELTA_PAGE is extremely rare; approximate with 800px
            deltaX *= 800;
            deltaY *= 800;
        }

        return { deltaX, deltaY };
    }

    findScrollTarget(event: WheelEvent, doc: Document): HTMLElement | null {
        let element = this.getEventElement(event, doc);

        while (element && element !== doc.documentElement) {
            if (this.isScrollableElement(element, doc)) {
                this.cachedIframeScrollTarget = element;
                return element;
            }

            element = element.parentElement;
        }

        if (this.isCachedScrollTargetValid(doc)) {
            return this.cachedIframeScrollTarget;
        }

        return this.findFallbackScrollTarget(doc);
    }

    findFallbackScrollTarget(doc: Document): HTMLElement | null {
        const main = doc.querySelector('main');
        const candidates = [
            ...(main ? [main] : []),
            ...Array.from(doc.body?.querySelectorAll('*') || []),
        ];

        for (const candidate of candidates) {
            if (this.isHTMLElement(candidate, doc) && this.isScrollableElement(candidate, doc)) {
                this.cachedIframeScrollTarget = candidate;
                return candidate;
            }
        }

        const root = doc.scrollingElement || doc.documentElement;
        if (this.isHTMLElement(root, doc) && this.isScrollableElement(root, doc)) {
            this.cachedIframeScrollTarget = root;
            return root;
        }

        this.cachedIframeScrollTarget = null;
        return null;
    }

    isScrollableElement(element: HTMLElement, doc: Document): boolean {
        const style = doc.defaultView?.getComputedStyle(element);
        const canScrollY =
            style &&
            /(auto|scroll)/.test(style.overflowY) &&
            element.scrollHeight > element.clientHeight;
        const canScrollX =
            style &&
            /(auto|scroll)/.test(style.overflowX) &&
            element.scrollWidth > element.clientWidth;

        return Boolean(canScrollY || canScrollX);
    }

    isCachedScrollTargetValid(doc: Document): boolean {
        return Boolean(
            this.cachedIframeScrollTarget?.isConnected &&
            this.isScrollableElement(this.cachedIframeScrollTarget, doc)
        );
    }

    getEventElement(event: WheelEvent, doc: Document): HTMLElement | null {
        const target = event.target;
        return this.isHTMLElement(target, doc) ? target : null;
    }

    isHTMLElement(value: unknown, doc: Document): value is HTMLElement {
        const HTMLElementCtor = doc.defaultView?.HTMLElement;
        return Boolean(HTMLElementCtor && value instanceof HTMLElementCtor);
    }

    getIframeDocument(): Document | null {
        try {
            return this.iframe?.contentDocument || null;
        } catch {
            return null;
        }
    }

    /**
     * Creates the iframe for the computer screen
     */
    createIframe() {
        // Create container
        const container = document.createElement('div');
        container.style.width = this.screenSize.width + 'px';
        container.style.height = this.screenSize.height + 'px';
        container.style.opacity = '1';
        container.style.background = '#1d2e2f';

        // Create iframe
        const iframe = document.createElement('iframe');

        // Bubble mouse move events to the main application, so we can affect the camera
        iframe.onload = () => {
            this.attachIframeWheelBridge();

            if (iframe.contentWindow) {
                window.addEventListener('message', (event) => {
                    var evt = new CustomEvent(event.data.type, {
                        bubbles: true,
                        cancelable: false,
                    });

                    // @ts-ignore
                    evt.inComputer = true;
                    if (event.data.type === 'mousemove') {
                        var clRect = iframe.getBoundingClientRect();
                        const { top, left, width, height } = clRect;
                        const widthRatio = width / IFRAME_SIZE.w;
                        const heightRatio = height / IFRAME_SIZE.h;

                        // @ts-ignore
                        evt.clientX = Math.round(
                            event.data.clientX * widthRatio + left
                        );
                        //@ts-ignore
                        evt.clientY = Math.round(
                            event.data.clientY * heightRatio + top
                        );
                    } else if (event.data.type === 'keydown') {
                        // @ts-ignore
                        evt.key = event.data.key;
                    } else if (event.data.type === 'keyup') {
                        // @ts-ignore
                        evt.key = event.data.key;
                    }

                    iframe.dispatchEvent(evt);
                });
            }
        };

        // Set iframe attributes
        // PROD
        iframe.src = '/app/';
        /**
         * Use dev server is query params are present
         *
         * Warning: This will not work unless the dev server is running on localhost:3131
         * Also running the dev server causes browsers to freak out over unsecure connections
         * in the iframe, so it will flag a ton of issues.
         */
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('dev')) {
            iframe.src = 'http://localhost:3131/';
        }
        iframe.style.width = this.screenSize.width + 'px';
        iframe.style.height = this.screenSize.height + 'px';
        iframe.style.padding = IFRAME_PADDING + 'px';
        iframe.style.boxSizing = 'border-box';
        iframe.style.opacity = '1';
        iframe.id = 'computer-screen';
        iframe.title = 'HandyOS';
        this.iframe = iframe;

        // Add iframe to container
        container.appendChild(iframe);

        // Create CSS plane
        this.createCssPlane(container);
    }

    /**
     * Creates a CSS plane and GL plane to properly occlude the CSS plane
     * @param element the element to create the css plane for
     */
    createCssPlane(element: HTMLElement) {
        // Create CSS3D object
        const object = new CSS3DObject(element);

        // copy monitor position and rotation
        object.position.copy(this.position);
        object.rotation.copy(this.rotation);

        // Add to CSS scene
        this.cssScene.add(object);

        // Create GL plane
        const material = new THREE.MeshLambertMaterial();
        material.side = THREE.DoubleSide;
        material.opacity = 0;
        material.transparent = true;
        // NoBlending allows the GL plane to occlude the CSS plane
        material.blending = THREE.NoBlending;

        // Create plane geometry
        const geometry = new THREE.PlaneGeometry(
            this.screenSize.width,
            this.screenSize.height
        );

        // Create the GL plane mesh
        const mesh = new THREE.Mesh(geometry, material);

        // Copy the position, rotation and scale of the CSS plane to the GL plane
        mesh.position.copy(object.position);
        mesh.rotation.copy(object.rotation);
        mesh.scale.copy(object.scale);

        // Add to gl scene
        this.scene.add(mesh);
    }


    /**
     * Adds a texture layer to the screen
     * @param texture the texture to add
     * @param blending the blending mode
     * @param opacity the opacity of the texture
     * @param offset the offset of the texture, higher values are further from the screen
     * @returns the created material
     */
    addTextureLayer(
        texture: THREE.Texture,
        blendingMode: THREE.Blending,
        opacity: number,
        offset: number
    ): THREE.MeshBasicMaterial {
        // Create material
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            blending: blendingMode,
            side: THREE.DoubleSide,
            opacity,
            transparent: true,
        });

        // Create geometry
        const geometry = new THREE.PlaneGeometry(
            this.screenSize.width,
            this.screenSize.height
        );

        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);

        // Copy position and apply the depth offset
        mesh.position.copy(
            this.offsetPosition(this.position, new THREE.Vector3(0, 0, offset))
        );

        // Copy rotation
        mesh.rotation.copy(this.rotation);

        this.scene.add(mesh);

        return material;
    }

    /**
     * Adds a texture layer with a fade-in animation
     */
    addTextureLayerWithFade(
        texture: THREE.Texture,
        blendingMode: THREE.Blending,
        targetOpacity: number,
        offset: number,
        duration = 500,
    ): void {
        const material = this.addTextureLayer(texture, blendingMode, 0, offset);
        this.fadeInMaterial(material, targetOpacity, duration);
    }

    private fadeInMaterial(
        material: THREE.MeshBasicMaterial,
        targetOpacity: number,
        duration: number,
    ): void {
        const startTime = performance.now();
        const fadeIn = () => {
            const progress = Math.min((performance.now() - startTime) / duration, 1);
            material.opacity = targetOpacity * progress;
            if (progress < 1) {
                requestAnimationFrame(fadeIn);
            }
        };
        requestAnimationFrame(fadeIn);
    }

    addSmudgeLayer(texture: LoadedTexture) {
        this.addTextureLayerWithFade(texture, THREE.AdditiveBlending, 0.12, SMUDGE_OFFSET);
    }

    addShadowLayer(texture: LoadedTexture) {
        this.addTextureLayerWithFade(texture, THREE.NormalBlending, 1, SHADOW_OFFSET);
    }

    /**
     * Creates enclosing planes for the computer screen
     * @param maxOffset the maximum offset of the texture layers
     */
    createEnclosingPlanes(maxOffset: number) {
        // Create planes, lots of boiler plate code here because I'm lazy
        const planes = {
            left: {
                size: new THREE.Vector2(maxOffset, this.screenSize.height),
                position: this.offsetPosition(
                    this.position,
                    new THREE.Vector3(
                        -this.screenSize.width / 2,
                        0,
                        maxOffset / 2
                    )
                ),
                rotation: new THREE.Euler(0, 90 * THREE.MathUtils.DEG2RAD, 0),
            },
            right: {
                size: new THREE.Vector2(maxOffset, this.screenSize.height),
                position: this.offsetPosition(
                    this.position,
                    new THREE.Vector3(
                        this.screenSize.width / 2,
                        0,
                        maxOffset / 2
                    )
                ),
                rotation: new THREE.Euler(0, 90 * THREE.MathUtils.DEG2RAD, 0),
            },
            top: {
                size: new THREE.Vector2(this.screenSize.width, maxOffset),
                position: this.offsetPosition(
                    this.position,
                    new THREE.Vector3(
                        0,
                        this.screenSize.height / 2,
                        maxOffset / 2
                    )
                ),
                rotation: new THREE.Euler(90 * THREE.MathUtils.DEG2RAD, 0, 0),
            },
            bottom: {
                size: new THREE.Vector2(this.screenSize.width, maxOffset),
                position: this.offsetPosition(
                    this.position,
                    new THREE.Vector3(
                        0,
                        -this.screenSize.height / 2,
                        maxOffset / 2
                    )
                ),
                rotation: new THREE.Euler(90 * THREE.MathUtils.DEG2RAD, 0, 0),
            },
        };

        // Add each of the planes
        for (const [_, plane] of Object.entries(planes)) {
            this.createEnclosingPlane(plane);
        }
    }

    /**
     * Creates a plane for the enclosing planes
     * @param plane the plane to create
     */
    createEnclosingPlane(plane: EnclosingPlane) {
        const material = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            color: 0x48493f,
        });

        const geometry = new THREE.PlaneGeometry(plane.size.x, plane.size.y);
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.copy(plane.position);
        mesh.rotation.copy(plane.rotation);

        this.scene.add(mesh);
    }

    createPerspectiveDimmer(maxOffset: number) {
        const material = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            color: 0x000000,
            transparent: true,
            blending: THREE.AdditiveBlending,
        });

        const plane = new THREE.PlaneGeometry(
            this.screenSize.width,
            this.screenSize.height
        );

        const mesh = new THREE.Mesh(plane, material);

        mesh.position.copy(
            this.offsetPosition(
                this.position,
                new THREE.Vector3(0, 0, maxOffset - 5)
            )
        );

        mesh.rotation.copy(this.rotation);

        this.dimmingPlane = mesh;

        this.scene.add(mesh);
    }

    /**
     * Offsets a position vector by another vector
     * @param position the position to offset
     * @param offset the offset to apply
     * @returns the new offset position
     */
    offsetPosition(position: THREE.Vector3, offset: THREE.Vector3) {
        const newPosition = new THREE.Vector3();
        newPosition.copy(position);
        newPosition.add(offset);
        return newPosition;
    }

    update() {
        if (this.dimmingPlane) {
            const planeNormal = new THREE.Vector3(0, 0, 1);
            const viewVector = new THREE.Vector3();
            viewVector.copy(this.camera.instance.position);
            viewVector.sub(this.position);
            viewVector.normalize();

            const dot = viewVector.dot(planeNormal);

            // calculate the distance from the camera vector to the plane vector
            const dimPos = this.dimmingPlane.position;
            const camPos = this.camera.instance.position;

            const distance = Math.sqrt(
                (camPos.x - dimPos.x) ** 2 +
                    (camPos.y - dimPos.y) ** 2 +
                    (camPos.z - dimPos.z) ** 2
            );

            const opacity = 1 / (distance / 10000);

            const DIM_FACTOR = 0.7;

            // @ts-ignore
            this.dimmingPlane.material.opacity =
                (1 - opacity) * DIM_FACTOR + (1 - dot) * DIM_FACTOR;
        }
    }
}
