import { Entity } from "./entity.js";
import { Matrix4 } from "./matrix4.js";
import { Vector3 } from "./vector3.js";

export class Camera {
  private FOV_SPEED_FACTOR = 3;

  private Z_NEAR: number = 0.01;
  private Z_FAR: number = 10000;
  
  public yaw: number = 0;
  public pitch: number = 0;
  public roll: number = 0;
  public position: Vector3 = new Vector3(0, 0, 2);
  public rotation: Matrix4 = Matrix4.identity;

  private fov: number = 70;
  private goalFov: number = 70;

  public subject: Entity;
  public subjectOffset: Vector3 = Vector3.zero;

  public getViewMatrix(): Matrix4 {
    return Matrix4.fromPosition(this.position).multiply(this.rotation);
  }

  public getProjectionMatrix(aspectRatio: number): Matrix4 {
    return Matrix4.fromPerspective(aspectRatio, this.fov, this.Z_NEAR, this.Z_FAR);
  }

  public rotate(yaw: number, pitch: number): void {
    this.yaw = (this.yaw + yaw) % (2 * Math.PI);
    this.pitch = Math.min(Math.max(this.pitch + pitch, -Math.PI / 2), Math.PI / 2);
    this.rotation = Matrix4.fromRotation(this.yaw, this.pitch, this.roll);
  }

  public setFov(fov: number): void {
    this.goalFov = fov;
  }

  public update(deltaTime: number): void {
    this.position = this.subject.position.add(this.subjectOffset);
    this.fov = this.goalFov + (this.fov - this.goalFov) * Math.exp(-this.FOV_SPEED_FACTOR * deltaTime);
  }
}