import { Capsule } from "./collisions";
import { Entity } from "./entity";
import { Vector3 } from "./vector3";

class Monster extends Entity {
  constructor() {
    super(
      new Vector3(),
      0,
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