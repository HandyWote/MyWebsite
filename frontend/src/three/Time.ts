export type AnimationScheduler = {
  request(callback: FrameRequestCallback): number;
  cancel(handle: number): void;
  now(): number;
};

const browserScheduler: AnimationScheduler = {
  request: (callback) => window.requestAnimationFrame(callback),
  cancel: (handle) => window.cancelAnimationFrame(handle),
  now: () => performance.now(),
};

export class Time {
  private listeners = new Set<(time: Time) => void>();
  private frame: number | null = null;
  private running = false;
  private previous = 0;

  elapsed = 0;
  delta = 16;

  constructor(private readonly scheduler: AnimationScheduler = browserScheduler) {}

  onTick(listener: (time: Time) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.previous = this.scheduler.now();
    this.frame = this.scheduler.request(this.tick);
  }

  stop(): void {
    if (!this.running && this.frame === null) return;
    this.running = false;
    if (this.frame !== null) this.scheduler.cancel(this.frame);
    this.frame = null;
    this.listeners.clear();
  }

  private readonly tick: FrameRequestCallback = (now) => {
    if (!this.running) return;
    this.delta = Math.max(0, now - this.previous);
    this.elapsed += this.delta;
    this.previous = now;
    for (const listener of [...this.listeners]) listener(this);
    if (this.running) this.frame = this.scheduler.request(this.tick);
  };
}
