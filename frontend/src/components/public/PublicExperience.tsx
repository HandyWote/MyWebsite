'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThreeExperience } from '@/three/types';
import { PublicPortalBoundary } from './PublicPortalBoundary';
import { loadThreeRuntime } from './threeRuntimeLoader';

export const DESKTOP_3D_MEDIA = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';

type ExperienceMode = 'ordinary' | 'desktop-loading' | 'desktop-ready' | 'desktop-error';

export function PublicExperience({ children }: { children: ReactNode }) {
  const webglMountRef = useRef<HTMLDivElement>(null);
  const cssMountRef = useRef<HTMLDivElement>(null);
  const parkingRef = useRef<HTMLDivElement>(null);
  const screenHostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ThreeExperience | null>(null);
  const retryRef = useRef<() => void>(() => {});
  const [mode, setMode] = useState<ExperienceMode>('ordinary');
  const [computerError, setComputerError] = useState('');

  useLayoutEffect(() => {
    const webglMount = webglMountRef.current;
    const cssMount = cssMountRef.current;
    const parkingNode = parkingRef.current;
    const screenHost = screenHostRef.current;
    if (!webglMount || !cssMount || !parkingNode || !screenHost) return;

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
            screenHost,
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

  return (
    <div className="public-experience" data-public-experience={mode}>
      <div className="public-scene" data-public-scene aria-hidden={!desktop}>
        <div ref={cssMountRef} className="public-css-mount" data-public-css-mount />
        <div ref={webglMountRef} className="public-webgl-mount" data-public-webgl-mount />
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
      </div>
    </div>
  );
}
