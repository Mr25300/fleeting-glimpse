import { Camera, Canvas } from "./canvas.js";
import { Control, Controller } from "./controller.js";
import { Matrix4 } from "./matrix4.js";
import { Ray, Triangle } from "./triangle.js";
import { Vector3 } from "./vector3.js";

/** Handle game loop */
export abstract class Gameloop {
  private _running: boolean = false;
  private lastTime: number;
  private _elapsedTime: number = 0;
  private _fps: number;

  protected start(): void {
    this._running = true;

    requestAnimationFrame((timestamp: number) => {
      this.loop(timestamp);
    });
  }

  /**
   * Handles the gameloop frame.
   * @param timestamp The animation frame timestamp in milliseconds.
   */
  private loop(timestamp: number): void {
    if (!this._running) return;

    // Calcualte the change in time from the current and last timestamp
    const deltaTime: number = this.lastTime !== undefined ? (timestamp - this.lastTime) / 1000 : 0;
    this.lastTime = timestamp;

    this._elapsedTime += deltaTime;
    this._fps = 1 / deltaTime;

    // Call update and render functions
    this.update(deltaTime);
    this.render();

    requestAnimationFrame((timestamp: number) => {
      this.loop(timestamp);
    });
  }

  public get running(): boolean {
    return this._running;
  }

  public get elapsedTime(): number {
    return this._elapsedTime;
  }

  public get fps(): number {
    return this._fps;
  }

  protected stop(): void {
    this._running = false;
  }

  protected abstract update(deltaTime: number): void;
  protected abstract render(): void;
}

async function loadObjFromPath(url: string): Promise<Triangle[]> {
  try {
    const response = await fetch(url);  // Fetch the OBJ file from the path URL
    if (!response.ok) {
      throw new Error(`Failed to fetch the OBJ file: ${response.statusText}`);
    }
    
    const objText = await response.text();  // Get the content of the OBJ file as text
    return parseObj(objText);  // Parse the OBJ content and return the triangles
  } catch (error) {
    console.error('Error loading OBJ file:', error);
    return [];
  }
}

function parseObj(objText: string): Triangle[] {
  const vertices: Vector3[] = [];
  const faces: number[][] = [];

  const lines = objText.split('\n');
  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);  // Split by whitespace
    if (parts.length === 0) return;

    if (parts[0] === 'v') {
      // This is a vertex line: v x y z
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);
      vertices.push(new Vector3(x, y, z));
    } else if (parts[0] === 'f') {
      // This is a face line: f v1 v2 v3 or f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3 ...
      // Handle both triangle and quad faces (more vertices can be present)
      const faceVertices: number[] = [];
      for (let i = 1; i < parts.length; i++) {
        const vertexData = parts[i].split('/')[0]; // Ignore texture and normal data for now
        const vertexIndex = parseInt(vertexData) - 1; // OBJ is 1-based, so subtract 1
        faceVertices.push(vertexIndex);
      }

      // Split faces into triangles if there are more than 3 vertices
      if (faceVertices.length === 3) {
        faces.push(faceVertices); // Directly add triangle
      } else if (faceVertices.length === 4) {
        // For quads, create two triangles
        faces.push([faceVertices[0], faceVertices[1], faceVertices[2]]);
        faces.push([faceVertices[0], faceVertices[2], faceVertices[3]]);
      } else {
        // For polygons with more than 4 vertices, triangulate the polygon (basic method)
        for (let i = 1; i < faceVertices.length - 1; i++) {
          faces.push([faceVertices[0], faceVertices[i], faceVertices[i + 1]]);
        }
      }
    }
  });

  // Create triangles based on the vertices and faces
  const triangles: Triangle[] = [];
  faces.forEach(face => {
    const v0 = vertices[face[0]];
    const v1 = vertices[face[1]];
    const v2 = vertices[face[2]];
    triangles.push(new Triangle(v0, v1, v2));
  });

  return triangles;
}

export class Game extends Gameloop {
  private static _instance: Game;

  public readonly points: Vector3[] = [];
  public triangles: Triangle[];

  public readonly canvas: Canvas = new Canvas();
  public readonly camera: Camera = new Camera();
  public controller: Controller;

  // public readonly onUpdate: GameEvent = new GameEvent();

  public static get instance(): Game {
    if (!Game._instance) Game._instance = new Game();

    return Game._instance;
  }

  public init(): void {
    this.start();

    this.controller = new Controller();

    // this.triangle = new Triangle(new Vector3(-2, -2, 0), new Vector3(2, -2, 0), new Vector3(0, 2, 0));
    // this.points.push(this.triangle.v0, this.triangle.v1, this.triangle.v2);

    loadObjFromPath("res/assets/cube.obj").then((value: Triangle[]) => {
      this.triangles = value;
    });
  }

  protected update(deltaTime: number): void {
    let moveDir: Vector3 = new Vector3();

    if (this.controller.controlActive(Control.moveF)) moveDir = moveDir.add(new Vector3(0, 0, -1));
    if (this.controller.controlActive(Control.moveB)) moveDir = moveDir.add(new Vector3(0, 0, 1));
    if (this.controller.controlActive(Control.moveL)) moveDir = moveDir.add(new Vector3(-1, 0, 0));
    if (this.controller.controlActive(Control.moveR)) moveDir = moveDir.add(new Vector3(1, 0, 0));

    if (moveDir.magnitude() === 0) return;

    this.camera.position = this.camera.position.add(this.camera.rotation.apply(moveDir).unit().multiply(2 * deltaTime));
  }

  protected render(): void {
    this.canvas.render();
  }
}

class Driver {
  constructor() {
    const game: Game = Game.instance;
    game.init();
  }
}

new Driver();