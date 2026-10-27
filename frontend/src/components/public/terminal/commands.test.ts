import { describe, expect, it } from "vitest";
import {
	AUTH_COMMANDS,
	authCompletionCandidates,
	authHelpLines,
	COMMAND_COLUMN_WIDTH,
	nearMissCommand,
	toHelpLine,
} from "./commands";

describe("terminal command registry", () => {
	it("lists every documented auth command in help with aligned columns", () => {
		const lines = authHelpLines();

		expect(lines).toEqual([
			toHelpLine("login", "sign in with GitHub"),
			toHelpLine("logout", "sign out"),
			toHelpLine("whoami", "show current user"),
		]);
		for (const line of lines) {
			expect(line.slice(2 + COMMAND_COLUMN_WIDTH)).toMatch(/^[a-z]/);
		}
	});

	it("keeps the password login hidden from help but completes the github alias", () => {
		const help = authHelpLines().join("\n");

		expect(help).not.toContain("login -u");
		expect(authCompletionCandidates()).toEqual([
			"login",
			"login github",
			"logout",
			"whoami",
		]);
	});

	it("points unknown subcommands at the real command", () => {
		expect(nearMissCommand("login google")).toBe("login");
		expect(nearMissCommand("foobar")).toBeUndefined();
		expect(nearMissCommand("   ")).toBeUndefined();
	});

	it("has a single source of truth for ids and usage", () => {
		expect(new Set(AUTH_COMMANDS.map((command) => command.id)).size).toBe(
			AUTH_COMMANDS.length,
		);
		expect(new Set(AUTH_COMMANDS.map((command) => command.usage)).size).toBe(
			AUTH_COMMANDS.length,
		);
	});
});
