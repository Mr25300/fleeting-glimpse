import { Entity } from "../entity/entity.js";
import { Matrix4 } from "../math/matrix4.js";
import { Util } from "../util/util.js";
import { Vector3 } from "../math/vector3.js";
import { Game } from "../core/game.js";

/** Represents the camera and its properties for rendering. */
export class Camera {
  private readonly MIN_FOV: number = 1;
  private readonly MAX_FOV: number = 140;
  private readonly FOV_SPEED_FACTOR = 2;

  private readonly Z_NEAR: number = 0.01;
  private readonly Z_FAR: number = 10000;
  
  private yaw: number = 0;
  private pitch: number = 0;
  private roll: number = 0;

  private _position: Vector3 = Vector3.zero;
  private _rotation: Matrix4 = Matrix4.identity;

  private currentFov: number = 70;
  private goalFov: number = 70;

  /** The subject entity to follow. */
  public subject?: Entity;
  /** The vector offset the camera should position itself from the entity. */
  public subjectOffset: Vector3 = Vector3.zero;

  public get position(): Vector3 {
    return this._position;
  }

  public get rotation(): Matrix4 {
    return this._rotation;
  }

  /** Returns a view matrix based on the camera's rotation and position for rendering. */
  public getViewMatrix(): Matrix4 {
    return this.rotation.transpose().multiply(Matrix4.fromPosition(this.position.multiply(-1))); // Inverse of rotation matrix (transpose because it is orthonormal)
  }

  /** Returns a projection matrix based on the camera's properties for rendering. */
  public getProjectionMatrix(aspectRatio: number): Matrix4 {
    return Matrix4.fromPerspective(aspectRatio, this.currentFov, this.Z_NEAR, this.Z_FAR);
  }

  /** Sets the camera's goal fov to the specified value so that it may transition to it. */
  public set fov(value: number) {
    this.goalFov = Util.clamp(value, this.MIN_FOV, this.MAX_FOV);
  }

  /** Update the camera rotation based on user input before physics occurs. */
  public prePhysicsUpdate(): void {
    const [xMovement, yMovement]: [number, number] = Game.instance.controller.aimMovement;

    this.yaw = (this.yaw + xMovement) % (2 * Math.PI);
    this.pitch = Util.clamp(this.pitch + yMovement, -Math.PI / 2, Math.PI / 2);

    this._rotation = Matrix4.fromEulerAngles(this.pitch, this.yaw, this.roll);
  }

  /**
   * Update the camera's position to track the entity and transition to the goal fov after physics occurs.
   * @param deltaTime The time passed since the last frame.
   */
  public postPhysicsUpdate(deltaTime: number): void {
    if (this.subject) {
      this._position = this.subject.position.add(this.subjectOffset);
    }

    this.currentFov = this.goalFov + (this.currentFov - this.goalFov) * Math.exp(-this.FOV_SPEED_FACTOR * deltaTime);
  }

  /** Reset the camera's fov and rotation properties. */
  public reset(): void {
    this.currentFov = this.goalFov = 70;
    this.pitch = this.yaw = this.roll = 0;
  }
}