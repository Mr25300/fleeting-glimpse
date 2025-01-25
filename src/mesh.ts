import { Triangle } from "./collisions.js";
import { Game } from "./game.js";
import { Matrix4 } from "./matrix4.js";
import { Util } from "./util.js";
import { Vector3 } from "./vector3.js";

type MeshName = "map" | "monster";

interface MeshInfo {
  name: MeshName,
  ignoreGameMesh?: boolean
}

interface MeshResult {
  renderMesh: RenderMesh,
  gameMesh?: GameMesh
}

export class MeshLoader {
  private MESH_INFO: MeshInfo[] = [
    { name: "map" },
    { name: "monster", ignoreGameMesh: true }
  ]

  private meshes: Map<MeshName, MeshResult> = new Map();

  public async init() {
    const promises: Promise<MeshResult>[] = [];

    for (let i = 0; i < this.MESH_INFO.length; i++) {
      const info: MeshInfo = this.MESH_INFO[i];
      promises[i] = this.loadMesh(`res/models/${info.name}.obj`, info.ignoreGameMesh);
    }

    const results: MeshResult[] = await Promise.all(promises);

    for (let i = 0; i < results.length; i++) {
      this.meshes.set(this.MESH_INFO[i].name, results[i]);
    }
  }

  private async loadMesh(path: string, ignoreGameMesh: boolean = false): Promise<MeshResult> {
    const objText: string = await (await Util.loadFile(path)).text();
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

        vertexData.push(x, y, z);

        if (!ignoreGameMesh) vertices.push(new Vector3(x, y, z));

      } else if (parts[0] === "f") {
        // This is a face line: f v1 v2 v3 or f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3 ...
        const faceIndicies: number[] = [];

        for (let i = 1; i < parts.length; i++) {
          const vertexData = parts[i].split("/"); // Ignore texture and normal data for now
          const vertexIndex = parseInt(vertexData[0]) - 1; // OBJ is 1-based, so subtract 1

          faceIndicies.push(vertexIndex);
        }

        // Triangulate the polygon (basic method)
        for (let i = 1; i < faceIndicies.length - 1; i++) {
          const [v0, v1, v2]: [number, number, number] = [faceIndicies[0], faceIndicies[i], faceIndicies[i + 1]];
          
          indexData.push(v0, v1, v2);

          if (!ignoreGameMesh) triangles.push(new MeshTriangle(v0, v1, v2));
        }
      }
    });

    const result: MeshResult = { renderMesh: new RenderMesh(vertexData, indexData) };

    if (!ignoreGameMesh) result.gameMesh = new GameMesh(vertices, triangles);

    return result;
  }

  public createRenderModel(name: MeshName): RenderModel {
    return new RenderModel(this.meshes.get(name)!.renderMesh);
  }

  public createGameModel(name: MeshName): GameModel {
    const gameMesh: GameMesh | undefined = this.meshes.get(name)!.gameMesh;

    if (!gameMesh) throw new Error(`Game mesh does not exist for ${name}`);

    return new GameModel(gameMesh);
  }
}

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

  constructor(vertexData: number[], indexData: number[]) {
    this.vertexBuffer = Game.instance.canvas.createBuffer(new Float32Array(vertexData));
    this.indexBuffer = Game.instance.canvas.createBuffer(new Uint16Array(indexData), true);
    this.indexCount = indexData.length;
  }
}

export class RenderModel {
  constructor(
    public readonly mesh: RenderMesh,
    public transformation: Matrix4 = Matrix4.identity
  ) {}
}