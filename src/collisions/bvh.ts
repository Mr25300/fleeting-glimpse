import { Bounds, Triangle, Ray, Capsule } from "./collisions.js";
import { GameModel } from "../mesh/mesh.js";
import { Vector3 } from "../math/vector3.js";

export interface RaycastInfo {
  t: number,
  position: Vector3,
  normal: Vector3
}

export interface CollisionInfo {
  normal: Vector3,
  overlap: number
}

/** Represents the contents and info of a BVH node. */
class BVHNode {
  public bounds: Bounds;
  public left?: BVHNode;
  public right?: BVHNode;
  public triangles?: Triangle[];
}

/** Encapsulates the creation and traversal of a BVH tree. */
export class BVH {
  private root: BVHNode;

  /**
   * Creates the BVH from a list of models.
   * @param models The model list.
   */
  public init(models: GameModel[]): void {
    // Combine all the triangles of the models.
    const triangles: Triangle[] = [];

    for (const model of models) {
      triangles.push(...model.triangles);
    }

    this.root = new BVHNode();
    this.constructNode(this.root, triangles);
  }

  /**
   * Construct a given node from a list of triangles.
   * @param node The current node.
   * @param triangles The list of triangles.
   */
  private constructNode(node: BVHNode, triangles: Triangle[]): void {
    const vertices: Vector3[] = [];
    const centers: Vector3[] = [];

    // Add the vertices and centers of all the triangles.
    for (const triangle of triangles) {
      vertices.push(triangle.v0, triangle.v1, triangle.v2);
      centers.push(triangle.centroid);
    }

    node.bounds = Bounds.fromPoints(vertices); // Create the node's bounds to contain all of the triangles

    const centerBounds: Bounds = Bounds.fromPoints(centers); // Define the bounds of the triangle centers

    // Stop the loop if there is only 1 triangle or all of the triangles have the exact same centers and cannot be differentiated from one another.
    if (triangles.length === 1 || centerBounds.dimensions.magnitude === 0) {
      node.triangles = triangles;

      return;
    }

    const leftTriangles: Triangle[] = [];
    const rightTriangles: Triangle[] = [];

    // Determine the largest axis of the triangles' positions
    let splitAxis: "x" | "y" | "z" = "x";
    if (centerBounds.dimensions.y > centerBounds.dimensions[splitAxis]) splitAxis = "y";
    if (centerBounds.dimensions.z > centerBounds.dimensions[splitAxis]) splitAxis = "z";

    // Split the triangles in half based on which half of the bounds they lie
    for (const triangle of triangles) {
      if (triangle.centroid[splitAxis] < centerBounds.center[splitAxis]) {
        leftTriangles.push(triangle);

      } else {
        rightTriangles.push(triangle);
      }
    }

    // Construct the left node if there are left triangles
    if (leftTriangles.length > 0) {
      node.left = new BVHNode();

      this.constructNode(node.left, leftTriangles);
    }

    // Construct the right node if there are right triangles
    if (rightTriangles.length > 0) {
      node.right = new BVHNode();

      this.constructNode(node.right, rightTriangles);
    }
  }

  /**
   * Recursively traverses a node based on whether or not it matches the filter, and adds its triangles to an array.
   * @param triangles The array to add triangles to.
   * @param callback The filter callback for node bounds.
   * @param node The current node, defaulting to the root node.
   */
  private traverse(triangles: Triangle[], filter: (nodeBound: Bounds) => boolean, node: BVHNode = this.root): void {
    if (filter(node.bounds)) {
      if (node.left) this.traverse(triangles, filter, node.left);
      if (node.right) this.traverse(triangles, filter, node.right);
      if (node.triangles) triangles.push(...node.triangles);
    }
  }

  /**
   * Wrapper function for the traverse method, returning an array of candidate triangles based on a filter callback.
   * @param nodeFilter The BVH node filter callback.
   * @returns The array of triangles.
   */
  private getCandidateTriangles(nodeFilter: (nodeBound: Bounds) => boolean): Triangle[] {
    const triangles: Triangle[] = [];

    this.traverse(triangles, nodeFilter);

    return triangles;
  }

  /**
   * Raycasts through the BVH, returning the first intersection if any.
   * @param ray The specified ray.
   * @returns The raycast info or undefined.
   */
  public raycast(ray: Ray): RaycastInfo | undefined {
    const possibleTriangles: Triangle[] = this.getCandidateTriangles((nodeBounds: Bounds) => {
      return ray.intersectsBounds(nodeBounds);
    });

    let intersection: boolean = false;
    let minT: number = Infinity;
    let minNormal: Vector3 = Vector3.zero;

    // Loop through the triangles and determine the first intersection
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

  /**
   * Filters through the BVH and returns a list of the capsule's collisions.
   * @param hitbox The capsule hitbox.
   * @returns A list of collisions and their info.
   */
  public collisionQuery(hitbox: Capsule): CollisionInfo[] {
    const possibleTriangles: Triangle[] = this.getCandidateTriangles((nodeBounds: Bounds) => {
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