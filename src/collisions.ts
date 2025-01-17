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
    this.bounds = Bounds.fromPoints([v0, v1, v2]);

    this.edge1 = this.v1.subtract(this.v0);
    this.edge2 = this.v2.subtract(this.v0);
    this.edgeCross = this.edge1.cross(this.edge2);
    this.normal = this.edgeCross.unit;
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

  public intersectsBounds(bounds: Bounds): boolean {
    const axes: ("x" | "y" | "z")[] = ["x", "y", "z"];

    let tEntry: number = -Infinity;
    let tExit: number = Infinity;

    for (const axis of axes) {
      const axisOrigin: number = this.origin[axis];
      const axisDir: number = this.direction[axis];
      const axisMin: number = bounds.min[axis];
      const axisMax: number = bounds.max[axis];

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

  public getTriangleIntersection(triangle: Triangle): number | undefined {
    // Moller trumbore theorum (slightly less optimized)
    const negDirection: Vector3 = this.direction.multiply(-1); // The negative ray direction (-D)
    const determinant: number = negDirection.dot(triangle.edgeCross); // The determinant of [-D, E1, E2] using the scalar triple product

    if (determinant <= 0) return; // Return if the line is parallel or towards the same direction as the triangle's normal

    const vertexDifference: Vector3 = this.origin.subtract(triangle.v0); // The difference between the origin and vertex 0 (T)

    const determinantU: number = negDirection.dot(vertexDifference.cross(triangle.edge2)); // The determinant of [-D, T, E2] using the scalar triple product
    const u: number = determinantU / determinant;

    if (u < 0) return; // Intersection point lies outside the triangle

    const determinantV: number = negDirection.dot(triangle.edge1.cross(vertexDifference)); // The determinant of [-D, E1, T] using the scalar triple product
    const v: number = determinantV / determinant;

    if (v < 0 || u + v > 1) return; // Intersection point lies outside the triangle

    const determinantT: number = vertexDifference.dot(triangle.edgeCross); // The determinant of [T, E1, E2] using the scalar triple product
    const t: number = determinantT / determinant;

    if (t < 0) return;

    return t;
  }
}

export class Capsule {
  private tStart: Vector3;
  private tEnd: Vector3;
  private direction: Vector3;
  private _bounds: Bounds;

  constructor(
    private readonly start: Vector3,
    private readonly end: Vector3,
    private readonly radius: number,
    private transformation: Matrix4 = Matrix4.identity
  ) {
    this.updateTransform();
  }

  public get bounds(): Bounds {
    return this._bounds;
  }

  private updateTransform(): void {
    this.tStart = this.transformation.apply(this.start);
    this.tEnd = this.transformation.apply(this.end);
    this.direction = this.tEnd.subtract(this.tStart);
    this._bounds = Bounds.fromPoints([this.tStart, this.tEnd], this.radius);
  }

  public setTransformation(transformation: Matrix4): void {
    this.transformation = transformation;

    this.updateTransform();
  }

  private closestPointOnLine(start: Vector3, end: Vector3, point: Vector3): Vector3 {
    const direction: Vector3 = end.subtract(start);
    let t: number = point.subtract(start).dot(direction) / direction.magnitude;

    t = Math.min(Math.max(t, 0), 1);

    return start.add(direction.multiply(t));
  }

  private sphereIntersectsTriangle(center: Vector3, triangle: Triangle): [boolean, Vector3?, number?] {
    const surfaceDist: number = center.subtract(triangle.v0).dot(triangle.normal);
    
    if (surfaceDist > this.radius || surfaceDist < 0) return [false];

    const surfacePoint: Vector3 = center.subtract(triangle.normal.multiply(surfaceDist));
    const cross0: Vector3 = surfacePoint.subtract(triangle.v0).cross(triangle.v1.subtract(triangle.v0));
    const cross1: Vector3 = surfacePoint.subtract(triangle.v1).cross(triangle.v2.subtract(triangle.v1));
    const cross2: Vector3 = surfacePoint.subtract(triangle.v2).cross(triangle.v0.subtract(triangle.v2));

    if (cross0.dot(triangle.normal) <= 0 && cross1.dot(triangle.normal) <= 0 && cross2.dot(triangle.normal) <= 0) {
      return [true, triangle.normal, surfaceDist];
    }

    const points: Vector3[] = [
      this.closestPointOnLine(triangle.v0, triangle.v1, center),
      this.closestPointOnLine(triangle.v1, triangle.v2, center),
      this.closestPointOnLine(triangle.v2, triangle.v0, center)
    ];

    let closestDist: number = Infinity;
    let closestNormal: Vector3 = Vector3.zero;

    for (const point of points) {
      const direction: Vector3 = center.subtract(point);
      const distance: number = direction.magnitude;

      if (distance < closestDist) {
        closestDist = distance;
        closestNormal = direction;
      }
    }

    if (closestDist <= this.radius) {
      return [true, closestNormal, this.radius - closestDist];
    }

    return [false];
  }

  public getTriangleIntersection(triangle: Triangle): [boolean, Vector3?, number?] {
    const base: Vector3 = this.tStart.subtract(this.direction.multiply(this.radius));
    const t: number = triangle.normal.dot(triangle.v0.subtract(base)) / Math.abs(triangle.normal.dot(this.direction));
    const planeIntersection: Vector3 = base.add(this.direction.multiply(t));

    let closestDist: number = Infinity;
    let closestPoint: Vector3 = Vector3.zero;

    for (const point of [triangle.v0, triangle.v1, triangle.v2]) {
      const dist: number = planeIntersection.subtract(point).magnitude;

      if (dist < closestDist) {
        closestDist = dist;
        closestPoint = point;
      }
    }

    const center: Vector3 = this.closestPointOnLine(this.tStart, this.tEnd, closestPoint);

    return this.sphereIntersectsTriangle(center, triangle);
  }
}

export class Bounds {
  public readonly dimensions: Vector3;
  public readonly center: Vector3;

  constructor(public readonly min: Vector3, public readonly max: Vector3) {
    this.dimensions = max.subtract(min);
    this.center = min.add(max).divide(2);
  }

  public static fromPoints(points: Vector3[], radius: number = 0): Bounds {
    let [minX, minY, minZ]: [number, number, number] = [Infinity, Infinity, Infinity];
    let [maxX, maxY, maxZ]: [number, number, number] = [-Infinity, -Infinity, -Infinity];

    for (const vertex of points) {
      if (vertex.x < minX) minX = vertex.x;
      if (vertex.y < minY) minY = vertex.y;
      if (vertex.z < minZ) minZ = vertex.z;
      if (vertex.x > maxX) maxX = vertex.x;
      if (vertex.y > maxY) maxY = vertex.y;
      if (vertex.z > maxZ) maxZ = vertex.z;
    }

    return new Bounds(
      new Vector3(minX - radius, minY - radius, minZ - radius),
      new Vector3(maxX + radius, maxY + radius, maxZ + radius)
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
}