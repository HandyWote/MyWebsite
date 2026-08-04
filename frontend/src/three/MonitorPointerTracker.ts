import type { Camera } from './Camera';
import type { Mouse } from './Mouse';

export class MonitorPointerTracker {
  private destroyed = false;
  private inHost = false;

  constructor(
    private readonly documentTarget: Document,
    private readonly host: HTMLElement,
    private readonly camera: Camera,
    private readonly mouse: Mouse,
  ) {}

  start(): void {
    if (this.destroyed) return;
    this.documentTarget.addEventListener('pointermove', this.onPointerMove);
    this.documentTarget.addEventListener('pointerdown', this.onPointerDown);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.documentTarget.removeEventListener('pointermove', this.onPointerMove);
    this.documentTarget.removeEventListener('pointerdown', this.onPointerDown);
  }

  private isInsideHost(event: Event): boolean {
    return event.target instanceof Node && this.host.contains(event.target);
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    if (this.isInsideHost(event)) {
      if (!this.inHost) this.camera.enterMonitor();
      this.inHost = true;
      return;
    }
    this.inHost = false;
    this.mouse.update(event);
  };

  private readonly onPointerDown = (event: PointerEvent) => {
    if (this.isInsideHost(event)) return;
    this.mouse.update(event);
    this.camera.toggleDeskView();
  };
}
