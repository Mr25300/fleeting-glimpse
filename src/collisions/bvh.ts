import { Bounds, Triangle, Ray, Capsule } from "./collisions.js";
import { GameModel } from "../mesh.js";
import { Vector3 } from "../vector3.js";

export interface RaycastInfo {
  t: number,
  position: Vector3,
  normal: Vector3
}

export interface CollisionInfo {
  normal: Vector3,
  overlap: number
}

class BVHNode {
  public bounds: Bounds;
  public left?: BVHNode;
  public right?: BVHNode;
  public triangles?: Triangle[];
}

export class BVH {
  private root: BVHNode;

  public init(models: GameModel[]): void {
    const triangles: Triangle[] = [];

    for (const model of models) {
      triangles.push(...model.triangles);
    }

    this.root = new BVHNode();
    this.constructNode(this.root, triangles);
  }

  private constructNode(node: BVHNode, triangles: Triangle[]): void {
    const vertices: Vector3[] = [];
    const centers: Vector3[] = [];

    for (const triangle of triangles) {
      vertices.push(triangle.v0, triangle.v1, triangle.v2);
      centers.push(triangle.centroid);
    }

    node.bounds = Bounds.fromPoints(vertices);

    const centerBounds: Bounds = Bounds.fromPoints(centers);

    if (triangles.length === 1 || centerBounds.dimensions.magnitude === 0) {
      node.triangles = triangles;

      return;
    }

    const leftTriangles: Triangle[] = [];
    const rightTriangles: Triangle[] = [];

    let splitAxis: "x" | "y" | "z" = "x";
    if (centerBounds.dimensions.y > centerBounds.dimensions[splitAxis]) splitAxis = "y";
    if (centerBounds.dimensions.z > centerBounds.dimensions[splitAxis]) splitAxis = "z";

    let averageAxisPos = 0;

    for (const triangle of triangles) {
      averageAxisPos += triangle.centroid[splitAxis];
    }

    averageAxisPos /= triangles.length;

    for (const triangle of triangles) {
      if (triangle.centroid[splitAxis] < averageAxisPos) {
        leftTriangles.push(triangle);

      } else {
        rightTriangles.push(triangle);
      }
    }

    if (leftTriangles.length > 0) {
      node.left = new BVHNode();

      this.constructNode(node.left, leftTriangles);
    }

    if (rightTriangles.length > 0) {
      node.right = new BVHNode();

      this.constructNode(node.right, rightTriangles);
    }
  }

  private traverse(triangles: Triangle[], callback: (nodeBound: Bounds) => boolean, node: BVHNode = this.root): void {
    if (callback(node.bounds)) {
      if (node.left) this.traverse(triangles, callback, node.left);
      if (node.right) this.traverse(triangles, callback, node.right);
      if (node.triangles) triangles.push(...node.triangles);
    }
  }

  public raycast(ray: Ray): RaycastInfo | undefined {
    const possibleTriangles: Triangle[] = [];

    this.traverse(possibleTriangles, (nodeBounds: Bounds) => {
      return ray.intersectsBounds(nodeBounds);
    });

    if (possibleTriangles.length === 0) return;

    let intersection: boolean = false;
    let minT: number = Infinity;
    let minNormal: Vector3 = Vector3.zero;

    for (const triangle of possibleTriangles) {
      const t: number | undefined = ray.getTriangleIntersection(triangle);

      if (t && t < minT) {
        intersection = true;
        minT = t;
        minNormal = triangle.normal;
      }
    }

    if (intersection) return {
      t: minT,
      normal: minNormal,
      position: ray.getPoint(minT)
    };
  }

  public collisionQuery(hitbox: Capsule): CollisionInfo[] {
    const possibleTriangles: Triangle[] = [];

    this.traverse(possibleTriangles, (nodeBounds: Bounds) => {
      return hitbox.bounds.overlaps(nodeBounds);
    });

    const info: CollisionInfo[] = [];

    for (const triangle of possibleTriangles) {
      const [intersects, normal, overlap] = hitbox.getTriangleIntersection(triangle);

      if (intersects) {
        info.push({ normal: normal!, overlap: overlap! });
      }
    }

    return info;
  }
}