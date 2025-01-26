type EventHandler = (...args: any) => void;

/** Handles connection handlers to events and firing. */
export class GameEvent {
  /** A map of handlers connected to the event for different keys. */
  private handlers: Set<EventHandler> = new Set();

  /**
   * Connects the handler to an event with an optional key.
   * @param handler The handler function.
   * @param key The event key.
   * @returns The event connection.
   */
  public connect(handler: EventHandler): EventConnection {
    this.handlers.add(handler);

    return new EventConnection(this, handler);
  }

  /**
   * Connects the handler to an event with an optional key so that it disconnects automatically after being fired.
   * @param handler The handler function.
   * @param key The event key.
   * @returns The event connection.
   */
  public connectOnce(handler: EventHandler): EventConnection {
    const wrapper = (...args: any) => {
      handler(...args);

      this.disconnect(wrapper);
    }

    return this.connect(wrapper);
  }

  /**
   * Disconnects an existing handler and its key from the event.
   * @param handler The handler function.
   * @param key The event key.
   */
  public disconnect(handler: EventHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * Checks whether or not a handler and its key are connected to the event.
   * @param handler The handler function.
   * @param key The event key.
   * @returns True if connected, false if not.
   */
  public isConnected(handler: EventHandler): boolean {
    return this.handlers.has(handler);
  }

  /**
   * Fires the event with a key, calling all connected handlers for that key.
   * @param key The event key.
   * @param args The arguments to pass to the handlers.
   */
  public fire(...args: any): void {
    for (const handler of this.handlers) {
      handler(...args);
    }
  }
}

/** Handles and manages event connections. */
export class EventConnection {
  private _active: boolean = true;
  
  constructor(private event: GameEvent, private handler: EventHandler) {}

  public get active(): boolean {
    if (this._active && !this.event.isConnected(this.handler)) {
      this._active = false;
    }

    return this._active;
  }
  
  /** Disconnects the connection"s handler from the associated event. */
  public disconnect(): void {
    if (!this._active) return;
    this._active = false;

    this.event.disconnect(this.handler);
  }
}