import * as THREE from "three";
import type { Camera } from "./Camera";

// Hover detection for the flat desk paper (decor.glb node 'paper'). Unlike the
// monitor (a real DOM host), the paper is a plain WebGL mesh: the webgl canvas
// never receives pointer events (`.public-webgl-mount` has pointer-events:
// none), so this tracker raycasts from the pointer's NDC position on every
// pointermove. Hovering enters the paper camera view; the view is sticky and
// is only left via the monitor tracker's click-to-toggle behavior, so clicks
// on the paper itself are swallowed (stopImmediatePropagation) to keep the
// monitor tracker from treating them as clicks outside the screen.
export class PaperPointerTracker {
	private readonly raycaster = new THREE.Raycaster();
	private destroyed = false;
	private hovering = false;

	constructor(
		private readonly documentTarget: Document,
		private readonly host: HTMLElement,
		private readonly canvas: HTMLCanvasElement,
		private readonly camera: Camera,
		private readonly getPaper: () => THREE.Mesh | null,
	) {}

	start(): void {
		if (this.destroyed) return;
		this.documentTarget.addEventListener("pointermove", this.onPointerMove);
		this.documentTarget.addEventListener("pointerdown", this.onPointerDown);
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		this.documentTarget.removeEventListener("pointermove", this.onPointerMove);
		this.documentTarget.removeEventListener("pointerdown", this.onPointerDown);
		this.hovering = false;
	}

	private isInsideHost(event: Event): boolean {
		return event.target instanceof Node && this.host.contains(event.target);
	}

	private readonly onPointerMove = (event: PointerEvent) => {
		if (this.isInsideHost(event)) {
			this.setHovering(false);
			return;
		}
		const paper = this.getPaper();
		if (!paper) {
			this.setHovering(false);
			return;
		}
		const rect = this.canvas.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) {
			this.setHovering(false);
			return;
		}
		const ndc = new THREE.Vector2(
			((event.clientX - rect.left) / rect.width) * 2 - 1,
			-((event.clientY - rect.top) / rect.height) * 2 + 1,
		);
		this.raycaster.setFromCamera(ndc, this.camera.instance);
		// The mesh's matrixWorld may be stale before the first render; refresh it
		// so hover works immediately after the model loads.
		paper.updateWorldMatrix(true, false);
		this.setHovering(this.raycaster.intersectObject(paper, false).length > 0);
	};

	private readonly onPointerDown = (event: PointerEvent) => {
		if (this.isInsideHost(event)) return;
		if (!this.hovering) return;
		// Clicking the paper is a no-op; swallow the event so the monitor tracker
		// (registered after this one) does not toggle the desk view.
		event.stopImmediatePropagation();
	};

	private setHovering(hovering: boolean): void {
		if (hovering === this.hovering) return;
		this.hovering = hovering;
		if (hovering) this.camera.enterPaper();
	}
}
