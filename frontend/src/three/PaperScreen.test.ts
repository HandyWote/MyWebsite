import * as THREE from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { describe, expect, it } from "vitest";
import { PaperScreen } from "./PaperScreen";

// The desk paper quad from decor.glb (local GLB coordinates; the decor model
// is baked at ×900, so the scale lives in matrixWorld).
const PAPER_LOCAL: ReadonlyArray<readonly [number, number, number]> = [
	[-2.29, -0.494, 1.693],
	[-2.858, -0.494, 0.904],
	[-1.728, -0.494, 1.288],
	[-2.296, -0.494, 0.499],
];

const SCALE = 900;
const TRANSLATION = new THREE.Vector3(1, 2, 3);

function paperGeometry(): THREE.BufferGeometry {
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.BufferAttribute(new Float32Array(PAPER_LOCAL.flat()), 3),
	);
	return geometry;
}

function paperMatrixWorld(): THREE.Matrix4 {
	const holder = new THREE.Object3D();
	holder.position.copy(TRANSLATION);
	holder.scale.setScalar(SCALE);
	holder.updateMatrixWorld(true);
	return holder.matrixWorld;
}

// Expected values are derived from the same float32 buffer the module reads
// (full-precision JS numbers would differ at the 1e-5 scale after ×900).
function worldVertices(geometry: THREE.BufferGeometry): THREE.Vector3[] {
	const position = geometry.getAttribute("position");
	const vertices: THREE.Vector3[] = [];
	for (let i = 0; i < position.count; i++) {
		vertices.push(
			new THREE.Vector3()
				.fromBufferAttribute(position, i)
				.applyMatrix4(paperMatrixWorld()),
		);
	}
	return vertices;
}

function expectClose(
	actual: number,
	expected: number,
	tolerance: number,
): void {
	expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

function expectVectorClose(
	actual: THREE.Vector3,
	expected: THREE.Vector3,
	tolerance: number,
): void {
	expect(actual.distanceTo(expected)).toBeLessThanOrEqual(tolerance);
}

describe("PaperScreen", () => {
	it("aligns the CSS3D overlay to the paper quad extracted from the geometry", () => {
		const cssScene = new THREE.Scene();
		const host = document.createElement("div");
		const geometry = paperGeometry();
		const paper = new PaperScreen(cssScene, host, geometry, paperMatrixWorld());

		// CSS3DObject in cssScene, wrapping the exact host element.
		expect(paper.object).toBeInstanceOf(CSS3DObject);
		expect(paper.object.element).toBe(host);
		expect(cssScene.children).toContain(paper.object);

		// Centre: average of the four world-space vertices, lifted 1 world unit.
		const center = new THREE.Vector3();
		for (const vertex of worldVertices(geometry)) center.add(vertex);
		center.divideScalar(4);
		expectVectorClose(
			paper.object.position,
			center.clone().add(new THREE.Vector3(0, 1, 0)),
			1e-6,
		);

		// Host dimensions: long side ≈ 875, short side ≈ 624 (×900 scale).
		const world = worldVertices(geometry);
		const L1 = world[0].distanceTo(world[1]);
		const L2 = world[0].distanceTo(world[2]);
		expectClose(parseFloat(host.style.width), L1, 1e-4);
		expectClose(parseFloat(host.style.height), L2, 1e-4);
		expectClose(parseFloat(host.style.width), 875, 1);
		expectClose(parseFloat(host.style.height), 624, 1);

		// Local +x maps to the longest edge direction (A − B, i.e.
		// (0.568, 0, 0.789) / 0.972 in world), local +z to world up.
		const expectedE1 = new THREE.Vector3(0.568, 0, 0.789).normalize();
		const fromVertices = new THREE.Vector3()
			.subVectors(world[0], world[1])
			.normalize();
		expectVectorClose(fromVertices, expectedE1, 1e-6);
		paper.object.updateMatrixWorld();
		const xDir = new THREE.Vector3(1, 0, 0).transformDirection(
			paper.object.matrixWorld,
		);
		const zDir = new THREE.Vector3(0, 0, 1).transformDirection(
			paper.object.matrixWorld,
		);
		expectVectorClose(xDir, expectedE1, 1e-6);
		expectVectorClose(zDir, new THREE.Vector3(0, 1, 0), 1e-6);

		// clip-path: 4 percentages, inset 2% toward the (50%, 50%) centre.
		const e2 = new THREE.Vector3().subVectors(world[2], world[0]).normalize();
		const expected = world.map((vertex) => {
			const offset = vertex.clone().sub(center);
			const u = offset.dot(expectedE1) / L1;
			const v = offset.dot(e2) / L2;
			const px = 50 + ((u + 0.5) * 100 - 50) * 0.98;
			const py = 50 + ((0.5 - v) * 100 - 50) * 0.98;
			return new THREE.Vector2(px, py);
		});
		const centroid = new THREE.Vector2();
		for (const point of expected) centroid.add(point);
		centroid.divideScalar(expected.length);
		const expectedOrdered = [...expected].sort(
			(p, q) =>
				Math.atan2(p.y - centroid.y, p.x - centroid.x) -
				Math.atan2(q.y - centroid.y, q.x - centroid.x),
		);

		expect(host.style.clipPath).toMatch(/^polygon\(/);
		const percentages = [
			...host.style.clipPath.matchAll(/(-?[\d.]+)% (-?[\d.]+)%/g),
		].map((match) => [parseFloat(match[1]), parseFloat(match[2])] as const);
		expect(percentages).toHaveLength(4);
		percentages.forEach(([px, py], i) => {
			expectClose(px, expectedOrdered[i].x, 0.11); // toFixed(1) rounding
			expectClose(py, expectedOrdered[i].y, 0.11);
			expect(px).toBeGreaterThan(0.9); // the 2% inset keeps values inside 1..99
			expect(px).toBeLessThan(99.1);
			expect(py).toBeGreaterThan(0.9);
			expect(py).toBeLessThan(99.1);
		});

		// Host markers/styles for the game mount.
		expect(host.getAttribute("data-three-paper-attached")).toBe("true");
		expect(host.style.background).toBe("transparent");
		expect(host.style.pointerEvents).toBe("auto");
		expect(host.style.overflow).toBe("hidden");

		// No occlusion plane: CSS3D composites above the canvas, so a coplanar
		// depth plane would only fight the paper mesh per-pixel (see the class
		// comment). The overlay must be the only object in the css scene.
		expect(cssScene.children).toHaveLength(1);
		expect(cssScene.children).toContain(paper.object);
	});

	it("deduplicates shared vertices before measuring the paper", () => {
		// Two triangles sharing vertices, like a real GLB quad strip.
		const positions = [
			...PAPER_LOCAL[0],
			...PAPER_LOCAL[1],
			...PAPER_LOCAL[2],
			...PAPER_LOCAL[1],
			...PAPER_LOCAL[3],
			...PAPER_LOCAL[2],
		];
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(new Float32Array(positions), 3),
		);

		const cssScene = new THREE.Scene();
		const host = document.createElement("div");
		const paper = new PaperScreen(cssScene, host, geometry, paperMatrixWorld());

		expectClose(parseFloat(host.style.width), 875, 1);
		expectClose(parseFloat(host.style.height), 624, 1);
		paper.object.updateMatrixWorld();
		const xDir = new THREE.Vector3(1, 0, 0).transformDirection(
			paper.object.matrixWorld,
		);
		expectVectorClose(
			xDir,
			new THREE.Vector3(0.568, 0, 0.789).normalize(),
			1e-6,
		);
		expect(cssScene.children).toContain(paper.object);
		expect(cssScene.children).toHaveLength(1);
	});

	it("restores the host and leaves no residue after destroy", () => {
		const cssScene = new THREE.Scene();
		const scene = new THREE.Scene();
		const parking = document.createElement("div");
		const host = document.createElement("div");
		host.setAttribute("style", "color: red; position: static");
		host.setAttribute("draggable", "true");
		host.setAttribute("data-three-paper-attached", "before");
		parking.appendChild(host);

		const paper = new PaperScreen(
			cssScene,
			host,
			paperGeometry(),
			paperMatrixWorld(),
		);
		expect(host.getAttribute("data-three-paper-attached")).toBe("true");
		expect(host.style.width).toBeTruthy();

		paper.destroy();
		paper.destroy(); // idempotent

		expect(cssScene.children).toHaveLength(0);
		expect(scene.children).toHaveLength(0);
		// The sacrificial marker must absorb the r137-style 'removed' event, so
		// the real host survives and returns to its original attributes.
		expect(host.parentElement).toBe(parking);
		expect(host.getAttribute("style")).toBe("color: red; position: static");
		expect(host.getAttribute("draggable")).toBe("true");
		// data-three-paper-attached was present before construction ('before'),
		// so restore returns it to that original value.
		expect(host.getAttribute("data-three-paper-attached")).toBe("before");
		expect(host.style.width).toBe("");
		expect(paper.object.element).not.toBe(host);
	});
});
