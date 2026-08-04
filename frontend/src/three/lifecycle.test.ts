import { Group, Tween } from '@tweenjs/tween.js';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Camera } from './Camera';
import { MonitorPointerTracker } from './MonitorPointerTracker';
import { Mouse } from './Mouse';
import { Sizes } from './Sizes';
import { Time, type AnimationScheduler } from './Time';

describe('runtime lifecycle services', () => {
  it('cancels the active RAF and does not schedule another frame after stop', () => {
    let frameCallback: FrameRequestCallback | undefined;
    const scheduler: AnimationScheduler = {
      request: vi.fn((callback) => {
        frameCallback = callback;
        return 42;
      }),
      cancel: vi.fn(),
      now: vi.fn(() => 10),
    };
    const time = new Time(scheduler);
    const tick = vi.fn();
    time.onTick(tick);
    time.start();
    time.stop();
    frameCallback?.(20);

    expect(scheduler.cancel).toHaveBeenCalledWith(42);
    expect(tick).not.toHaveBeenCalled();
    expect(scheduler.request).toHaveBeenCalledTimes(1);
  });

  it('keeps non-camera tweens when replacing a camera transition', () => {
    const group = new Group();
    const foreignState = { opacity: 0 };
    const foreignTween = new Tween(foreignState, group).to({ opacity: 1 }, 500).start(0);
    const sizes = new Sizes(window);
    const camera = new Camera(new THREE.Scene(), sizes, new Mouse(), new Time(), group);

    camera.transition('desk', 100);
    camera.transition('idle', 100);

    expect(group.getAll()).toContain(foreignTween);
    camera.destroy();
    sizes.destroy();
  });

  it('removes its resize listener idempotently', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const sizes = new Sizes(window);
    sizes.destroy();
    sizes.destroy();

    const resizeListener = add.mock.calls.find(([name]) => name === 'resize')?.[1];
    expect(resizeListener).toBeDefined();
    expect(remove).toHaveBeenCalledWith('resize', resizeListener);
  });

  it('ignores scene pointer actions inside the host and removes document listeners', () => {
    const host = document.createElement('div');
    const link = document.createElement('a');
    host.appendChild(link);
    document.body.appendChild(host);
    const camera = { enterMonitor: vi.fn(), toggleDeskView: vi.fn() } as unknown as Camera;
    const tracker = new MonitorPointerTracker(document, host, camera, new Mouse());
    tracker.start();

    link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 12, clientY: 16 }));
    expect(camera.toggleDeskView).not.toHaveBeenCalled();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 30 }));
    expect(camera.toggleDeskView).toHaveBeenCalledTimes(1);

    tracker.destroy();
    tracker.destroy();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(camera.toggleDeskView).toHaveBeenCalledTimes(1);
  });
});
