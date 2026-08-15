import { StrictMode, type ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ThreeExperienceOptions } from '@/three/types';
import { DESKTOP_3D_MEDIA, PublicExperience } from './PublicExperience';

const { loadRuntimeMock } = vi.hoisted(() => ({ loadRuntimeMock: vi.fn() }));
const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn(() => '/') }));
vi.mock('next/navigation', () => ({ usePathname: usePathnameMock }));
vi.mock('./threeRuntimeLoader', () => ({ loadThreeRuntime: loadRuntimeMock }));
vi.mock('./PublicPortalBoundary', () => ({
  PublicPortalBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

class MediaQueryController {
  matches: boolean;
  readonly media = DESKTOP_3D_MEDIA;
  onchange = null;
  private listeners = new Set<(event: MediaQueryListEvent) => void>();

  constructor(matches: boolean) {
    this.matches = matches;
  }

  addEventListener(_name: string, listener: (event: MediaQueryListEvent) => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_name: string, listener: (event: MediaQueryListEvent) => void) {
    this.listeners.delete(listener);
  }

  set(matches: boolean) {
    this.matches = matches;
    const event = { matches, media: this.media } as MediaQueryListEvent;
    for (const listener of [...this.listeners]) listener(event);
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function installMedia(matches: boolean) {
  const media = new MediaQueryController(matches);
  vi.mocked(window.matchMedia).mockImplementation((query) => {
    expect(query).toBe(DESKTOP_3D_MEDIA);
    return media as unknown as MediaQueryList;
  });
  return media;
}

function runtimeModule(onCreate?: (options: ThreeExperienceOptions) => void) {
  const runtime = {
    start: vi.fn(),
    retryComputer: vi.fn(),
    destroy: vi.fn(),
  };
  const createThreeExperience = vi.fn((options: ThreeExperienceOptions) => {
    onCreate?.(options);
    return runtime;
  });
  return { module: { createThreeExperience }, runtime, createThreeExperience };
}

describe('PublicExperience', () => {
  beforeEach(() => {
    loadRuntimeMock.mockReset();
    usePathnameMock.mockReset();
    usePathnameMock.mockReturnValue('/');
  });

  it('server-renders scene mounts, stable parking, and one real ScreenHost tree', () => {
    const html = renderToStaticMarkup(<PublicExperience><article>SSR body</article></PublicExperience>);
    const document = new DOMParser().parseFromString(html, 'text/html');

    expect(document.querySelector('[data-public-css-mount]')).not.toBeNull();
    expect(document.querySelector('[data-public-webgl-mount]')).not.toBeNull();
    expect(document.querySelector('[data-screen-parking]')).not.toBeNull();
    expect(document.querySelectorAll('#screen-host')).toHaveLength(1);
    expect(document.querySelector('#screen-host article')?.textContent).toBe('SSR body');
    // The empty transparent game-mount host ships alongside the screen host.
    expect(document.querySelectorAll('#paper-screen-host')).toHaveLength(1);
    expect(document.querySelector('#paper-screen-host')?.childElementCount).toBe(0);
    // The paper overlay has its own CSS3D mount (z3, above the canvas),
    // decoupled from the monitor's css-mount.
    expect(document.querySelectorAll('#paper-mount')).toHaveLength(1);
    expect(document.querySelector('#paper-mount')?.getAttribute('data-public-paper-mount')).not.toBeNull();
  });

  it('does not import the Three runtime when desktop capabilities do not match', async () => {
    installMedia(false);
    render(<PublicExperience><p>Mobile content</p></PublicExperience>);
    await act(async () => Promise.resolve());

    expect(loadRuntimeMock).not.toHaveBeenCalled();
    expect(screen.getByText('Mobile content')).toBeVisible();
    expect(document.querySelector('[data-public-experience="ordinary"]')).not.toBeNull();
  });

  it('cancels a stale dynamic import when media changes before it resolves', async () => {
    const media = installMedia(true);
    const pending = deferred<ReturnType<typeof runtimeModule>['module']>();
    const runtime = runtimeModule();
    loadRuntimeMock.mockReturnValue(pending.promise);
    render(<PublicExperience><p>Content</p></PublicExperience>);

    act(() => media.set(false));
    pending.resolve(runtime.module);
    await act(async () => pending.promise);

    expect(runtime.createThreeExperience).not.toHaveBeenCalled();
    expect(document.querySelector('[data-public-experience="ordinary"]')).not.toBeNull();
  });

  it('creates one StrictMode runtime and tears it down once', async () => {
    installMedia(true);
    const runtime = runtimeModule();
    loadRuntimeMock.mockResolvedValue(runtime.module);
    const view = render(<StrictMode><PublicExperience><p>Strict content</p></PublicExperience></StrictMode>);

    await waitFor(() => expect(runtime.createThreeExperience).toHaveBeenCalledTimes(1));
    expect(runtime.runtime.start).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(runtime.runtime.destroy).toHaveBeenCalledTimes(1);
  });

  it('keeps one runtime and the same host while route children change', async () => {
    installMedia(true);
    let options: ThreeExperienceOptions | undefined;
    const runtime = runtimeModule((createdOptions) => {
      options = createdOptions;
      createdOptions.cssMount.appendChild(createdOptions.screenHost);
    });
    runtime.runtime.destroy.mockImplementation(() => {
      if (options) options.parkingNode.appendChild(options.screenHost);
    });
    loadRuntimeMock.mockResolvedValue(runtime.module);
    const view = render(<PublicExperience><p>Route one</p></PublicExperience>);

    await waitFor(() => expect(runtime.createThreeExperience).toHaveBeenCalledTimes(1));
    const host = document.getElementById('screen-host');
    expect(host?.parentElement).toBe(options?.cssMount);

    view.rerender(<PublicExperience><p>Route two</p></PublicExperience>);
    expect(screen.getByText('Route two')).toBeInTheDocument();
    expect(document.getElementById('screen-host')).toBe(host);
    expect(runtime.createThreeExperience).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(runtime.runtime.destroy).toHaveBeenCalledTimes(1);
    expect(options?.screenHost.parentElement).toBe(options?.parkingNode);
  });

  it('keeps desktop mode on computer failure and retries only that model', async () => {
    installMedia(true);
    let options: ThreeExperienceOptions | undefined;
    const runtime = runtimeModule((createdOptions) => { options = createdOptions; });
    loadRuntimeMock.mockResolvedValue(runtime.module);
    render(<PublicExperience><p>Hidden desktop content</p></PublicExperience>);
    await waitFor(() => expect(options).toBeDefined());

    act(() => options?.onComputerError(new Error('computer unavailable')));
    expect(screen.getByRole('alert')).toHaveTextContent('computer unavailable');
    expect(document.querySelector('[data-public-experience="desktop-error"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry computer model' }));
    expect(runtime.runtime.retryComputer).toHaveBeenCalledTimes(1);
  });

  it('mounts the routed game onto the paper screen when the desktop is ready', async () => {
    installMedia(true);
    usePathnameMock.mockReturnValue('/games/drawing');
    let options: ThreeExperienceOptions | undefined;
    const runtime = runtimeModule((createdOptions) => { options = createdOptions; });
    loadRuntimeMock.mockResolvedValue(runtime.module);
    render(<PublicExperience><p>Route content</p></PublicExperience>);
    await waitFor(() => expect(options).toBeDefined());

    act(() => options?.onComputerReady());
    await waitFor(() => {
      expect(document.getElementById('paper-screen-host')?.querySelector('[data-game="drawing"]')).not.toBeNull();
    });
  });

  it('keeps one 3D runtime across game route changes and keeps rendering the derived game', async () => {
    installMedia(true);
    usePathnameMock.mockReturnValue('/games/drawing');
    let options: ThreeExperienceOptions | undefined;
    const runtime = runtimeModule((createdOptions) => { options = createdOptions; });
    loadRuntimeMock.mockResolvedValue(runtime.module);
    const view = render(<PublicExperience><p>Route content</p></PublicExperience>);
    await waitFor(() => expect(runtime.createThreeExperience).toHaveBeenCalledTimes(1));
    act(() => options?.onComputerReady());
    const gameNode = await waitFor(() => {
      const node = document.querySelector('#paper-screen-host [data-game="drawing"]');
      expect(node).not.toBeNull();
      return node;
    });

    usePathnameMock.mockReturnValue('/');
    view.rerender(<PublicExperience><p>Route content</p></PublicExperience>);

    expect(runtime.createThreeExperience).toHaveBeenCalledTimes(1);
    // 切出游戏路由后回退到默认游戏，纸面内容继续渲染且不重建节点。
    expect(document.querySelector('#paper-screen-host [data-game="drawing"]')).toBe(gameNode);
  });

  it('falls back to the default game for an unknown game route id', async () => {
    installMedia(true);
    usePathnameMock.mockReturnValue('/games/nope');
    let options: ThreeExperienceOptions | undefined;
    const runtime = runtimeModule((createdOptions) => { options = createdOptions; });
    loadRuntimeMock.mockResolvedValue(runtime.module);
    render(<PublicExperience><p>Route content</p></PublicExperience>);
    await waitFor(() => expect(options).toBeDefined());

    act(() => options?.onComputerReady());
    await waitFor(() => {
      expect(document.getElementById('paper-screen-host')?.querySelector('[data-game="drawing"]')).not.toBeNull();
    });
  });

  it('does not mount any game when the desktop capability is unavailable', async () => {
    installMedia(false);
    usePathnameMock.mockReturnValue('/games/drawing');
    render(<PublicExperience><p>Mobile content</p></PublicExperience>);
    await act(async () => Promise.resolve());

    expect(loadRuntimeMock).not.toHaveBeenCalled();
    expect(document.getElementById('paper-screen-host')?.childElementCount).toBe(0);
  });

  it('does not mount the game when the computer model fails', async () => {
    installMedia(true);
    usePathnameMock.mockReturnValue('/games/drawing');
    let options: ThreeExperienceOptions | undefined;
    const runtime = runtimeModule((createdOptions) => { options = createdOptions; });
    loadRuntimeMock.mockResolvedValue(runtime.module);
    render(<PublicExperience><p>Route content</p></PublicExperience>);
    await waitFor(() => expect(options).toBeDefined());

    act(() => options?.onComputerError(new Error('computer unavailable')));
    expect(document.querySelector('[data-public-experience="desktop-error"]')).not.toBeNull();
    expect(document.getElementById('paper-screen-host')?.childElementCount).toBe(0);
  });
});
