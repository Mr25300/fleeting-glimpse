import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { Vector3 } from "./vector3.js";

class Entity {
  private moveDirection: Vector3;
  private faceDirection: Vector3;

  constructor(private position: Vector3, private speed: number) {

  }

  public update(deltaTime: number) {
    const moveMatrix: Matrix4 = Matrix4.fromRotationY(Game.instance.camera.yaw);

    this.position = this.position.add(this.moveDirection.multiply(this.speed * deltaTime));
  }
}