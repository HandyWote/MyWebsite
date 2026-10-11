import { Box } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/public/TerminalCommandBar", () => ({
	TerminalCommandBar: () => <Box data-testid="terminal-command-bar-mock" />,
}));

vi.mock("@/components/public/TerminalNotFound", () => ({
	TerminalNotFound: () => <Box data-testid="terminal-not-found-mock" />,
}));

import NotFoundPage from "./not-found";

describe("not-found page shell", () => {
	it("renders content with terminal bar and without explorer sidebar", () => {
		render(<NotFoundPage />);

		expect(screen.getByTestId("terminal-not-found-mock")).toBeInTheDocument();
		expect(screen.getByTestId("terminal-command-bar-mock")).toBeInTheDocument();
		expect(screen.queryByText("explorer")).not.toBeInTheDocument();
	});
});
