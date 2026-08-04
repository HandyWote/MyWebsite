export type SizeSnapshot = {
  width: number;
  height: number;
  pixelRatio: number;
};

export class Sizes {
  private listeners = new Set<(size: SizeSnapshot) => void>();
  private destroyed = false;
  private readonly onResize = () => {
    this.read();
    for (const listener of [...this.listeners]) listener(this.snapshot());
  };

  width = 1;
  height = 1;
  pixelRatio = 1;

  constructor(private readonly target: Window = window) {
    this.read();
    target.addEventListener('resize', this.onResize);
  }

  onChange(listener: (size: SizeSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): SizeSnapshot {
    return { width: this.width, height: this.height, pixelRatio: this.pixelRatio };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.target.removeEventListener('resize', this.onResize);
    this.listeners.clear();
  }

  private read(): void {
    this.width = Math.max(1, this.target.innerWidth);
    this.height = Math.max(1, this.target.innerHeight);
    this.pixelRatio = Math.min(this.target.devicePixelRatio || 1, 2);
  }
}
