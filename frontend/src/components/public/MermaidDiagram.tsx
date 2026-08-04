'use client';

import { useEffect, useId, useRef } from 'react';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const FORBIDDEN_ELEMENTS = 'script, foreignObject, iframe, object, embed, a, image';
let initializedMermaid: Promise<typeof import('mermaid').default> | undefined;

async function loadMermaid() {
  initializedMermaid ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      htmlLabels: false,
      suppressErrorRendering: true,
    });
    return mermaid;
  });
  return initializedMermaid;
}

function hasUnsafeCssUrl(value: string): boolean {
  const matches = value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi);
  return [...matches].some((match) => !match[2].trim().startsWith('#'));
}

function resetFallback(container: HTMLDivElement, source: string) {
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  const caption = document.createElement('figcaption');
  code.className = 'language-mermaid';
  code.dataset.mermaidFallback = 'true';
  code.textContent = source;
  caption.textContent = 'Mermaid diagram source. A rendered diagram replaces this fallback when available.';
  pre.append(code);
  container.replaceChildren(pre, caption);
}

function parseSafeSvg(svgText: string): SVGSVGElement | null {
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = parsed.documentElement;
  if (svg.namespaceURI !== SVG_NAMESPACE || svg.localName !== 'svg' || svg.querySelector('parsererror')) return null;
  if (svg.querySelector(FORBIDDEN_ELEMENTS)) return null;
  for (const style of svg.querySelectorAll('style')) {
    const css = style.textContent?.toLowerCase() ?? '';
    if (css.includes('@import') || css.includes('javascript:') || css.includes('data:') || hasUnsafeCssUrl(css)) return null;
  }

  for (const element of [svg, ...svg.querySelectorAll('*')]) {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || value.includes('javascript:') || value.includes('data:') || hasUnsafeCssUrl(value)) return null;
      if ((name === 'href' || name === 'xlink:href') && value && !value.startsWith('#')) return null;
    }
  }

  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Mermaid diagram');
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
    container.dataset.mermaidStatus = 'rendering';

    loadMermaid()
      .then((mermaid) => mermaid.render(`mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`, source))
      .then(({ svg }) => {
        if (!active || !container.isConnected) return;
        const safeSvg = parseSafeSvg(svg);
        if (!safeSvg) throw new Error('Mermaid returned unsafe SVG');
        container.replaceChildren(document.importNode(safeSvg, true));
        container.dataset.mermaidStatus = 'rendered';
      })
      .catch(() => {
        if (active && container.isConnected) container.dataset.mermaidStatus = 'fallback';
      });

    return () => {
      active = false;
    };
  }, [reactId, source]);

  return (
    <figure data-mermaid-diagram="true">
      <div ref={containerRef} data-mermaid-status="fallback">
        <pre><code className="language-mermaid" data-mermaid-fallback="true">{source}</code></pre>
        <figcaption>Mermaid diagram source. A rendered diagram replaces this fallback when available.</figcaption>
      </div>
    </figure>
  );
}
