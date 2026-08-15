import * as THREE from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

/** Vertices closer than this (local units) are treated as the same point. */
const SAME_POINT_EPSILON = 1e-6;

/** Clip-path vertices are pulled this far toward the host centre (2% inset). */
const CLIP_INSET = 0.98;

/** The overlay floats this far above the paper plane (world units). */
const LIFT = new THREE.Vector3(0, 1, 0);

type AttributeSnapshot = string | null;

/**
 * World-space direction of the paper's printed content "up" edge: the vertex
 * with the largest UV v minus the smallest (UV v runs up the page), flipped
 * 180° because the baked decor texture stores the paper content head-down.
 * Falls back to the longest edge between any two vertices when the mesh has
 * no usable UVs. Shared by World (camera paper framing) and PaperScreen
 * (overlay orientation) so both consumers always agree on which way the
 * printed content reads.
 */
export function paperContentUp(
	geometry: THREE.BufferGeometry,
	matrixWorld: THREE.Matrix4,
): THREE.Vector3 {
	const position = geometry.getAttribute("position");
	const uv =
		geometry.getAttribute("uv") ?? geometry.getAttribute("TEXCOORD_0");
	if (uv && uv.count >= 2) {
		let maxI = 0;
		let minI = 0;
		for (let i = 1; i < uv.count; i++) {
			if (uv.getY(i) > uv.getY(maxI)) maxI = i;
			if (uv.getY(i) < uv.getY(minI)) minI = i;
		}
		if (maxI !== minI) {
			return (
				new THREE.Vector3()
					.subVectors(
						new THREE.Vector3().fromBufferAttribute(position, maxI),
						new THREE.Vector3().fromBufferAttribute(position, minI),
					)
					.transformDirection(matrixWorld)
					.normalize()
					// The baked decor texture stores the paper content head-down
					// (content "up" points toward the smaller UV v, verified in
					// the rendered scene), so flip the derived direction 180°.
					.multiplyScalar(-1)
			);
		}
	}
	// Fallback: the longest edge between any two vertices.
	let best = new THREE.Vector3(0, 0, 1);
	let bestLength = -1;
	for (let i = 0; i < position.count; i++) {
		for (let j = i + 1; j < position.count; j++) {
			const direction = new THREE.Vector3()
				.subVectors(
					new THREE.Vector3().fromBufferAttribute(position, j),
					new THREE.Vector3().fromBufferAttribute(position, i),
				)
				.transformDirection(matrixWorld);
			if (direction.lengthSq() > bestLength) {
				bestLength = direction.lengthSq();
				best = direction;
			}
		}
	}
	return best.normalize();
}

/**
 * Transparent CSS3D overlay mounted above the desk paper quad — the mount
 * point for future mini-games. The scene passed in is the paper-dedicated
 * CSS layer (paperCssScene), rendered by a second CSS3DRenderer into its own
 * z3 container above the WebGL canvas, so the overlay no longer shares the
 * monitor's cssScene and is unaffected by it. Everything is derived from the
 * mesh geometry at runtime (no baked model data): unique vertices are
 * extracted and de-duplicated, the host frame is content-driven (element
 * CSS-up = the printed content's "up" direction from paperContentUp(),
 * element front = world up, width/height span the content axes — so a
 * portrait printed page stays a portrait overlay), and a clip-path polygon
 * (inset 2% toward the centre) keeps game content inside the paper's
 * silhouette.
 *
 * No occlusion plane: CSS3DRenderer composites its elements in the DOM layer
 * above the WebGL canvas, so a depth-writing plane cannot make 3D geometry
 * occlude the overlay — and a plane coplanar with the paper mesh fights it
 * per-pixel (rasterization noise), punching dynamic transparent holes in the
 * paper on the canvas that show the scene's dark backdrop through the
 * transparent overlay as flickering black shards (verified in the rendered
 * scene). MonitorScreen's plane is only invisible because its host has an
 * opaque background.
 */
export class PaperScreen {
	readonly object: CSS3DObject;
	private readonly styleBefore: AttributeSnapshot;
	private readonly draggableBefore: AttributeSnapshot;
	private readonly attachedBefore: AttributeSnapshot;
	private destroyed = false;

	constructor(
		private readonly cssScene: THREE.Scene,
		private readonly host: HTMLElement,
		geometry: THREE.BufferGeometry,
		matrixWorld: THREE.Matrix4,
	) {
		// Snapshot before CSS3DObject mutates the host (position/draggable/...).
		this.styleBefore = host.getAttribute("style");
		this.draggableBefore = host.getAttribute("draggable");
		this.attachedBefore = host.getAttribute("data-three-paper-attached");

		const local = this.extractVertices(geometry);
		const world = local.map((vertex) =>
			vertex.clone().applyMatrix4(matrixWorld),
		);

		const center = new THREE.Vector3();
		for (const vertex of world) center.add(vertex);
		center.divideScalar(world.length);

		// Content-driven basis: the element front (local +z) faces world up and
		// the element CSS-up (local −y) shows the printed content "up" edge, so
		// the host reads the same way round as the printed page. Local +y (CSS
		// downward) is therefore the negated content-up direction.
		const contentUp = paperContentUp(geometry, matrixWorld);
		const yAxis = contentUp.clone().negate();
		const zAxis = new THREE.Vector3(0, 1, 0);
		zAxis.addScaledVector(yAxis, -zAxis.dot(yAxis));
		if (zAxis.lengthSq() < 1e-16) {
			// Content up is parallel to world up (standing paper): pick any
			// perpendicular to keep the basis deterministic.
			zAxis.crossVectors(new THREE.Vector3(0, 0, 1), yAxis).normalize();
		} else {
			zAxis.normalize();
		}
		// Right-handed by construction: x = y × z ⟹ x × y = z.
		const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
		const width = this.extentAlong(world, xAxis);
		const height = this.extentAlong(world, contentUp);

		this.object = new CSS3DObject(host);
		this.object.position.copy(center).add(LIFT);
		this.object.quaternion.setFromRotationMatrix(
			new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis),
		);
		this.cssScene.add(this.object);

		host.dataset.threePaperAttached = "true";
		host.style.width = `${width}px`;
		host.style.height = `${height}px`;
		host.style.background = "transparent";
		host.style.pointerEvents = "auto";
		host.style.overflow = "hidden";
		host.style.clipPath = this.clipPath(
			world,
			center,
			xAxis,
			contentUp,
			width,
			height,
		);
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;

		// CSS3DObject removes its element from the DOM on the Object3D 'removed'
		// event. Point it at a sacrificial node before removal so the real host
		// (possibly reparented by the CSS3D renderer) survives untouched.
		const removalMarker = document.createElement("div");
		this.object.element = removalMarker;
		this.restoreHost();
		this.cssScene.remove(this.object);
	}

	private restoreHost(): void {
		this.restoreAttribute("style", this.styleBefore);
		this.restoreAttribute("draggable", this.draggableBefore);
		this.restoreAttribute("data-three-paper-attached", this.attachedBefore);
	}

	private restoreAttribute(name: string, value: AttributeSnapshot): void {
		if (value === null) this.host.removeAttribute(name);
		else this.host.setAttribute(name, value);
	}

	private extractVertices(geometry: THREE.BufferGeometry): THREE.Vector3[] {
		const position = geometry.getAttribute("position");
		if (!position) {
			throw new Error("PaperScreen: geometry has no position attribute");
		}
		const vertices: THREE.Vector3[] = [];
		const probe = new THREE.Vector3();
		for (let i = 0; i < position.count; i++) {
			probe.fromBufferAttribute(position, i);
			const isDuplicate = vertices.some(
				(vertex) => vertex.distanceToSquared(probe) < SAME_POINT_EPSILON ** 2,
			);
			if (!isDuplicate) vertices.push(probe.clone());
		}
		if (vertices.length < 3) {
			throw new Error(
				`PaperScreen: expected at least 3 unique vertices, got ${vertices.length}`,
			);
		}
		return vertices;
	}

	/** World-space range of the vertex projections onto `axis`. */
	private extentAlong(world: THREE.Vector3[], axis: THREE.Vector3): number {
		let min = Infinity;
		let max = -Infinity;
		for (const vertex of world) {
			const projection = vertex.dot(axis);
			if (projection < min) min = projection;
			if (projection > max) max = projection;
		}
		return max - min;
	}

	/**
	 * Clip-path polygon (in % of the host) mapping every world vertex into the
	 * content-driven host frame: u runs along the width axis (local +x), v
	 * along the content-up axis (local −y), inset 2% toward the centre.
	 */
	private clipPath(
		world: THREE.Vector3[],
		center: THREE.Vector3,
		xAxis: THREE.Vector3,
		contentUp: THREE.Vector3,
		width: number,
		height: number,
	): string {
		const projected = world.map((vertex) => {
			const offset = vertex.clone().sub(center);
			const u = offset.dot(xAxis) / width;
			const v = offset.dot(contentUp) / height;
			// CSS y runs downward while v grows along the content-up axis,
			// hence the flipped v sign; then inset 2% toward the host centre
			// (50%, 50%).
			const px = 50 + ((u + 0.5) * 100 - 50) * CLIP_INSET;
			const py = 50 + ((0.5 - v) * 100 - 50) * CLIP_INSET;
			return new THREE.Vector2(px, py);
		});
		// Cyclic order around the centroid keeps the polygon simple (non
		// self-intersecting) for any convex paper shape and vertex ordering.
		const centroid = new THREE.Vector2();
		for (const point of projected) centroid.add(point);
		centroid.divideScalar(projected.length);
		const ordered = [...projected].sort(
			(p, q) =>
				Math.atan2(p.y - centroid.y, p.x - centroid.x) -
				Math.atan2(q.y - centroid.y, q.x - centroid.x),
		);
		return `polygon(${ordered
			.map((point) => `${point.x.toFixed(1)}% ${point.y.toFixed(1)}%`)
			.join(", ")})`;
	}
}
