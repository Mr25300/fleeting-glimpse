import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { Ray } from "./triangle.js";

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

      for (let i = 0; i < 200; i++) {
        const lineDirection: Matrix4 = Game.instance.camera.rotation.rotate(0, 0, 2 * Math.PI * Math.random()).rotate(0, 10 * Math.PI / 180 * Math.random(), 0);

        const ray = new Ray(Game.instance.camera.position, lineDirection.lookVector);

        let minT: number = Infinity;
        let found: boolean = false;

        for (const triangle of Game.instance.triangles) {
          const t: number | undefined = ray.getIntersectionPoint(triangle);

          if (t !== undefined && t > 0 && t < minT) {
            minT = t;
            found = true;
          }
        }

        if (found) Game.instance.points.push(ray.getPoint(minT));
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