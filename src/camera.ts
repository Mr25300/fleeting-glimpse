import { Matrix4 } from "./matrix4.js";
import { Vector3 } from "./vector3.js";

export class Camera {
  private Z_NEAR: number = 0.01;
  private Z_FAR: number = 10000;

  public fov: number = 70;
  public yaw: number = 0;
  public pitch: number = 0;
  public roll: number = 0;
  public position: Vector3 = new Vector3(0, 0, 2);
  public rotation: Matrix4 = Matrix4.identity;

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
}