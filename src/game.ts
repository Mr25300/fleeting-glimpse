import { BVH } from "./bvh.js";
import { Camera } from "./camera.js";
import { Canvas } from "./canvas.js";
import { Capsule, Triangle } from "./collisions.js";
import { Controller } from "./controller.js";
import { Entity } from "./entity.js";
import { Matrix4 } from "./matrix4.js";
import { GameMesh, GameModel, RenderMesh, RenderModel } from "./mesh.js";
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

  public readonly canvas: Canvas = new Canvas();
  public readonly camera: Camera = new Camera();
  public readonly player: Entity = new Entity(new Vector3(0, 3, 0), 5, new Capsule(new Vector3(0, 0, 0), new Vector3(0, 0, 0), 0.5));
  public renderModels: Map<RenderMesh, Set<RenderModel>> = new Map();
  public bvh: BVH;
  public controller: Controller;

  // public readonly onUpdate: GameEvent = new GameEvent();

  public static get instance(): Game {
    if (!Game._instance) Game._instance = new Game();

    return Game._instance;
  }

  public async init(): Promise<void> {
    await this.canvas.init();

    this.controller = new Controller();

    const [gameMesh, renderMesh] = await GameMesh.fromFile("res/assets/MAPONE.obj");

    this.bvh = new BVH([new GameModel(gameMesh)]);

    this.renderModels.set(renderMesh, new Set());
    this.renderModels.get(renderMesh)?.add(new RenderModel(renderMesh));

    this.start();

    // const triangle = new Triangle(
    //   new Vector3(1, 1, 1),
    //   new Vector3(1, -1, 3),
    //   new Vector3(-2, 1, 1)
    // );

    // const capsule = new Capsule(
    //   new Vector3(0, 0, -1),
    //   new Vector3(0, 0, 1),
    //   1
    // );

    // console.log(capsule.getTriangleIntersection(triangle));

    console.log(Matrix4.fromRotation(0.2, 0.1, 0).multiply(Matrix4.fromPosition(new Vector3(2, 2, 2))));
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