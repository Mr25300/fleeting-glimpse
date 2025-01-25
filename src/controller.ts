import { Game } from "./game.js";

export enum Control {
  moveF = "w",
  moveL = "a",
  moveR = "d",
  moveB = "s",
  jump = " ",
  sprint = "shift",
  glimpse = "mouseclick"
}

export class Controller {
  private xMovement: number = 0;
  private yMovement: number = 0;
  private _scrollMovement: number = 0;

  private activeControls: Map<Control, boolean> = new Map();

  constructor() {
    document.addEventListener("mousemove", (event: MouseEvent) => {
      this.xMovement += event.movementX;
      this.yMovement -= event.movementY;
    });

    document.addEventListener("wheel", (event: WheelEvent) => {
      this._scrollMovement = event.deltaY;
    });

    document.addEventListener("mousedown", () => {
      this.activeControls.set("mouseclick" as Control, true);
    });

    document.addEventListener("mouseup", () => {
      this.activeControls.set("mouseclick" as Control, false);
    });

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      this.activeControls.set(event.key.toLowerCase() as Control, true);
    });

    document.addEventListener("keyup", (event: KeyboardEvent) => {
      this.activeControls.set(event.key.toLowerCase() as Control, false);
    });
  }

  public get aimMovement(): [number, number] {
    const totalX: number = this.xMovement;
    const totalY: number = this.yMovement;

    this.xMovement = 0;
    this.yMovement = 0;

    return [totalX, totalY]
  }

  public get scrollMovement(): number {
    const movement: number = this._scrollMovement;

    this._scrollMovement = 0;

    return movement;
  }

  public controlActive(control: Control): boolean {
    return this.activeControls.get(control) === true;
  }

  public lockMouse(): void {
    document.body.requestPointerLock();
  }

  public unlockMouse(): void {
    document.exitPointerLock();
  }
}