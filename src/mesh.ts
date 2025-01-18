import { Triangle } from "./collisions.js";
import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { Util } from "./util.js";
import { Vector3 } from "./vector3.js";

export class MeshTriangle {
  constructor(
    public readonly v0: number,
    public readonly v1: number,
    public readonly v2: number
  ) {}
}

export class GameMesh {
  constructor(
    public readonly vertices: Vector3[],
    public readonly triangles: MeshTriangle[]
  ) {}

  static async fromFile(filePath: string): Promise<[GameMesh, RenderMesh]> {
    const objText: string = await Util.loadFile(filePath);
    const vertexData: number[] = [];
    const indexData: number[] = [];
    const vertices: Vector3[] = [];
    const triangles: MeshTriangle[] = [];

    objText.split("\n").forEach(line => {
      const parts = line.trim().split(/\s+/);  // Split by whitespace

      if (parts.length === 0) return;

      if (parts[0] === "v") {
        const x: number = parseFloat(parts[1]);
        const y: number = parseFloat(parts[2]);
        const z: number = parseFloat(parts[3]);

        vertices.push(new Vector3(x, y, z));
        vertexData.push(x, y, z);

      } else if (parts[0] === "f") {
        // This is a face line: f v1 v2 v3 or f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3 ...
        const faceIndicies: number[] = [];

        for (let i = 1; i < parts.length; i++) {
          const vertexData = parts[i].split("/"); // Ignore texture and normal data for now
          const vertexIndex = parseInt(vertexData[0]) - 1; // OBJ is 1-based, so subtract 1

          faceIndicies.push(vertexIndex);
        }

        // Split faces into triangles if there are more than 3 vertices
        if (faceIndicies.length === 3) {
          const tri = new MeshTriangle(faceIndicies[0], faceIndicies[1], faceIndicies[2]);

          triangles.push(tri);
          indexData.push(tri.v0, tri.v1, tri.v2); // Directly add triangle
          
        } else {
          // For polygons with more than 4 vertices, triangulate the polygon (basic method)
          for (let i = 1; i < faceIndicies.length - 1; i++) {
            const tri = new MeshTriangle(faceIndicies[0], faceIndicies[i], faceIndicies[i + 1]);

            triangles.push(tri);
            indexData.push(tri.v0, tri.v1, tri.v2);
          }
        }
      }
    });

    return [
      new GameMesh(vertices, triangles),
      new RenderMesh(new Float32Array(vertexData), new Uint16Array(indexData))
    ];
  }
}

export class GameModel {
  public readonly vertices: Vector3[];
  public readonly triangles: Triangle[];

  constructor(private mesh: GameMesh, private transformation: Matrix4 = Matrix4.identity) {
    this.vertices = new Array(this.mesh.vertices.length);
    this.triangles = new Array(this.mesh.triangles.length);
    this.updateVertexTransforms();
  }

  private updateVertexTransforms(): void {
    for (let i = 0; i < this.vertices.length; i++) {
      this.vertices[i] = this.transformation.apply(this.mesh.vertices[i]);
    }

    for (let i = 0; i < this.triangles.length; i++) {
      const meshTriangle: MeshTriangle = this.mesh.triangles[i];

      this.triangles[i] = new Triangle(
        this.vertices[meshTriangle.v0],
        this.vertices[meshTriangle.v1],
        this.vertices[meshTriangle.v2]
      );
    }
  }

  public setTransformation(transform: Matrix4): void {
    this.transformation = transform;
    this.updateVertexTransforms();
  }
}

export class RenderMesh {
  public readonly vertexBuffer: WebGLBuffer;
  public readonly indexBuffer: WebGLBuffer;
  public readonly indexCount: number;

  constructor(vertexData: Float32Array, indexData: Uint16Array) {
    this.vertexBuffer = Game.instance.canvas.createBuffer(vertexData);
    this.indexBuffer = Game.instance.canvas.createBuffer(indexData, true);
    this.indexCount = indexData.length;
  }
}

export class RenderModel {
  constructor(private mesh: RenderMesh, private _transformation: Matrix4 = Matrix4.identity) {}

  public get transformation(): Matrix4 {
    return this._transformation;
  }

  public setTransformation(transformation: Matrix4): void {
    this._transformation = transformation;
  }
}