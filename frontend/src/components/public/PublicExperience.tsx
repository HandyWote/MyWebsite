'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import type { PaperGameHost } from '@/games/host';
import { getDefaultGame, getGame } from '@/games/registry';
import type { ThreeExperience } from '@/three/types';
import { DESKTOP_3D_MEDIA } from '@/games/media';
import { PublicPortalBoundary } from './PublicPortalBoundary';
import { loadThreeRuntime } from './threeRuntimeLoader';

// 与 src/games/media 保持同源（导出名不变，既有测试从 './PublicExperience' 导入）。
export { DESKTOP_3D_MEDIA };

type ExperienceMode = 'ordinary' | 'desktop-loading' | 'desktop-ready' | 'desktop-error';

export function PublicExperience({ children }: { children: ReactNode }) {
  const webglMountRef = useRef<HTMLDivElement>(null);
  const cssMountRef = useRef<HTMLDivElement>(null);
  const paperMountRef = useRef<HTMLDivElement>(null);
  const parkingRef = useRef<HTMLDivElement>(null);
  const screenHostRef = useRef<HTMLDivElement>(null);
  const paperHostRef = useRef<HTMLDivElement>(null);
  // Portal target for the paper mini-game: the node must be read at render
  // time, so it is mirrored into state via the attach callback (stable
  // identity, so React calls it only on mount/unmount). First render is null
  // (no portal), and any later state update re-renders with the node set.
  const [paperHostNode, setPaperHostNode] = useState<HTMLDivElement | null>(null);
  const attachPaperHost = useCallback((node: HTMLDivElement | null) => {
    paperHostRef.current = node;
    setPaperHostNode(node);
  }, []);
  // Stable PaperGameHost instance: mount/unmount/getSize bind to the current
  // #paper-screen-host node at call time (PaperScreen reparents that node
  // into the paper renderer; the host contract is unaffected).
  const [host] = useState<PaperGameHost>(() => ({
    mount(element: HTMLElement) {
      paperHostRef.current?.appendChild(element);
    },
    unmount() {
      paperHostRef.current?.replaceChildren();
    },
    getSize() {
      const node = paperHostRef.current;
      return { width: node?.offsetWidth ?? 0, height: node?.offsetHeight ?? 0 };
    },
  }));
  const runtimeRef = useRef<ThreeExperience | null>(null);
  const retryRef = useRef<() => void>(() => {});
  const [mode, setMode] = useState<ExperienceMode>('ordinary');
  const [computerError, setComputerError] = useState('');

  useLayoutEffect(() => {
    const webglMount = webglMountRef.current;
    const cssMount = cssMountRef.current;
    const paperMount = paperMountRef.current;
    const parkingNode = parkingRef.current;
    const screenHost = screenHostRef.current;
    const paperHost = paperHostRef.current;
    if (!webglMount || !cssMount || !paperMount || !parkingNode || !screenHost || !paperHost) return;

    const media = window.matchMedia(DESKTOP_3D_MEDIA);
    let disposed = false;
    let generation = 0;

    const parkHost = () => {
      if (screenHost.parentElement !== parkingNode) parkingNode.appendChild(screenHost);
    };

    const teardown = () => {
      generation += 1;
      const runtime = runtimeRef.current;
      runtimeRef.current = null;
      runtime?.destroy();
      parkHost();
    };

    const activate = () => {
      if (!media.matches || disposed) {
        teardown();
        setComputerError('');
        setMode('ordinary');
        return;
      }

      const token = ++generation;
      setComputerError('');
      setMode('desktop-loading');
      void loadThreeRuntime()
        .then(({ createThreeExperience }) => {
          if (disposed || token !== generation || !media.matches) return;
          const runtime = createThreeExperience({
            webglMount,
            cssMount,
            paperMount,
            screenHost,
            paperHost,
            parkingNode,
            onComputerError(error) {
              if (disposed || token !== generation) return;
              setComputerError(error.message || 'Unable to load the computer model');
              setMode('desktop-error');
            },
            onComputerReady() {
              if (disposed || token !== generation) return;
              setComputerError('');
              setMode('desktop-ready');
            },
          });
          if (disposed || token !== generation || !media.matches) {
            runtime.destroy();
            parkHost();
            return;
          }
          runtimeRef.current = runtime;
          runtime.start();
        })
        .catch((error: unknown) => {
          if (disposed || token !== generation) return;
          const message = error instanceof Error ? error.message : String(error);
          setComputerError(message || 'Unable to initialize the 3D experience');
          setMode('desktop-error');
        });
    };

    const handleMediaChange = () => {
      teardown();
      activate();
    };

    retryRef.current = () => {
      if (!media.matches || disposed) return;
      setComputerError('');
      setMode('desktop-loading');
      if (runtimeRef.current) runtimeRef.current.retryComputer();
      else activate();
    };

    media.addEventListener('change', handleMediaChange);
    activate();

    return () => {
      disposed = true;
      retryRef.current = () => {};
      media.removeEventListener('change', handleMediaChange);
      teardown();
    };
  }, []);

  const retryComputer = useCallback(() => retryRef.current(), []);
  const desktop = mode !== 'ordinary';

  // Route-driven game derivation: pure render-time mapping, no effect, so
  // route switches never touch the 3D activation logic. Unknown ids (and all
  // non-/games/* routes) fall back to the default game.
  const pathname = usePathname();
  const gameRouteMatch = /^\/games\/([^/]+)/.exec(pathname ?? '');
  const game = (gameRouteMatch ? getGame(gameRouteMatch[1]) : undefined) ?? getDefaultGame();

  return (
    <div className="public-experience" data-public-experience={mode}>
      <div className="public-scene" data-public-scene aria-hidden={!desktop}>
        <div ref={cssMountRef} className="public-css-mount" data-public-css-mount />
        <div ref={webglMountRef} className="public-webgl-mount" data-public-webgl-mount />
        {/* Paper mini-game overlay's own CSS3D layer (z3, above the canvas),
            decoupled from the monitor's css-mount (z1). */}
        <div ref={paperMountRef} className="public-paper-mount" id="paper-mount" data-public-paper-mount />
      </div>
      {mode === 'desktop-error' && (
        <div className="public-scene-error" role="alert">
          <p>Computer model failed to load.</p>
          <p className="public-scene-error-detail">{computerError}</p>
          <button type="button" onClick={retryComputer}>Retry computer model</button>
        </div>
      )}
      <div
        ref={parkingRef}
        className="public-screen-parking"
        data-screen-parking
        aria-hidden={desktop && mode !== 'desktop-ready' ? true : undefined}
      >
        <PublicPortalBoundary>
          <div ref={screenHostRef} id="screen-host" data-screen-host="public">
            {children}
          </div>
        </PublicPortalBoundary>
        {/* Future mini-game mount: transparent overlay aligned to the desk
            paper (the PaperScreen CSS3DObject takes over this host). */}
        <div
          ref={attachPaperHost}
          id="paper-screen-host"
          data-paper-screen-host
          aria-hidden={desktop && mode !== 'desktop-ready' ? true : undefined}
        />
      </div>
      {/* Route-driven mini-game: mounted onto the desk paper via portal only
          when the desktop layer is ready. The portal target is the persistent
          #paper-screen-host node, regardless of PaperScreen reparenting. */}
      {mode === 'desktop-ready' && paperHostNode !== null &&
        createPortal(<game.GameView host={host} />, paperHostNode)}
    </div>
  );
}
