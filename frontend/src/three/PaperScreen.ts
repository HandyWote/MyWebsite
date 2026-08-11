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
 * Transparent CSS3D overlay mounted above the desk paper quad — the mount
 * point for future mini-games. The scene passed in is the paper-dedicated
 * CSS layer (paperCssScene), rendered by a second CSS3DRenderer into its own
 * z3 container above the WebGL canvas, so the overlay no longer shares the
 * monitor's cssScene and is unaffected by it. Everything is derived from the
 * mesh geometry at runtime (no baked model data): unique vertices are
 * extracted and de-duplicated, the longest hull edge becomes the host's
 * width axis, and a clip-path polygon (inset 2% toward the centre) keeps
 * game content inside the paper's silhouette.
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
		const { a, b, c, L1, L2 } = this.selectSides(local, world);

		const center = new THREE.Vector3();
		for (const vertex of world) center.add(vertex);
		center.divideScalar(world.length);

		// e1 follows the longest paper edge (sign is arbitrary: the rotation and
		// the clip-path share the same basis, so flipping it mirrors both).
		const e1 = new THREE.Vector3().subVectors(world[a], world[b]).normalize();
		const e2 = new THREE.Vector3().subVectors(world[c], world[a]).normalize();

		// The host lies flat over the paper, long edge along local +x, facing up.
		this.object = new CSS3DObject(host);
		this.object.position.copy(center).add(LIFT);
		this.object.quaternion.setFromRotationMatrix(this.rotationBasis(e1));
		this.cssScene.add(this.object);

		host.dataset.threePaperAttached = "true";
		host.style.width = `${L1}px`;
		host.style.height = `${L2}px`;
		host.style.background = "transparent";
		host.style.pointerEvents = "auto";
		host.style.overflow = "hidden";
		host.style.clipPath = this.clipPath(world, center, e1, e2, L1, L2);
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

	/**
	 * Hull edges only: a pair is a side when every other vertex lies on the
	 * same side of its line (a diagonal splits the remaining vertices). Returns
	 * the longest side (a, b) and the longest other side (a, c) sharing a —
	 * (a, c) covers subdivided edges, where the true corner is the farthest
	 * collinear neighbour. Sizes are world-space distances.
	 */
	private selectSides(
		local: THREE.Vector3[],
		world: THREE.Vector3[],
	): { a: number; b: number; c: number; L1: number; L2: number } {
		const sides: Array<[number, number]> = [];
		for (let i = 0; i < local.length; i++) {
			for (let j = i + 1; j < local.length; j++) {
				if (this.isHullEdge(local, i, j)) sides.push([i, j]);
			}
		}

		let a = -1;
		let b = -1;
		let L1 = -1;
		for (const [i, j] of sides) {
			const length = world[i].distanceTo(world[j]);
			if (length > L1) {
				a = i;
				b = j;
				L1 = length;
			}
		}

		let c = -1;
		let L2 = -1;
		for (const [i, j] of sides) {
			const other = i === a ? j : j === a ? i : -1;
			if (other === -1 || other === b) continue;
			const length = world[a].distanceTo(world[other]);
			if (length > L2) {
				c = other;
				L2 = length;
			}
		}
		if (a === -1 || c === -1) {
			throw new Error("PaperScreen: could not find two paper edges");
		}
		return { a, b, c, L1, L2 };
	}

	private isHullEdge(points: THREE.Vector3[], i: number, j: number): boolean {
		const base = new THREE.Vector3().subVectors(points[j], points[i]);
		let reference: THREE.Vector3 | null = null;
		for (let k = 0; k < points.length; k++) {
			if (k === i || k === j) continue;
			const cross = new THREE.Vector3()
				.subVectors(points[k], points[i])
				.cross(base);
			if (cross.lengthSq() < 1e-24) continue; // collinear with the edge
			if (reference === null) reference = cross;
			else if (reference.dot(cross) < 0) return false; // opposite sides: a diagonal
		}
		return true;
	}

	/** Rotation matrix mapping local +x onto e1 and local +z onto world +y. */
	private rotationBasis(e1: THREE.Vector3): THREE.Matrix4 {
		const xAxis = e1.clone().normalize();
		const up = new THREE.Vector3(0, 1, 0);
		const zAxis = new THREE.Vector3()
			.copy(up)
			.addScaledVector(xAxis, -up.dot(xAxis));
		if (zAxis.lengthSq() < 1e-16) {
			// e1 parallel to world up (standing paper): pick any perpendicular.
			zAxis.crossVectors(new THREE.Vector3(0, 0, 1), xAxis).normalize();
		} else {
			zAxis.normalize();
		}
		const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis);
		return new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
	}

	private clipPath(
		world: THREE.Vector3[],
		center: THREE.Vector3,
		e1: THREE.Vector3,
		e2: THREE.Vector3,
		L1: number,
		L2: number,
	): string {
		const projected = world.map((vertex) => {
			const offset = vertex.clone().sub(center);
			const u = offset.dot(e1) / L1;
			const v = offset.dot(e2) / L2;
			// CSS y runs downward, hence the flipped v sign; then inset 2% toward
			// the host centre (50%, 50%).
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
