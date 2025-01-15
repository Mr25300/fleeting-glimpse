import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { Ray } from "./ray.js";
import { Util } from "./util.js";
import { Vector3 } from "./vector3.js";

export interface RaycastInfo {
  t: number,
  position: Vector3,
  normal: Vector3
}

export class Capsule {
  private transformation: Matrix4 = Matrix4.identity;

  constructor(

  ) {}
}

export class Bounds {
  constructor(private min: Vector3, private max: Vector3) {

  }
}

export class Triangle {
  constructor(
    public readonly v0: Vector3,
    public readonly v1: Vector3,
    public readonly v2: Vector3
  ) {}
}

export class Model {
  private transformation: Matrix4 = Matrix4.identity;
  private transformedVertices: Vector3[];

  constructor(private mesh: Mesh) {
    this.transformedVertices = new Array(this.mesh.vertices.length);
  }

  public get transformationMatrix(): Matrix4 {
    return this.transformation;
  }

  public setTransformation(transform: Matrix4): void {
    this.transformation = transform;
    this.transformedVertices = new Array(this.mesh.vertices.length);
  }

  public getVertex(index: number): Vector3 {
    if (!this.transformedVertices[index]) {
      this.transformedVertices[index] = this.transformation.apply(this.mesh.getVertex(index));
    }

    return this.transformedVertices[index];
  }

  public getTriangle(triangle: number): Triangle {
    const [v0, v1, v2] = this.mesh.getTriangleIndices(triangle);

    return new Triangle(
      this.getVertex(v0),
      this.getVertex(v1),
      this.getVertex(v2)
    );
  }

  public raycast(ray: Ray): RaycastInfo | undefined {
    let lastInfo: RaycastInfo | undefined;

    for (let i: number = 0; i < this.mesh.triangleCount; i++) {
      const triangle: Triangle = this.getTriangle(i);
      const edge1: Vector3 = triangle.v1.subtract(triangle.v0); // The edge vector going from vertex 0 to 1 (E1)
      const edge2: Vector3 = triangle.v2.subtract(triangle.v0); // The edge vector going from vertex 0 to 2 (E2)
      const normal: Vector3 = edge1.cross(edge2); // The normal of the triangle
      const negDirection: Vector3 = ray.direction.multiply(-1); // The negative ray direction (-D)
      const determinant: number = negDirection.dot(normal); // The determinant of [-D, E1, E2] using the scalar triple product

      if (determinant <= 0) continue; // Return if the line is parallel or towards the same direction as the triangle's normal

      const vertexDifference: Vector3 = ray.origin.subtract(triangle.v0); // The difference between the origin and vertex 0 (T)

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

export class Model {

}

export class Mesh {
  public readonly vertexBuffer: WebGLBuffer;
  public readonly indexBuffer: WebGLBuffer;

  constructor(public readonly vertices: Vector3[], private vertexIndices: number[]) {
    const vertexData: Float32Array = new Float32Array(vertices.length * 3);
    const indexData: Uint16Array = new Uint16Array(vertexIndices);

    for (let i = 0; i < vertices.length; i++) {
      const vertex: Vector3 = vertices[i];

      vertexData[i * 3] = vertex.x;
      vertexData[i * 3 + 1] = vertex.y;
      vertexData[i * 3 + 2] = vertex.z;
    }

    this.vertexBuffer = Game.instance.canvas.createBuffer(vertexData);
    this.indexBuffer = Game.instance.canvas.createBuffer(indexData, true);
  }

  static async fromFilePath(filePath: string): Promise<Mesh> {
    const text: string = await Util.loadFile(filePath);
    const [vertices, vertexIndices] = Util.parseObj(text);

    return new Mesh(vertices, vertexIndices);
  }

  public get triangleCount(): number {
    return this.vertexIndices.length / 3;
  }

  public getTriangleIndices(triangle: number): [number, number, number] {
    return [
      this.vertexIndices[triangle * 3],
      this.vertexIndices[triangle * 3 + 1],
      this.vertexIndices[triangle * 3 + 2]
    ];
  }

  public getVertex(index: number): Vector3 {
    return this.vertices[index];
  }
}

export class RenderModel {
  private transformation: Matrix4;

  public setTransformation(transformation: Matrix4): void {
    this.transformation = transformation;
  }

  public bind(): void {

  }
}

export class RenderMesh {
  public readonly vertexBuffer: WebGLBuffer;
  public readonly indexBuffer: WebGLBuffer;
  public readonly indexCount: number;

  constructor(vertexData: Float32Array, indexData: Uint16Array) {
    this.vertexBuffer = Game.instance.canvas.createBuffer(vertexData);
    this.indexBuffer = Game.instance.canvas.createBuffer(indexData);
    this.indexCount = indexData.length;
  }

  public bind() {

  }
}