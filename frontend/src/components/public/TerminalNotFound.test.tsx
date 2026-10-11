import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TerminalNotFound } from "./TerminalNotFound";

vi.mock("next/navigation", () => ({
	usePathname: vi.fn(),
}));

import { usePathname } from "next/navigation";
const mockUsePathname = vi.mocked(usePathname);

describe("TerminalNotFound (issue #4)", () => {
	it("echoes the requested path in the cat command and cli error", () => {
		mockUsePathname.mockReturnValue("/handy@handywote.top");
		render(<TerminalNotFound />);

		expect(screen.getByText("$ cat /handy@handywote.top")).toBeInTheDocument();
		expect(
			screen.getByText("cat: /handy@handywote.top: No such file or directory"),
		).toBeInTheDocument();
	});

	it("falls back to root path when pathname is empty", () => {
		mockUsePathname.mockReturnValue("");
		render(<TerminalNotFound />);

		expect(screen.getByText("$ cat /")).toBeInTheDocument();
	});

	it("renders the figlet 404 not found ascii art", () => {
		mockUsePathname.mockReturnValue("/whatever");
		render(<TerminalNotFound />);

		const ascii = screen.getByTestId("terminal-404-ascii");
		expect(ascii.textContent).toContain("_  _    ___  _  _");
		expect(ascii.textContent).toContain("_ __   ___ | |_");
	});

	it("shows hint and did you mean suggestions as internal links", () => {
		mockUsePathname.mockReturnValue("/whatever");
		render(<TerminalNotFound />);

		expect(
			screen.getByText("hint: requested page does not exist"),
		).toBeInTheDocument();

		expect(
			screen.getByRole("link", { name: "cd articles/" }),
		).toHaveAttribute("href", "/articles");
		expect(
			screen.getByRole("link", { name: "cd projects/" }),
		).toHaveAttribute("href", "/projects");
		expect(
			screen.getByRole("link", { name: "cd games/" }),
		).toHaveAttribute("href", "/games");
		expect(screen.getByRole("link", { name: "cd ~" })).toHaveAttribute(
			"href",
			"/",
		);
	});

	it("keeps the prompt at the bottom with a blinking cursor", () => {
		mockUsePathname.mockReturnValue("/whatever");
		render(<TerminalNotFound />);

		expect(screen.getByText("guest@handywote:~ $")).toBeInTheDocument();
		expect(screen.getByTestId("terminal-cursor")).toBeInTheDocument();
	});
});
