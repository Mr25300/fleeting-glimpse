import { AudioEmitter } from "./audiomanager.js";
import { Capsule } from "./collisions.js";
import { Entity } from "./entity.js";
import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { RenderModel } from "./mesh.js";
import { Player } from "./player.js";
import { Timer } from "./timer.js";
import { Vector3 } from "./vector3.js";

export class Monster extends Entity {
  private readonly SPRINT_AGGRO_RATE = 50;
  private readonly SPRINT_AGGRO_RANGE = 20;

  private readonly ROAM_SPEED: number = 6;
  private readonly CHASE_SPEED: number = 20;

  private readonly MAX_AGGRESSION: number = 100;
  private readonly AGGRESSION_DRAIN_RATE: number = 5;

  private aggression: number = 0;
  private recentlyAggressed: Timer = new Timer(10);
  private chasingTimer: Timer = new Timer(10);

  private heartbeatEmitter: AudioEmitter;

  constructor(private model: RenderModel, private target: Player) {
    super(
      new Vector3(-69, 0, -45),
      new Capsule(
        new Vector3(0, -2, 0),
        new Vector3(0, 6.9, 0),
        1.5
      )
    );

    this.heartbeatEmitter = Game.instance.audioManager.get("heartbeat").createEmitter();
  }

  public prePhysicsBehaviour(deltaTime: number): void {
    let direction = Vector3.zero;

    if (this.chasingTimer.active) {
      this.moveSpeed = this.CHASE_SPEED;

      direction = this.target.position.subtract(this.position);

    } else {
      this.moveSpeed = this.ROAM_SPEED;
    }

    this.aimDirection = direction;
    this.moveDirection = direction;
  }

  public postPhysicsBehaviour(deltaTime: number): void {
    const distance: number = this.target.position.subtract(this.position).magnitude;

    if (!this.chasingTimer.active) {
      let aggressionChange: number = 0;

      if (this.target.sprinting && distance <= this.SPRINT_AGGRO_RANGE) {
        const rate: number = this.SPRINT_AGGRO_RATE * (1 - distance / this.SPRINT_AGGRO_RANGE);
  
        aggressionChange += rate * deltaTime;
      }
  
      if (aggressionChange > 0) {
        this.recentlyAggressed.start();
  
        this.aggression = Math.min(this.aggression + aggressionChange, this.MAX_AGGRESSION);

        if (this.aggression === this.MAX_AGGRESSION) {
          this.chasingTimer.start();
          this.aggression = 0;

          Game.instance.audioManager.get("aggression").emit(true);
        }
      }
  
      if (!this.recentlyAggressed.active) {
        this.aggression = Math.max(this.aggression - this.AGGRESSION_DRAIN_RATE * deltaTime, 0);
      }
    }

    this.heartbeatEmitter.frequency = 1 + 1.3 * (this.aggression / this.MAX_AGGRESSION);

    if (this.aggression > 0 && !this.chasingTimer.active) this.heartbeatEmitter.start();
    else this.heartbeatEmitter.stop();

    // console.log(this.aggression);

    this.model.transformation = Matrix4.fromPosition(this.position).multiply(this.faceMatrix);
  }
}