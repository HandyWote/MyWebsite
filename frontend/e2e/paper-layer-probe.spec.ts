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
			paperHostInPaperRenderer: paperHost.closest(
				'[data-three-css-renderer="paper"]',
			) === renderer,
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

type FocusProbeReport = {
	ready: boolean;
	probed?: number;
	misses?: Array<{ fx: number; fy: number; hit: string }>;
	hostTransform?: string;
	layerPointerEvents?: string;
	hostInLayer?: boolean;
	placeholderInRenderer?: boolean;
	layerRect?: { x: number; y: number; width: number; height: number };
	hostRect?: { x: number; y: number; width: number; height: number };
};

// P0 第二轮回归：paper 特写（相机静止、纸面 ≈82% 屏高）下 Chromium 对
// 贴近视相机平面的 preserve-3d 元素命中测试与绘制不一致——修复前仅顶部
// 约 1/3 可命中，中下部 elementFromPoint 落到背景层。PaperFocusLayer 在
// settle 时把宿主搬进无 3D 变换的屏幕 2D 层：命中必须全表面可靠。
test("paper focus swaps the host into a 2D screen layer with full hit coverage", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name !== "desktop-chrome");
	test.setTimeout(90_000);
	await page.goto("/");
	await expect(
		page.locator('[data-public-experience="desktop-ready"]'),
	).toBeVisible({ timeout: 30_000 });

	// 点击空白切 desk 视角，悬停纸面中心 → enterPaper → settle 后 2D 层接管
	await page.mouse.click(24, 24);
	const host = page.locator("#paper-screen-host");
	await expect
		.poll(
			async () => {
				const box = await host.boundingBox();
				return box ? Math.round(box.width) : 0;
			},
			{ timeout: 15_000, message: "desk view should enlarge the paper" },
		)
		.toBeGreaterThan(150);
	const center = await host.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
	});
	await page.mouse.move(center.x, center.y);
	const focusLayer = page.locator("[data-paper-focus-layer]");
	await expect(focusLayer).toHaveCount(1, { timeout: 15_000 });

	// 命中网格：纸面 clip-path 多边形（向质心收缩 4%）内部的每个采样点
	// 都必须命中宿主或其子孙；另验层几何与投影 AABB 重合、宿主无 3D 变换。
	const report = await page.evaluate<FocusProbeReport>(() => {
		const host = document.querySelector("#paper-screen-host");
		const layer = document.querySelector("[data-paper-focus-layer]");
		if (!host || !layer) return { ready: false };
		const rect = host.getBoundingClientRect();
		const layerRect = layer.getBoundingClientRect();
		// clip-path polygon 以宿主百分比给出纸面四边形；提取所有 x% y% 对
		const clip = getComputedStyle(host).clipPath;
		const tokens = [...clip.matchAll(/([\d.]+)%/g)].map((match) =>
			Number.parseFloat(match[1]),
		);
		const polygon: Array<{ x: number; y: number }> = [];
		for (let i = 0; i + 1 < tokens.length; i += 2) {
			polygon.push({
				x: rect.x + (tokens[i] / 100) * rect.width,
				y: rect.y + (tokens[i + 1] / 100) * rect.height,
			});
		}
		// 向质心收缩 4%：避开裁剪边上的亚像素歧义，只测纸面内部点
		const centroid = polygon.reduce(
			(acc, point) => ({
				x: acc.x + point.x / polygon.length,
				y: acc.y + point.y / polygon.length,
			}),
			{ x: 0, y: 0 },
		);
		const shrunk = polygon.map((point) => ({
			x: centroid.x + (point.x - centroid.x) * 0.96,
			y: centroid.y + (point.y - centroid.y) * 0.96,
		}));
		const pointInPolygon = (
			point: { x: number; y: number },
			poly: Array<{ x: number; y: number }>,
		): boolean => {
			let inside = false;
			for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
				const intersect =
					(poly[i].y > point.y) !== (poly[j].y > point.y) &&
					point.x <
						((poly[j].x - poly[i].x) * (point.y - poly[i].y)) /
							(poly[j].y - poly[i].y) +
						poly[i].x;
				if (intersect) inside = !inside;
			}
			return inside;
		};
		const misses: Array<{ fx: number; fy: number; hit: string }> = [];
		let probed = 0;
		for (let i = 1; i <= 9; i++) {
			for (let j = 1; j <= 9; j++) {
				const fx = i / 10;
				const fy = j / 10;
				const x = rect.x + rect.width * fx;
				const y = rect.y + rect.height * fy;
				if (!pointInPolygon({ x, y }, shrunk)) continue;
				probed += 1;
				const hit = document.elementFromPoint(x, y);
				if (hit !== host && !host.contains(hit)) {
					misses.push({
						fx,
						fy,
						hit: hit ? hit.tagName.toLowerCase() : "none",
					});
				}
			}
		}
		return {
			ready: true,
			probed,
			misses,
			hostTransform: getComputedStyle(host).transform,
			layerPointerEvents: getComputedStyle(layer).pointerEvents,
			hostInLayer: host.parentElement === layer,
			placeholderInRenderer: Boolean(
				document.querySelector(
					'[data-three-css-renderer="paper"] [data-paper-placeholder]',
				),
			),
			layerRect: {
				x: layerRect.x,
				y: layerRect.y,
				width: layerRect.width,
				height: layerRect.height,
			},
			hostRect: {
				x: rect.x,
				y: rect.y,
				width: rect.width,
				height: rect.height,
			},
		};
	});
	expect(report.ready).toBe(true);
	// 接管：宿主在层内且层可命中，CSS3D 场景由占位元素顶替
	expect(report.hostInLayer).toBe(true);
	expect(report.placeholderInRenderer).toBe(true);
	expect(report.layerPointerEvents).toBe("auto");
	// 2D 层的本质：宿主不再携带 CSS3D matrix
	expect(report.hostTransform).toBe("none");
	// 层矩形与投影 AABB 重合（translate+scale 对齐）
	for (const key of ["x", "y", "width", "height"] as const) {
		expect(Math.abs(report.layerRect![key] - report.hostRect![key])).toBeLessThanOrEqual(1.5);
	}
	// 命中网格全绿：内部采样点全部命中宿主（修复前中下部大面积落空），
	// 且采样确实覆盖了纸面主体（而非只碰到顶部边缘）
	expect(report.probed).toBeGreaterThan(20);
	expect(report.misses).toEqual([]);

	// 点击空白退出特写：宿主同步搬回 CSS3D，层与占位消失
	await page.mouse.click(24, 24);
	await expect(focusLayer).toHaveCount(0);
	await expect(
		page.locator('[data-three-css-renderer="paper"] #paper-screen-host'),
	).toHaveCount(1);
	await expect(
		page.locator('[data-three-css-renderer="paper"] [data-paper-placeholder]'),
	).toHaveCount(0);
});
