import { BVH, RaycastInfo } from "./bvh.js";
import { Camera } from "./camera.js";
import { Canvas } from "./canvas.js";
import { Bounds, Capsule, Ray, Triangle } from "./collisions.js";
import { Control, Controller } from "./controller.js";
import { Entity } from "./entity.js";
import { Matrix4 } from "./matrix4.js";
import { GameMesh, GameModel, RenderMesh, RenderModel } from "./mesh.js";
import { Player } from "./player.js";
import { AudioManager } from "./audiomanager.js";
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
  public readonly controller: Controller = new Controller();
  public readonly audioManager: AudioManager = new AudioManager();
  public readonly bvh: BVH = new BVH();
  
  public readonly player: Player = new Player();
  public renderModels: Map<RenderMesh, Set<RenderModel>> = new Map();

  // public readonly onUpdate: GameEvent = new GameEvent();

  public static get instance(): Game {
    if (!Game._instance) Game._instance = new Game();

    return Game._instance;
  }

  public async init(): Promise<void> {
    await this.canvas.init();

    const [gameMesh, renderMesh] = await GameMesh.fromFile("res/models/map.obj");

    this.bvh.init([new GameModel(gameMesh)]);
    this.canvas.registerModel(new RenderModel(renderMesh));

    const [_, monsterMesh] = await GameMesh.fromFile("res/models/monster.obj");
    this.canvas.registerModel(new RenderModel(monsterMesh));

    this.camera.subject = this.player;
    this.camera.subjectOffset = new Vector3(0, 1.5, 0);

    this.start();
  }

  protected update(deltaTime: number): void {
    this.player.prePhysicsBehaviour(deltaTime);
    this.player.update(deltaTime);
    this.camera.update(deltaTime);
    this.player.postPhysicsBehaviour();
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