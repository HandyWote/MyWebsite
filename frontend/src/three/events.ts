export type Unsubscribe = () => void;

export class TypedEventEmitter<EventMap extends object> {
  private listeners = new Map<keyof EventMap, Set<(payload: never) => void>>();

  on<Key extends keyof EventMap>(
    name: Key,
    listener: (payload: EventMap[Key]) => void,
  ): Unsubscribe {
    const listeners = this.listeners.get(name) ?? new Set();
    listeners.add(listener as (payload: never) => void);
    this.listeners.set(name, listeners);

    return () => listeners.delete(listener as (payload: never) => void);
  }

  emit<Key extends keyof EventMap>(name: Key, payload: EventMap[Key]): void {
    const listeners = this.listeners.get(name);
    if (!listeners) return;
    for (const listener of [...listeners]) listener(payload as never);
  }

  clear(): void {
    this.listeners.clear();
  }
}
