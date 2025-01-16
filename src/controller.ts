import { RaycastInfo } from "./bvh.js";
import { Ray } from "./collisions.js";
import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";

export enum Control {
  moveF = "w",
  moveL = "a",
  moveR = "d",
  moveB = "s",
  jump = "space"
}

export class Controller {
  private activeControls: Map<Control, boolean> = new Map();

  constructor() {
    document.addEventListener("click", () => {
      document.body.requestPointerLock();

      for (let i = 0; i < 500; i++) {
        const lineDirection: Matrix4 = Game.instance.camera.rotation.rotate(0, 0, 2 * Math.PI * Math.random()).rotate(0, 10 * Math.PI / 180 * Math.random(), 0);
        const ray = new Ray(Game.instance.camera.position, lineDirection.lookVector);

        const info: RaycastInfo | undefined = Game.instance.bvh.raycast(ray);

        if (info) Game.instance.canvas.createDot(info.position, info.normal);
      }
    });

    document.addEventListener("mousemove", (event: MouseEvent) => {
      Game.instance.camera.rotate(-event.movementX / 200, -event.movementY / 200);
    });

    document.addEventListener("wheel", (event: WheelEvent) => {

    });

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      this.handleKeyEvent(event, true);
    });

    document.addEventListener("keyup", (event: KeyboardEvent) => {
      this.handleKeyEvent(event, false);
    });
  }

  private handleKeyEvent(event: KeyboardEvent, pressed: boolean): void {
    const key: string = event.key.toLowerCase();

    this.activeControls.set(key as Control, pressed);
  }

  public controlActive(control: Control): boolean {
    return this.activeControls.get(control) === true;
  }
}