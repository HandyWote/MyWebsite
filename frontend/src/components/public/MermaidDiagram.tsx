"use client";

import { useEffect, useId, useRef } from "react";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const FORBIDDEN_ELEMENTS = new Set([
	"script",
	"foreignobject",
	"iframe",
	"object",
	"embed",
	"a",
	"image",
]);
const LINK_REFERENCE_ATTRIBUTES = new Set(["href", "xlink:href", "src"]);
let initializedMermaid: Promise<typeof import("mermaid").default> | undefined;

function loadMermaid() {
	initializedMermaid ??= import("mermaid").then(({ default: mermaid }) => {
		mermaid.initialize({
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
		});
		return mermaid;
	});
	return initializedMermaid;
}

function hasUnsafeCssUrl(value: string): boolean {
	const matches = value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi);
	return [...matches].some((match) => !isSafeReference(match[2]));
}

function normalizeProtocolValue(value: string): string {
	return [...value]
		.filter(
			(character) =>
				character.charCodeAt(0) > 31 &&
				character.charCodeAt(0) !== 127 &&
				!/\s/.test(character),
		)
		.join("")
		.toLowerCase();
}

function hasDangerousProtocol(value: string): boolean {
	const normalized = normalizeProtocolValue(value);
	return (
		normalized.includes("javascript:") ||
		normalized.includes("vbscript:") ||
		normalized.includes("data:")
	);
}

function isSafeReference(value: string): boolean {
	const trimmed = value.trim();
	return trimmed === "" || trimmed.startsWith("#");
}

function hasForbiddenElement(elements: Element[]): boolean {
	return elements.some((element) =>
		FORBIDDEN_ELEMENTS.has(element.localName.toLowerCase()),
	);
}

function hasUnsafeStyle(style: Element): boolean {
	const css = style.textContent?.toLowerCase() ?? "";
	return (
		css.includes("@import") || hasDangerousProtocol(css) || hasUnsafeCssUrl(css)
	);
}

function hasUnsafeAttribute(attribute: Attr): boolean {
	const name = attribute.name.toLowerCase();
	const value = attribute.value.trim();
	return (
		name.startsWith("on") ||
		hasDangerousProtocol(value) ||
		hasUnsafeCssUrl(value) ||
		(LINK_REFERENCE_ATTRIBUTES.has(name) && !isSafeReference(value))
	);
}

function hasUnsafeAttributes(elements: Element[]): boolean {
	return elements.some((element) =>
		[...element.attributes].some(hasUnsafeAttribute),
	);
}

function resetFallback(container: HTMLDivElement, source: string) {
	const pre = document.createElement("pre");
	const code = document.createElement("code");
	const caption = document.createElement("figcaption");
	code.className = "language-mermaid";
	code.dataset.mermaidFallback = "true";
	code.textContent = source;
	caption.textContent =
		"Mermaid diagram source. A rendered diagram replaces this fallback when available.";
	pre.append(code);
	container.replaceChildren(pre, caption);
}

function parseSafeSvg(svgText: string): SVGSVGElement | null {
	const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
	const svg = parsed.documentElement;
	if (
		svg.namespaceURI !== SVG_NAMESPACE ||
		svg.localName !== "svg" ||
		svg.querySelector("parsererror")
	)
		return null;

	const elements = [svg, ...svg.querySelectorAll("*")];
	if (hasForbiddenElement(elements)) return null;
	if ([...svg.querySelectorAll("style")].some(hasUnsafeStyle)) return null;
	if (hasUnsafeAttributes(elements)) return null;

	svg.setAttribute("role", "img");
	svg.setAttribute("aria-label", "Mermaid diagram");
	return svg as unknown as SVGSVGElement;
}

export function MermaidDiagram({ source }: { source: string }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const reactId = useId();

	useEffect(() => {
		let active = true;
		const container = containerRef.current;
		if (!container) return undefined;
		resetFallback(container, source);
		container.dataset.mermaidStatus = "rendering";

		loadMermaid()
			.then((mermaid) =>
				mermaid.render(
					`mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
					source,
				),
			)
			.then(({ svg }) => {
				if (!active || !container.isConnected) return;
				const safeSvg = parseSafeSvg(svg);
				if (!safeSvg) throw new Error("Mermaid returned unsafe SVG");
				container.replaceChildren(document.importNode(safeSvg, true));
				container.dataset.mermaidStatus = "rendered";
			})
			.catch(() => {
				if (active && container.isConnected)
					container.dataset.mermaidStatus = "fallback";
			});

		return () => {
			active = false;
		};
	}, [reactId, source]);

	return (
		<figure data-mermaid-diagram="true">
			<div ref={containerRef} data-mermaid-status="fallback">
				<pre>
					<code className="language-mermaid" data-mermaid-fallback="true">
						{source}
					</code>
				</pre>
				<figcaption>
					Mermaid diagram source. A rendered diagram replaces this fallback when
					available.
				</figcaption>
			</div>
		</figure>
	);
}
