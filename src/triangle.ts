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
    // Daniel old implementation:
    // if (this.direction.dot(normal) === 0) return;
    // const d:number = normal.xverticeOne.x + normal.yverticeOne.y + normal.z+verticeOne.z;
    // const t:number = (normal.xthis.direction.x+normal.ythis.direction.y+normal.zthis.direction.z)/(normal.xthis.origin.x+normal.ythis.origin.y+normal.zthis.origin.z+d);
    // const parameterX:number = this.origin.x + tthis.direction.x;
    // const parameterY:number = this.origin.y + tthis.direction.y;
    // const parameterZ:number = this.origin.z + t*this.direction.z;
    // const intersectionPoint = new Vector3(parameterX, parameterY, parameterZ);

    // return intersectionPoint;

    // Sebastian old implementation:
    // const edge1: Vector3 = triangle.v1.subtract(triangle.v0);
    // const edge2: Vector3 = triangle.v2.subtract(triangle.v0);
    // const normal: Vector3 = edge1.cross(edge2);

    // const directionDot: number = normal.dot(this.direction);
    // if (directionDot < 0.001) return;

    // const originDot: number = normal.dot(triangle.v1.subtract(this.origin));
    // const t: number = originDot / directionDot;

    // return t;

    // [-D, V1 - V0, V2 - V0][t, u, v] = O - V0
    // [-D, E1, E2][t, u, v] = T

    const edge1: Vector3 = triangle.v1.subtract(triangle.v0); // The edge vector going from vertex 0 to 1 (E1)
    const edge2: Vector3 = triangle.v2.subtract(triangle.v0); // The edge vector going from vertex 0 to 2 (E2)
    const normal: Vector3 = edge1.cross(edge2); // The normal of the triangle
    const negDirection: Vector3 = this.direction.multiply(-1); // The negative ray direction (-D)
    const determinant: number = negDirection.dot(normal); // The determinant of [-D, E1, E2] using the scalar triple product

    if (determinant === 0) return; // Return if the line is parallel or towards the same direction as the triangle's normal

    const vertexDifference: Vector3 = this.origin.subtract(triangle.v0); // The difference between the origin and vertex 0 (T)

    const determinantU: number = negDirection.dot(vertexDifference.cross(edge2)); // The determinant of [-D, T, E2] using the scalar triple product
    const u: number = determinantU / determinant;

    if (u < 0) return; // Intersection point lies outside the triangle

    const determinantV: number = negDirection.dot(edge1.cross(vertexDifference)); // The determinant of [-D, E1, T] using the scalar triple product
    const v: number = determinantV / determinant;

    if (v < 0 || u + v > 1) return; // Intersection point lies outside the triangle

    const determinantT: number = vertexDifference.dot(normal); // The determinant of [T, E1, E2] using the scalar triple product
    const t: number = determinantT / determinant;

    return t;
  }
}