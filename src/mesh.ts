import { Matrix4 } from "./matrix4.js";
import { Ray } from "./triangle.js";
import { Util } from "./util.js";
import { Vector3 } from "./vector3.js";

export interface RaycastInfo {
  t: number,
  position: Vector3,
  normal: Vector3
}

export class Triangle {
  constructor(
    public readonly v0: number,
    public readonly v1: number,
    public readonly v2: number
  ) { }
}

export class Mesh {
  private transformation: Matrix4 = Matrix4.identity;
  private transformedVertices: Vector3[];

  constructor(
    private vertices: Vector3[],
    private triangles: Triangle[]
  ) {
    this.transformedVertices = vertices;
  }

  static fromFilePath(filePath: string): Mesh {
    const mesh: Mesh = new Mesh([], []);

    Util.loadFile(filePath).then((text: string) => {
      const [vertices, vertexIndices] = Util.parseObj(text);

      mesh.vertices = vertices;

      for (let i = 0; i < vertexIndices.length / 3; i++) {
        mesh.triangles[i] = new Triangle(
          vertexIndices[i * 3],
          vertexIndices[i * 3 + 1],
          vertexIndices[i * 3 + 2]
        );
      }
    });

    return mesh;
  }

  private getVertex(index: number): Vector3 {
    if (!this.transformedVertices[index]) {
      this.transformedVertices[index] = this.transformation.apply(this.vertices[index]);
    }

    return this.transformedVertices[index];
  }

  public raycast(ray: Ray): RaycastInfo | undefined {
    let lastInfo: RaycastInfo | undefined;

    for (const triangle of this.triangles) {
      const v0: Vector3 = this.getVertex(triangle.v0);
      const v1: Vector3 = this.getVertex(triangle.v1);
      const v2: Vector3 = this.getVertex(triangle.v2);

      const edge1: Vector3 = v1.subtract(v0); // The edge vector going from vertex 0 to 1 (E1)
      const edge2: Vector3 = v2.subtract(v0); // The edge vector going from vertex 0 to 2 (E2)
      const normal: Vector3 = edge1.cross(edge2); // The normal of the triangle
      const negDirection: Vector3 = ray.direction.multiply(-1); // The negative ray direction (-D)
      const determinant: number = negDirection.dot(normal); // The determinant of [-D, E1, E2] using the scalar triple product

      if (determinant <= 0) continue; // Return if the line is parallel or towards the same direction as the triangle's normal

      const vertexDifference: Vector3 = ray.origin.subtract(v0); // The difference between the origin and vertex 0 (T)

      const determinantU: number = negDirection.dot(vertexDifference.cross(edge2)); // The determinant of [-D, T, E2] using the scalar triple product
      const u: number = determinantU / determinant;

      if (u < 0) continue; // Intersection point lies outside the triangle

      const determinantV: number = negDirection.dot(edge1.cross(vertexDifference)); // The determinant of [-D, E1, T] using the scalar triple product
      const v: number = determinantV / determinant;

      if (v < 0 || u + v > 1) continue; // Intersection point lies outside the triangle

      const determinantT: number = vertexDifference.dot(normal); // The determinant of [T, E1, E2] using the scalar triple product
      const t: number = determinantT / determinant;

      if (t < 0) continue;

      if (!lastInfo || t < lastInfo.t) {
        const position: Vector3 = ray.getPoint(t);

        lastInfo = { t, position, normal };
      }
    }

    return lastInfo;
  }
}