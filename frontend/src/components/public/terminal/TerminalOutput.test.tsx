import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TerminalOutput } from "./TerminalOutput";

describe("TerminalOutput", () => {
	it("renders nothing when there is no output", () => {
		const { container } = render(<TerminalOutput lines={[]} />);

		expect(container.querySelector("[data-terminal-output]")).toBeNull();
	});

	it("keeps every line when two lines share the same text", () => {
		render(
			<TerminalOutput
				lines={[
					{ id: "a", text: "password:" },
					{ id: "b", text: "password:" },
				]}
			/>,
		);

		expect(screen.getAllByText("password:")).toHaveLength(2);
	});

	it("renders error lines in a different color than info lines", () => {
		render(
			<TerminalOutput
				lines={[
					{ id: "a", text: "invalid credentials", tone: "error" },
					{ id: "b", text: "logged out" },
				]}
			/>,
		);

		const errorColor = getComputedStyle(screen.getByText("invalid credentials")).color;
		const infoColor = getComputedStyle(screen.getByText("logged out")).color;
		expect(errorColor).not.toBe("");
		expect(errorColor).not.toBe(infoColor);
	});
});
