import type { PaperScreen } from "./PaperScreen";

/**
 * Screen-space 2D interaction layer for the paper close-up (focus) view.
 *
 * Chromium's hit-testing for CSS3D/preserve-3d elements disagrees with its
 * painting near the degenerate z≈0 region of a close perspective camera: in
 * the paper view only roughly the top third of the game host receives
 * pointer events, the rest falls through to the background. Fix without
 * touching the 3D scene: once the camera settles on 'paper', the game host
 * (#paper-screen-host) is "moved out" of the CSS3D scene onto a plain
 * absolutely-positioned 2D layer aligned to the host's projected AABB at
 * that instant (no 3D transforms below it → hit-testing is 100% reliable);
 * when leaving the paper view it is moved back synchronously before the
 * camera tween starts, while the CSS3D projection still coincides with the
 * 2D placement, so the handover is invisible. The CSS3D scene keeps an
 * invisible same-sized placeholder that still receives the renderer-written
 * transform, which is what realign() re-measures after a resize.
 *
 * The layer div is appended to the paper mount (.public-paper-mount, the
 * pointer-events:none z3 container); the layer itself re-enables pointer
 * events. All styling is inline — no stylesheet changes.
 */
export class PaperFocusLayer {
	private layer: HTMLDivElement | null = null;
	private paperScreen: PaperScreen | null = null;
	private host: HTMLElement | null = null;
	private hostParent: Node | null = null;
	private layoutHeight = 0;
	private destroyed = false;

	constructor(
		private readonly mount: HTMLElement,
		private readonly getPaperScreen: () => PaperScreen | null,
	) {}

	get engaged(): boolean {
		return this.layer !== null;
	}

	/**
	 * Takes over the game host while it still hangs in the CSS3D scene:
	 * measures the projected AABB (getBoundingClientRect) and the layout
	 * size (offsetWidth/offsetHeight, the paper's unscaled CSS size), then
	 * creates the 2D layer, swaps the host's CSS3DObject element for the
	 * placeholder and moves the host into the layer. Idempotent; no-op when
	 * no paper screen exists yet or the projection degenerates to zero.
	 */
	engage(): void {
		if (this.destroyed || this.layer) return;
		const paperScreen = this.getPaperScreen();
		if (!paperScreen || paperScreen.placeholderElement) return;
		const host = paperScreen.object.element;
		if (!(host instanceof HTMLElement)) return;
		const rect = host.getBoundingClientRect();
		const height = host.offsetHeight;
		if (
			rect.width === 0 ||
			rect.height === 0 ||
			height === 0 ||
			host.offsetWidth === 0
		) {
			return;
		}

		const layer = document.createElement("div");
		layer.dataset.paperFocusLayer = "true";
		layer.style.position = "absolute";
		// Pin to the mount's origin: with top/left auto the layer would sit at
		// its static position — below the mount's full-height CSS3D renderer
		// root (1000px tall sibling) — and the translate would stack on top of
		// that offset, placing the paper a full viewport below its projection.
		layer.style.top = "0px";
		layer.style.left = "0px";
		layer.style.transformOrigin = "0 0";
		layer.style.width = `${host.offsetWidth}px`;
		layer.style.height = `${height}px`;
		layer.style.pointerEvents = "auto";
		// The mount also holds the (unpositioned) CSS3D renderer root; any
		// positive z keeps the layer above it within the mount's stacking
		// context — the mount itself (z3) fixes the stacking vs the scene.
		layer.style.zIndex = "1";

		this.layer = layer;
		this.paperScreen = paperScreen;
		this.host = host;
		this.hostParent = host.parentNode;
		this.layoutHeight = height;

		this.mount.appendChild(layer);
		paperScreen.detachHost();
		layer.appendChild(host);
		this.applyRect(rect);
	}

	/**
	 * Returns the host to the CSS3D scene (restoring its transform snapshot)
	 * and removes the layer. Synchronous: call before the camera leaves the
	 * paper pose so both projections coincide at the swap. Idempotent.
	 */
	release(): void {
		const layer = this.layer;
		if (!layer) return;
		this.layer = null;
		const paperScreen = this.paperScreen;
		const host = this.host;
		const hostParent = this.hostParent;
		this.paperScreen = null;
		this.host = null;
		this.hostParent = null;
		this.layoutHeight = 0;

		// Restore the CSS3DObject element + transform snapshot first, then put
		// the host back into its original parent (the CSS3D renderer's
		// cameraElement) so the very next paint is identical to the 2D frame.
		paperScreen?.reattachHost();
		if (host && hostParent) hostParent.appendChild(host);
		layer.remove();
	}

	/**
	 * Re-measures the projection from the CSS3D placeholder and updates the
	 * layer transform (window resize while engaged). No-op when not engaged.
	 */
	realign(): void {
		const layer = this.layer;
		const placeholder = this.paperScreen?.placeholderElement;
		if (!layer || !placeholder) return;
		const rect = placeholder.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		this.applyRect(rect);
	}

	/** Equivalent to release(); a no-op when not engaged. Idempotent. */
	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		this.release();
	}

	/** Positions the layer so it exactly covers the given projected rect. */
	private applyRect(rect: DOMRect): void {
		const layer = this.layer;
		if (!layer || this.layoutHeight === 0) return;
		const mountRect = this.mount.getBoundingClientRect();
		const x = rect.left - mountRect.left;
		const y = rect.top - mountRect.top;
		// Uniform scale by the height ratio keeps the paper's aspect; at the
		// paper view distance the projection is near-orthographic, so the
		// width ratio matches to sub-pixel precision.
		const scale = rect.height / this.layoutHeight;
		layer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
	}
}
