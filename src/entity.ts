import { Capsule } from "./collisions.js";
import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { Vector3 } from "./vector3.js";

export abstract class Entity {
  private GRAV_ACCEL: number = 50;
  private MAX_SLOPE: number = 75 * Math.PI / 180;

  private _moveDirection: Vector3 = Vector3.zero;
  private _faceDirection: Vector3 = new Vector3(0, 0, -1);
  private _moveSpeed: number = 0;
  private fallSpeed: number = 0;
  private _onFloor: boolean = false;
  private floorNormal: Vector3 = Vector3.zero;

  constructor(private _position: Vector3, private hitbox: Capsule) { }

  public get position(): Vector3 {
    return this._position;
  }

  public get moveDirection(): Vector3 {
    return this._moveDirection;
  }

  public set moveDirection(direction: Vector3) {
    this._moveDirection = direction.unit;
  }

  public set faceDirection(direction: Vector3) {
    this._faceDirection = direction.unit;
  }

  public get onFloor(): boolean {
    return this._onFloor;
  }

  public set moveSpeed(speed: number) {
    this._moveSpeed = Math.max(0, speed);
  }

  public impulseUp(magnitude: number): void {
    this.fallSpeed -= magnitude;
  }

  public abstract prePhysicsBehaviour(deltaTime: number): void;
  public abstract postPhysicsBehaviour(deltaTime: number): void;

  private handleCollisions(floor: boolean): boolean {
    this.hitbox.setTransformation(Matrix4.fromPosition(this._position).multiply(Matrix4.fromLookVector(this._faceDirection)));

    let collisionOccured: boolean = false;
    let totalCorrection: Vector3 = Vector3.zero;

    for (const collision of Game.instance.bvh.collisionQuery(this.hitbox)) {
      const angle: number = Math.acos(collision.normal.dot(Vector3.y));
      
      if (floor && angle > this.MAX_SLOPE) continue;
      if (!floor && angle <= this.MAX_SLOPE) continue;

      const correction: Vector3 = collision.normal.multiply(collision.overlap);
      const parallelComponent: Vector3 = totalCorrection.unit.multiply(totalCorrection.unit.dot(correction));
      const orthogonalComponent: Vector3 = correction.subtract(parallelComponent);

      collisionOccured = true;
      totalCorrection = totalCorrection.add(orthogonalComponent);
    }

    this._position = this._position.add(totalCorrection);

    return collisionOccured;
  }

  public update(deltaTime: number): void {
    const moveDisplacement: Vector3 = this._moveDirection.multiply(this._moveSpeed * deltaTime);
    this._position = this._position.add(moveDisplacement);

    this.handleCollisions(false);

    const fallDisplacement: Vector3 = Vector3.y.multiply(-this.fallSpeed * deltaTime);
    const gravDisplacement: Vector3 = Vector3.y.multiply(-this.GRAV_ACCEL * deltaTime ** 2 / 2);

    this._position = this._position.add(moveDisplacement).add(fallDisplacement).add(gravDisplacement);
    this.fallSpeed = this.fallSpeed + this.GRAV_ACCEL * deltaTime;

    this._onFloor = this.handleCollisions(true);

    if (this._onFloor) this.fallSpeed = 0;

    // const [intersects, normal, overlap] = this.hitbox.getTriangleIntersection(Game.instance.testTri);

    // if (intersects) this.position = this.position.add(normal!.multiply(overlap!));
  }
}