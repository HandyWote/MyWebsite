import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticleExitButton } from "./ArticleExitButton";

describe("ArticleExitButton", () => {
	it("returns to the article list via a crawlable link", () => {
		render(<ArticleExitButton />);

		const exitLink = screen.getByRole("link", { name: /exit buffer/i });
		expect(exitLink).toHaveAttribute("href", "/articles");
	});
});
