import { AudioEmitter } from "./audiomanager.js";
import { RaycastInfo } from "./bvh.js";
import { Capsule, Ray } from "./collisions.js";
import { Control } from "./controller.js";
import { Entity } from "./entity.js";
import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { Timer } from "./timer.js";
import { Util } from "./util.js";
import { Vector3 } from "./vector3.js";

export class Player extends Entity {
  private readonly MIN_SCAN_ANGLE: number = 5 * Math.PI / 180;
  private readonly MAX_SCAN_ANGLE: number = 30 * Math.PI / 180;
  private readonly DOTS_PER_SCAN: number = 200;

  private readonly WALK_SPEED: number = 8;
  private readonly SPRINT_SPEED: number = 16;
  private readonly JUMP_VELOCITY: number = 30;

  private readonly MAX_STAMINA: number = 100;
  private readonly STAMINA_DRAIN_RATE: number = 20;
  private readonly STAMINA_FILL_RATE = 10;

  private stamina: number;

  private footstepEmitter: AudioEmitter;

  private _sprinting: boolean = false;
  private jumpTimer: Timer = new Timer(1);

  private scanAngle: number = this.MIN_SCAN_ANGLE;
  private scanTimer: Timer = new Timer(0.05);

  constructor() {
    super(
      Vector3.zero,
      new Capsule(
        new Vector3(0, -2, 0),
        new Vector3(0, 2, 0),
        1.5
      )
    );

    this.stamina = this.MAX_STAMINA;

    this.footstepEmitter = Game.instance.audioManager.get("footstep").createEmitter();
  }

  public get sprinting(): boolean {
    return this._sprinting;
  }

  public prePhysicsBehaviour(deltaTime: number): void {
    let inputDir: Vector3 = Vector3.zero;

    if (Game.instance.controller.controlActive(Control.moveF)) inputDir = inputDir.subtract(Vector3.z);
    if (Game.instance.controller.controlActive(Control.moveB)) inputDir = inputDir.add(Vector3.z);
    if (Game.instance.controller.controlActive(Control.moveL)) inputDir = inputDir.subtract(Vector3.x);
    if (Game.instance.controller.controlActive(Control.moveR)) inputDir = inputDir.add(Vector3.x);

    this.aimDirection = Game.instance.camera.rotation.lookVector;
    this.moveDirection = this.faceMatrix.apply(inputDir);

    if (Game.instance.controller.controlActive(Control.jump) && this.onFloor && !this.jumpTimer.active) {
      this.jumpTimer.start();
      this.impulseUp(this.JUMP_VELOCITY);
    }

    if (Game.instance.controller.controlActive(Control.sprint) && this.moveDirection.magnitude > 0) {
      this.stamina = Math.max(this.stamina - this.STAMINA_DRAIN_RATE * deltaTime, 0);

      if (this.stamina > 0) this._sprinting = true;
      else this._sprinting = false;

    } else {
      this.stamina = Math.min(this.stamina + this.STAMINA_FILL_RATE * deltaTime, this.MAX_STAMINA);
      this._sprinting = false;
    }

    if (this._sprinting) {
      this.moveSpeed = this.SPRINT_SPEED;

      this.footstepEmitter.frequency = 1.8;

      Game.instance.camera.fov = 100;

    } else {
      this.moveSpeed = this.WALK_SPEED;

      this.footstepEmitter.frequency = 1;

      Game.instance.camera.fov = 70;
    }

    if (this.moveDirection.magnitude > 0) this.footstepEmitter.start();
    else this.footstepEmitter.stop();
  }

  public postPhysicsBehaviour(): void {
    const direction: Vector3 = this.aimDirection;
    const perpendicular: Vector3 = direction.orthogonal();

    const scroll: number = Game.instance.controller.scrollMovement;
    this.scanAngle = Util.clamp(this.scanAngle + scroll * Math.PI / 180 / 50, this.MIN_SCAN_ANGLE, this.MAX_SCAN_ANGLE);
    
    if (Game.instance.controller.controlActive(Control.glimpse) && !this.scanTimer.active) {
      this.scanTimer.start();

      for (let i: number = 0; i < this.DOTS_PER_SCAN; i++) {
        const roll: number = 2 * Math.PI * Math.random();
        const pitch: number = this.scanAngle * Math.random();

        const pitchMatrix = Matrix4.fromAxisAngle(perpendicular, pitch);
        const rollMatrix = Matrix4.fromAxisAngle(this.aimDirection, roll);

        const direction: Vector3 = rollMatrix.apply(pitchMatrix.apply(this.aimDirection));

        const ray = new Ray(Game.instance.camera.position, direction);
        const info: RaycastInfo | undefined = Game.instance.bvh.raycast(ray);
  
        if (info) Game.instance.canvas.createDot(info.position, info.normal);
      }
    }
  }
}