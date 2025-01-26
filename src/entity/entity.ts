import { Capsule } from "../collisions/collisions.js";
import { Game } from "../core/game.js";
import { Matrix4 } from "../math/matrix4.js";
import { Vector3 } from "../math/vector3.js";

export abstract class Entity {
  private GRAV_ACCEL: number = 100;
  private MAX_VERTICAL_SLOPE: number = 80 * Math.PI / 180;

  private _moveDirection: Vector3 = Vector3.zero;
  private _aimDirection: Vector3 = Matrix4.identity.lookVector;
  private _faceMatrix: Matrix4 = Matrix4.identity;
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

  public get aimDirection(): Vector3 {
    return this._aimDirection;
  }

  public get faceMatrix(): Matrix4 {
    return this._faceMatrix;
  }

  /** Sets the move direction of the entity, ensuring there is no y component and it is normalized. */
  public set moveDirection(direction: Vector3) {
    this._moveDirection = new Vector3(direction.x, 0, direction.z).unit;
  }

  /** Sets the aim direction and updates the face matrix. */
  public set aimDirection(direction: Vector3) {
    if (direction.magnitude !== 0) this._aimDirection = direction.unit;

    this._faceMatrix = Matrix4.fromLookVector(new Vector3(this._aimDirection.x, 0, this._aimDirection.z).unit);
  }
  
  public get moveSpeed(): number {
    return this._moveSpeed;
  }

  public set moveSpeed(speed: number) {
    this._moveSpeed = Math.max(0, speed);
  }

  public get onFloor(): boolean {
    return this._onFloor;
  }

  /**
   * Creates an upwards impulse for the entity.
   * @param magnitude The impulse magnitude.
   */
  public impulseUp(magnitude: number): void {
    this.fallSpeed -= magnitude;
  }

  /**
   * Handles collisions for a specified surface type.
   * @param vertical Whether or not they should be vertical.
   * @returns A tuple consisting of:
   * - Whether or not there were any collisions.
   * - The total collision correction.
   */
  private handleCollisions(vertical: boolean): [boolean, Vector3] {
    this.hitbox.setTransformation(Matrix4.fromPosition(this._position).multiply(this._faceMatrix));

    const corrections: Vector3[] = [];

    for (const collision of Game.instance.bvh.collisionQuery(this.hitbox)) {
      const angle: number = Math.acos(collision.normal.dot(Vector3.y));
      const isVertical: boolean = angle <= this.MAX_VERTICAL_SLOPE || angle >= Math.PI - this.MAX_VERTICAL_SLOPE;

      if (isVertical != vertical) continue; // Skip if vertical and the angle exceeds the max slope

      const correction: Vector3 = collision.normal.multiply(collision.overlap);

      corrections.push(correction);
    }

    let maxCorrection: Vector3 = Vector3.zero;

    // Determine maximum correction
    for (const correction of corrections) {
      if (correction.magnitude > maxCorrection.magnitude) maxCorrection = correction;
    }

    let orthogonalCorrection1: Vector3 = Vector3.zero;

    // Get the maximum correction orthogonal to the max correction
    for (const correction of corrections) {
      const orthogonalComponent: Vector3 = correction.getOrthogonalComponent(maxCorrection);

      if (orthogonalComponent.magnitude > orthogonalCorrection1.magnitude) orthogonalCorrection1 = orthogonalComponent;
    }

    let planeNormal: Vector3 = maxCorrection.cross(orthogonalCorrection1);
    let orthogonalCorrection2: Vector3 = Vector3.zero;

    // Get the maximum correction orthogonal to both the max correction and first orthogonal component
    for (const correction of corrections) {
      const parallelComponent: Vector3 = correction.getParallelComponent(planeNormal);

      if (parallelComponent.magnitude > orthogonalCorrection2.magnitude) orthogonalCorrection2 = parallelComponent;
    }

    const totalCorrection: Vector3 = maxCorrection.add(orthogonalCorrection1).add(orthogonalCorrection2); // Sum the corrections

    this._position = this._position.add(totalCorrection);
    
    return [corrections.length > 0, totalCorrection];
  }

  /**
   * Handle the physics and collisions for the entity.
   * @param deltaTime The time passed since the last frame.
   */
  public updatePhysics(deltaTime: number): void {
    // Calculate the fall velocity and gravity acceleration displacements
    const fallDisplacement: Vector3 = Vector3.y.multiply(-this.fallSpeed * deltaTime);
    const gravDisplacement: Vector3 = Vector3.y.multiply(-this.GRAV_ACCEL * deltaTime ** 2 / 2);

    this._position = this._position.add(fallDisplacement).add(gravDisplacement); // Add the fall displacements
    this.fallSpeed = this.fallSpeed + this.GRAV_ACCEL * deltaTime; // Accelerate the fall speed

    const [verticalCollision, verticalCorrection] = this.handleCollisions(true); // Handle floor collisions

    if (verticalCollision) this.fallSpeed = 0; // Clear the fall speed if collided

    // Set on floor if the correction is not the ceiling
    if (verticalCollision && verticalCorrection.dot(Vector3.y) > 0) this._onFloor = true;
    else this._onFloor = false;

    const moveDisplacement: Vector3 = this._moveDirection.multiply(this._moveSpeed * deltaTime); // Handle move displacement
    this._position = this._position.add(moveDisplacement);
    
    this.handleCollisions(false); // Handle wall collisions
  }
}