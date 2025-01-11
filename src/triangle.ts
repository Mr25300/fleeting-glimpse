import { Vector3 } from "./vector3";

export class Triangle {
  constructor(
    public readonly v0: Vector3,
    public readonly v1: Vector3,
    public readonly v2: Vector3
  ) {}
}

export class Ray {
  constructor(
    public readonly origin: Vector3,
    public readonly direction: Vector3
  ) {}

  public getPoint(t: number): Vector3 {
    return this.origin.add(this.direction.multiply(t));
  }

  public getIntersectionPoint(triangle: Triangle): number | undefined {
    // if (this.direction.dot(normal) === 0) return;
    // const d:number = normal.xverticeOne.x + normal.yverticeOne.y + normal.z+verticeOne.z;
    // const t:number = (normal.xthis.direction.x+normal.ythis.direction.y+normal.zthis.direction.z)/(normal.xthis.origin.x+normal.ythis.origin.y+normal.zthis.origin.z+d);
    // const parameterX:number = this.origin.x + tthis.direction.x;
    // const parameterY:number = this.origin.y + tthis.direction.y;
    // const parameterZ:number = this.origin.z + t*this.direction.z;
    // const intersectionPoint = new Vector3(parameterX, parameterY, parameterZ);

    // return intersectionPoint;

    const edge1: Vector3 = triangle.v1.subtract(triangle.v0);
    const edge2: Vector3 = triangle.v2.subtract(triangle.v0);
    const normal: Vector3 = edge1.cross(edge2);

    const directionDot: number = normal.dot(this.direction);
    if (directionDot < 0.001) return;

    const originDot: number = normal.dot(triangle.v1.subtract(this.origin));
    const t: number = originDot / directionDot;

    

    return t;
  }
}