import { Vector3 } from "./vector3";

export class Ray {
  constructor(
    public readonly origin: Vector3,
    public readonly direction: Vector3
  ) {}

  public getPoint(t: number): Vector3 {
    return this.origin.add(this.direction.multiply(t));
  }
}