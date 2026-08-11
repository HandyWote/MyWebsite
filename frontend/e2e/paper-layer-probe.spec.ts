import { expect, test } from "@playwright/test";

// Verifies the paper mask renders in its own
// CSS3D layer (second CSS3DRenderer, z3) above the WebGL canvas, while the
// monitor's cssScene/CSS3DRenderer (z1) keeps the screen host untouched.
test("paper mask renders in a dedicated CSS3D layer above the canvas", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name !== "desktop-chrome");
	await page.goto("/");
	await expect(
		page.locator('[data-public-experience="desktop-ready"]'),
	).toBeVisible({ timeout: 30_000 });

	const layer = await page.evaluate(() => {
		const mount = document.querySelector(".public-paper-mount");
		const renderer = document.querySelector(
			'[data-three-css-renderer="paper"]',
		);
		const monitorRenderer = document.querySelector(
			'[data-three-css-renderer="public"]',
		);
		const webglMount = document.querySelector(".public-webgl-mount");
		const cssMount = document.querySelector(".public-css-mount");
		const paperHost = document.querySelector("#paper-screen-host");
		const screenHost = document.querySelector("#screen-host");
		if (
			!mount ||
			!renderer ||
			!monitorRenderer ||
			!webglMount ||
			!cssMount ||
			!paperHost ||
			!screenHost
		)
			return { ready: false, paperOverlaySize: { width: 0, height: 0 } };
		return {
			ready: true,
			rendererInsidePaperMount: renderer.parentElement === mount,
			monitorRendererInsideCssMount: monitorRenderer.parentElement === cssMount,
			distinctRenderers: renderer !== monitorRenderer,
			paperHostInPaperRenderer: paperHost.parentElement === renderer,
			paperAttached: paperHost.getAttribute("data-three-paper-attached"),
			paperMountZ: getComputedStyle(mount).zIndex,
			webglMountZ: getComputedStyle(webglMount).zIndex,
			cssMountZ: getComputedStyle(cssMount).zIndex,
			screenHostInMonitorRenderer: screenHost.closest(
				'[data-three-css-renderer="public"]',
			) === monitorRenderer,
			paperOverlaySize: (() => {
				const rect = paperHost.getBoundingClientRect();
				return { width: rect.width, height: rect.height };
			})(),
		};
	});
	expect(layer.ready).toBe(true);
	// The paper mask is in its own renderer, mounted in its own z3 container.
	expect(layer.rendererInsidePaperMount).toBe(true);
	expect(layer.distinctRenderers).toBe(true);
	expect(layer.paperHostInPaperRenderer).toBe(true);
	expect(layer.paperAttached).toBe("true");
	// z3 paper mount stacks above the z2 canvas mount; monitor stays at z1.
	expect(Number(layer.paperMountZ)).toBe(3);
	expect(Number(layer.webglMountZ)).toBe(2);
	expect(Number(layer.cssMountZ)).toBe(1);
	// The monitor's layer still owns the screen host.
	expect(layer.monitorRendererInsideCssMount).toBe(true);
	expect(layer.screenHostInMonitorRenderer).toBe(true);
	// The overlay is a real sized quad, not an empty box.
	expect(layer.paperOverlaySize.width).toBeGreaterThan(0);
	expect(layer.paperOverlaySize.height).toBeGreaterThan(0);
});
