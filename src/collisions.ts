import { Matrix4 } from "./matrix4.js";
import { Vector3 } from "./vector3.js";

export class Triangle {
  public readonly center: Vector3;
  public readonly bounds: Bounds;
  public readonly edge1: Vector3;
  public readonly edge2: Vector3;
  public readonly edgeCross: Vector3;
  public readonly normal: Vector3;

  constructor(
    public readonly v0: Vector3,
    public readonly v1: Vector3,
    public readonly v2: Vector3
  ) {
    this.center = v0.add(v1).add(v2).divide(3);
    this.bounds = Bounds.fromVertices([v0, v1, v2]);

    this.edge1 = this.v1.subtract(this.v0);
    this.edge2 = this.v2.subtract(this.v0);
    this.edgeCross = this.edge1.cross(this.edge2);
    this.normal = this.edgeCross.unit;
  }

  public getRayIntersection(ray: Ray): number | undefined {
    // Moller trumbore theorum (slightly less optimized)
    const negDirection: Vector3 = ray.direction.multiply(-1); // The negative ray direction (-D)
    const determinant: number = negDirection.dot(this.edgeCross); // The determinant of [-D, E1, E2] using the scalar triple product

    if (determinant <= 0) return; // Return if the line is parallel or towards the same direction as the triangle's normal

    const vertexDifference: Vector3 = ray.origin.subtract(this.v0); // The difference between the origin and vertex 0 (T)

    const determinantU: number = negDirection.dot(vertexDifference.cross(this.edge2)); // The determinant of [-D, T, E2] using the scalar triple product
    const u: number = determinantU / determinant;

    if (u < 0) return; // Intersection point lies outside the triangle

    const determinantV: number = negDirection.dot(this.edge1.cross(vertexDifference)); // The determinant of [-D, E1, T] using the scalar triple product
    const v: number = determinantV / determinant;

    if (v < 0 || u + v > 1) return; // Intersection point lies outside the triangle

    const determinantT: number = vertexDifference.dot(this.edgeCross); // The determinant of [T, E1, E2] using the scalar triple product
    const t: number = determinantT / determinant;

    if (t < 0) return;

    return t;
  }
}

export class Ray {
  constructor(
    public readonly origin: Vector3,
    public readonly direction: Vector3
  ) { }

  public getPoint(t: number): Vector3 {
    return this.origin.add(this.direction.multiply(t));
  }
}

export class Capsule {
  private transformation: Matrix4 = Matrix4.identity;

  constructor(

  ) { }
}

export class Bounds {
  public readonly dimensions: Vector3;
  public readonly center: Vector3;

  constructor(private min: Vector3, private max: Vector3) {
    this.dimensions = max.subtract(min);
    this.center = min.add(max).divide(2);
  }

  public static fromVertices(vertices: Vector3[]): Bounds {
    let [minX, minY, minZ] = [Infinity, Infinity, Infinity];
    let [maxX, maxY, maxZ] = [-Infinity, -Infinity, -Infinity];

    for (const vertex of vertices) {
      if (vertex.x < minX) minX = vertex.x;
      if (vertex.y < minY) minY = vertex.y;
      if (vertex.z < minZ) minZ = vertex.z;
      if (vertex.x > maxX) maxX = vertex.x;
      if (vertex.y > maxY) maxY = vertex.y;
      if (vertex.z > maxZ) maxZ = vertex.z;
    }

    return new Bounds(
      new Vector3(minX, minY, minZ),
      new Vector3(maxX, maxY, maxZ)
    );
  }

  public overlaps(bounds: Bounds): boolean {
    if (
      (this.min.x > bounds.max.x || bounds.min.x > this.max.x) &&
      (this.min.y > bounds.max.y || bounds.min.y > this.max.y) &&
      (this.min.z > bounds.max.z || bounds.min.z > this.max.z)
    ) {
      return false;
    }

    return true;
  }

  public doesRayIntersect(ray: Ray): boolean {
    const axes: ("x" | "y" | "z")[] = ["x", "y", "z"];

    let tEntry: number = -Infinity;
    let tExit: number = Infinity;

    for (const axis of axes) {
      const axisOrigin: number = ray.origin[axis];
      const axisDir: number = ray.direction[axis];
      const axisMin: number = this.min[axis];
      const axisMax: number = this.max[axis];

      if (axisDir === 0) {
        if (axisOrigin < axisMin || axisOrigin > axisMax) return false;

      } else {
        let tMin: number = (axisMin - axisOrigin) / axisDir;
        let tMax: number = (axisMax - axisOrigin) / axisDir;

        if (tMin > tMax) [tMin, tMax] = [tMax, tMin];

        tEntry = Math.max(tEntry, tMin);
        tExit = Math.min(tExit, tMax);

        if (tEntry > tExit) return false;
      }
    }

    return true;
  }
}