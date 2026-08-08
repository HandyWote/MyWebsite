import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleExitButton } from "./ArticleExitButton";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

describe("ArticleExitButton", () => {
	beforeEach(() => {
		pushMock.mockReset();
	});

	it("returns to the article list with client navigation", () => {
		render(<ArticleExitButton />);
		fireEvent.click(screen.getByRole("button", { name: /exit buffer/i }));
		expect(pushMock).toHaveBeenCalledWith("/articles");
	});
});
