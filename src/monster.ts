import { Capsule } from "./collisions";
import { Entity } from "./entity";
import { Game } from "./game";
import { Player } from "./player";
import { Vector3 } from "./vector3";

class Monster extends Entity {
  private SPRINT_AGGRO_RATE = 30;
  private SPRINT_AGGRO_RANGE = 8;

  private aggression: number = 0;
  private maxAggression: number = 100;

  private roamSpeed: number = 4;
  private chaseSpeed: 18;

  constructor() {
    super(
      new Vector3(),
      new Capsule(
        new Vector3(0, -2, 0),
        new Vector3(0, 6.9, 0),
        1.5
      )
    );
  }

  public prePhysicsBehaviour(deltaTime: number): void {
    
  }

  public postPhysicsBehaviour(deltaTime: number): void {
    const player: Player = Game.instance.player;
    const distance: number = player.position.subtract(this.position).magnitude;

    if (Game.instance.player.sprinting && distance <= this.SPRINT_AGGRO_RANGE) {
      const rate: number = this.SPRINT_AGGRO_RATE * (1 - distance / this.SPRINT_AGGRO_RANGE);

      this.aggression += rate * deltaTime;
    }
  }
}