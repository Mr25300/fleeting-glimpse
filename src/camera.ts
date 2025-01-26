import { Entity } from "./entity/entity.js";
import { Matrix4 } from "./matrix4.js";
import { Util } from "./util.js";
import { Vector3 } from "./vector3.js";

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

  public subject?: Entity;
  public subjectOffset: Vector3 = Vector3.zero;

  public get position(): Vector3 {
    return this._position;
  }

  public get rotation(): Matrix4 {
    return this._rotation;
  }

  public getViewMatrix(): Matrix4 {
    return this.rotation.transpose().multiply(Matrix4.fromPosition(this.position.multiply(-1))); // Inverse of rotation matrix (transpose because it is orthonormal)
  }

  public getProjectionMatrix(aspectRatio: number): Matrix4 {
    return Matrix4.fromPerspective(aspectRatio, this.currentFov, this.Z_NEAR, this.Z_FAR);
  }

  public set fov(value: number) {
    this.goalFov = Util.clamp(value, this.MIN_FOV, this.MAX_FOV);
  }

  public rotate(yaw: number, pitch: number): void {
    this.yaw = (this.yaw + yaw) % (2 * Math.PI);
    this.pitch = Math.min(Math.max(this.pitch + pitch, -Math.PI / 2), Math.PI / 2);

    this._rotation = Matrix4.fromRotation(this.yaw, this.pitch, this.roll);
  }

  public update(deltaTime: number): void {
    if (this.subject) {
      this._position = this.subject.position.add(this.subjectOffset);
    }

    this.currentFov = this.goalFov + (this.currentFov - this.goalFov) * Math.exp(-this.FOV_SPEED_FACTOR * deltaTime);
  }

  public reset(): void {
    this.currentFov = this.goalFov = 70;
    this.pitch = this.yaw = this.roll = 0;
  }
}