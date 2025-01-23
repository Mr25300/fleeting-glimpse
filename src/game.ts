import { BVH, RaycastInfo } from "./bvh.js";
import { Camera } from "./camera.js";
import { Canvas } from "./canvas.js";
import { Bounds, Capsule, Ray, Triangle } from "./collisions.js";
import { Control, Controller } from "./controller.js";
import { Entity } from "./entity.js";
import { Matrix4 } from "./matrix4.js";
import { GameMesh, GameModel, MeshLoader, RenderMesh, RenderModel } from "./mesh.js";
import { Player } from "./player.js";
import { AudioManager } from "./audiomanager.js";
import { Vector3 } from "./vector3.js";
import { GameEvent } from "./gameevent.js";
import { UIManager } from "./uimanager.js";

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
  public readonly meshLoader: MeshLoader = new MeshLoader();
  public readonly audioManager: AudioManager = new AudioManager();
  public readonly uiManager: UIManager = new UIManager();
  public readonly controller: Controller = new Controller();
  public readonly bvh: BVH = new BVH();
  
  public player: Player = new Player();
  public renderModels: Map<RenderMesh, Set<RenderModel>> = new Map();

  public readonly firstStep: GameEvent = new GameEvent();
  public readonly postPhysicsStep: GameEvent = new GameEvent();

  public static get instance(): Game {
    if (!Game._instance) Game._instance = new Game();

    return Game._instance;
  }

  public async init(): Promise<void> {
    const canvasPromise: Promise<void> = this.canvas.init();

    canvasPromise.then(() => {
      this.meshLoader.init();
    });

    await Promise.all([
      canvasPromise,
      this.audioManager.init(),
      this.uiManager.awaitUserInteract()
    ]);

    const monster: RenderModel = this.meshLoader.createRenderModel("monster");

    const mapRender: RenderModel = this.meshLoader.createRenderModel("map");
    const mapModel: GameModel = this.meshLoader.createGameModel("map");

    this.bvh.init([mapModel]);

    this.canvas.registerModel(mapRender);
    this.canvas.registerModel(monster);

    this.uiManager.promptMenu();
  }

  public startGame(): void {
    this.player = new Player();

    this.camera.subject = this.player;
    this.camera.subjectOffset = new Vector3(0, 1.5, 0);

    this.audioManager.getAudio("ambience").emit(true);

    this.controller.lockMouse();

    this.start();
  }

  protected update(deltaTime: number): void {
    this.firstStep.fire(deltaTime);

    this.player.prePhysicsBehaviour(deltaTime);
    this.player.update(deltaTime);
    this.camera.update(deltaTime);
    this.player.postPhysicsBehaviour();

    this.postPhysicsStep.fire(deltaTime);
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