import { Capsule } from "./collisions.js";
import { Control } from "./controller.js";
import { Entity } from "./entity.js";
import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { Vector3 } from "./vector3.js";

export class Player extends Entity {
  private walkSpeed: number = 8;
  private sprintSpeed: number = 16;
  private jumpVelocity: number = 20;

  constructor() {
    super(
      Vector3.zero,
      8,
      new Capsule(new Vector3(0, -2, 0), new Vector3(0, 2, 0), 1.5)
      // new Capsule(new Vector3(0, -2, 0), new Vector3(0, 2, 0), 1.5)
    );
  }

  public behaviour() {
    let inputDir: Vector3 = Vector3.zero;

    // if (this.position.y < 0) {
    //   this.gravityVelocity
    // }

    if (Game.instance.controller.controlActive(Control.moveF)) inputDir = inputDir.subtract(Vector3.z);
    if (Game.instance.controller.controlActive(Control.moveB)) inputDir = inputDir.add(Vector3.z);
    if (Game.instance.controller.controlActive(Control.moveL)) inputDir = inputDir.subtract(Vector3.x);
    if (Game.instance.controller.controlActive(Control.moveR)) inputDir = inputDir.add(Vector3.x);

    if (inputDir.magnitude === 0) inputDir = Vector3.zero;
    else inputDir = inputDir.unit;

    const moveMatrix: Matrix4 = Matrix4.fromRotationY(Game.instance.camera.yaw);

    this.faceDirection = moveMatrix.lookVector;
    this.moveDirection = moveMatrix.apply(inputDir);

    if (Game.instance.controller.controlActive(Control.jump) && this.onFloor) this.fallSpeed -= this.jumpVelocity;

    if (Game.instance.controller.controlActive(Control.sprint)) {
      this.speed = this.sprintSpeed;
      Game.instance.camera.setFov(100);

    } else {
      this.speed = this.walkSpeed;
      Game.instance.camera.setFov(70);
    }
  }
}