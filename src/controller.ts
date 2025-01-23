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
  private activeControls: Map<Control, boolean> = new Map();

  constructor() {
    document.addEventListener("mousemove", (event: MouseEvent) => {
      Game.instance.camera.rotate(-event.movementX / 200, -event.movementY / 200);
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