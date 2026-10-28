import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShellFlipProvider } from "./ShellFlipProvider";

// useShellFlip 内部 useRouter → 这里只需要 push 可调
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushMock }),
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

const shell = (href: string, extra?: Record<string, unknown>) => (
	<ShellFlipProvider>
		<a href={href} {...extra}>
			go
		</a>
	</ShellFlipProvider>
);

describe("shell flip navigation", () => {
	beforeEach(() => {
		pushMock.mockClear();
	});
	it("navigates for plain left clicks on internal links", async () => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn().mockReturnValue({ matches: true }), // reduced motion → 直接跳转
		);
		const { findByText } = render(shell("/articles"));
		fireEvent.click(await findByText("go"));
		await vi.waitFor(() => expect(pushMock).toHaveBeenCalled());
		vi.unstubAllGlobals();
	});

	it("does not intercept modified clicks (new tab)", async () => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn().mockReturnValue({ matches: true }),
		);
		const { findByText } = render(shell("/articles"));
		fireEvent.click(await findByText("go"), { ctrlKey: true });
		expect(pushMock).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});

	it("does not intercept external links", async () => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn().mockReturnValue({ matches: true }),
		);
		const { findByText } = render(shell("https://example.com"));
		fireEvent.click(await findByText("go"));
		expect(pushMock).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});
});
