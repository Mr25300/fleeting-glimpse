import { Capsule } from "./collisions.js";
import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { Vector3 } from "./vector3.js";

export abstract class Entity {
  private GRAV_ACCEL: number = 100;
  private MAX_SLOPE: number = 80 * Math.PI / 180;

  private _moveDirection: Vector3 = Vector3.zero;
  private _faceDirection: Vector3 = new Vector3(0, 0, -1);
  private _moveSpeed: number = 0;
  private fallSpeed: number = 0;
  private _onFloor: boolean = false;

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

  private handleCollisions(vertical: boolean): [boolean, Vector3] {
    this.hitbox.setTransformation(Matrix4.fromPosition(this._position).multiply(Matrix4.fromLookVector(this._faceDirection)));

    const corrections: Vector3[] = [];

    for (const collision of Game.instance.bvh.collisionQuery(this.hitbox)) {
      const angle: number = Math.acos(collision.normal.dot(Vector3.y));
      const isVertical: boolean = angle <= this.MAX_SLOPE || angle >= Math.PI - this.MAX_SLOPE;

      if (isVertical != vertical) continue;

      const correction: Vector3 = collision.normal.multiply(collision.overlap);

      corrections.push(correction);
    }

    let maxCorrection: Vector3 = Vector3.zero;

    for (const correction of corrections) {
      if (correction.magnitude > maxCorrection.magnitude) maxCorrection = correction;
    }

    let orthogonalCorrection1: Vector3 = Vector3.zero;

    for (const correction of corrections) {
      const parallelComponent: Vector3 = maxCorrection.unit.multiply(maxCorrection.unit.dot(correction));
      const orthogonalComponent: Vector3 = correction.subtract(parallelComponent);

      if (orthogonalComponent.magnitude > orthogonalCorrection1.magnitude) orthogonalCorrection1 = orthogonalComponent;
    }

    let planeNormal: Vector3 = maxCorrection.cross(orthogonalCorrection1);
    let orthogonalCorrection2: Vector3 = Vector3.zero;

    for (const correction of corrections) {
      const parallelComponent: Vector3 = planeNormal.unit.multiply(planeNormal.unit.dot(correction));

      if (parallelComponent.magnitude > orthogonalCorrection2.magnitude) orthogonalCorrection2 = parallelComponent;
    }

    const totalCorrection: Vector3 = maxCorrection.add(orthogonalCorrection1).add(orthogonalCorrection2)

    this._position = this._position.add(totalCorrection);
    
    return [corrections.length > 0, totalCorrection];
  }

  public update(deltaTime: number): void {
    const fallDisplacement: Vector3 = Vector3.y.multiply(-this.fallSpeed * deltaTime);
    const gravDisplacement: Vector3 = Vector3.y.multiply(-this.GRAV_ACCEL * deltaTime ** 2 / 2);

    this._position = this._position.add(fallDisplacement).add(gravDisplacement);
    this.fallSpeed = this.fallSpeed + this.GRAV_ACCEL * deltaTime;

    const [verticalCollision, verticalCorrection] = this.handleCollisions(true);

    if (verticalCollision) this.fallSpeed = 0;

    if (verticalCollision && verticalCorrection.dot(Vector3.y) > 0) this._onFloor = true;
    else this._onFloor = false;

    const moveDisplacement: Vector3 = this._moveDirection.multiply(this._moveSpeed * deltaTime);
    this._position = this._position.add(moveDisplacement);

    this.handleCollisions(false);

    // const [intersects, normal, overlap] = this.hitbox.getTriangleIntersection(Game.instance.testTri);

    // if (intersects) this.position = this.position.add(normal!.multiply(overlap!));
  }
}