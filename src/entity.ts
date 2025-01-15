import { Control } from "./controller.js";
import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { Vector3 } from "./vector3.js";

export class Entity {
  private GRAV_ACCEL: Vector3 = new Vector3(0, -10, 0);

  private moveDirection: Vector3 = Vector3.zero;
  private faceDirection: Vector3;
  private gravityVelocity: Vector3 = Vector3.zero;

  constructor(public position: Vector3, private speed: number) {}

  public behaviour(): void {
    let inputDir: Vector3 = Vector3.zero;

    // if (this.position.y < 0) {
    //   this.gravityVelocity
    // }

    if (Game.instance.controller.controlActive(Control.moveF)) inputDir = inputDir.add(new Vector3(0, 0, -1));
    if (Game.instance.controller.controlActive(Control.moveB)) inputDir = inputDir.add(new Vector3(0, 0, 1));
    if (Game.instance.controller.controlActive(Control.moveL)) inputDir = inputDir.add(new Vector3(-1, 0, 0));
    if (Game.instance.controller.controlActive(Control.moveR)) inputDir = inputDir.add(new Vector3(1, 0, 0));

    if (inputDir.magnitude === 0) inputDir = Vector3.zero;
    else inputDir = inputDir.unit;

    const moveMatrix: Matrix4 = Matrix4.fromRotationY(Game.instance.camera.yaw);

    this.moveDirection = moveMatrix.apply(inputDir);
  }

  public update(deltaTime: number): void {
    this.position = this.position.add(this.moveDirection.multiply(this.speed * deltaTime));
  }
}