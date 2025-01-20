import { RaycastInfo } from "./bvh.js";
import { Capsule, Ray } from "./collisions.js";
import { Control } from "./controller.js";
import { Entity } from "./entity.js";
import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { Vector3 } from "./vector3.js";

export class Player extends Entity {
  private GLIMPSE_ANGLE: number = 8 * Math.PI / 180;
  private STAMINA_DRAIN_RATE: number = 20;
  private STAMINA_FILL_RATE = 10;

  private walkSpeed: number = 8;
  private sprintSpeed: number = 16;
  private jumpVelocity: number = 20;

  private maxStamina: number = 100;
  private stamina: number;

  constructor() {
    super(
      Vector3.zero,
      8,
      new Capsule(new Vector3(0, -2, 0), new Vector3(0, 2, 0), 1.5)
      // new Capsule(new Vector3(0, -2, 0), new Vector3(0, 2, 0), 1.5)
    );

    this.stamina = this.maxStamina;
  }

  public prePhysicsBehaviour(deltaTime: number): void {
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

    const sprinting: boolean = Game.instance.controller.controlActive(Control.sprint);

    if (sprinting && this.stamina > 0) {
      this.speed = this.sprintSpeed;
      Game.instance.camera.setFov(100);

      this.stamina = Math.max(this.stamina - this.STAMINA_DRAIN_RATE * deltaTime, 0);

    } else {
      this.speed = this.walkSpeed;
      Game.instance.camera.setFov(70);

      if (!sprinting) this.stamina = Math.min(this.stamina + this.STAMINA_FILL_RATE * deltaTime, this.maxStamina);
    }

    console.log(this.stamina);
  }

  public postPhysicsBehaviour(): void {
    if (Game.instance.controller.controlActive(Control.glimpse)) {
      let angle = this.GLIMPSE_ANGLE;

      if (this.moveDirection.magnitude > 0) angle *= 1.5;

      for (let i: number = 0; i < 10; i++) {
        const lineDirection: Matrix4 = Game.instance.camera.rotation.rotate(0, 0, 2 * Math.PI * Math.random()).rotate(0, angle * Math.random(), 0);
        const ray = new Ray(Game.instance.camera.position, lineDirection.lookVector);
  
        const info: RaycastInfo | undefined = Game.instance.bvh.raycast(ray);
  
        if (info) Game.instance.canvas.createDot(info.position, info.normal);
      }

      Game.instance.audioManager.play("scanning");

    } else {
      Game.instance.audioManager.stop("scanning");
    }
  }
}