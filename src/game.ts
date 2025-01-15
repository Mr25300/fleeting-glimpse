import { Camera } from "./camera.js";
import { Canvas } from "./canvas.js";
import { Control, Controller } from "./controller.js";
import { Entity } from "./entity.js";
import { Mesh, Triangle } from "./mesh.js";
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

export class Game extends Gameloop {
  private static _instance: Game;

  public meshes: Mesh[] = [];

  public readonly canvas: Canvas = new Canvas();
  public readonly camera: Camera = new Camera();
  public readonly player: Entity = new Entity(Vector3.zero, 2);
  public controller: Controller;

  // public readonly onUpdate: GameEvent = new GameEvent();

  public static get instance(): Game {
    if (!Game._instance) Game._instance = new Game();

    return Game._instance;
  }

  public async init(): Promise<void> {
    await this.canvas.init();

    this.start();

    this.controller = new Controller();

    // this.triangle = new Triangle(new Vector3(-2, -2, 0), new Vector3(2, -2, 0), new Vector3(0, 2, 0));
    // this.points.push(this.triangle.v0, this.triangle.v1, this.triangle.v2);

    const mesh: Mesh = await Mesh.fromFilePath("res/assets/cube.obj");
    this.meshes.push(mesh);
  }

  protected update(deltaTime: number): void {
    this.player.behaviour();
    this.player.update(deltaTime);
    this.camera.position = this.player.position;
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