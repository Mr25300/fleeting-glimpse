import { Capsule } from "./collisions";
import { Entity } from "./entity";
import { Vector3 } from "./vector3";

class Monster extends Entity {
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
    
  }
}