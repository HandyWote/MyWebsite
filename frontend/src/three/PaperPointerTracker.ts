import * as THREE from "three";
import type { Camera } from "./Camera";

// Hover detection for the flat desk paper (decor.glb node 'paper'). Unlike the
// monitor (a real DOM host), the paper is a plain WebGL mesh: the webgl canvas
// never receives pointer events (`.public-webgl-mount` has pointer-events:
// none), so this tracker raycasts from the pointer's NDC position on every
// pointermove. Hovering enters the paper camera view; the view is sticky and
// is only left via the monitor tracker's click-to-toggle behavior, so clicks
// on the paper — the mesh or the game overlay host (#paper-screen-host) — are
// swallowed (stopImmediatePropagation) to keep the monitor tracker from
// treating them as clicks outside the screen. The overlay-host check matters
// for touches: a first contact has no preceding pointermove raycast, so the
// hover state alone would not cover it.
export class PaperPointerTracker {
	private readonly raycaster = new THREE.Raycaster();
	private destroyed = false;
	private hovering = false;

	constructor(
		private readonly documentTarget: Document,
		/** Monitor 屏幕宿主：悬停其上时排除纸面 hover。 */
		private readonly screenHost: HTMLElement,
		/** 纸面游戏宿主（#paper-screen-host）：其内的点击一律吞掉。 */
		private readonly paperHost: HTMLElement,
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

	private isInsideScreenHost(event: Event): boolean {
		return (
			event.target instanceof Node && this.screenHost.contains(event.target)
		);
	}

	private isInsidePaperHost(event: Event): boolean {
		return (
			event.target instanceof Node && this.paperHost.contains(event.target)
		);
	}

	private readonly onPointerMove = (event: PointerEvent) => {
		if (this.isInsideScreenHost(event)) {
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
		// 屏幕宿主内的点击维持透传（monitor tracker 自身对其 no-op）。
		if (this.isInsideScreenHost(event)) return;
		// 游戏遮罩内的点击就是纸面上的点击：无条件吞掉，否则 monitor tracker
		// 会把它当作屏幕外点击切换 desk 视角（触摸首次落笔无先行 hover）。
		if (this.isInsidePaperHost(event)) {
			event.stopImmediatePropagation();
			return;
		}
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
