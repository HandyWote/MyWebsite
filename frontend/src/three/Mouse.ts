export class Mouse {
  x = 0;
  y = 0;

  update(event: PointerEvent): void {
    this.x = event.clientX;
    this.y = event.clientY;
  }
}
