import { StrictMode, type ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ThreeExperienceOptions } from '@/three/types';
import { DESKTOP_3D_MEDIA, PublicExperience } from './PublicExperience';

const { loadRuntimeMock } = vi.hoisted(() => ({ loadRuntimeMock: vi.fn() }));
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
  });

  it('server-renders scene mounts, stable parking, and one real ScreenHost tree', () => {
    const html = renderToStaticMarkup(<PublicExperience><article>SSR body</article></PublicExperience>);
    const document = new DOMParser().parseFromString(html, 'text/html');

    expect(document.querySelector('[data-public-css-mount]')).not.toBeNull();
    expect(document.querySelector('[data-public-webgl-mount]')).not.toBeNull();
    expect(document.querySelector('[data-screen-parking]')).not.toBeNull();
    expect(document.querySelectorAll('#screen-host')).toHaveLength(1);
    expect(document.querySelector('#screen-host article')?.textContent).toBe('SSR body');
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
});
