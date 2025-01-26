import { Triangle } from "../collisions/collisions.js";
import { Game } from "../core/game.js";
import { Matrix4 } from "../math/matrix4.js";
import { Util } from "../util/util.js";
import { Vector3 } from "../math/vector3.js";

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
  /** Default mesh info. */
  private readonly MESH_INFO: MeshInfo[] = [
    { name: "map" },
    { name: "monster", ignoreGameMesh: true }
  ];

  /** A map of the default loaded mesh results. */
  private readonly meshes: Map<MeshName, MeshResult> = new Map();

  /** Initialize and load all default meshes. */
  public async init(): Promise<void> {
    const promises: Promise<MeshResult>[] = [];

    // Create all mesh load promises
    for (let i = 0; i < this.MESH_INFO.length; i++) {
      const info: MeshInfo = this.MESH_INFO[i];
      promises[i] = this.loadMesh(`res/models/${info.name}.obj`, info.ignoreGameMesh);
    }

    // Load meshes simultaneously
    const results: MeshResult[] = await Promise.all(promises);

    for (let i = 0; i < results.length; i++) {
      this.meshes.set(this.MESH_INFO[i].name, results[i]);
    }
  }

  /**
   * Loads a mesh from an obj file.
   * @param path The path to the obj file.
   * @param ignoreGameMesh Whether or not a game mesh should be created.
   * @returns A mesh load result.
   */
  private async loadMesh(path: string, ignoreGameMesh: boolean = false): Promise<MeshResult> {
    const objFile: Response = await Util.loadFile(path);
    const objText: string = await objFile.text(); // Get obj file text
    const vertexData: number[] = [];
    const indexData: number[] = [];
    const vertices: Vector3[] = [];
    const triangles: MeshTriangle[] = [];

    // Split into lines
    objText.split("\n").forEach(line => {
      const parts = line.trim().split(/\s+/); // Split by whitespace

      if (parts.length === 0) return;
      
      if (parts[0] === "v") { // Part defines a vertex
        const x: number = parseFloat(parts[1]);
        const y: number = parseFloat(parts[2]);
        const z: number = parseFloat(parts[3]);

        vertexData.push(x, y, z);

        if (!ignoreGameMesh) vertices.push(new Vector3(x, y, z));

      } else if (parts[0] === "f") { // Part defines a face
        const faceIndicies: number[] = [];

        for (let i = 1; i < parts.length; i++) {
          const vertexData = parts[i].split("/"); // Split into vertex, texture and normal parts
          const vertexIndex = parseInt(vertexData[0]) - 1; // Isolate vertex part and subtract 1 because obj is 1-based

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

    if (!ignoreGameMesh) result.gameMesh = new GameMesh(vertices, triangles); // Create game mesh if should not ignore game mesh

    return result;
  }

  /**
   * Creates a render model from an existing mesh's render mesh.
   * @param name The name of the mesh.
   * @returns The render model.
   */
  public createRenderModel(name: MeshName): RenderModel {
    return new RenderModel(this.meshes.get(name)!.renderMesh);
  }

  /**
   * Creates a game model from an existing mesh's game mesh.
   * @param name The name of the mesh.
   * @returns The game model.
   */
  public createGameModel(name: MeshName): GameModel {
    const gameMesh: GameMesh | undefined = this.meshes.get(name)!.gameMesh;

    if (!gameMesh) throw new Error(`Game mesh does not exist for ${name}`); // Throw error if the mesh does not exist

    return new GameModel(gameMesh);
  }
}

/** Defines the indices of a game mesh triangle. */
export class MeshTriangle {
  constructor(
    public readonly v0: number,
    public readonly v1: number,
    public readonly v2: number
  ) {}
}

/** Represents an untransformed game mesh and its vertices and triangle indices. */
export class GameMesh {
  constructor(
    public readonly vertices: Vector3[],
    public readonly triangles: MeshTriangle[]
  ) {}
}

/** Represents a game mesh with transformation. */
export class GameModel {
  public readonly vertices: Vector3[];
  public readonly triangles: Triangle[];

  /**
   * Creates a game model from a game mesh.
   * @param mesh The game mesh.
   * @param _transformation The applied transformation.
   */
  constructor(private mesh: GameMesh, private _transformation: Matrix4 = Matrix4.identity) {
    this.vertices = new Array(this.mesh.vertices.length);
    this.triangles = new Array(this.mesh.triangles.length);
    this.updateTransform();
  }

  /** Updates the vertices and triangles of the model using the current transformation. */
  private updateTransform(): void {
    // Update the vertex positions based on the transformation
    for (let i = 0; i < this.vertices.length; i++) {
      this.vertices[i] = this._transformation.apply(this.mesh.vertices[i]);
    }

    // Loop through and create all the new triangles from the new vertices
    for (let i = 0; i < this.triangles.length; i++) {
      const meshTriangle: MeshTriangle = this.mesh.triangles[i];

      this.triangles[i] = new Triangle(
        this.vertices[meshTriangle.v0],
        this.vertices[meshTriangle.v1],
        this.vertices[meshTriangle.v2]
      );
    }
  }

  /**
   * Sets a new transformation and updates the game model.
   * @param transform The new transformation.
   */
  public set transformation(transform: Matrix4) {
    this._transformation = transform;
    this.updateTransform();
  }
}

/** Represents a render mesh and its buffers. */
export class RenderMesh {
  public readonly vertexBuffer: WebGLBuffer;
  public readonly indexBuffer: WebGLBuffer;
  public readonly indexCount: number;

  /**
   * Creates a render mesh and its buffers from vertex and index data.
   * @param vertexData The vertex array.
   * @param indexData The index array.
   */
  constructor(vertexData: number[], indexData: number[]) {
    this.vertexBuffer = Game.instance.canvas.createBuffer(new Float32Array(vertexData));
    this.indexBuffer = Game.instance.canvas.createBuffer(new Uint16Array(indexData), true);
    this.indexCount = indexData.length;
  }
}

/** Represents a render model and its transformation. */
export class RenderModel {
  constructor(
    public readonly mesh: RenderMesh,
    public transformation: Matrix4 = Matrix4.identity
  ) {}
}