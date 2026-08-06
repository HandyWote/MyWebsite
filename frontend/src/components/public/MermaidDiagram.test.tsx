import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MermaidDiagram } from "./MermaidDiagram";

const { initializeMock, renderMock } = vi.hoisted(() => ({
	initializeMock: vi.fn(),
	renderMock: vi.fn(),
}));

vi.mock("mermaid", () => ({
	default: { initialize: initializeMock, render: renderMock },
}));

describe("MermaidDiagram client enhancement", () => {
	beforeEach(() => {
		renderMock.mockReset();
	});

	it("replaces the readable fallback with a safe rendered SVG for a graph TD diagram", async () => {
		renderMock.mockResolvedValue({
			svg: `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 120 80">
          <style>#flowchart .edgePath .path { stroke: #8b949e; marker-end: url(#flowchart-pointEnd); }</style>
          <defs><marker id="flowchart-pointEnd"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>
          <g class="node default" data-id="A"><rect fill="#58a6ff" stroke="#30363d"></rect><text>Rendered graph</text></g>
          <path class="flowchart-link" marker-end="url(#flowchart-pointEnd)" d="M 20 20 L 80 20"></path>
        </svg>
      `,
		});
		const { container } = render(<MermaidDiagram source="graph TD; A-->B" />);

		expect(screen.getByText("graph TD; A-->B")).toBeInTheDocument();
		await waitFor(() =>
			expect(
				screen.getByRole("img", { name: "Mermaid diagram" }),
			).toHaveTextContent("Rendered graph"),
		);
		expect(
			container.querySelector("[data-mermaid-fallback]"),
		).not.toBeInTheDocument();
		expect(container.querySelector("[data-mermaid-status]")).toHaveAttribute(
			"data-mermaid-status",
			"rendered",
		);
		expect(initializeMock).toHaveBeenCalledWith(
			expect.objectContaining({
				startOnLoad: false,
				theme: "dark",
				securityLevel: "strict",
				fontFamily: "'JetBrains Mono', monospace",
				themeVariables: {
					primaryColor: "#58a6ff",
					primaryTextColor: "#f0f6fc",
					primaryBorderColor: "#30363d",
					lineColor: "#8b949e",
					secondaryColor: "#21262d",
					tertiaryColor: "#161b22",
				},
				htmlLabels: false,
				suppressErrorRendering: true,
			}),
		);
	});

	it("keeps the fallback when Mermaid rendering fails", async () => {
		renderMock.mockRejectedValue(new Error("invalid diagram"));
		const { container } = render(<MermaidDiagram source="not valid" />);

		await waitFor(() =>
			expect(container.querySelector("[data-mermaid-status]")).toHaveAttribute(
				"data-mermaid-status",
				"fallback",
			),
		);
		expect(screen.getByText("not valid")).toBeInTheDocument();
		expect(
			screen.queryByRole("img", { name: "Mermaid diagram" }),
		).not.toBeInTheDocument();
	});

	it.each([
		[
			"script element",
			'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
		],
		[
			"event attribute",
			'<svg xmlns="http://www.w3.org/2000/svg"><text onclick="alert(1)">bad</text></svg>',
		],
		[
			"javascript href",
			'<svg xmlns="http://www.w3.org/2000/svg"><use href="javascript:alert(1)"></use></svg>',
		],
		[
			"data href",
			'<svg xmlns="http://www.w3.org/2000/svg"><use href="data:image/svg+xml,&lt;svg&gt;"></use></svg>',
		],
		[
			"external href",
			'<svg xmlns="http://www.w3.org/2000/svg"><use href="https://example.test/icon.svg#x"></use></svg>',
		],
		[
			"external css url",
			'<svg xmlns="http://www.w3.org/2000/svg"><path filter="url(https://example.test/filter.svg#x)"></path></svg>',
		],
	])(
		"rejects unsafe generated SVG with %s and leaves malicious source as text",
		async (_, svg) => {
			renderMock.mockResolvedValue({ svg });
			const source = "graph TD; A[<img src=x onerror=alert(1)>]";
			const { container } = render(<MermaidDiagram source={source} />);

			await waitFor(() =>
				expect(
					container.querySelector("[data-mermaid-status]"),
				).toHaveAttribute("data-mermaid-status", "fallback"),
			);
			expect(screen.getByText(source)).toBeInTheDocument();
			expect(
				screen.queryByRole("img", { name: "Mermaid diagram" }),
			).not.toBeInTheDocument();
			expect(container.querySelector("script")).not.toBeInTheDocument();
			expect(container.querySelector("img")).not.toBeInTheDocument();
		},
	);
});
