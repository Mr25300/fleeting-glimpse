import { Capsule } from "./collisions.js";
import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { Vector3 } from "./vector3.js";

export abstract class Entity {
  private GRAV_ACCEL: number = 50;
  private MAX_SLOPE: number = 75 * Math.PI / 180;

  private _moveDirection: Vector3 = Vector3.zero;
  private _faceDirection: Vector3 = new Vector3(0, 0, -1);
  protected fallSpeed: number = 0;
  protected onFloor: boolean = false;

  constructor(public position: Vector3, protected speed: number, private hitbox: Capsule) { }

  public set moveDirection(direction: Vector3) {
    this._moveDirection = direction.unit;
  }

  public set faceDirection(direction: Vector3) {
    this._faceDirection = direction.unit;
  }

  public abstract behaviour(): void;

  public update(deltaTime: number): void {
    const moveDisplacement: Vector3 = this._moveDirection.multiply(this.speed * deltaTime);
    const fallDisplacement: Vector3 = Vector3.y.multiply(-this.fallSpeed * deltaTime);
    const gravDisplacement: Vector3 = Vector3.y.multiply(-this.GRAV_ACCEL * deltaTime ** 2 / 2);

    // do gravity displacement and collisions first
    // then do movement displacement and ensure player velocity is adjusted depending on the slope of the ground

    this.position = this.position.add(moveDisplacement).add(fallDisplacement).add(gravDisplacement);
    this.fallSpeed = this.fallSpeed + this.GRAV_ACCEL * deltaTime;

    this.hitbox.setTransformation(Matrix4.fromPosition(this.position).multiply(Matrix4.fromLookVector(this._faceDirection)));

    let wallNormal: Vector3 = Vector3.zero;
    let wallOverlap: number = 0;
    let floorNormal: Vector3 = Vector3.zero;
    let floorOverlap: number = 0;
    let floorCollision: boolean = false;

    for (const collision of Game.instance.bvh.collisionQuery(this.hitbox)) {
      const angle: number = Math.acos(collision.normal.dot(Vector3.y));

      if (angle <= this.MAX_SLOPE) {
        floorCollision = true;

        if (collision.overlap > floorOverlap) {
          floorOverlap = collision.overlap;
          floorNormal = collision.normal;
        }

      } else if (collision.overlap > wallOverlap) {
        wallOverlap = collision.overlap;
        wallNormal = collision.normal;
      }
    }

    this.position = this.position.add(floorNormal.multiply(floorOverlap)).add(wallNormal.multiply(wallOverlap));

    if (floorCollision) {
      this.fallSpeed = 0;
    }

    this.onFloor = floorCollision;

    // const [intersects, normal, overlap] = this.hitbox.getTriangleIntersection(Game.instance.testTri);

    // if (intersects) this.position = this.position.add(normal!.multiply(overlap!));
  }
}