import { Matrix4 } from "../math/matrix4.js";
import { Util } from "../util/util.js";
import { Vector3 } from "../math/vector3.js";

/** Represents a line in 3d space. */
export class Line {
  public readonly direction: Vector3;

  /**
   * Creates a line from a start and end point.
   * @param start The starting point.
   * @param end The ending point.
   */
  constructor(
    public readonly start: Vector3,
    public readonly end: Vector3
  ) {
    this.direction = end.subtract(start); // Assign the direction
  }

  /**
   * Gets the closest point on the line to a reference point.
   * @param reference The reference point.
   * @returns The closest point on the line to the reference
   */
  public closestPointTo(reference: Vector3): Vector3 {
    let t: number = reference.subtract(this.start).dot(this.direction.unit); // Project the reference onto the line
    t = Util.clamp(t, 0, this.direction.magnitude); // Clamp the distance between the start and end

    return this.start.add(this.direction.unit.multiply(t));
  }

  /**
   * Gets the intersection point of the line with a plane.
   * @param planePoint A point on the plane.
   * @param planeNormal The plane normal.
   * @param infiniteRange Whether or not the line should have unlimited range.
   * @returns The plane intersection point, if existing.
   */
  public getPlaneIntersection(planePoint: Vector3, planeNormal: Vector3, infiniteRange?: boolean): Vector3 | undefined {
    const normalDot: number = planeNormal.dot(this.direction);
    if (normalDot === 0) return;

    let t: number = planeNormal.dot(planePoint.subtract(this.start)) / normalDot; // Get the projected distance between the line and plane

    if (!infiniteRange && (t < 0 || t > 1)) return; // Return if range is finite and intersection point exceeds line

    return this.start.add(this.direction.multiply(t));
  }
}

/** Represents a triangle in 3d space. */
export class Triangle {
  public readonly centroid: Vector3;
  public readonly bounds: Bounds;
  public readonly edge1: Vector3;
  public readonly edge2: Vector3;
  public readonly edgeCross: Vector3;
  public readonly normal: Vector3;

  public readonly edges: Line[] = new Array(3);

  /**
   * Creates a triangle and all of its properties from the specified vertices.
   * @param v0 The first vertex.
   * @param v1 The second vertex.
   * @param v2 The third vertex.
   */
  constructor(
    public readonly v0: Vector3,
    public readonly v1: Vector3,
    public readonly v2: Vector3
  ) {
    this.centroid = v0.add(v1).add(v2).divide(3); // The average of the three vertices
    this.bounds = Bounds.fromPoints([v0, v1, v2]);

    // Assign the edges and normals for 
    this.edge1 = this.v1.subtract(this.v0);
    this.edge2 = this.v2.subtract(this.v0);
    this.edgeCross = this.edge1.cross(this.edge2);
    this.normal = this.edgeCross.unit;

    // Create the edge lines from the vertices
    this.edges[0] = new Line(v0, v1);
    this.edges[1] = new Line(v1, v2);
    this.edges[2] = new Line(v2, v0);
  }

  /**
   * Calculates the closest point on the triangle to a reference.
   * @param reference The reference point.
   * @param onPlane Whether or not the reference is already on the plane.
   * @param occludeDist The specified maximum planar distance before the method does an early return.
   * @returns A tuple consisting of:
   * - The closest point on the triangle to the reference.
   * - Whether or not the reference was within the triangle relative to the plane.
   * - The distance from the reference to the closest point.
   */
  public closestPoint(reference: Vector3, onPlane: boolean, occludeDist?: number): [Vector3, boolean, number] {
    let surfacePoint: Vector3 = reference;
    let surfaceDist: number = 0;

    // Set the planar distance and projection if the reference is not already on the plane
    if (!onPlane) {
      surfaceDist = reference.subtract(this.v0).dot(this.normal);
      surfacePoint = reference.subtract(this.normal.multiply(surfaceDist));
    }

    // Early exit if the surface distance exceeds the occlusion distance
    if (occludeDist !== undefined && surfaceDist > occludeDist) {
      return [Vector3.zero, false, surfaceDist];
    }

    const cross0: Vector3 = surfacePoint.subtract(this.v0).cross(this.v1.subtract(this.v0));
    const cross1: Vector3 = surfacePoint.subtract(this.v1).cross(this.v2.subtract(this.v1));
    const cross2: Vector3 = surfacePoint.subtract(this.v2).cross(this.v0.subtract(this.v2));

    // All dot products will be less than zero if the point is within the triangle, and thus can return the planar distance and projection
    if (cross0.dot(this.normal) <= 0 && cross1.dot(this.normal) <= 0 && cross2.dot(this.normal) <= 0) {
      return [surfacePoint, true, surfaceDist];
    }
    
    let closestDist: number = Infinity;
    let closestPoint: Vector3 = Vector3.zero;

    // Loop through the triangle's edges, and get the closest of the closest points of each edge to the reference
    for (let i = 0; i < 3; i++) {
      const point: Vector3 = this.edges[i].closestPointTo(reference);
      const distance: number = reference.subtract(point).magnitude;

      if (distance < closestDist) {
        closestDist = distance;
        closestPoint = point;
      }
    }

    return [closestPoint, false, closestDist];
  }
}

/** Manages ray information and methods. */
export class Ray {
  constructor(
    public readonly origin: Vector3,
    public readonly direction: Vector3
  ) {}

  /**
   * Determines the point along the ray from a specified direction scalar.
   * @param t The direction scalar.
   * @returns The point along the ray.
   */
  public getPoint(t: number): Vector3 {
    return this.origin.add(this.direction.multiply(t));
  }

  /**
   * Determines whether or not the ray intersects with specified bounds.
   * @param bounds The specified bounds.
   * @returns True if it intersects, false if otherwise.
   */
  public intersectsBounds(bounds: Bounds): boolean {
    const axes: ("x" | "y" | "z")[] = ["x", "y", "z"];

    let tEntry: number = -Infinity;
    let tExit: number = Infinity;

    // Loop through the axes
    for (const axis of axes) {
      const axisOrigin: number = this.origin[axis];
      const axisDir: number = this.direction[axis];
      const axisMin: number = bounds.min[axis];
      const axisMax: number = bounds.max[axis];

      if (axisDir === 0) {
        // If the direction for the axis is 0, and the originis not within the bounds for that axis
        if (axisOrigin < axisMin || axisOrigin > axisMax) return false;

      } else {
        // Determine the intersection times of the ray with the axis plane of the bounds
        let tMin: number = (axisMin - axisOrigin) / axisDir;
        let tMax: number = (axisMax - axisOrigin) / axisDir;

        if (tMin > tMax) [tMin, tMax] = [tMax, tMin]; // Ensure minimum and maximum are correct

        tEntry = Math.max(tEntry, tMin); // Get maximum entry time
        tExit = Math.min(tExit, tMax); // Get minimum exit time

        if (tEntry > tExit) return false; // If it enters before it exists at any point, no collision
      }
    }

    return true;
  }

  /**
   * Performs a triangle intersection test with the ray using the moller trumbore algorithm.
   * @param triangle The specified triangle/
   * @returns The intersection time, if it occurs.
   */
  public getTriangleIntersection(triangle: Triangle): number | undefined {
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

    if (t < 0) return; // The intersection occurs behind the ray

    return t;
  }
}

/** Manages properties and methods of a capsule collision object. */
export class Capsule {
  private tStart: Vector3;
  private tEnd: Vector3;
  private line: Line;
  private _bounds: Bounds;

  /**
   * Creates a capsule from the specified parameters.
   * @param start The starting point of the capsule.
   * @param end The ending point of the capsule.
   * @param radius The capsule radius.
   * @param transformation The start transformation, defaults to nothing.
   */
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

  /** Updates the transform and bounds of the capsule. */
  private updateTransform(): void {
    this.tStart = this.transformation.apply(this.start);
    this.tEnd = this.transformation.apply(this.end);
    this.line = new Line(this.tStart, this.tEnd);
    this._bounds = Bounds.fromPoints([this.tStart, this.tEnd], this.radius);
  }

  /**
   * Sets and updates the transformation of the capsule.
   * @param transformation The new transformation.
   */
  public setTransformation(transformation: Matrix4): void {
    this.transformation = transformation;

    this.updateTransform();
  }

  /**
   * Gets the intersection between the capsule and a triangle.
   * @param triangle The specified triangle.
   * @returns The tuple collision info, consisting of:
   * - A boolean, true if there is a collision, false if otherwise.
   * - The normal vector of the collision.
   * - The overlap amount between the capsule and triangle along the normal axis.
   */
  public getTriangleIntersection(triangle: Triangle): [boolean, Vector3?, number?] {
    // Get the capsule's direction's intersection point with the triangle's plane
    const planeIntersection: Vector3 | undefined = this.line.getPlaneIntersection(triangle.v0, triangle.normal);
    let reference: Vector3 = triangle.centroid; // An arbitrary approximation for the reference point in case there is no intersection

    // Set the reference point to the closest point on the triangle to the intersection point if there is one
    if (planeIntersection) {
      const [closest]: [Vector3?, boolean?, number?] = triangle.closestPoint(planeIntersection, true);
      reference = closest!;
    }

    // Get the closest point along the capsule to the reference point
    const center: Vector3 = this.line.closestPointTo(reference);

    // Get the closest point in the triangle to the point on the capsule
    const [closestPoint, insideTriangle, pointDistance]: [Vector3?, boolean?, number?] = triangle.closestPoint(center, false, this.radius);

    if (pointDistance > this.radius) return [false]; // Early exit if the distance is greater than the capsule radius

    // Set the normal to push away from the closest point
    let normal = triangle.normal;
    if (!insideTriangle) normal = center.subtract(closestPoint).unit;

    return [true, normal, this.radius - pointDistance];
  }
}

/** Represents a rectangular bound in 3d space. */
export class Bounds {
  public readonly dimensions: Vector3;
  public readonly center: Vector3;

  /**
   * Creates bounds from a minimum and maximum corner.
   * @param min The minimum corner.
   * @param max The maximum corner.
   */
  constructor(public readonly min: Vector3, public readonly max: Vector3) {
    this.dimensions = max.subtract(min);
    this.center = min.add(max).divide(2);
  }

  /**
   * Creates bounds from an array of points and their radii.
   * @param points The specified points.
   * @param radius The additional radius, defaulting to 0.
   * @returns The created bounds.
   */
  public static fromPoints(points: Vector3[], radius: number = 0): Bounds {
    let [minX, minY, minZ]: [number, number, number] = [Infinity, Infinity, Infinity];
    let [maxX, maxY, maxZ]: [number, number, number] = [-Infinity, -Infinity, -Infinity];

    // Loop through the points and reassign the minimums and maximums if necessary
    for (const point of points) {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.z < minZ) minZ = point.z;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
      if (point.z > maxZ) maxZ = point.z;
    }

    // Return the bounds from the min and max axes and the radius addition
    return new Bounds(
      new Vector3(minX - radius, minY - radius, minZ - radius),
      new Vector3(maxX + radius, maxY + radius, maxZ + radius)
    );
  }

  /**
   * Determines whether this rectagular bound overlaps with another.
   * @param bounds The other bounds.
   * @returns True if they overlap, false if otherwise.
   */
  public overlaps(bounds: Bounds): boolean {
    if (
      (this.min.x > bounds.max.x || bounds.min.x > this.max.x) ||
      (this.min.y > bounds.max.y || bounds.min.y > this.max.y) ||
      (this.min.z > bounds.max.z || bounds.min.z > this.max.z)
    ) {
      return false;
    }

    return true;
  }
}