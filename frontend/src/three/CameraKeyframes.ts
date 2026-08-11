import * as THREE from "three";
import type { Mouse } from "./Mouse";
import type { Sizes } from "./Sizes";
import type { Time } from "./Time";

export type CameraKey =
	| "idle"
	| "monitor"
	| "loading"
	| "desk"
	| "paper"
	| "orbitControlsStart";

// The desk paper (decor.glb node 'paper') lies flat in the xz plane, so the
// perpendicular view is straight down (-y). World-space defaults match the
// baked GLB geometry (×900 scene scale); World.refreshes them from the loaded
// model via Camera.setPaperTarget.
export const PAPER_CENTER = new THREE.Vector3(-2063.7, -444.6, 986.4);
// Camera sits above the paper so it fills ~82% of the view height at fov 35°.
export const PAPER_VIEW_DISTANCE = 1690;
// A 1.1° horizontal tilt keeps lookAt well away from the degenerate case where
// the view direction is parallel to the up vector (NaN otherwise); it is
// visually indistinguishable from a perfectly perpendicular view.
export const PAPER_VIEW_TILT = new THREE.Vector3(50, 0, 0);

export type CameraFrame = {
	position: THREE.Vector3;
	focalPoint: THREE.Vector3;
	// Roll of the view (screen-up direction). Defaults to world up; the paper
	// frame gets a custom up via Camera.setPaperTarget so the flat paper's
	// content stands upright in the close-up view.
	up: THREE.Vector3;
	update(): void;
};

const frame = (
	position: THREE.Vector3,
	focalPoint: THREE.Vector3,
): CameraFrame => ({
	position,
	focalPoint,
	up: new THREE.Vector3(0, 1, 0),
	update() {},
});

export function createCameraKeyframes(
	sizes: Sizes,
	mouse: Mouse,
	time: Time,
): Record<CameraKey, CameraFrame> {
	const monitorOrigin = new THREE.Vector3(0, 950, 2000);
	const monitor = frame(monitorOrigin.clone(), new THREE.Vector3(0, 950, 0));
	monitor.update = () => {
		const aspect = sizes.height / sizes.width;
		monitor.position.z = monitorOrigin.z + aspect * 1200 - 600;
	};

	const deskOrigin = new THREE.Vector3(0, 1800, 5500);
	const desk = frame(deskOrigin.clone(), new THREE.Vector3(0, 500, 0));
	desk.update = () => {
		desk.focalPoint.x += (mouse.x - sizes.width / 2 - desk.focalPoint.x) * 0.05;
		desk.focalPoint.y += (-(mouse.y - sizes.height) - desk.focalPoint.y) * 0.05;
		desk.position.x += (mouse.x - sizes.width / 2 - desk.position.x) * 0.025;
		desk.position.y +=
			(-(mouse.y - sizes.height * 2) - desk.position.y) * 0.025;
		desk.position.z = deskOrigin.z + (sizes.height / sizes.width) * 3000 - 1800;
	};

	const paper = frame(
		PAPER_CENTER.clone()
			.add(PAPER_VIEW_TILT)
			.add(new THREE.Vector3(0, PAPER_VIEW_DISTANCE, 0)),
		PAPER_CENTER.clone(),
	);

	const idleOrigin = new THREE.Vector3(-20000, 12000, 20000);
	const idle = frame(idleOrigin.clone(), new THREE.Vector3(0, -1000, 0));
	idle.update = () => {
		idle.position.x = Math.sin((time.elapsed + 19000) * 0.00008) * idleOrigin.x;
		idle.position.y =
			Math.sin((time.elapsed + 1000) * 0.000004) * 4000 + idleOrigin.y - 3000;
	};

	return {
		idle,
		monitor,
		desk,
		paper,
		loading: frame(
			new THREE.Vector3(-35000, 35000, 35000),
			new THREE.Vector3(0, -5000, 0),
		),
		orbitControlsStart: frame(
			new THREE.Vector3(-15000, 10000, 15000),
			new THREE.Vector3(-100, 350, 0),
		),
	};
}
