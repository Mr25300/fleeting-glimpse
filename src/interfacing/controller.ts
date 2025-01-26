export enum Control {
  moveF = "w",
  moveL = "a",
  moveR = "d",
  moveB = "s",
  jump = " ",
  sprint = "shift",
  scan = "mouseclick"
}

/** Handles user input and controls. */
export class Controller {
  private readonly MOUSE_SENSITIVITY: number = 1 / 200;
  private readonly SCROLL_SENSITIVITY: number = Math.PI / 180 / 50;

  private mouseLocked: boolean = false;
  private alreadyAwaiting: boolean = false;
  private lockWaitPromise?: Promise<void>;

  private xMovement: number = 0;
  private yMovement: number = 0;
  private _scrollMovement: number = 0;

  /** A map of currently held down controls. */
  private activeControls: Map<Control, boolean> = new Map();

  constructor() {
    document.addEventListener("mousemove", (event: MouseEvent) => {
      this.xMovement += event.movementX;
      this.yMovement -= event.movementY;
    });

    document.addEventListener("wheel", (event: WheelEvent) => {
      this._scrollMovement = event.deltaY;
    });

    document.addEventListener("mousedown", (event: MouseEvent) => {
      this.activeControls.set("mouseclick" as Control, true);

      if (this.mouseLocked && !document.pointerLockElement) {
        this.handleMouseLockRequest();
      }
    });

    document.addEventListener("mouseup", (event: MouseEvent) => {
      this.activeControls.set("mouseclick" as Control, false);
    });

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      this.activeControls.set(event.key.toLowerCase() as Control, true);
    });

    document.addEventListener("keyup", (event: KeyboardEvent) => {
      this.activeControls.set(event.key.toLowerCase() as Control, false);
    });

    document.addEventListener("pointerlockchange", () => {
      if (!document.pointerLockElement) {
        // Create promise to prevent pointer lock during cooldown
        this.lockWaitPromise = new Promise((resolve) => {
          setTimeout(() => {
            delete this.lockWaitPromise;
            this.alreadyAwaiting = false;

            resolve();

          }, 1300);
        });
      }
    });
  }

  /** Handles mouse lock, awaiting the pointer lock cooldown if active. */
  private handleMouseLockRequest(): void {
    if (this.lockWaitPromise) {
      if (!this.alreadyAwaiting) {
        this.alreadyAwaiting = true;
        this.lockWaitPromise.then(() => document.body.requestPointerLock())
      }

    } else {
      document.body.requestPointerLock();
    }
  }

  /** Returns the x and y aim delta based on the user's mouse movement since the last call. */
  public get aimMovement(): [number, number] {
    const totalX: number = this.xMovement;
    const totalY: number = this.yMovement;

    // Reset movement for next frame
    this.xMovement = 0;
    this.yMovement = 0;

    return [-totalX * this.MOUSE_SENSITIVITY, totalY * this.MOUSE_SENSITIVITY];
  }

  /** Returns the user's mouse scroll movement since the last call. */
  public get scrollMovement(): number {
    const movement: number = this._scrollMovement;

    this._scrollMovement = 0; // Reset movement for next frame
    
    return movement * this.SCROLL_SENSITIVITY;
  }

  /**
   * Determines whether or not a specified control is currently held down.
   * @param control The specified control.
   * @returns True if being held down, false if otherwise.
   */
  public controlActive(control: Control): boolean {
    return this.activeControls.get(control) === true;
  }

  /** Lock and hide the mouse. */
  public lockMouse(): void {
    this.mouseLocked = true;

    this.handleMouseLockRequest();
  }

  /** Unlock and show the mouse. */
  public unlockMouse(): void {
    this.mouseLocked = false;

    document.exitPointerLock();
  }
}