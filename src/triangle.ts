import { Vector3 } from "./vector3";

export class Triangle {
  constructor(
    public readonly v1: Vector3,
    public readonly v2: Vector3,
    public readonly v3: Vector3
  ) {}

  public getNormal(): Vector3 {
    return this.v1.subtract(this.v1).cross(this.v3.subtract(this.v2));
  }
}

export class Ray {
  constructor(
    public readonly origin: Vector3,
    public readonly direction: Vector3
  ) {}

  public getPoint(t: number): Vector3 {
    return this.origin.add(this.direction.multiply(t));
  }

  public getIntersection(triangle: Triangle): number | undefined {
    const normal: Vector3 = triangle.getNormal();

    if (this.direction.dot(normal) === 0) return;

    
  }
}