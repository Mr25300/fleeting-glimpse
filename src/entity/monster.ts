import { AudioEmission, AudioEmitter } from "../audio/audiomanager.js";
import { RaycastInfo } from "../collisions/bvh.js";
import { Capsule, Ray } from "../collisions/collisions.js";
import { Entity } from "./entity.js";
import { Game } from "../core/game.js";
import { Matrix4 } from "../math/matrix4.js";
import { RenderModel } from "../mesh/mesh.js";
import { Player } from "./player.js";
import { Timer } from "../util/timer.js";
import { Vector3 } from "../math/vector3.js";

export class Monster extends Entity {
  private readonly MOVE_AGGRO_RANGE: number = 50;
  private readonly MOVE_AGGRO_RATE: number = 60;
  private readonly SCAN_AGGRO_RATE: number = 180;
  private readonly KILL_RANGE: number = 1;

  private readonly ROAM_SPEED: number = 8;
  private readonly CHASE_SPEED: number = 18;

  public readonly MAX_AGGRESSION: number = 100;
  private readonly AGGRESSION_DRAIN_RATE: number = 5;

  private _aggression: number = 0;
  private recentlyAggressed: Timer = new Timer(10);
  private chasingTimer: Timer = new Timer(10);
  private roamChangeTimer: Timer;

  private heartbeatEmitter: AudioEmitter = Game.instance.audioManager.get("heartbeat").createEmitter();
  private screamAudio: AudioEmission;

  constructor(private model: RenderModel, private target: Player) {
    super(
      new Vector3(-70, 0, -60),
      new Capsule(
        new Vector3(0, -2, 0),
        new Vector3(0, 6.9, 0),
        1.5
      )
    );
  }

  public get aggression(): number {
    return this._aggression;
  }

  /** Handle monster aiming and moving based on player target. */
  public prePhysicsBehaviour(): void {
    if (this.chasingTimer.active) {
      this.moveSpeed = this.CHASE_SPEED;
      this.aimDirection = this.moveDirection = this.target.position.subtract(this.position);

    } else {
      this.moveSpeed = this.ROAM_SPEED;

      if (!this.roamChangeTimer || !this.roamChangeTimer.active) {
        this.roamChangeTimer = new Timer(5 + 5 * Math.random());
        this.roamChangeTimer.start();

        const angle: number = 2 * Math.PI * Math.random();
        const direction: Vector3 = new Vector3(Math.cos(angle), 0, Math.sin(angle));

        this.aimDirection = this.moveDirection = direction;
      }
    }
  }

  /**
   * Handle the monster aggression and killing logic, and update the monster model transformation.
   * @param deltaTime The time passed.
   */
  public postPhysicsBehaviour(deltaTime: number): void {
    const distance: number = this.target.position.subtract(this.position).magnitude;

    if (!this.chasingTimer.active) {
      let aggressionChangeRate: number = 0;

      // Handle aggression if target is moving nearby
      if (this.target.moveDirection.magnitude > 0 && distance < this.MOVE_AGGRO_RANGE) {
        aggressionChangeRate += this.MOVE_AGGRO_RATE * (1 - distance / this.MOVE_AGGRO_RANGE) * this.target.moveSpeed / 16;
      }

      if (this.target.scanning) { // If target is scanning
        const scanAngleDirection: Vector3 = this.position.subtract(this.target.scanOrigin);
        const scanAngleDifference: number = Math.acos(this.target.aimDirection.dot(scanAngleDirection.unit));

        if (scanAngleDifference <= this.target.scanAngle) { // If monster is within scan cone range
          const ray: Ray = new Ray(this.target.position, scanAngleDirection.unit); // Create ray from target to monster
          const info: RaycastInfo | undefined = Game.instance.bvh.raycast(ray);

          if (!info || scanAngleDirection.magnitude < info.t) { // Check if anything is in the way
            aggressionChangeRate += this.SCAN_AGGRO_RATE;
          }
        }
      }
  
      if (aggressionChangeRate > 0) {
        this.recentlyAggressed.start();
        this._aggression = Math.min(this._aggression + aggressionChangeRate * deltaTime, this.MAX_AGGRESSION);

        if (this._aggression === this.MAX_AGGRESSION) { // Start chasing if aggression is at max
          this.chasingTimer.start();
          this._aggression = 0;

          this.screamAudio = Game.instance.audioManager.get("aggression").emit(true);
          this.screamAudio.subject = this;
        }
      }
  
      if (!this.recentlyAggressed.active) {
        this._aggression = Math.max(this._aggression - this.AGGRESSION_DRAIN_RATE * deltaTime, 0);
      }

    } else {
      if (distance < this.KILL_RANGE) Game.instance.end(); // End the game if close enough to the target
    }

    const aggressionPercent: number = this._aggression / this.MAX_AGGRESSION;

    // Increase heartbeat intensity as aggression increases
    this.heartbeatEmitter.volume = 1 + 0.5 * aggressionPercent;
    this.heartbeatEmitter.frequency = 1 + 1.3 * aggressionPercent;

    if (this._aggression > 0 && !this.chasingTimer.active) this.heartbeatEmitter.start();
    else this.heartbeatEmitter.stop();

    this.model.transformation = Matrix4.fromPosition(this.position).multiply(this.faceMatrix); // Update monster model
  }

  /** Destroy audio instances tied to the monster. */
  public destroy(): void {
    this.heartbeatEmitter.stop();
    this.screamAudio.stop();
  }
}