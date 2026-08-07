import { expect, test, type Page } from "@playwright/test";

const assetPaths = [
	"/3d/v1/models/computer-setup.glb",
	"/3d/v1/textures/computer.webp",
	"/3d/v1/models/environment.glb",
	"/3d/v1/textures/environment.webp",
	"/3d/v1/models/decor.glb",
	"/3d/v1/textures/decor.webp",
	"/3d/v1/textures/monitor-smudges.webp",
	"/3d/v1/textures/monitor-shadow.webp",
];

type Rect = { x: number; y: number; width: number; height: number };

async function pixelStats(page: Page, screenshot: Buffer, exclude?: Rect) {
	return page.evaluate(
		async ({ source, excluded }) => {
			const image = new Image();
			image.src = `data:image/png;base64,${source}`;
			await image.decode();

			const canvas = document.createElement("canvas");
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;
			const context = canvas.getContext("2d", { willReadFrequently: true });
			if (!context)
				throw new Error("Unable to create screenshot analysis canvas");
			context.drawImage(image, 0, 0);

			const pixels = context.getImageData(
				0,
				0,
				canvas.width,
				canvas.height,
			).data;
			const buckets = new Uint8Array(4096);
			let bucketCount = 0;
			let count = 0;
			let luminanceSum = 0;
			let luminanceSquaredSum = 0;
			let nearWhite = 0;
			let nonDark = 0;

			for (let y = 0; y < canvas.height; y += 1) {
				for (let x = 0; x < canvas.width; x += 1) {
					if (
						excluded &&
						x >= excluded.x &&
						x < excluded.x + excluded.width &&
						y >= excluded.y &&
						y < excluded.y + excluded.height
					)
						continue;

					const index = (y * canvas.width + x) * 4;
					const red = pixels[index];
					const green = pixels[index + 1];
					const blue = pixels[index + 2];
					const luminance = (red + green + blue) / 3;
					const bucket = (red >> 4) * 256 + (green >> 4) * 16 + (blue >> 4);
					if (buckets[bucket] === 0) {
						buckets[bucket] = 1;
						bucketCount += 1;
					}
					count += 1;
					luminanceSum += luminance;
					luminanceSquaredSum += luminance * luminance;
					if (red >= 245 && green >= 245 && blue >= 245) nearWhite += 1;
					if (luminance >= 24) nonDark += 1;
				}
			}

			const mean = luminanceSum / count;
			return {
				bucketCount,
				nearWhiteRatio: nearWhite / count,
				nonDarkRatio: nonDark / count,
				variance: luminanceSquaredSum / count - mean * mean,
			};
		},
		{ source: screenshot.toString("base64"), excluded: exclude },
	);
}

test("desktop renders nonblank 3D around the one real host and preserves it across routes", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name !== "desktop-chrome");
	const assetResponses = new Map(assetPaths.map((path) => [path, 0]));
	const hydrationErrors: string[] = [];
	page.on("response", (response) => {
		const path = new URL(response.url()).pathname;
		if (response.ok() && assetResponses.has(path)) {
			assetResponses.set(path, (assetResponses.get(path) ?? 0) + 1);
		}
	});
	page.on("console", (message) => {
		if (
			message.type() === "error" &&
			/hydration|did not match/i.test(message.text())
		) {
			hydrationErrors.push(message.text());
		}
	});

	await page.goto("/");
	await expect(
		page.locator('[data-public-experience="desktop-ready"]'),
	).toBeVisible({ timeout: 30_000 });
	await expect
		.poll(
			() => [...assetResponses.values()].filter((count) => count > 0).length,
			{ timeout: 30_000 },
		)
		.toBe(assetPaths.length);

	// The viewport-level page border must not overlay the 3D scene in desktop mode:
	// it belongs inside the screen host (recreated as its ::before ring).
	expect(
		await page.evaluate(
			() => getComputedStyle(document.body, "::before").display,
		),
	).toBe("none");

	const host = page.locator("#screen-host");
	const canvas = page.locator('canvas[data-three-canvas="public"]');
	await expect(host).toHaveCount(1);
	await expect(host).toBeVisible();
	await expect(host).toContainText("double click to enter articles");
	await expect(host.getByLabel("Terminal command")).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() =>
				Boolean(
					document
						.querySelector("#screen-host")
						?.closest('[data-three-css-renderer="public"]'),
				),
			),
		)
		.toBe(true);
	await expect(canvas).toHaveCount(1);
	await host.evaluate((element) => {
		const bounds = element.getBoundingClientRect();
		element.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX: bounds.left + bounds.width / 2,
				clientY: bounds.top + bounds.height / 2,
			}),
		);
	});

	// Moving the pointer into the host eases the camera into the monitor; poll until
	// the projected screen size stabilizes instead of sampling mid-transition.
	await expect
		.poll(
			async () => {
				const bounds = await host.boundingBox();
				return bounds ? Math.round(bounds.width) : 0;
			},
			{ timeout: 15_000, message: "screen host should reach monitor size" },
		)
		.toBeGreaterThan(900);
	await page.waitForTimeout(2_500); // let the camera ease fully into the monitor
	const hostBounds = await host.boundingBox();
	expect(hostBounds).not.toBeNull();
	expect(hostBounds!.height).toBeGreaterThan(400);

	// Keep space between the computer bezel, the blue window border, and its
	// content. The page must also not collapse to its natural content height.
	const screen = await page.evaluate(() => {
		const host = document.querySelector("#screen-host")!;
		const hostRect = host.getBoundingClientRect();
		const pageBox = host.querySelector(".screen-page")!;
		const pageStyle = getComputedStyle(pageBox);
		const grid = [...host.querySelectorAll("div")].find((el) => {
			const style = getComputedStyle(el);
			return (
				style.display === "grid" &&
				style.gridTemplateRows.split(" ").length === 2
			);
		});
		const gridRect = grid?.getBoundingClientRect();
		return {
			hostPadding: getComputedStyle(host).paddingTop,
			borderTop: pageStyle.borderTopWidth,
			borderColor: pageStyle.borderTopColor,
			pagePadding: pageStyle.paddingTop,
			fillRatio: gridRect ? gridRect.height / hostRect.height : 0,
		};
	});
	expect(screen.hostPadding).toBe("32px");
	expect(screen.borderTop).toBe("1px");
	expect(screen.borderColor).toBe("rgb(88, 166, 255)");
	expect(screen.pagePadding).toBe("16px");
	expect(screen.fillRatio).toBeGreaterThan(0.9);

	const screenScreenshot = await host.screenshot({
		path: testInfo.outputPath("desktop-screen-region.png"),
	});
	const screenStats = await pixelStats(page, screenScreenshot);
	expect(screenStats.variance).toBeGreaterThan(100);
	expect(screenStats.bucketCount).toBeGreaterThan(32);
	expect(screenStats.nearWhiteRatio).toBeLessThan(0.9);

	const viewportScreenshot = await page.screenshot({
		path: testInfo.outputPath("desktop-model-and-screen.png"),
	});
	const modelStats = await pixelStats(page, viewportScreenshot, hostBounds!);
	expect(modelStats.variance).toBeGreaterThan(20);
	expect(modelStats.bucketCount).toBeGreaterThan(16);
	expect(modelStats.nonDarkRatio).toBeGreaterThan(0.01);

	await page.evaluate(() => {
		const state = window as Window & {
			__e5Canvas?: Element;
			__e5Host?: Element;
		};
		state.__e5Canvas =
			document.querySelector('canvas[data-three-canvas="public"]') ?? undefined;
		state.__e5Host = document.querySelector("#screen-host") ?? undefined;
	});
	const commandInput = host.getByLabel("Terminal command");
	await commandInput.fill("cd articles/");
	await commandInput.press("Enter");
	await expect(page).toHaveURL(/\/articles$/);
	await expect(host).toContainText("found 2 articles");
	await expect(host).toContainText("3D DOM Fusion Notes");
	expect(
		await page.evaluate(() => {
			const state = window as Window & {
				__e5Canvas?: Element;
				__e5Host?: Element;
			};
			return (
				state.__e5Canvas ===
					document.querySelector('canvas[data-three-canvas="public"]') &&
				state.__e5Host === document.querySelector("#screen-host")
			);
		}),
	).toBe(true);
	await expect(canvas).toHaveCount(1);
	expect(Object.fromEntries(assetResponses)).toEqual(
		Object.fromEntries(assetPaths.map((path) => [path, 1])),
	);
	expect(hydrationErrors).toEqual([]);

	await page.screenshot({
		path: testInfo.outputPath("desktop-route-persistence.png"),
		fullPage: true,
	});
});

test("mobile and touch layouts keep complete ordinary DOM and request no 3D assets", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name === "desktop-chrome");
	const threeRequests: string[] = [];
	page.on("request", (request) => {
		const path = new URL(request.url()).pathname;
		if (path.startsWith("/3d/") || path.endsWith(".glb"))
			threeRequests.push(path);
	});

	await page.goto("/");
	await expect(
		page.locator('[data-public-experience="ordinary"]'),
	).toBeVisible();
	await expect(page.locator("#screen-host")).toHaveCount(1);
	await expect(page.locator("#screen-host")).toContainText(
		"double click to enter articles",
	);
	await expect(
		page.locator("#screen-host").getByLabel("Terminal command"),
	).toBeVisible();
	await expect(page.locator('canvas[data-three-canvas="public"]')).toHaveCount(
		0,
	);
	await page.waitForTimeout(1_000);
	expect(threeRequests).toEqual([]);

	const commandInput = page
		.locator("#screen-host")
		.getByLabel("Terminal command");
	await commandInput.fill("cd articles/");
	await commandInput.press("Enter");
	await expect(page).toHaveURL(/\/articles$/);
	await expect(page.locator("#screen-host")).toContainText("found 2 articles");
	await expect(page.locator("#screen-host")).toContainText(
		"3D DOM Fusion Notes",
	);
	expect(threeRequests).toEqual([]);
	await page.screenshot({
		path: testInfo.outputPath(`${testInfo.project.name}-ordinary-public.png`),
		fullPage: true,
	});
});
