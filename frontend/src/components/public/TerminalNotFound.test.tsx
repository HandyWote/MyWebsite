import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TerminalNotFound } from "./TerminalNotFound";

vi.mock("next/navigation", () => ({
	usePathname: vi.fn(),
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

		// 显式硬断言用户可见导航,与 SHELL_NAV_ITEMS 注册表解耦:
		// 注册表误删/改名时这些断言必须红,测试范围不随注册表缩小。
		expect(
			screen.getByRole("link", { name: "cd articles/" }),
		).toHaveAttribute("href", "/articles");
		expect(
			screen.getByRole("link", { name: "cd projects/" }),
		).toHaveAttribute("href", "/projects");
		expect(
			screen.getByRole("link", { name: "cd games/" }),
		).toHaveAttribute("href", "/games");
		expect(
			screen.getByRole("link", { name: "cd about/" }),
		).toHaveAttribute("href", "/");
	});
});
