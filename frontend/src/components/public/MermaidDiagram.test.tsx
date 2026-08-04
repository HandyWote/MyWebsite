import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MermaidDiagram } from './MermaidDiagram';

const { initializeMock, renderMock } = vi.hoisted(() => ({
  initializeMock: vi.fn(),
  renderMock: vi.fn(),
}));

vi.mock('mermaid', () => ({
  default: { initialize: initializeMock, render: renderMock },
}));

describe('MermaidDiagram client enhancement', () => {
  beforeEach(() => {
    renderMock.mockReset();
  });

  it('replaces the readable fallback with a safe rendered SVG', async () => {
    renderMock.mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>Rendered graph</text></svg>',
    });
    const { container } = render(<MermaidDiagram source="graph TD; A-->B" />);

    expect(screen.getByText('graph TD; A-->B')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('img', { name: 'Mermaid diagram' })).toHaveTextContent('Rendered graph'));
    expect(container.querySelector('[data-mermaid-fallback]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-mermaid-status]')).toHaveAttribute('data-mermaid-status', 'rendered');
    expect(initializeMock).toHaveBeenCalledWith(expect.objectContaining({ securityLevel: 'strict', htmlLabels: false }));
  });

  it('keeps the fallback when Mermaid rendering fails', async () => {
    renderMock.mockRejectedValue(new Error('invalid diagram'));
    const { container } = render(<MermaidDiagram source="not valid" />);

    await waitFor(() => expect(container.querySelector('[data-mermaid-status]')).toHaveAttribute('data-mermaid-status', 'fallback'));
    expect(screen.getByText('not valid')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Mermaid diagram' })).not.toBeInTheDocument();
  });

  it('rejects unsafe generated SVG and leaves malicious source as text', async () => {
    renderMock.mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    });
    const source = 'graph TD; A[<img src=x onerror=alert(1)>]';
    const { container } = render(<MermaidDiagram source={source} />);

    await waitFor(() => expect(container.querySelector('[data-mermaid-status]')).toHaveAttribute('data-mermaid-status', 'fallback'));
    expect(screen.getByText(source)).toBeInTheDocument();
    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});
