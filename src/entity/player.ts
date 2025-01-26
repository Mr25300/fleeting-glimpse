import { AudioEmission, AudioEmitter } from "../audio/audiomanager.js";
import { RaycastInfo } from "../collisions/bvh.js";
import { Capsule, Ray } from "../collisions/collisions.js";
import { Control } from "../interfacing/controller.js";
import { Entity } from "./entity.js";
import { Game } from "../core/game.js";
import { Matrix4 } from "../math/matrix4.js";
import { Timer } from "../util/timer.js";
import { Util } from "../util/util.js";
import { Vector3 } from "../math/vector3.js";

export class Player extends Entity {
  public readonly MIN_SCAN_ANGLE: number = 3 * Math.PI / 180;
  public readonly MAX_SCAN_ANGLE: number = 30 * Math.PI / 180;
  private readonly DOTS_PER_SCAN: number = 120;

  private readonly WALK_SPEED: number = 8;
  private readonly SPRINT_SPEED: number = 16;
  private readonly JUMP_VELOCITY: number = 30;

  public readonly MAX_STAMINA: number = 100;
  private readonly STAMINA_DRAIN_RATE: number = 8;
  private readonly STAMINA_FILL_RATE = 5;

  private _stamina: number = this.MAX_STAMINA;
  private jumpTimer: Timer = new Timer(1);

  private _scanning: boolean = false;
  private _scanOrigin: Vector3 = Vector3.zero;
  private _scanAngle: number = this.MIN_SCAN_ANGLE;
  private scanTimer: Timer = new Timer(0.05);

  private footstepEmitter: AudioEmitter = Game.instance.audioManager.get("footstep").createEmitter();
  private scanAudio?: AudioEmission;

  constructor() {
    super(
      Vector3.zero,
      new Capsule(
        new Vector3(0, -2, 0),
        new Vector3(0, 2, 0),
        1.5
      )
    );
  }

  public get stamina(): number {
    return this._stamina;
  }

  public get scanning(): boolean {
    return this._scanning;
  }

  public get scanAngle(): number {
    return this._scanAngle;
  }

  /** Returns the origin position of the last scan's rays. */
  public get scanOrigin(): Vector3 {
    return this._scanOrigin;
  }

  /**
   * Handle aim and move direction inputs, sprinting and jumping.
   * @param deltaTime The time passed.
   */
  public prePhysicsBehaviour(deltaTime: number): void {
    let inputDir: Vector3 = Vector3.zero;

    if (Game.instance.controller.controlActive(Control.moveF)) inputDir = inputDir.subtract(Vector3.z);
    if (Game.instance.controller.controlActive(Control.moveB)) inputDir = inputDir.add(Vector3.z);
    if (Game.instance.controller.controlActive(Control.moveL)) inputDir = inputDir.subtract(Vector3.x);
    if (Game.instance.controller.controlActive(Control.moveR)) inputDir = inputDir.add(Vector3.x);

    this.aimDirection = Game.instance.camera.rotation.lookVector;
    this.moveDirection = this.faceMatrix.apply(inputDir); // Apply facing matrix to input direction to get proper rotation directions

    if (Game.instance.controller.controlActive(Control.jump) && this.onFloor && !this.jumpTimer.active) {
      this.jumpTimer.start();
      this.impulseUp(this.JUMP_VELOCITY);
    }

    let sprinting: boolean = false;

    if (Game.instance.controller.controlActive(Control.sprint) && this.moveDirection.magnitude > 0) {
      this._stamina = Math.max(this._stamina - this.STAMINA_DRAIN_RATE * deltaTime, 0);
      if (this._stamina > 0) sprinting = true;

    } else {
      this._stamina = Math.min(this._stamina + this.STAMINA_FILL_RATE * deltaTime, this.MAX_STAMINA);
    }

    if (sprinting) {
      this.moveSpeed = this.SPRINT_SPEED;

      this.footstepEmitter.volume = 1.5;
      this.footstepEmitter.frequency = 2;

      Game.instance.camera.fov = 100;

    } else {
      this.moveSpeed = this.WALK_SPEED;

      this.footstepEmitter.volume = 1;
      this.footstepEmitter.frequency = 1;

      Game.instance.camera.fov = 70;
    }

    if (this.moveDirection.magnitude > 0) this.footstepEmitter.start();
    else this.footstepEmitter.stop();
  }

  /** Handle player scanning. */
  public postPhysicsBehaviour(): void {
    const scrollAmount: number = Game.instance.controller.scrollMovement;
    this._scanAngle = Util.clamp(this._scanAngle + scrollAmount, this.MIN_SCAN_ANGLE, this.MAX_SCAN_ANGLE);

    this._scanOrigin = Game.instance.camera.position;
    
    if (Game.instance.controller.controlActive(Control.scan)) {
      this._scanning = true;

      if (!this.scanTimer.active) {
        this.scanTimer.start();

        for (let i: number = 0; i < this.DOTS_PER_SCAN; i++) {
          const roll: number = 2 * Math.PI * Math.random();
          const pitch: number = this._scanAngle * Math.random();
  
          const pitchMatrix = Matrix4.fromAxisAngle(this.aimDirection.perpendicular, pitch); // Get axis angle rotation matrix for pitching the direction
          const rollMatrix = Matrix4.fromAxisAngle(this.aimDirection, roll); // Get the axis angle rotation around the direction vector

          // Apply pitch matrix and roll matrix to direction to get random cone range effect
          const rayDirection: Vector3 = rollMatrix.apply(pitchMatrix.apply(this.aimDirection));
  
          const ray = new Ray(this._scanOrigin, rayDirection);
          const info: RaycastInfo | undefined = Game.instance.bvh.raycast(ray);
    
          if (info) Game.instance.canvas.createDot(info.position, info.normal);
        }
      }

      if (!this.scanAudio) this.scanAudio = Game.instance.audioManager.get("scanning").emit(true);

    } else {
      this._scanning = false;

      if (this.scanAudio) this.scanAudio.stop();
      delete this.scanAudio;
    }
  }

  /** Destroy audio instances tied to the player. */
  public destroy(): void {
    this.footstepEmitter.stop();
    if (this.scanAudio) this.scanAudio.stop();
  }
}