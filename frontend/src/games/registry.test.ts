import { describe, expect, it } from "vitest";
import { DrawingGame } from "./drawing/DrawingGame";
import { GAME_REGISTRY, getDefaultGame, getGame } from "./registry";

describe("game registry", () => {
	it("registers the drawing game as the single default desktop game", () => {
		expect(GAME_REGISTRY.map((game) => game.id)).toEqual(["drawing"]);
		const drawing = getGame("drawing");
		expect(drawing?.name).toBe("Drawing");
		expect(drawing?.isDefault).toBe(true);
		expect(drawing?.desktopOnly).toBe(true);
		expect(getDefaultGame().id).toBe("drawing");
	});

	it("returns undefined for unknown ids", () => {
		expect(getGame("nope")).toBeUndefined();
	});

	it("binds the registry GameView to the DrawingGame component", () => {
		expect(getGame("drawing")?.GameView).toBe(DrawingGame);
	});

	it("every registered game carries a stable id, description and preview", () => {
		for (const game of GAME_REGISTRY) {
			expect(game.id).toMatch(/^[a-z0-9-]+$/);
			expect(game.name.length).toBeGreaterThan(0);
			expect(game.description.length).toBeGreaterThan(0);
			expect(game.preview.startsWith("data:")).toBe(true);
		}
	});
});
