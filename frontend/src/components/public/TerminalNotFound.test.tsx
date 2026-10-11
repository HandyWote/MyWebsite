import { Box } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SHELL_NAV_ITEMS } from "./shellUtils";
import { TerminalNotFound } from "./TerminalNotFound";

vi.mock("next/navigation", () => ({
	usePathname: vi.fn(),
}));

vi.mock("@/components/public/PublicShell", () => ({
	PublicShell: ({ children }: { children: React.ReactNode }) => (
		<Box data-testid="public-shell-mock">{children}</Box>
	),
}));

import { usePathname } from "next/navigation";
const mockUsePathname = vi.mocked(usePathname);

describe("TerminalNotFound", () => {
	beforeEach(() => {
		mockUsePathname.mockReset();
	});

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
		expect(screen.getByText("did you mean:")).toBeInTheDocument();

		for (const item of SHELL_NAV_ITEMS) {
			expect(
				screen.getByRole("link", { name: item.command }),
			).toHaveAttribute("href", item.href);
		}
	});
});
